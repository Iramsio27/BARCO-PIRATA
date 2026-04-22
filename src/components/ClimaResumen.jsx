import { Link } from 'react-router-dom'
import { useMarinaForecast } from '../hooks/useMarinaForecast'

const UMBRAL_VIENTO = 40
const UMBRAL_OLAS   = 2

/** Muestra un resumen compacto del pronóstico para la `fecha` indicada ('yyyy-MM-dd'). */
export function ClimaResumen({ fecha }) {
  const { datos, cargando, error } = useMarinaForecast(fecha)

  if (!fecha) return null

  if (cargando) return (
    <div className="flex items-center gap-2 text-sm text-navy-400 py-2">
      <span className="animate-spin inline-block">🌊</span>
      <span>Consultando pronóstico para este día…</span>
    </div>
  )

  if (error || !datos) return null

  const viento = datos.clima.velocidadViento
  const olas   = datos.marina.alturaOlas
  const tMax   = datos.clima.temperaturaMax
  const tMin   = datos.clima.temperaturaMin

  const esExtremo = (viento !== null && viento > UMBRAL_VIENTO) ||
                    (olas   !== null && olas   > UMBRAL_OLAS)

  const fechaLabel = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className={`rounded-xl border p-4 ${
      esExtremo ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm mb-2">
        <span className="font-semibold text-navy-700 capitalize">
          {esExtremo ? '⛔ Condiciones extremas' : '✅ Buen clima'} — {fechaLabel}
        </span>

        {tMax !== null && tMin !== null && (
          <span>🌡️ {tMin}–{tMax} °C</span>
        )}
        {viento !== null && (
          <span className={viento > UMBRAL_VIENTO ? 'text-red-700 font-semibold' : ''}>
            💨 {viento} km/h
          </span>
        )}
        {olas !== null && (
          <span className={olas > UMBRAL_OLAS ? 'text-red-700 font-semibold' : ''}>
            🌊 {olas} m
          </span>
        )}

        <Link to={`/clima?fecha=${fecha}`} className="text-blue-600 hover:underline text-xs ml-auto shrink-0">
          Ver detalle →
        </Link>
      </div>

      {esExtremo && (
        <p className="text-red-700 text-xs leading-snug">
          Las condiciones previstas superan los límites seguros. Es posible que la salida
          sea cancelada. Te recomendamos elegir otra fecha o consultar antes de reservar.
        </p>
      )}
    </div>
  )
}
