import { supabase } from '@lib/supabase'

export interface SendReceiptResult {
  sent: boolean
  simulated?: boolean
  to?: string
  id?: string | null
  error?: string
}

export const receiptService = {
  /**
   * Dispara la Edge Function `send-receipt` que envía el comprobante por correo.
   * Si el proyecto no tiene RESEND_API_KEY, la función responde
   * `{ sent: false, simulated: true }` y la UI muestra el flujo como si
   * hubiese llegado — útil para demos.
   */
  async send(reservationId: string, email: string): Promise<SendReceiptResult> {
    const { data, error } = await supabase.functions.invoke('send-receipt', {
      body: { reservationId, email },
    })

    if (error) {
      // No queremos tumbar el flujo de pago por un fallo de correo.
      console.error('[receiptService.send] error', error)
      return { sent: false, error: error.message ?? String(error) }
    }
    return (data ?? { sent: false }) as SendReceiptResult
  },
}
