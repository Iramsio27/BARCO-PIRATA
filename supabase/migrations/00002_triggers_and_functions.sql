-- ═══════════════════════════════════════════════════════════════════════════
--  Triggers: updated_at automático + auditoría
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_reservations_updated on public.reservations;
create trigger trg_reservations_updated
  before update on public.reservations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_user_profiles_updated on public.user_profiles;
create trigger trg_user_profiles_updated
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Auditoría genérica
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  uemail text;
begin
  select email into uemail from auth.users where id = uid;

  insert into public.audit_log(user_id, user_email, action, table_name, record_id, old_values, new_values)
  values (
    uid,
    uemail,
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_reservations on public.reservations;
create trigger trg_audit_reservations
  after insert or update or delete on public.reservations
  for each row execute function public.audit_trigger();

drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.audit_trigger();

-- Reporte diario (RPC)
create or replace function public.daily_report(report_date date)
returns jsonb language plpgsql security definer as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'date', report_date,
    'totalReservations', count(*),
    'totalPeople', coalesce(sum(number_of_people), 0),
    'totalRevenue', coalesce(sum(total) filter (where status = 'pagada'), 0),
    'reservations', coalesce(jsonb_agg(to_jsonb(r) order by r.time), '[]'::jsonb)
  ) into result
  from public.reservations r
  where date = report_date and status <> 'cancelada';

  return result;
end;
$$;
