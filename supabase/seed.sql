-- ═══════════════════════════════════════════════════════════════════════════
--  Barco Pirata – SEED de desarrollo
--  ⚠️  NO EJECUTAR EN PRODUCCIÓN – Crea usuarios con contraseñas conocidas.
--
--  Cómo aplicar:
--    npx supabase db reset        (ejecuta migraciones + este seed)
--    -- o manualmente --
--    psql $DATABASE_URL -f supabase/seed.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Usuarios de prueba (admin + vendedor) ─────────────────────────────
-- Insertados en auth.users + auth.identities + public.user_profiles.
-- Idempotente: si ya existen por email, los omite.

do $$
declare
  v_admin_id    uuid := gen_random_uuid();
  v_vendedor_id uuid := gen_random_uuid();
begin
  -- Admin
  if not exists (select 1 from auth.users where email = 'admin@barcopirata.mx') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id, 'authenticated', 'authenticated',
      'admin@barcopirata.mx',
      crypt('BarcoPirata2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrador General"}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_admin_id, v_admin_id::text,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@barcopirata.mx', 'email_verified', true),
      'email', now(), now(), now()
    );

    insert into public.user_profiles (id, email, full_name, role)
    values (v_admin_id, 'admin@barcopirata.mx', 'Administrador General', 'admin');
  end if;

  -- Vendedor
  if not exists (select 1 from auth.users where email = 'vendedor@barcopirata.mx') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_vendedor_id, 'authenticated', 'authenticated',
      'vendedor@barcopirata.mx',
      crypt('Vendedor2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Juan Vendedor"}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_vendedor_id, v_vendedor_id::text,
      jsonb_build_object('sub', v_vendedor_id::text, 'email', 'vendedor@barcopirata.mx', 'email_verified', true),
      'email', now(), now(), now()
    );

    insert into public.user_profiles (id, email, full_name, role)
    values (v_vendedor_id, 'vendedor@barcopirata.mx', 'Juan Vendedor', 'vendedor');
  end if;
end $$;

-- ─── 2. Reservaciones demo ────────────────────────────────────────────────
-- 9 reservaciones repartidas en 5 días con todos los estados posibles.
-- Solo se insertan si la tabla está vacía (evita duplicar en re-ejecución).

do $$
begin
  if (select count(*) from public.reservations) = 0 then
    with ins as (
      insert into public.reservations (
        contact_name, contact_phone, date, time, number_of_people,
        package_id, service_type, subtotal, discount, total, status, payment_method, notes
      ) values
        -- HOY
        ('María López',       '+526381234567', current_date,     '10:00', 4, 'CON_COMIDA',   'individual', 1800, 0,   1800, 'pagada',     'efectivo', 'Aniversario'),
        ('Carlos Hernández',  '+526389876543', current_date,     '12:00', 8, 'SOLO_BEBIDAS', 'grupal',     2800, 280, 2520, 'pagada',     'tarjeta',  'Cumpleaños 50'),
        ('Ana García',        '+526381112233', current_date,     '16:00', 2, 'SOLO_PASEO',   'individual',  500, 0,    500, 'pendiente',  null,       null),

        -- MAÑANA
        ('Jorge Ramírez',     '+526385556677', current_date + 1, '11:00', 6, 'CON_COMIDA',   'grupal',     2700, 270, 2430, 'confirmada', null,       'Grupo de amigos'),
        ('Sofía Torres',      '+526382223344', current_date + 1, '14:00', 3, 'SOLO_PASEO',   'individual',  750, 0,    750, 'confirmada', null,       null),

        -- AYER
        ('Luis Mendoza',      '+526383334455', current_date - 1, '13:00', 5, 'SOLO_BEBIDAS', 'grupal',     1750, 175, 1575, 'pagada',     'tarjeta',  'Reunión empresa'),
        ('Patricia Ruiz',     '+526387778899', current_date - 1, '17:00', 2, 'CON_COMIDA',   'individual',  900, 0,    900, 'cancelada',  null,       'Cliente canceló'),

        -- ANTIER (descuento grupal)
        ('Roberto Jiménez',   '+526384445566', current_date - 2, '10:00', 10, 'CON_COMIDA',  'grupal',     4500, 450, 4050, 'pagada',     'efectivo', 'Despedida soltero'),

        -- HACE 3 DÍAS
        ('Elena Vargas',      '+526386667788', current_date - 3, '15:00', 4, 'SOLO_PASEO',   'individual', 1000, 0,   1000, 'pagada',     'efectivo', null)
      returning id, status, total, payment_method, date
    )
    insert into public.payments (reservation_id, method, amount, status, processed_at)
    select id, payment_method, total, 'completado', date::timestamp + interval '1 hour'
    from ins
    where status = 'pagada';
  end if;
end $$;
