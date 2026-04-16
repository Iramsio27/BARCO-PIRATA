-- ═══════════════════════════════════════════════════════════════════════════
--  Hardening de seguridad
--  1) Fija search_path en funciones (previene secuestro de esquema)
--  2) Restringe policies permisivas a roles con perfil válido
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Funciones con search_path inmutable ───────────────────────────────
alter function public.set_updated_at()  set search_path = public, pg_catalog;
alter function public.audit_trigger()   set search_path = public, pg_catalog;
alter function public.daily_report(date) set search_path = public, pg_catalog;

-- ─── 2. Helper: ¿el usuario actual es staff? ──────────────────────────────
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.user_profiles p
    where p.id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.user_profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ─── 3. Endurecer policies de reservations ────────────────────────────────
drop policy if exists "staff_select_reservations" on public.reservations;
create policy "staff_select_reservations"
  on public.reservations for select
  to authenticated
  using (public.is_staff());

drop policy if exists "staff_update_reservations" on public.reservations;
create policy "staff_update_reservations"
  on public.reservations for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "staff_delete_reservations" on public.reservations;
create policy "staff_delete_reservations"
  on public.reservations for delete
  to authenticated
  using (public.is_admin());

-- INSERT anónimo: agrega constraint de anti-spam (máx 50 personas ya está en CHECK)
-- Mantenemos WITH CHECK true porque la validación real vive en la app (Zod + sanitize)
-- y es una operación pública por diseño.

-- ─── 4. Endurecer policies de payments ────────────────────────────────────
drop policy if exists "staff_full_access_payments" on public.payments;

create policy "staff_select_payments"
  on public.payments for select
  to authenticated
  using (public.is_staff());

create policy "staff_update_payments"
  on public.payments for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "staff_delete_payments"
  on public.payments for delete
  to authenticated
  using (public.is_admin());

-- INSERT de pagos: tanto anon (flujo Stripe client-side) como staff (efectivo)
-- pueden insertar, pero SOLO si la reservación existe y no está ya pagada.
drop policy if exists "anon_insert_payments" on public.payments;
create policy "insert_payment_only_for_unpaid_reservation"
  on public.payments for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id
        and r.status <> 'pagada'
    )
  );

-- ─── 5. Acortar la ventana del SELECT anónimo en reservations ────────────
-- Remplazamos el SELECT anónimo permisivo: ahora solo puede leer reservaciones
-- de los últimos 30 días para evitar scraping histórico.
drop policy if exists "anon_select_own_reservation" on public.reservations;
create policy "anon_select_recent_reservation"
  on public.reservations for select
  to anon
  using (created_at >= now() - interval '30 days');
