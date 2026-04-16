import { useParams, useNavigate } from 'react-router-dom'
import { Printer, CheckCircle, CreditCard, Banknote, ArrowLeft } from 'lucide-react'
import { useReservation } from '@features/reservations/hooks/useReservations'
import { useProcessPayment } from '@features/payments/hooks/usePayments'
import { formatCurrency, formatDate, formatTime } from '@utils/formatters'
import { PACKAGES } from '@constants/index'
import type { PackageId } from '@constants/index'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { StatusBadge } from '@components/ui/Badge'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'
import { COMPANY } from '@constants/index'
import { useState } from 'react'

export default function SalePage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { data: reservation, isLoading } = useReservation(reservationId ?? '')
  const { mutateAsync: processPayment, isPending } = useProcessPayment()
  const [paid, setPaid] = useState(false)

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  if (!reservation) return <div className="text-center py-20 text-gray-500">Reservación no encontrada.</div>

  const pkg = PACKAGES[reservation.packageId as PackageId]
  const isPagada = reservation.status === 'pagada' || paid

  const handleConfirmCash = async () => {
    await processPayment({ reservationId: reservation.id, method: 'efectivo' })
    setPaid(true)
  }

  const handlePrint = () => window.print()

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display font-bold text-navy-950">Comprobante de Venta</h1>
          {isPagada && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          )}
        </div>

        {/* Comprobante */}
        <Card id="receipt" className="print:shadow-none">
          {/* Encabezado comprobante */}
          <div className="text-center border-b border-gray-100 pb-5 mb-5">
            <p className="font-display font-bold text-xl text-navy-950">{COMPANY.name}</p>
            <p className="text-sm text-gray-500">{COMPANY.location}</p>
            <p className="text-sm text-gray-500">{COMPANY.phone}</p>
          </div>

          {isPagada && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-5">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-green-700 font-medium text-sm">Pago confirmado</p>
            </div>
          )}

          <div className="space-y-2 text-sm mb-6">
            <Row label="Nombre" value={reservation.contactName} />
            <Row label="Teléfono" value={reservation.contactPhone} />
            <Row label="Fecha del paseo" value={formatDate(reservation.date)} />
            <Row label="Hora" value={formatTime(reservation.time)} />
            <Row label="No. Personas" value={`${reservation.numberOfPeople}`} />
            <Row label="Paquete" value={`${pkg?.icon} ${pkg?.label}`} />
            <Row label="Tipo de servicio" value={reservation.serviceType} />
            <Row label="Estado" value={<StatusBadge status={reservation.status} />} />
            {reservation.paymentMethod && (
              <Row
                label="Método de pago"
                value={
                  <span className="flex items-center gap-1.5 capitalize">
                    {reservation.paymentMethod === 'tarjeta'
                      ? <CreditCard className="w-4 h-4" />
                      : <Banknote className="w-4 h-4" />}
                    {reservation.paymentMethod}
                  </span>
                }
              />
            )}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(reservation.subtotal)}</span>
            </div>
            {reservation.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento grupal (10%)</span>
                <span>-{formatCurrency(reservation.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-brand-600">{formatCurrency(reservation.total)}</span>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Folio: {reservation.id.slice(0, 8).toUpperCase()}
          </p>
        </Card>

        {/* Acción de cobro (solo si pendiente) */}
        {!isPagada && (
          <Card className="mt-4">
            <p className="text-gray-600 text-sm mb-4">
              Confirma el pago en efectivo una vez que el cliente haya liquidado el monto total.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleConfirmCash} isLoading={isPending} className="flex-1">
                <Banknote className="w-4 h-4" /> Confirmar Pago en Efectivo
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/pago/${reservation.id}`)}
                className="flex-1"
              >
                <CreditCard className="w-4 h-4" /> Cobrar con Tarjeta
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
