import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string

if (!publishableKey) {
  console.warn('[Stripe] Falta VITE_STRIPE_PUBLISHABLE_KEY – los pagos con tarjeta no funcionarán.')
}

/**
 * Instancia singleton de Stripe.
 * Se carga de forma diferida (lazy) al primer uso.
 */
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null
