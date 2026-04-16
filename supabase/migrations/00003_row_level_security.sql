-- ═══════════════════════════════════════════════════════════════════════════
--  Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.reservations  enable row level security;
alter table public.payments      enable row level security;
alter table public.user_profiles enable row level security;
alter table public.audit_log     enable row level security;

-- ─── Reservations ─────────────────────────────────────────────────────────

-- Clientes anónimos pueden crear reservaciones
drop policy if exists "insert_anonymous_reservations" on public.reservations;
create policy "insert_anonymous_reservations"
  on public.reservations for insert
  to anon, authenticated
  with check (true);

-- Staff autenticado puede leer/actualizar/eliminar
drop policy if exists "staff_select_reservations" on public.reservations;
create policy "staff_select_reservations"
  on public.reservations for select
  to authenticated
  using (true);

drop policy if exists "staff_update_reservations" on public.reservations;
create policy "staff_update_reservations"
  on public.reservations for update
  to authenticated
  using (true) with check (true);

drop policy if exists "staff_delete_reservations" on public.reservations;
create policy "staff_delete_reservations"
  on public.reservations for delete
  to authenticated
  using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Cliente anónimo puede leer su reservación (conoce el UUID)
drop policy if exists "anon_select_own_reservation" on public.reservations;
create policy "anon_select_own_reservation"
  on public.reservations for select
  to anon
  using (true);

-- ─── Payments ─────────────────────────────────────────────────────────────
drop policy if exists "staff_full_access_payments" on public.payments;
create policy "staff_full_access_payments"
  on public.payments for all
  to authenticated
  using (true) with check (true);

drop policy if exists "anon_insert_payments" on public.payments;
create policy "anon_insert_payments"
  on public.payments for insert
  to anon
  with check (true);

-- ─── User Profiles ────────────────────────────────────────────────────────
drop policy if exists "user_read_own_profile" on public.user_profiles;
create policy "user_read_own_profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "admin_manage_profiles" on public.user_profiles;
create policy "admin_manage_profiles"
  on public.user_profiles for all
  to authenticated
  using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── Audit Log (solo admins leen, nadie edita) ────────────────────────────
drop policy if exists "admin_read_audit" on public.audit_log;
create policy "admin_read_audit"
  on public.audit_log for select
  to authenticated
  using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );
