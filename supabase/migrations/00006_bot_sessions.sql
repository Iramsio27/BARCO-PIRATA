-- ─── 00006_bot_sessions.sql ──────────────────────────────────────────────────
-- Tabla para persistir el estado de conversación del chatbot de WhatsApp.
-- Reemplaza el Map en RAM de bot-logic.ts para sobrevivir reinicios y evitar
-- crecimiento ilimitado de memoria.
--
-- También se usa para rate limiting: se cuenta cuántos mensajes llegaron
-- de un número en los últimos 60 segundos.

CREATE TABLE IF NOT EXISTS public.bot_sessions (
  -- Número de WhatsApp del cliente (normalizado, sin +, ej: 526381234567)
  phone               TEXT PRIMARY KEY,

  -- Idioma detectado: 'es' | 'en'
  lang                TEXT NOT NULL DEFAULT 'es'
                        CHECK (lang IN ('es', 'en')),

  -- true mientras el bot espera que el cliente confirme o niegue la cancelación
  awaiting_cancel_confirm BOOLEAN NOT NULL DEFAULT FALSE,

  -- Contador de mensajes recibidos en la ventana actual (rate limiting)
  message_count       INTEGER NOT NULL DEFAULT 0,

  -- Inicio de la ventana de rate limiting (se resetea cada 60 s)
  window_start        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Última actividad (para limpiar sesiones inactivas)
  last_seen           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para limpiar sesiones antiguas eficientemente
CREATE INDEX IF NOT EXISTS idx_bot_sessions_last_seen
  ON public.bot_sessions (last_seen);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
-- Solo la service_role (Edge Function) puede leer/escribir esta tabla.
-- Ningún usuario anónimo ni autenticado tiene acceso.
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- Sin políticas públicas → acceso denegado para todos excepto service_role
-- (service_role bypasea RLS por defecto en Supabase)

-- ─── Función de limpieza ──────────────────────────────────────────────────────
-- Elimina sesiones inactivas por más de 24 horas.
-- Llamar con un cron job o manualmente: SELECT cleanup_bot_sessions();
CREATE OR REPLACE FUNCTION public.cleanup_bot_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.bot_sessions
  WHERE last_seen < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ─── Trigger: actualizar updated_at automáticamente ───────────────────────────
CREATE OR REPLACE FUNCTION public.set_bot_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bot_sessions_updated_at
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_bot_sessions_updated_at();
