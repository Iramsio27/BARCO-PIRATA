// ─── meta-api.ts ──────────────────────────────────────────────────────────────
// Helper para enviar mensajes a través de la Meta (WhatsApp) Cloud API.
// Doc: https://developers.facebook.com/docs/whatsapp/cloud-api/messages

const META_API_VERSION = 'v19.0'

function getBaseUrl(): string {
  const phoneId = Deno.env.get('META_PHONE_NUMBER_ID')!
  return `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`
}

function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${Deno.env.get('META_ACCESS_TOKEN')!}`,
    'Content-Type': 'application/json',
  }
}

// ─── Enviar mensaje de texto libre ───────────────────────────────────────────
export async function sendTextMessage(to: string, text: string): Promise<boolean> {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'text',
    text: { preview_url: false, body: text },
  }

  const res = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[meta-api] sendTextMessage error:', err)
    return false
  }
  return true
}

// ─── Enviar mensaje con botones de respuesta rápida ───────────────────────────
export async function sendButtonMessage(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<boolean> {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  }

  const res = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[meta-api] sendButtonMessage error:', err)
    return false
  }
  return true
}

// ─── Enviar lista de opciones ─────────────────────────────────────────────────
export async function sendListMessage(
  to: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
): Promise<boolean> {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: { button: buttonLabel, sections },
    },
  }

  const res = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[meta-api] sendListMessage error:', err)
    return false
  }
  return true
}

// ─── Marcar mensaje como leído ────────────────────────────────────────────────
export async function markAsRead(messageId: string): Promise<void> {
  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  }
  await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  }).catch(() => { /* silencioso */ })
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
// WhatsApp Cloud API requiere número internacional sin + (ej: 526381123686)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('52')) return digits
  if (digits.length === 10) return `52${digits}`
  return digits
}
