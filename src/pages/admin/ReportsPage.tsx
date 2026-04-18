import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileSpreadsheet, FileText, TrendingUp, Users, DollarSign,
  CalendarRange, Package, CreditCard, BarChart3,
} from 'lucide-react'
import { reportService } from '@features/reports/services/reportService'
import { formatCurrency, formatDate } from '@utils/formatters'
import { PACKAGES } from '@constants/index'
import type { PackageId } from '@constants/index'
import { Button } from '@components/ui/Button'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'
import { PeriodPicker, DEFAULT_PERIOD, type Period } from '@components/ui/PeriodPicker'
import { BarChart, LineChart, DonutChart } from '@components/ui/Charts'

// ════════════════════════════════════════════════════════════════════════
//   KPI Card
// ════════════════════════════════════════════════════════════════════════
function KpiCard({
  icon: Icon, label, value, hint, accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl p-5 border shadow-sm transition-all',
        accent
          ? 'bg-gold-gradient text-navy-900 border-gold-300'
          : 'admin-surface admin-border',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={['text-xs font-bold uppercase tracking-wider mb-1.5',
            accent ? 'text-navy-800/80' : 'admin-text-muted'].join(' ')}>
            {label}
          </p>
          <p className={['text-2xl font-bold tabular-nums',
            accent ? 'text-navy-900' : 'admin-text-title'].join(' ')}>
            {value}
          </p>
          {hint && (
            <p className={['text-xs mt-1',
              accent ? 'text-navy-800/70' : 'admin-text-subtle'].join(' ')}>
              {hint}
            </p>
          )}
        </div>
        <div className={[
          'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          accent ? 'bg-navy-900/10' : 'bg-gold-100',
        ].join(' ')}>
          <Icon className={['w-5 h-5', accent ? 'text-navy-900' : 'text-gold-600'].join(' ')} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   Página de Reportes
// ════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD)

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['rangeReport', period.startDate, period.endDate, period.granularity],
    queryFn: () => reportService.getRangeReport(period.startDate, period.endDate, period.granularity),
  })

  const seriesForCharts = useMemo(
    () => (report?.series ?? []).map((p) => ({
      label: p.label,
      value: p.revenue,
      sublabel: `${p.reservations} reserv.`,
    })),
    [report],
  )
  const peopleSeries = useMemo(
    () => (report?.series ?? []).map((p) => ({ label: p.label, value: p.people })),
    [report],
  )

  const packageDonut = useMemo(() => {
    if (!report) return []
    return (Object.keys(report.byPackage) as PackageId[])
      .map((k) => {
        const pkg = PACKAGES[k]
        const s = report.byPackage[k]
        return { label: pkg.label, value: s.count, icon: pkg.icon }
      })
      .filter((d) => d.value > 0)
  }, [report])

  const paymentDonut = useMemo(() => {
    if (!report) return []
    return Object.entries(report.byPaymentMethod).map(([method, s]) => ({
      label: method.replace(/_/g, ' '),
      value: s.revenue,
    }))
  }, [report])

  const avgTicket = report && report.totalReservations
    ? report.totalRevenue / report.totalReservations
    : 0

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold admin-text-title">Reportes</h1>
          <p className="text-sm admin-text-muted mt-0.5">
            Analiza el desempeño de reservaciones, ocupación e ingresos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker value={period} onChange={setPeriod} />
          {report && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reportService.exportRangeToExcel(report)}
                disabled={!report.totalReservations}
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reportService.exportRangeToPDF(report)}
                disabled={!report.totalReservations}
              >
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Estados */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {isError && (
        <div className="panel-danger text-center">
          Error al cargar el reporte: {(error as Error)?.message ?? 'desconocido'}
        </div>
      )}

      {report && !isLoading && (
        <>
          {/* Banda de período activo */}
          <div className="flex items-center gap-2 text-sm admin-text-muted">
            <CalendarRange className="w-4 h-4 text-gold-500" />
            <span>
              Periodo analizado:&nbsp;
              <span className="font-semibold admin-text-body">
                {formatDate(report.startDate)} → {formatDate(report.endDate)}
              </span>
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              icon={TrendingUp}
              label="Reservaciones"
              value={String(report.totalReservations)}
              hint={`${report.series.length} ${report.granularity === 'day' ? 'día(s)' : report.granularity === 'month' ? 'mes(es)' : 'año(s)'} con datos`}
            />
            <KpiCard
              icon={Users}
              label="Personas"
              value={String(report.totalPeople)}
              hint={report.totalReservations
                ? `${(report.totalPeople / report.totalReservations).toFixed(1)} por reserva`
                : '—'}
            />
            <KpiCard
              icon={DollarSign}
              label="Ingresos"
              value={formatCurrency(report.totalRevenue)}
              hint={`Ticket prom. ${formatCurrency(avgTicket)}`}
              accent
            />
            <KpiCard
              icon={BarChart3}
              label="Mejor período"
              value={
                report.series.length
                  ? report.series.reduce((a, b) => (a.revenue > b.revenue ? a : b)).label
                  : '—'
              }
              hint={
                report.series.length
                  ? formatCurrency(report.series.reduce((a, b) => (a.revenue > b.revenue ? a : b)).revenue)
                  : 'Sin datos'
              }
            />
          </div>

          {/* Gráfica principal — Ingresos por período */}
          <section className="admin-surface border admin-border rounded-xl p-5">
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gold-500" />
                <h2 className="font-display font-bold admin-text-title">
                  Ingresos por {report.granularity === 'day' ? 'día' : report.granularity === 'month' ? 'mes' : 'año'}
                </h2>
              </div>
              <span className="text-xs admin-text-subtle">{report.series.length} puntos</span>
            </header>
            <LineChart
              data={seriesForCharts}
              valueFormatter={(v) => formatCurrency(v)}
              height={280}
            />
          </section>

          {/* Dos columnas: personas + paquetes */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="admin-surface border admin-border rounded-xl p-5">
              <header className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gold-500" />
                <h2 className="font-display font-bold admin-text-title">Personas embarcadas</h2>
              </header>
              <BarChart
                data={peopleSeries.map((d) => ({ label: d.label, value: d.value }))}
                valueFormatter={(v) => String(v)}
                height={240}
              />
            </section>

            <section className="admin-surface border admin-border rounded-xl p-5">
              <header className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gold-500" />
                <h2 className="font-display font-bold admin-text-title">Distribución por paquete</h2>
              </header>
              {packageDonut.length ? (
                <DonutChart
                  data={packageDonut}
                  centerValue={String(report.totalReservations)}
                  centerLabel="Reservas"
                  valueFormatter={(v) => `${v} reserv.`}
                />
              ) : (
                <p className="text-sm admin-text-muted text-center py-8">Sin datos en el período.</p>
              )}
            </section>
          </div>

          {/* Pago + detalle de paquetes */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="admin-surface border admin-border rounded-xl p-5">
              <header className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gold-500" />
                <h2 className="font-display font-bold admin-text-title">Ingresos por método de pago</h2>
              </header>
              {paymentDonut.length ? (
                <DonutChart
                  data={paymentDonut}
                  centerValue={formatCurrency(report.totalRevenue)}
                  centerLabel="Total"
                  valueFormatter={(v) => formatCurrency(v)}
                />
              ) : (
                <p className="text-sm admin-text-muted text-center py-8">Sin pagos registrados.</p>
              )}
            </section>

            <section className="admin-surface border admin-border rounded-xl p-5">
              <header className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gold-500" />
                <h2 className="font-display font-bold admin-text-title">Desglose por paquete</h2>
              </header>
              <div className="space-y-4">
                {(Object.keys(report.byPackage) as PackageId[]).map((pkgId) => {
                  const pkg = PACKAGES[pkgId]
                  const stats = report.byPackage[pkgId]
                  const pct = report.totalReservations
                    ? Math.round((stats.count / report.totalReservations) * 100)
                    : 0
                  return (
                    <div key={pkgId}>
                      <div className="flex justify-between items-baseline text-sm mb-1.5">
                        <span className="font-semibold admin-text-body">
                          <span className="mr-1.5">{pkg.icon}</span>{pkg.label}
                        </span>
                        <span className="tabular-nums admin-text-muted">
                          <span className="font-semibold admin-text-title">{stats.count}</span> reserv. ·
                          &nbsp;<span className="font-semibold text-gold-600">{formatCurrency(stats.revenue)}</span>
                        </span>
                      </div>
                      <div className="h-2 admin-surface-alt rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-gradient rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] admin-text-subtle mt-0.5 text-right">{pct}% del total</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Tabla de serie */}
          <section className="admin-surface border admin-border rounded-xl overflow-hidden">
            <header className="flex items-center gap-2 px-5 py-4 border-b admin-border">
              <CalendarRange className="w-5 h-5 text-gold-500" />
              <h2 className="font-display font-bold admin-text-title">Detalle por período</h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="admin-surface-alt">
                  <tr className="text-left">
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider admin-text-muted">Período</th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider admin-text-muted text-right">Reservas</th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider admin-text-muted text-right">Personas</th>
                    <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider admin-text-muted text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y admin-divide">
                  {report.series.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center admin-text-muted">
                        Sin datos en el período seleccionado.
                      </td>
                    </tr>
                  )}
                  {report.series.map((p) => (
                    <tr key={p.key} className="admin-row-hover">
                      <td className="px-5 py-3 font-medium admin-text-body">{p.label}</td>
                      <td className="px-5 py-3 text-right tabular-nums admin-text-body">{p.reservations}</td>
                      <td className="px-5 py-3 text-right tabular-nums admin-text-body">{p.people}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-gold-600">
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
