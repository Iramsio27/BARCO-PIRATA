import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CreditCard, Banknote, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { stripePromise } from '@lib/stripe'
import { useReservation } from '@features/reservations/hooks/useReservations'
import { useProcessPayment, useCreateStripeIntent } from '@features/payments/hooks/usePayments'
import { PAYMENT_METHODS } from '@constants/index'
import { formatCurrency } from '@utils/formatters'
import { Button } from '@components/ui/Button'
import { Card, CardHeader, CardTitle } from '@components/ui/Card'
import { LoadingSpinner } from '@components/ui/LoadingSpinner'

export default function PaymentPage() {
  const { t } = useTranslation()
  const { reservationId } = useParams<{ reservationId: string }>()
  const { data: reservation, isLoading } = useReservation(reservationId ?? '')
  const [method, setMethod] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const { mutateAsync: createIntent, isPending: creatingIntent } = useCreateStripeIntent()
  const { mutateAsync: processPayment, isPending: processing } = useProcessPayment()
  const navigate = useNavigate()

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  if (!reservation) return <div className="text-center py-20 text-navy-500">{t('payment.notFound')}</div>
  if (reservation.status === 'pagada') {
    return (
      <div className="container-app py-16 max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-100 border-4 border-gold-300 mb-4 shadow-gold">
          <CheckCircle className="w-12 h-12 text-gold-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">{t('payment.paid')}</h2>
        <p className="text-navy-500">{t('payment.paidSubtitle')}</p>
      </div>
    )
  }

  const handleEfectivo = async () => {
    await processPayment({ reservationId: reservation.id, method: PAYMENT_METHODS.EFECTIVO })
    navigate(`/admin/venta/${reservation.id}`)
  }

  const handleCardSetup = async () => {
    const { clientSecret: cs } = await createIntent(reservation.id)
    setClientSecret(cs)
  }

  return (
    <div className="container-app py-12 max-w-lg">
      <h1 className="text-3xl font-display font-bold text-navy-900 mb-8 text-center">{t('payment.title')}</h1>

      <Card className="mb-6 panel-dark">
        <div className="flex justify-between items-center">
          <span className="text-navy-200">{t('payment.totalPay')}</span>
          <span className="text-3xl font-bold text-gold-400">{formatCurrency(reservation.total)}</span>
        </div>
      </Card>

      {/* Selección de método */}
      <Card className="mb-6">
        <CardHeader><CardTitle>{t('payment.method')}</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'efectivo', icon: Banknote,    label: t('payment.cash') },
            { value: 'tarjeta',  icon: CreditCard,  label: t('payment.card') },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setMethod(value as typeof method)}
              className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-colors ${
                method === value
                  ? 'border-gold-500 bg-gold-50 text-navy-900'
                  : 'border-navy-200 text-navy-500 hover:border-navy-300'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="font-medium text-sm">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Pago efectivo */}
      {method === 'efectivo' && (
        <Card>
          <p className="text-navy-600 mb-4 text-sm">
            {t('payment.cashInfo')}
          </p>
          <Button variant="accent" onClick={handleEfectivo} isLoading={processing} className="w-full">
            {t('payment.cashConfirm')}
          </Button>
        </Card>
      )}

      {/* Pago con tarjeta */}
      {method === 'tarjeta' && !clientSecret && (
        <Card>
          <p className="text-navy-600 mb-4 text-sm">
            {t('payment.cardInfo')}
          </p>
          <Button variant="accent" onClick={handleCardSetup} isLoading={creatingIntent} className="w-full">
            {t('payment.cardContinue')}
          </Button>
        </Card>
      )}

      {method === 'tarjeta' && clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripeCheckoutForm reservationId={reservation.id} />
        </Elements>
      )}
    </div>
  )
}

function StripeCheckoutForm({ reservationId }: { reservationId: string }) {
  const { t } = useTranslation()
  const stripe = useStripe()
  const elements = useElements()
  const { mutateAsync: processPayment, isPending } = useProcessPayment()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setError(null)
    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message ?? t('payment.paymentError'))
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      await processPayment({
        reservationId,
        method: 'tarjeta',
        stripePaymentMethodId: paymentIntent.id,
      })
      navigate(`/admin/venta/${reservationId}`)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        {error && <p className="error-message">{error}</p>}
        <Button variant="accent" type="submit" isLoading={isPending} className="w-full" disabled={!stripe}>
          {t('payment.payNow')}
        </Button>
      </form>
    </Card>
  )
}
