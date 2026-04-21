-- ════════════════════════════════════════════════════════════════════════
--   Migration 00006 — Email del cliente en la reservación
--
--   Agrega la columna `contact_email` a public.reservations para poder
--   enviar el comprobante de pago al correo del cliente (Edge Function
--   `send-receipt`). Se deja NULL-able porque las reservaciones viejas no
--   tienen correo y porque el correo se captura hasta el momento del pago.
-- ════════════════════════════════════════════════════════════════════════

alter table public.reservations
  add column if not exists contact_email text;

-- Validación ligera del formato (no estricta, es CHECK permisivo).
alter table public.reservations
  drop constraint if exists reservations_contact_email_format;
alter table public.reservations
  add constraint reservations_contact_email_format
  check (
    contact_email is null
    or contact_email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  );

-- Índice para búsquedas ocasionales por correo (uso admin futuro).
create index if not exists idx_reservations_contact_email
  on public.reservations (contact_email);

comment on column public.reservations.contact_email is
  'Correo del cliente — capturado al momento del pago para enviar el comprobante.';
