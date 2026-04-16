import { useReservationStore } from '@app/store/reservationStore'
import { useReservationsByDate } from '@features/reservations/hooks/useReservations'
import { formatCurrency } from '@utils/formatters'
import { StatusBadge } from '@components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@components/ui/Card'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'
import { Button } from '@components/ui/Button'
import { Link } from 'react-router-dom'
import { PACKAGES } from '@constants/index'
import type { PackageId } from '@constants/index'

export default function ReservationsPage() {
  const { selectedDate, setSelectedDate } = useReservationStore()
  const { data, isLoading } = useReservationsByDate(selectedDate)
  const reservations = data?.data ?? []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-display font-bold text-navy-950">Reservaciones</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field w-auto"
        />
      </div>

      <Card padding="none">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Reservaciones del día</CardTitle>
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
                  {['Nombre', 'Teléfono', 'Hora', 'Personas', 'Paquete', 'Subtotal', 'Desc.', 'Total', 'Estado', 'Pago', 'Acción'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((r) => {
                  const pkg = PACKAGES[r.packageId as PackageId]
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.contactName}</td>
                      <td className="px-4 py-3 text-gray-500">{r.contactPhone}</td>
                      <td className="px-4 py-3">{r.time}</td>
                      <td className="px-4 py-3 text-center">{r.numberOfPeople}</td>
                      <td className="px-4 py-3">{pkg?.icon} {pkg?.label}</td>
                      <td className="px-4 py-3">{formatCurrency(r.subtotal)}</td>
                      <td className="px-4 py-3 text-green-600">{r.discount > 0 ? `-${formatCurrency(r.discount)}` : '–'}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(r.total)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 capitalize">{r.paymentMethod ?? '–'}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/venta/${r.id}`}>
                          <Button variant="ghost" size="sm">Gestionar</Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
