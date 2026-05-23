-- ═══════════════════════════════════════════════════════════════════════════
--  Migración 00018: Corrige recursión infinita en políticas RLS
--
--  Problema
--  --------
--  La política `admin_manage_profiles` sobre `user_profiles` (creada en
--  00003) ejecuta un sub-SELECT contra la PROPIA tabla `user_profiles`:
--      EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() ...)
--  Postgres aplica RLS a ese sub-SELECT → vuelve a evaluar
--  `admin_manage_profiles` → recursión infinita.
--  Error: "infinite recursion detected in policy for relation user_profiles".
--
--  Efecto colateral
--  ----------------
--  Las políticas de `business_settings` (`admin_update_business_settings` y
--  `admin_insert_business_settings`, creadas en 00015) también hacen
--  EXISTS(SELECT ... FROM user_profiles ...). Al evaluarlas se dispara la RLS
--  de `user_profiles` → la misma recursión → cualquier PATCH/INSERT sobre
--  `business_settings` devuelve 500. Esto rompe el guardado de horarios, días
--  de cierre, capacidad, fechas cerradas, paquetes y promociones.
--
--  Solución
--  --------
--  Usar la función `is_admin()` (SECURITY DEFINER, creada en 00004), que
--  ejecuta su consulta como propietario y por tanto NO dispara RLS sobre
--  `user_profiles` → sin recursión. Es el mismo patrón que ya usan
--  correctamente las políticas de reservations / payments / audit_log.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. user_profiles: reemplazar la política recursiva ────────────────────
drop policy if exists "admin_manage_profiles" on public.user_profiles;

-- SELECT: el admin ve todos los perfiles
-- (la política "user_read_own_profile" se mantiene: cada usuario lee el suyo)
drop policy if exists "admin_select_profiles" on public.user_profiles;
create policy "admin_select_profiles"
  on public.user_profiles for select
  to authenticated
  using (public.is_admin());

-- INSERT / UPDATE / DELETE: solo admin
drop policy if exists "admin_insert_profiles" on public.user_profiles;
create policy "admin_insert_profiles"
  on public.user_profiles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin_update_profiles" on public.user_profiles;
create policy "admin_update_profiles"
  on public.user_profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_delete_profiles" on public.user_profiles;
create policy "admin_delete_profiles"
  on public.user_profiles for delete
  to authenticated
  using (public.is_admin());

-- ─── 2. business_settings: usar is_admin() en lugar del EXISTS recursivo ───
drop policy if exists "admin_update_business_settings" on public.business_settings;
create policy "admin_update_business_settings"
  on public.business_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_insert_business_settings" on public.business_settings;
create policy "admin_insert_business_settings"
  on public.business_settings for insert
  to authenticated
  with check (public.is_admin());
