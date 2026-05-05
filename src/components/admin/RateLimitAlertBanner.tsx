// ─── RateLimitAlertBanner.tsx ─────────────────────────────────────────────────
// Banner que aparece en la parte superior del panel de admin cuando el chatbot
// detecta un número de WhatsApp que superó el rate limit.
// Se actualiza en tiempo real via Supabase Realtime.

import { ShieldAlert, X, XCircle, Phone } from 'lucide-react'
import { useRateLimitAlerts } from '@features/admin/hooks/useRateLimitAlerts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function RateLimitAlertBanner() {
  const { alerts, dismiss, dismissAll } = useRateLimitAlerts()

  if (alerts.length === 0) return null

  return (
    <div
      className="w-full px-4 py-2 flex flex-col gap-1.5"
      style={{
        background: 'rgba(239,68,68,0.08)',
        borderBottom: '1px solid rgba(239,68,68,0.25)',
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Encabezado de la sección de alertas */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: '#f87171' }} />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: '#f87171' }}
          >
            {alerts.length === 1
              ? 'Alerta de seguridad — Rate limit'
              : `${alerts.length} alertas de seguridad — Rate limit`}
          </span>
        </div>

        {alerts.length > 1 && (
          <button
            type="button"
            onClick={dismissAll}
            className="text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition-opacity hover:opacity-70"
            style={{ color: '#f87171' }}
            aria-label="Descartar todas las alertas"
          >
            <XCircle className="w-3.5 h-3.5" />
            Descartar todas
          </button>
        )}
      </div>

      {/* Lista de alertas individuales */}
      <div className="flex flex-col gap-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
            }}
          >
            {/* Info */}
            <div className="flex items-center gap-3 min-w-0">
              <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: '#f87171' }} />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                {/* Número bloqueado */}
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: '#fca5a5' }}
                >
                  +{alert.phone}
                </span>

                {/* Descripción */}
                <span
                  className="text-xs hidden sm:inline"
                  style={{ color: 'rgba(252,165,165,0.7)' }}
                >
                  superó {alert.limit} mensajes en {alert.windowSeconds}s
                </span>

                {/* Hora */}
                <span
                  className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: 'rgba(252,165,165,0.8)',
                  }}
                >
                  {format(parseISO(alert.blockedAt), "HH:mm:ss", { locale: es })}
                </span>
              </div>
            </div>

            {/* Botón descartar */}
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className="shrink-0 p-1 rounded-md transition-opacity hover:opacity-70"
              style={{ color: '#f87171' }}
              aria-label={`Descartar alerta del número ${alert.phone}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <p
        className="text-[11px] px-1"
        style={{ color: 'rgba(252,165,165,0.6)' }}
      >
        Los mensajes del número bloqueado se ignoran automáticamente. Revisa la{' '}
        <a
          href="/admin/bitacora"
          className="underline underline-offset-2 hover:opacity-80 transition-opacity"
          style={{ color: 'rgba(252,165,165,0.85)' }}
        >
          bitácora
        </a>{' '}
        para el historial completo.
      </p>
    </div>
  )
}
