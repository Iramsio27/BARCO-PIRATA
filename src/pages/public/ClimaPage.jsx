import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Anchor } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useMarinaForecast } from '../../hooks/useMarinaForecast'
import { DateSlotPicker } from '../../components/ui/DateSlotPicker'

const UMBRAL_VIENTO = 40
const UMBRAL_OLAS   = 2

const today = format(new Date(), 'yyyy-MM-dd')
const maxDay = format(new Date(Date.now() + 13 * 86400_000), 'yyyy-MM-dd')

function Brujula({ grados, noData }) {
  if (grados === null || grados === undefined) return <span className="text-gray-400 italic">{noData}</span>
  const dirs = ['N','NE','E','SE','S','SO','O','NO']
  return <span>{grados}° ({dirs[Math.round(grados / 45) % 8]})</span>
}

function Valor({ v, unidad = '', noData }) {
  if (v === null || v === undefined) return <span className="text-gray-400 italic">{noData}</span>
  return <span>{v}{unidad}</span>
}

function AlertaCondiciones({ datos, cargando }) {
  const { t } = useTranslation()

  if (cargando) return (
    <div className="flex items-center gap-2 text-navy-400 py-4 animate-pulse">
      <span>🌊</span><span>{t('clima.forecastLoading')}</span>
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
          <p className="font-bold text-red-800 text-lg">{t('clima.extreme.title')}</p>
          <p className="text-red-700 text-sm mt-1">
            {viento !== null && viento > UMBRAL_VIENTO && t('clima.extreme.windExceeded', { value: viento, limit: UMBRAL_VIENTO })}
            {olas   !== null && olas   > UMBRAL_OLAS   && t('clima.extreme.wavesExceeded', { value: olas, limit: UMBRAL_OLAS })}
          </p>
          <p className="text-red-600 text-sm mt-2">
            {t('clima.extreme.warning')}
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
          <p className="font-bold text-green-800 text-lg">{t('clima.favorable.title')}</p>
          <p className="text-green-700 text-sm mt-1">{t('clima.favorable.subtitle')}</p>
        </div>
      </div>
    </div>
  )
}

function TarjetaClima({ datos }) {
  const { t } = useTranslation()
  if (!datos) return null
  const { clima, marina } = datos
  const noData = t('clima.noData')

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-blue-900 text-white px-5 py-3">
        <h2 className="font-bold text-lg">🌊 {t('clima.detail.title')}</h2>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('clima.general.title')}</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>{t('clima.general.tempMaxMin')}</span>
              <span>
                <Valor v={clima.temperaturaMax} unidad=" °C" noData={noData} /> / <Valor v={clima.temperaturaMin} unidad=" °C" noData={noData} />
              </span>
            </li>
            <li className="flex justify-between">
              <span>{t('clima.general.windMax')}</span>
              <Valor v={clima.velocidadViento} unidad=" km/h" noData={noData} />
            </li>
            <li className="flex justify-between">
              <span>{t('clima.general.windDir')}</span>
              <Brujula grados={clima.direccionViento} noData={noData} />
            </li>
            <li className="flex justify-between">
              <span>{t('clima.general.precipitation')}</span>
              <Valor v={clima.precipitacion} unidad=" mm" noData={noData} />
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('clima.marine.title')}</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>{t('clima.marine.waveHeight')}</span>
              <Valor v={marina.alturaOlas} unidad=" m" noData={noData} />
            </li>
            <li className="flex justify-between">
              <span>{t('clima.marine.waveDir')}</span>
              <Brujula grados={marina.direccionOlas} noData={noData} />
            </li>
            <li className="flex justify-between">
              <span>{t('clima.marine.wavePeriod')}</span>
              <Valor v={marina.periodoOlas} unidad=" s" noData={noData} />
            </li>
            <li className="flex justify-between">
              <span>{t('clima.marine.windWaves')}</span>
              <Valor v={marina.alturaOlasViento} unidad=" m" noData={noData} />
            </li>
            <li className="flex justify-between">
              <span>{t('clima.marine.swellHeight')}</span>
              <Valor v={marina.alturaSwell} unidad=" m" noData={noData} />
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function InfoUmbrales() {
  const { t } = useTranslation()
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-6">
      <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
        <Anchor className="w-4 h-4" />
        {t('clima.safety.title')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-blue-800">
        <div className="flex items-center gap-2">
          <span className="text-green-500 font-bold">✓</span>
          <span>{t('clima.safety.windOk', { limit: UMBRAL_VIENTO })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-500 font-bold">✓</span>
          <span>{t('clima.safety.wavesOk', { limit: UMBRAL_OLAS })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold">✗</span>
          <span>{t('clima.safety.windBad', { limit: UMBRAL_VIENTO })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold">✗</span>
          <span>{t('clima.safety.wavesBad', { limit: UMBRAL_OLAS })}</span>
        </div>
      </div>
    </div>
  )
}

export default function ClimaPage() {
  const { t } = useTranslation()
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
          {t('clima.backHome')}
        </Link>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-navy-900 tracking-wide uppercase">
            🌊 {t('clima.title')}
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
          <p className="font-semibold">⚠️ {t('clima.errorTitle')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Tarjeta de datos */}
      {!cargando && <TarjetaClima datos={datos} />}

      {/* Umbrales */}
      <InfoUmbrales />

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-navy-500 text-sm mb-3">{t('clima.cta.question')}</p>
        <Link to={`/reservar?date=${fecha}`} className="inline-flex btn-accent px-6 py-3 text-base">
          {t('clima.cta.button')}
        </Link>
      </div>
    </div>
  )
}
