-- ══════════════════════════════════════════════════════════════════════════
-- 00005_capacity_validation.sql
-- Evita doble-booking validando la capacidad del barco antes de cada
-- reservación. Además expone una RPC pública `get_daily_availability`
-- que el frontend consume para mostrar slots disponibles en vivo.
-- ══════════════════════════════════════════════════════════════════════════

-- ─── Parámetros del negocio ─────────────────────────────────────────────
-- Capacidad máxima de personas por horario (slot). Si algún día se agrega
-- otro barco o se quiere parametrizar por fecha, migrar a una tabla.
create or replace function public.boat_capacity()
returns int language sql immutable as $$
  select 40
$$;

-- Horarios válidos (5 slots desde las 9 AM hasta las 5 PM cada 2 horas).
create or replace function public.valid_time_slots()
returns time[] language sql immutable as $$
  select array[
    '09:00'::time,
    '11:00'::time,
    '13:00'::time,
    '15:00'::time,
    '17:00'::time
  ]
$$;

-- ─── Función de ocupación por slot ──────────────────────────────────────
create or replace function public.get_slot_occupancy(
  p_date date,
  p_time time
) returns int
language sql stable security definer as $$
  select coalesce(sum(number_of_people), 0)::int
  from public.reservations
  where date = p_date
    and time = p_time
    and status in ('pendiente','confirmada','pagada')
$$;

-- ─── Disponibilidad diaria (todos los slots del día) ────────────────────
-- Retorna los 5 slots con su ocupación y cupo restante, ya sea que tengan
-- reservas o no (LEFT JOIN con unnest de slots). El frontend usa esto
-- para mostrar las tarjetas de horario.
create or replace function public.get_daily_availability(p_date date)
returns table (
  slot_time time,
  occupied  int,
  available int,
  is_full   boolean
)
language sql stable security definer as $$
  with slots as (
    select unnest(public.valid_time_slots()) as t
  )
  select
    s.t as slot_time,
    coalesce(sum(r.number_of_people), 0)::int as occupied,
    (public.boat_capacity() - coalesce(sum(r.number_of_people), 0))::int as available,
    coalesce(sum(r.number_of_people), 0) >= public.boat_capacity() as is_full
  from slots s
  left join public.reservations r
    on r.date = p_date
    and r.time = s.t
    and r.status in ('pendiente','confirmada','pagada')
  group by s.t
  order by s.t;
$$;

-- ─── Trigger: prevenir overbooking ──────────────────────────────────────
-- Se ejecuta antes de INSERT o UPDATE de `number_of_people`, `date`, `time`
-- o `status`. Rechaza cuando la suma excede `boat_capacity()`.
create or replace function public.check_capacity_before_write()
returns trigger language plpgsql as $$
declare
  v_occupied     int;
  v_available    int;
  v_total        int;
  v_time_changed boolean;
begin
  -- Cancelaciones no consumen cupo, permitir siempre
  if new.status = 'cancelada' then
    return new;
  end if;

  -- ¿Es INSERT o el horario cambió en UPDATE?
  v_time_changed := (tg_op = 'INSERT') or (new.time is distinct from old.time);

  -- Solo validar slots válidos en INSERT o si cambió el horario
  -- (reservas históricas con horarios libres pueden seguir actualizándose)
  if v_time_changed and not (new.time = any(public.valid_time_slots())) then
    raise exception
      'Horario % no disponible. Horarios permitidos: %',
      new.time::text,
      array_to_string(public.valid_time_slots()::text[], ', ')
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  -- Revalidar capacidad solo si cambió algo que la afecte
  if tg_op = 'INSERT'
     or new.date is distinct from old.date
     or new.time is distinct from old.time
     or new.number_of_people is distinct from old.number_of_people
     or (old.status = 'cancelada' and new.status <> 'cancelada')
  then
    select coalesce(sum(number_of_people), 0) into v_occupied
    from public.reservations
    where date = new.date
      and time = new.time
      and status in ('pendiente','confirmada','pagada')
      and id is distinct from new.id;

    v_available := public.boat_capacity() - v_occupied;
    v_total     := v_occupied + new.number_of_people;

    if v_total > public.boat_capacity() then
      raise exception
        'Capacidad excedida para % a las %: solo quedan % lugares disponibles (solicitaste %).',
        new.date::text,
        to_char(new.time, 'HH24:MI'),
        v_available,
        new.number_of_people
        using errcode = '23514';  -- check_violation
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_capacity on public.reservations;
create trigger trg_check_capacity
  before insert or update on public.reservations
  for each row execute function public.check_capacity_before_write();

-- ─── Permisos para anon / authenticated ─────────────────────────────────
grant execute on function public.boat_capacity()             to anon, authenticated;
grant execute on function public.valid_time_slots()          to anon, authenticated;
grant execute on function public.get_slot_occupancy(date, time) to anon, authenticated;
grant execute on function public.get_daily_availability(date) to anon, authenticated;

-- ─── Índice de apoyo ────────────────────────────────────────────────────
-- Acelera el cálculo de ocupación por (date, time).
create index if not exists idx_reservations_date_time_status
  on public.reservations (date, time, status)
  where status in ('pendiente','confirmada','pagada');

comment on function public.get_daily_availability is
  'Devuelve los 5 slots horarios del día con su ocupación y cupo restante. Usado por el frontend público (no requiere auth).';
comment on function public.check_capacity_before_write is
  'Trigger que impide overbooking y valida horarios permitidos antes de INSERT/UPDATE en reservations.';
