import { useMarinaWeather } from '../hooks/useMarinaWeather'

function Val({ valor, unidad = '' }) {
  if (valor === null || valor === undefined) return <span className="text-gray-400 italic">Sin cobertura</span>
  return <span>{valor}{unidad}</span>
}

function Brujula({ grados }) {
  if (grados === null || grados === undefined) return <span className="text-gray-400 italic">Sin cobertura</span>
  const dirs = ['N','NE','E','SE','S','SO','O','NO']
  const punto = dirs[Math.round(grados / 45) % 8]
  return <span>{grados}° ({punto})</span>
}

export function ClimaMarino() {
  const { datos, cargando, error } = useMarinaWeather()

  if (cargando) return (
    <div className="flex items-center gap-2 text-gray-500 p-4">
      <span className="animate-spin text-xl">🌊</span>
      <span>Obteniendo condiciones marinas…</span>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      <p className="font-semibold">⚠️ Error al cargar el clima</p>
      <p className="text-sm mt-1">{error}</p>
    </div>
  )

  const { clima, marina, actualizadoEn } = datos

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Encabezado */}
      <div className="bg-blue-900 text-white px-5 py-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">🌊 Condiciones Marinas</h2>
        <span className="text-xs text-blue-200">
          Actualizado: {new Date(actualizadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* ── Clima general ── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Clima General</h3>
          <ul className="space-y-2 text-sm">
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
              <Val valor={clima.velocidadViento} unidad=" km/h" />
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
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos Marinos</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>🌊 Altura de olas</span>
              <Val valor={marina.alturaOlas} unidad=" m" />
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
    </div>
  )
}
