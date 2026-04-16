import { Users, CalendarCheck, DollarSign, TrendingUp } from 'lucide-react'
import { useReservationStore } from '@app/store/reservationStore'
import { useReservationsByDate } from '@features/reservations/hooks/useReservations'
import { formatCurrency, formatDate } from '@utils/formatters'
import { StatusBadge } from '@components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@components/ui/Card'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'

export default function DashboardPage() {
  const { selectedDate, setSelectedDate } = useReservationStore()
  const { data, isLoading } = useReservationsByDate(selectedDate)

  const reservations = data?.data ?? []
  const totalRevenue = reservations
    .filter((r) => r.status === 'pagada')
    .reduce((sum, r) => sum + r.total, 0)
  const totalPeople = reservations.reduce((sum, r) => sum + r.numberOfPeople, 0)

  const stats = [
    { label: 'Reservaciones', value: reservations.length, icon: CalendarCheck, color: 'text-blue-500' },
    { label: 'Personas', value: totalPeople, icon: Users, color: 'text-purple-500' },
    { label: 'Ingresos del día', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-green-500' },
    { label: 'Tasa de pago', value: `${reservations.length ? Math.round((reservations.filter(r => r.status === 'pagada').length / reservations.length) * 100) : 0}%`, icon: TrendingUp, color: 'text-brand-500' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-950">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen del día seleccionado</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field w-auto"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`p-2.5 rounded-lg bg-gray-100 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-navy-950">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabla de reservaciones */}
      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <div className="flex justify-between items-center">
            <CardTitle>Reservaciones – {formatDate(selectedDate)}</CardTitle>
            <Link to="/admin/reservaciones">
              <Button variant="ghost" size="sm">Ver todas</Button>
            </Link>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : reservations.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No hay reservaciones para esta fecha.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Nombre', 'Hora', 'Personas', 'Paquete', 'Total', 'Estado', 'Acción'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{r.contactName}</td>
                    <td className="px-6 py-4 text-gray-500">{r.time}</td>
                    <td className="px-6 py-4">{r.numberOfPeople}</td>
                    <td className="px-6 py-4 text-gray-500">{r.packageId.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 font-semibold">{formatCurrency(r.total)}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4">
                      <Link to={`/admin/venta/${r.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
