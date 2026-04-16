# 💳 Configuración de Stripe

Esta guía te lleva paso a paso de **cero a pagos funcionando en modo test**.

## 1. Crear cuenta de Stripe (gratis)

1. Ve a https://dashboard.stripe.com/register
2. Regístrate (puede ser con email o Google)
3. **No necesitas activar la cuenta ni subir documentos** para usar el modo test.
4. Al entrar verás el toggle **"Modo test"** en la esquina superior derecha; déjalo activo.

## 2. Obtener las llaves API

1. En el dashboard, ve a **Developers → API keys**
   (URL: https://dashboard.stripe.com/test/apikeys)
2. Verás dos llaves:

   | Tipo | Prefijo | Dónde va |
   |------|---------|----------|
   | **Publishable key** | `pk_test_...` | Frontend (`.env.local`) – **puede ser pública** |
   | **Secret key** | `sk_test_...` | Solo en el servidor (Supabase secrets) – **NUNCA al cliente** |

3. Copia la publishable key al `.env.local`:

   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABCxyz...
   ```

## 3. Cargar la secret key en Supabase

La Edge Function `create-payment-intent` ya está desplegada. Solo falta que lea la secret key de forma segura.

### Opción A – Desde el dashboard de Supabase (recomendado)

1. Entra a tu proyecto: https://supabase.com/dashboard/project/foaimrzqvsgiffmvyebr
2. Ve a **Project Settings → Edge Functions → Secrets** (o **Functions → Secrets**)
3. Agrega:

   | Nombre | Valor |
   |--------|-------|
   | `STRIPE_SECRET_KEY` | `sk_test_...` (pégalo) |

4. Guarda. La Edge Function lo leerá en la próxima invocación (no necesita redeploy).

### Opción B – Con Supabase CLI

```bash
# Una sola vez: login + link
npx supabase login
npx supabase link --project-ref foaimrzqvsgiffmvyebr

# Cargar la secret
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
```

## 4. Probar el flujo completo

1. `npm run dev` → http://localhost:3000
2. Ve a **Reservar**, llena el formulario.
3. En la página de pago, elige **Tarjeta**.
4. Usa una tarjeta de prueba de Stripe:

   | Escenario | Número | CVC | Fecha |
   |-----------|--------|-----|-------|
   | ✅ Pago exitoso | `4242 4242 4242 4242` | cualquier 3 dígitos | cualquier fecha futura |
   | ❌ Tarjeta rechazada | `4000 0000 0000 0002` | cualquiera | futura |
   | 🔐 Requiere 3D Secure | `4000 0025 0000 3155` | cualquiera | futura |

   Lista completa: https://stripe.com/docs/testing

5. Verifica en el dashboard de Stripe:
   https://dashboard.stripe.com/test/payments

## 5. (Opcional) Webhook para reconciliación

Para mayor robustez, Stripe puede notificar a tu backend cuando el pago cambia
de estado (útil si el cliente cierra el navegador antes de que tu app actualice
la BD).

1. En Stripe: **Developers → Webhooks → Add endpoint**
2. URL: `https://foaimrzqvsgiffmvyebr.supabase.co/functions/v1/stripe-webhook`
3. Eventos a escuchar: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copia el **Signing secret** (`whsec_...`) y agrégalo como secret:
   `STRIPE_WEBHOOK_SECRET=whsec_...`
5. Despliega la Edge Function `stripe-webhook` (no incluida en este repo; se
   puede agregar cuando se quiera pasar a producción).

## 6. Pasar a producción

Cuando estés listo para cobrar dinero real:

1. Activa tu cuenta Stripe (necesitarás RFC, CLABE, etc. en México).
2. Cambia las llaves por `pk_live_...` y `sk_live_...`
3. Actualiza `.env.local` (o las variables de Vercel/Netlify) con las live keys.
4. Actualiza `STRIPE_SECRET_KEY` en Supabase secrets con la live key.
5. Haz una transacción pequeña de prueba.

## ❓ Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `Configuración de pagos incompleta` | Falta `STRIPE_SECRET_KEY` en Supabase | Configurar como en paso 3 |
| `No such payment_intent` | Mezclaste llaves test y live | Ambas deben ser del mismo modo |
| `Your card was declined` | Número de tarjeta de prueba incorrecto | Usa `4242 4242 4242 4242` |
| Popup de Stripe no aparece | Bloqueador de popups o CSP | Revisa la consola del navegador |
