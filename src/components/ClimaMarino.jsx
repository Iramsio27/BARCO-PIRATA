import { useMarinaWeather } from '../hooks/useMarinaWeather'

const UMBRAL_VIENTO = 40
const UMBRAL_OLAS   = 2

function Val({ valor, unidad = '', alerta = false }) {
  if (valor === null || valor === undefined) return <span className="text-navy-300 italic">Sin cobertura</span>
  return <span className={alerta ? 'text-pirate-500 font-bold' : ''}>{valor}{unidad}</span>
}

function Brujula({ grados }) {
  if (grados === null || grados === undefined) return <span className="text-navy-300 italic">Sin cobertura</span>
  const dirs = ['N','NE','E','SE','S','SO','O','NO']
  return <span>{grados}° ({dirs[Math.round(grados / 45) % 8]})</span>
}

function AlertaSeguridad({ clima, marina }) {
  const viento    = clima.velocidadViento
  const olas      = marina.alturaOlas
  const vientoMal = viento !== null && viento > UMBRAL_VIENTO
  const olasMal   = olas   !== null && olas   > UMBRAL_OLAS
  const esExtremo = vientoMal || olasMal

  if (esExtremo) return (
    <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-pirate-200 bg-pirate-50 px-4 py-3">
      <span className="text-xl shrink-0">⛔</span>
      <div>
        <p className="font-bold text-pirate-700 text-sm">Condiciones extremas — No se recomienda zarpar</p>
        <p className="text-pirate-600 text-xs mt-0.5">
          {vientoMal && `Viento: ${viento} km/h (límite ${UMBRAL_VIENTO} km/h). `}
          {olasMal   && `Olas: ${olas} m (límite ${UMBRAL_OLAS} m).`}
        </p>
      </div>
    </div>
  )

  return (
    <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <span className="text-xl shrink-0">✅</span>
      <div>
        <p className="font-bold text-green-800 text-sm">Condiciones favorables para zarpar</p>
        <p className="text-green-700 text-xs mt-0.5">
          Viento y altura de olas dentro de los rangos seguros
          ({UMBRAL_VIENTO} km/h · {UMBRAL_OLAS} m).
        </p>
      </div>
    </div>
  )
}

export function ClimaMarino({ fecha }) {
  const { datos, cargando, error } = useMarinaWeather(fecha)

  if (cargando) return (
    <div className="flex items-center gap-2 text-navy-400 p-4 animate-pulse">
      <span className="text-xl">🌊</span>
      <span className="text-sm">Obteniendo condiciones marinas…</span>
    </div>
  )

  if (error) return (
    <div className="panel-danger">
      <p className="font-semibold text-sm">⚠️ Error al cargar el clima</p>
      <p className="text-xs mt-1">{error}</p>
    </div>
  )

  const { clima, marina, actualizadoEn } = datos

  return (
    <div className="bg-white rounded-xl border border-navy-100 overflow-hidden">
      {/* Encabezado */}
      <div className="bg-navy-900 text-white px-5 py-3 flex items-center justify-between">
        <h2 className="font-bold text-sm tracking-wide">🌊 Condiciones Marinas</h2>
        <span className="text-xs text-navy-300">
          Actualizado: {new Date(actualizadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Alerta de seguridad */}
      <AlertaSeguridad clima={clima} marina={marina} />

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">

        {/* ── Clima general ── */}
        <section>
          <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Clima General</h3>
          <ul className="space-y-2 text-sm text-navy-700">
            <li className="flex justify-between">
              <span>🌡️ Temperatura</span>
              <Val valor={clima.temperatura} unidad=" °C" />
            </li>
            <li className="flex justify-between">
              <span>💧 Humedad</span>
              <Val valor={clima.humedad} unidad=" %" />
            </li>
            <li className="flex justify-between">
              <span>💨 Viento</span>
              <Val valor={clima.velocidadViento} unidad=" km/h" alerta={clima.velocidadViento > UMBRAL_VIENTO} />
            </li>
            <li className="flex justify-between">
              <span>🧭 Dirección viento</span>
              <Brujula grados={clima.direccionViento} />
            </li>
            <li className="flex justify-between">
              <span>🌧️ Precipitación</span>
              <Val valor={clima.precipitacion} unidad=" mm" />
            </li>
          </ul>
        </section>

        {/* ── Marina ── */}
        <section>
          <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Datos Marinos</h3>
          <ul className="space-y-2 text-sm text-navy-700">
            <li className="flex justify-between">
              <span>🌊 Altura de olas</span>
              <Val valor={marina.alturaOlas} unidad=" m" alerta={marina.alturaOlas > UMBRAL_OLAS} />
            </li>
            <li className="flex justify-between">
              <span>🧭 Dirección olas</span>
              <Brujula grados={marina.direccionOlas} />
            </li>
            <li className="flex justify-between">
              <span>⏱️ Período de olas</span>
              <Val valor={marina.periodoOlas} unidad=" s" />
            </li>
            <li className="flex justify-between">
              <span>💨 Olas por viento</span>
              <Val valor={marina.alturaOlasViento} unidad=" m" />
            </li>
            <li className="flex justify-between">
              <span>🌐 Altura swell</span>
              <Val valor={marina.alturaSwell} unidad=" m" />
            </li>
            <li className="flex justify-between">
              <span>🔄 Corriente</span>
              <Val valor={marina.velocidadCorriente} unidad=" m/s" />
            </li>
            <li className="flex justify-between">
              <span>🧭 Dir. corriente</span>
              <Brujula grados={marina.direccionCorriente} />
            </li>
          </ul>
        </section>

      </div>

      {/* Umbrales */}
      <div className="mx-5 mb-5 mt-1 grid grid-cols-2 gap-2 rounded-lg bg-navy-50 border border-navy-100 p-3 text-xs text-navy-600">
        <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> Viento ≤ {UMBRAL_VIENTO} km/h</span>
        <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> Olas ≤ {UMBRAL_OLAS} m</span>
        <span className="flex items-center gap-1.5"><span className="text-pirate-500 font-bold">✗</span> Viento &gt; {UMBRAL_VIENTO} km/h</span>
        <span className="flex items-center gap-1.5"><span className="text-pirate-500 font-bold">✗</span> Olas &gt; {UMBRAL_OLAS} m</span>
      </div>
    </div>
  )
}
