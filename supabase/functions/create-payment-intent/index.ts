// Edge Function: create-payment-intent
// Deploy: supabase functions deploy create-payment-intent --no-verify-jwt=false
//
// Esta función se ejecuta en el servidor (Deno runtime) con la secret key de
// Stripe. El frontend NUNCA debe tener acceso a la secret key.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado' }, 401)

    // Cliente Supabase autenticado con el JWT del usuario
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { reservationId } = await req.json()
    if (!reservationId) return json({ error: 'reservationId es requerido' }, 400)

    // Busca la reservación y valida monto desde el servidor
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('id, total, status, contact_name')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) return json({ error: 'Reservación no encontrada' }, 404)
    if (reservation.status === 'pagada') return json({ error: 'Ya está pagada' }, 400)

    // Crea el PaymentIntent (monto en centavos)
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(reservation.total) * 100),
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: {
        reservationId: reservation.id,
        customerName: reservation.contact_name,
      },
    })

    return json({ clientSecret: intent.client_secret }, 200)
  } catch (err) {
    console.error('[create-payment-intent]', err)
    return json({ error: 'Error interno del servidor' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
