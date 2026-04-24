import { supabase } from '@lib/supabase'
import type { Payment, ProcessPaymentDto } from '@app-types/index'

interface CreateIntentResponse {
  clientSecret: string
  amount: number
  currency: string
}

export const paymentService = {
  /**
   * Crea un PaymentIntent en Stripe a través de la Edge Function de Supabase.
   * El monto se calcula SERVER-SIDE leyendo la reservación de la BD,
   * por lo que el cliente NUNCA puede falsificarlo.
   */
  async createStripeIntent(reservationId: string): Promise<CreateIntentResponse> {
    const { data, error } = await supabase.functions.invoke<CreateIntentResponse>(
      'create-payment-intent',
      { body: { reservationId } }
    )

    if (error) throw new Error(error.message)
    if (!data?.clientSecret) throw new Error('No se recibió clientSecret de Stripe')
    return data
  },

  /**
   * Registra un pago completado (efectivo o tarjeta confirmada).
   */
  async recordPayment(dto: ProcessPaymentDto): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        reservation_id: dto.reservationId,
        method: dto.method,
        amount: 0, // Se actualiza desde el backend con el monto real
        status: dto.method === 'efectivo' && dto.adminConfirm ? 'completado' : 'pendiente',
        stripe_payment_intent_id: dto.stripePaymentMethodId ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: (data as Record<string, unknown>).id as string,
      reservationId: (data as Record<string, unknown>).reservation_id as string,
      method: (data as Record<string, unknown>).method as Payment['method'],
      amount: (data as Record<string, unknown>).amount as number,
      status: (data as Record<string, unknown>).status as Payment['status'],
      stripePaymentIntentId: (data as Record<string, unknown>).stripe_payment_intent_id as string | null,
      receiptUrl: (data as Record<string, unknown>).receipt_url as string | null,
      processedAt: (data as Record<string, unknown>).processed_at as string | null,
      createdAt: (data as Record<string, unknown>).created_at as string,
    }
  },

  async getByReservation(reservationId: string): Promise<Payment | null> {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .maybeSingle()

    if (!data) return null

    const row = data as Record<string, unknown>
    return {
      id: row.id as string,
      reservationId: row.reservation_id as string,
      method: row.method as Payment['method'],
      amount: row.amount as number,
      status: row.status as Payment['status'],
      stripePaymentIntentId: row.stripe_payment_intent_id as string | null,
      receiptUrl: row.receipt_url as string | null,
      processedAt: row.processed_at as string | null,
      createdAt: row.created_at as string,
    }
  },
}
