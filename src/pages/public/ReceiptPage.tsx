import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle, Calendar, Clock, Users, Package, Phone, User,
  Banknote, ArrowLeftRight, Printer, Home, Mail,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useReservation } from '@features/reservations/hooks/useReservations'
import { PACKAGES, COMPANY } from '@constants/index'
import type { PackageId } from '@constants/index'
import { formatDate, formatTime, formatCurrency } from '@utils/formatters'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'

// ════════════════════════════════════════════════════════════════════════
//   Página pública de recibo — se muestra al cliente tras pagar.
//   NO exponer rutas de admin. Usa useReservation (query pública).
// ════════════════════════════════════════════════════════════════════════
export default function ReceiptPage() {
  const { t } = useTranslation()
  const { reservationId } = useParams<{ reservationId: string }>()
  const { data: reservation, isLoading } = useReservation(reservationId ?? '')

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="container-app py-16 text-center">
        <p className="text-navy-500 mb-4">{t('receipt.notFound')}</p>
        <Link to="/"><Button>{t('receipt.backHome')}</Button></Link>
      </div>
    )
  }

  const pkg = PACKAGES[reservation.packageId as PackageId]
  const isPaid = reservation.status === 'pagada'
  const isCashPending = !isPaid && reservation.paymentMethod === 'efectivo'

  return (
    <div className="container-app py-12 max-w-lg print:py-4">
      {/* Hero confirmación */}
      <div className="text-center mb-8 animate-fade-in print:mb-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-100 border-4 border-gold-300 mb-4 shadow-gold">
          <CheckCircle className="w-12 h-12 text-gold-600" />
        </div>
        <h1 className="text-3xl font-display font-bold text-navy-900 mb-2">
          {isPaid ? t('receipt.title') : t('receipt.titlePending')}
        </h1>
        <p className="text-navy-600">
          {isPaid ? t('receipt.subtitle') : t('receipt.subtitlePending')}
        </p>
      </div>

      {/* Banner de correo enviado */}
      {reservation.contactEmail && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 print:hidden">
          <Mail className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
          <span>
            {t('receipt.emailSent', { email: reservation.contactEmail })}
          </span>
        </div>
      )}

      {/* Recibo */}
      <Card className="animate-slide-up print:shadow-none print:border">
        {/* Encabezado del recibo */}
        <div className="text-center pb-4 border-b-2 border-dashed border-navy-200 mb-5">
          <h2 className="font-display font-bold text-navy-900 uppercase tracking-wider">
            {COMPANY.shortName}
          </h2>
          <p className="text-xs text-navy-500 mt-0.5">{COMPANY.location}</p>
          <p className="text-[11px] text-navy-400 mt-1">
            {t('receipt.document')} &middot; {new Date().toLocaleString()}
          </p>
        </div>

        {/* Badge de estado */}
        <div className="flex justify-center mb-5">
          <span
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
              isPaid
                ? 'bg-green-100 text-green-800 border border-green-300'
                : isCashPending
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-gold-100 text-gold-800 border border-gold-300',
            ].join(' ')}
          >
            {isPaid
              ? <>{reservation.paymentMethod === 'transferencia' ? <ArrowLeftRight className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />} {t('receipt.statusPaid')}</>
              : isCashPending
                ? <><Banknote className="w-3.5 h-3.5" /> {t('receipt.statusCashPending')}</>
                : <>{t('receipt.statusPending')}</>}
          </span>
        </div>

        {/* Detalles */}
        <dl className="space-y-3">
          <InfoRow
            icon={<User className="w-4 h-4" />}
            label={t('confirmation.fields.name')}
            value={reservation.contactName}
          />
          <InfoRow
            icon={<Phone className="w-4 h-4" />}
            label={t('confirmation.fields.phone')}
            value={reservation.contactPhone}
          />
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label={t('confirmation.fields.date')}
            value={formatDate(reservation.date)}
          />
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label={t('confirmation.fields.time')}
            value={formatTime(reservation.time)}
          />
          <InfoRow
            icon={<Users className="w-4 h-4" />}
            label={t('confirmation.fields.people')}
            value={t('confirmation.personCount', { count: reservation.numberOfPeople })}
          />
          <InfoRow
            icon={<Package className="w-4 h-4" />}
            label={t('confirmation.fields.package')}
            value={`${pkg?.icon ?? ''} ${pkg ? t(`packages.${pkg.id}.label`) : ''}`}
          />
          {(isPaid || isCashPending) && (
            <InfoRow
              icon={reservation.paymentMethod === 'transferencia'
                ? <ArrowLeftRight className="w-4 h-4" />
                : <Banknote className="w-4 h-4" />}
              label={t('receipt.paymentMethod')}
              value={reservation.paymentMethod === 'transferencia'
                ? t('payment.transfer')
                : t('payment.cash')}
            />
          )}
        </dl>

        {/* Totales */}
        <div className="mt-5 pt-4 border-t-2 border-dashed border-navy-200">
          <div className="flex justify-between text-sm text-navy-500 mb-1">
            <span>{t('confirmation.subtotal')}</span>
            <span>{formatCurrency(reservation.subtotal)}</span>
          </div>
          {reservation.discount > 0 && (
            <div className="flex justify-between text-sm text-gold-700 mb-1 font-semibold">
              <span>{t('confirmation.groupDiscount')}</span>
              <span>-{formatCurrency(reservation.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg mt-2">
            <span className="text-navy-900">
              {isPaid ? t('receipt.totalPaid') : t('confirmation.totalPay')}
            </span>
            <span className="text-gold-600">{formatCurrency(reservation.total)}</span>
          </div>
        </div>

        {/* ID folio */}
        <div className="mt-5 pt-4 border-t border-navy-100 text-center">
          <p className="text-[11px] uppercase tracking-wider text-navy-400 mb-1">
            {t('receipt.folio')}
          </p>
          <code className="font-mono text-xs text-navy-700 break-all">
            {reservation.id}
          </code>
        </div>

        <p className="text-center text-[11px] text-navy-400 mt-4 print:mt-2">
          {t('receipt.thanks')}
        </p>
      </Card>

      {/* Acciones */}
      <div className="mt-6 flex gap-3 print:hidden">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.print()}
        >
          <Printer className="w-4 h-4" />
          {t('receipt.print')}
        </Button>
        <Link to="/" className="flex-1">
          <Button variant="accent" className="w-full">
            <Home className="w-4 h-4" />
            {t('receipt.backHome')}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function InfoRow({
  icon, label, value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gold-600">{icon}</span>
      <span className="text-navy-500 text-sm w-24 shrink-0">{label}</span>
      <span className="font-medium text-navy-900 flex-1 text-right">{value}</span>
    </div>
  )
}
