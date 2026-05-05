// ─── whatsapp-bot/index.ts ────────────────────────────────────────────────────
// Supabase Edge Function: webhook para Meta (WhatsApp) Cloud API.
//
// Deploy:
//   supabase functions deploy whatsapp-bot --no-verify-jwt
//
// Variables de entorno requeridas (ver CHATBOT_SETUP.md):
//   META_VERIFY_TOKEN, META_APP_SECRET, META_ACCESS_TOKEN,
//   META_PHONE_NUMBER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'
import { handleMessage, handleInitialRedirect, type IncomingMessage } from './bot-logic.ts'
import { isRateLimited } from './db.ts'

// ─── Prefijo del mensaje de redirección desde la app ─────────────────────────
const REDIRECT_PREFIX = 'RESERVA:'

// ─── Verificación de firma HMAC-SHA256 de Meta ───────────────────────────────
// Meta firma cada POST con X-Hub-Signature-256: sha256=<hex>
// Si no validamos esto, cualquiera que conozca nuestra URL puede enviar
// payloads falsos y manipular reservaciones.
async function verifyMetaSignature(req: Request, rawBody: string): Promise<boolean> {
  const appSecret = Deno.env.get('META_APP_SECRET')
  if (!appSecret) {
    // Si la variable no está configurada, rechazar por seguridad
    console.error('[whatsapp-bot] META_APP_SECRET no configurado')
    return false
  }

  const signature = req.headers.get('x-hub-signature-256') ?? ''
  if (!signature.startsWith('sha256=')) return false

  const receivedHex = signature.slice('sha256='.length)

  // Importar la clave secreta para HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  // Calcular el HMAC del cuerpo recibido
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  )

  // Convertir a hex
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Comparación en tiempo constante para evitar timing attacks
  return timingSafeEqual(receivedHex, computedHex)
}

// Comparación de strings en tiempo constante (evita ataques de timing)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ─── Servidor ────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const url = new URL(req.url)

  // ─── Verificación del webhook (GET) ────────────────────────────────────────
  // Meta llama aquí con GET al registrar el webhook por primera vez.
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === Deno.env.get('META_VERIFY_TOKEN')) {
      console.log('[whatsapp-bot] Webhook verificado ✅')
      return new Response(challenge, { status: 200 })
    }

    return new Response('Forbidden', { status: 403 })
  }

  // ─── Mensajes entrantes (POST) ─────────────────────────────────────────────
  if (req.method === 'POST') {

    // Leer el cuerpo como texto ANTES de parsearlo como JSON
    // (necesario para calcular el HMAC sobre el payload original)
    const rawBody = await req.text()

    // ── 1. Verificar firma de Meta ──────────────────────────────────────────
    const signatureValid = await verifyMetaSignature(req, rawBody)
    if (!signatureValid) {
      console.warn('[whatsapp-bot] Firma inválida — request rechazado')
      return new Response('Unauthorized', { status: 401 })
    }

    // ── 2. Parsear JSON ─────────────────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return new Response('Bad Request', { status: 400 })
    }

    // ── 3. Extraer mensajes ─────────────────────────────────────────────────
    const entry    = (body?.entry as unknown[])?.[0] as Record<string, unknown> | undefined
    const changes  = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined
    const value    = changes?.value as Record<string, unknown> | undefined
    const messages = value?.messages as unknown[] | undefined

    if (!messages?.length) {
      // Notificación de estado (delivered, read) — ignorar silenciosamente
      return new Response('OK', { status: 200 })
    }

    // ── 4. Procesar mensajes ────────────────────────────────────────────────
    for (const rawMsg of messages) {
      const m         = rawMsg as Record<string, unknown>
      const from      = (m.from as string) ?? ''
      const messageId = (m.id as string) ?? ''
      const timestamp = (m.timestamp as string) ?? ''
      const type      = (m.type as string) ?? ''

      if (!from || !messageId) continue

      // ── 5. Rate limiting por número ─────────────────────────────────────
      const blocked = await isRateLimited(from)
      if (blocked) {
        console.warn(`[whatsapp-bot] Rate limit alcanzado para ${from}`)
        // No respondemos nada al cliente para no confirmar que el límite se alcanzó
        continue
      }

      // Construir mensaje normalizado
      const msg: IncomingMessage = { from, messageId, timestamp }

      if (type === 'text') {
        msg.text = ((m.text as Record<string, unknown>)?.body as string) ?? ''
      } else if (type === 'interactive') {
        const interactive = m.interactive as Record<string, unknown>
        const iType = interactive?.type as string

        if (iType === 'button_reply') {
          const reply       = interactive.button_reply as Record<string, unknown>
          msg.buttonReplyId = reply?.id as string
          msg.text          = reply?.title as string
        } else if (iType === 'list_reply') {
          const reply     = interactive.list_reply as Record<string, unknown>
          msg.listReplyId = reply?.id as string
          msg.text        = reply?.title as string
        }
      }

      // ── 6. Detectar mensaje inicial desde la app ────────────────────────
      if (msg.text?.startsWith(REDIRECT_PREFIX)) {
        // Validar que el ID de reserva sea un UUID válido antes de usarlo
        const candidate = msg.text.replace(REDIRECT_PREFIX, '').trim()
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(candidate)) {
          console.warn('[whatsapp-bot] ID de reserva inválido:', candidate)
          continue
        }
        try {
          await handleInitialRedirect(from, messageId, candidate)
        } catch (err) {
          console.error('[whatsapp-bot] handleInitialRedirect error:', err)
        }
        continue
      }

      // ── 7. Mensaje regular ──────────────────────────────────────────────
      try {
        await handleMessage(msg)
      } catch (err) {
        console.error('[whatsapp-bot] handleMessage error:', err)
      }
    }

    // Meta espera 200 en menos de 20 s; de lo contrario reintenta el envío.
    return new Response('OK', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})
