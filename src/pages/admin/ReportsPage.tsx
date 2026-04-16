import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, FileText, BarChart3 } from 'lucide-react'
import { reportService } from '@features/reports/services/reportService'
import { formatCurrency, formatDate } from '@utils/formatters'
import { PACKAGES } from '@constants/index'
import type { PackageId } from '@constants/index'
import { Button } from '@components/ui/Button'
import { Card, CardHeader, CardTitle } from '@components/ui/Card'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'
import { todayISO } from '@utils/formatters'

export default function ReportsPage() {
  const [date, setDate] = useState(todayISO())

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', date],
    queryFn: () => reportService.getDailyReport(date),
    enabled: !!date,
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-display font-bold text-navy-950">Reportes</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-auto"
          />
          {report && (
            <>
              <Button variant="outline" size="sm" onClick={() => reportService.exportToExcel(report)}>
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => reportService.exportToPDF(report)}>
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>}
      {isError && <p className="text-red-500 text-center py-12">Error al cargar el reporte.</p>}

      {report && (
        <div className="space-y-6">
          {/* Resumen general */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Reservaciones', value: report.totalReservations },
              { label: 'Personas totales', value: report.totalPeople },
              { label: 'Ingresos totales', value: formatCurrency(report.totalRevenue) },
              { label: 'Fecha', value: formatDate(report.date) },
            ].map(({ label, value }) => (
              <Card key={label} className="text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-navy-950">{value}</p>
              </Card>
            ))}
          </div>

          {/* Por paquete */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-500" />
                <CardTitle>Por Paquete</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {Object.entries(report.byPackage).map(([pkgId, stats]) => {
                const pkg = PACKAGES[pkgId as PackageId]
                const pct = report.totalReservations
                  ? Math.round((stats.count / report.totalReservations) * 100)
                  : 0
                return (
                  <div key={pkgId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{pkg.icon} {pkg.label}</span>
                      <span className="text-gray-500">{stats.count} reserv. · {formatCurrency(stats.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Por método de pago */}
          <Card>
            <CardHeader><CardTitle>Por Método de Pago</CardTitle></CardHeader>
            <div className="divide-y divide-gray-100">
              {Object.entries(report.byPaymentMethod).map(([method, stats]) => (
                <div key={method} className="flex justify-between py-3 text-sm">
                  <span className="capitalize font-medium">{method.replace('_', ' ')}</span>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(stats.revenue)}</p>
                    <p className="text-xs text-gray-400">{stats.count} transacción(es)</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
