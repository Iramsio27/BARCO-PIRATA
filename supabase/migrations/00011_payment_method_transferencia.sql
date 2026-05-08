-- ═══════════════════════════════════════════════════════════════════════════
--  Migración 00011 – Reemplazar método de pago 'tarjeta' por 'transferencia'
--  Los pagos ya no se procesan en línea. El cliente paga en efectivo o por
--  transferencia bancaria directamente en el lugar o antes de abordar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Paso 1: Agregar 'transferencia' al enum existente ────────────────────
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transferencia';

-- ─── Paso 2: Agregar columna para la referencia de transferencia ──────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transferencia_reference TEXT;

-- ─── Paso 3: Sanear registros con 'tarjeta' antes de recrear el enum ──────
-- (No había datos reales de Stripe; se anulan los métodos de pago pendientes)
UPDATE public.reservations
  SET payment_method = NULL
  WHERE payment_method = 'tarjeta';

UPDATE public.payments
  SET method = 'efectivo'
  WHERE method = 'tarjeta';

-- ─── Paso 4: Recrear el enum sin 'tarjeta' ────────────────────────────────
-- PostgreSQL no permite DROP VALUE en enums, por lo que se renombra y recrea.

ALTER TYPE payment_method RENAME TO payment_method_old;

CREATE TYPE payment_method AS ENUM ('efectivo', 'transferencia');

ALTER TABLE public.reservations
  ALTER COLUMN payment_method TYPE payment_method
  USING payment_method::text::payment_method;

ALTER TABLE public.payments
  ALTER COLUMN method TYPE payment_method
  USING method::text::payment_method;

DROP TYPE payment_method_old;

-- ─── Paso 5: Eliminar la columna de Stripe (ya no se usa) ─────────────────
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_payment_intent_id;
