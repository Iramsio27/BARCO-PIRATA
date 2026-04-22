import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Anchor } from 'lucide-react'
import { format } from 'date-fns'
import { useMarinaForecast } from '../../hooks/useMarinaForecast'
import { DateSlotPicker } from '../../components/ui/DateSlotPicker'

const UMBRAL_VIENTO = 40
const UMBRAL_OLAS   = 2

const today = format(new Date(), 'yyyy-MM-dd')
const maxDay = format(new Date(Date.now() + 13 * 86400_000), 'yyyy-MM-dd')

function Brujula({ grados }) {
  if (grados === null || grados === undefined) return <span className="text-gray-400 italic">Sin datos</span>
  const dirs = ['N','NE','E','SE','S','SO','O','NO']
  return <span>{grados}° ({dirs[Math.round(grados / 45) % 8]})</span>
}

function Valor({ v, unidad = '' }) {
  if (v === null || v === undefined) return <span className="text-gray-400 italic">Sin datos</span>
  return <span>{v}{unidad}</span>
}

function AlertaCondiciones({ datos, cargando }) {
  if (cargando) return (
    <div className="flex items-center gap-2 text-navy-400 py-4 animate-pulse">
      <span>🌊</span><span>Consultando pronóstico…</span>
    </div>
  )
  if (!datos) return null

  const viento    = datos.clima.velocidadViento
  const olas      = datos.marina.alturaOlas
  const esExtremo = (viento !== null && viento > UMBRAL_VIENTO) ||
                    (olas   !== null && olas   > UMBRAL_OLAS)

  if (esExtremo) return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-5 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⛔</span>
        <div>
          <p className="font-bold text-red-800 text-lg">Condiciones extremas — No se recomienda zarpar</p>
          <p className="text-red-700 text-sm mt-1">
            {viento !== null && viento > UMBRAL_VIENTO && `Viento: ${viento} km/h (límite ${UMBRAL_VIENTO} km/h). `}
            {olas   !== null && olas   > UMBRAL_OLAS   && `Altura de olas: ${olas} m (límite ${UMBRAL_OLAS} m).`}
          </p>
          <p className="text-red-600 text-sm mt-2">
            Las reservaciones para este día podrían ser canceladas. Comunícate con nosotros para más información.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-5 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-bold text-green-800 text-lg">Condiciones favorables para zarpar</p>
          <p className="text-green-700 text-sm mt-1">Las condiciones previstas están dentro de los rangos seguros.</p>
        </div>
      </div>
    </div>
  )
}

function TarjetaClima({ datos }) {
  if (!datos) return null
  const { clima, marina } = datos

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-blue-900 text-white px-5 py-3">
        <h2 className="font-bold text-lg">🌊 Detalle del día</h2>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Clima General</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>🌡️ Temp. máx / mín</span>
              <span>
                <Valor v={clima.temperaturaMax} unidad=" °C" /> / <Valor v={clima.temperaturaMin} unidad=" °C" />
              </span>
            </li>
            <li className="flex justify-between">
              <span>💨 Viento máx.</span>
              <Valor v={clima.velocidadViento} unidad=" km/h" />
            </li>
            <li className="flex justify-between">
              <span>🧭 Dir. viento</span>
              <Brujula grados={clima.direccionViento} />
            </li>
            <li className="flex justify-between">
              <span>🌧️ Precipitación</span>
              <Valor v={clima.precipitacion} unidad=" mm" />
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos Marinos</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>🌊 Altura de olas</span>
              <Valor v={marina.alturaOlas} unidad=" m" />
            </li>
            <li className="flex justify-between">
              <span>🧭 Dirección olas</span>
              <Brujula grados={marina.direccionOlas} />
            </li>
            <li className="flex justify-between">
              <span>⏱️ Período de olas</span>
              <Valor v={marina.periodoOlas} unidad=" s" />
            </li>
            <li className="flex justify-between">
              <span>💨 Olas por viento</span>
              <Valor v={marina.alturaOlasViento} unidad=" m" />
            </li>
            <li className="flex justify-between">
              <span>🌐 Altura swell</span>
              <Valor v={marina.alturaSwell} unidad=" m" />
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function InfoUmbrales() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-6">
      <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
        <Anchor className="w-4 h-4" />
        Criterios de seguridad marina
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-blue-800">
        <div className="flex items-center gap-2">
          <span className="text-green-500 font-bold">✓</span>
          <span>Viento hasta <strong>{UMBRAL_VIENTO} km/h</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-500 font-bold">✓</span>
          <span>Olas hasta <strong>{UMBRAL_OLAS} m</strong> de altura</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold">✗</span>
          <span>Viento mayor a <strong>{UMBRAL_VIENTO} km/h</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold">✗</span>
          <span>Olas mayores a <strong>{UMBRAL_OLAS} m</strong></span>
        </div>
      </div>
    </div>
  )
}

export default function ClimaPage() {
  const [searchParams] = useSearchParams()
  const paramFecha = searchParams.get('fecha')

  const [fecha, setFecha] = useState(
    paramFecha && paramFecha >= today && paramFecha <= maxDay ? paramFecha : today
  )

  const { datos, cargando, error } = useMarinaForecast(fecha)

  return (
    <div className="container-app py-12 max-w-3xl">
      {/* Encabezado */}
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-navy-900 tracking-wide uppercase">
            🌊 Condiciones Marinas
          </h1>
          <p className="text-navy-500 mt-2">Puerto Peñasco, Sonora</p>
        </div>
      </div>

      {/* Selector de fecha — mismo componente que en reservas */}
      <div className="bg-white border border-navy-100 rounded-xl p-5 shadow-sm mb-6">
        <DateSlotPicker
          value={fecha}
          onChange={setFecha}
          closedWeekday={7}
          days={14}
        />
      </div>

      {/* Alerta de condiciones */}
      <AlertaCondiciones datos={datos} cargando={cargando} />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          <p className="font-semibold">⚠️ No se pudo cargar el pronóstico</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Tarjeta de datos */}
      {!cargando && <TarjetaClima datos={datos} />}

      {/* Umbrales */}
      <InfoUmbrales />

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-navy-500 text-sm mb-3">¿Las condiciones se ven bien?</p>
        <Link to={`/reservar?date=${fecha}`} className="inline-flex btn-accent px-6 py-3 text-base">
          Reservar para este día
        </Link>
      </div>
    </div>
  )
}
