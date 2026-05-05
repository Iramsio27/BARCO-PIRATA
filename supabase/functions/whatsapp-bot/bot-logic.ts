// ─── bot-logic.ts ─────────────────────────────────────────────────────────────
// Lógica principal del chatbot: detección de idioma, manejo de intenciones,
// construcción de respuestas bilingüe (ES / EN).
// Solo reservaciones — NO procesa pagos.

import { sendTextMessage, sendButtonMessage, sendListMessage, markAsRead } from './meta-api.ts'
import {
  getReservationByPhone,
  confirmReservation,
  requestCancellation,
  getBusinessSettings,
  getSession,
  updateSession,
  type Reservation,
} from './db.ts'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface IncomingMessage {
  from: string          // número del cliente (ej: 526381234567)
  messageId: string
  text?: string         // texto libre
  buttonReplyId?: string // id del botón pulsado
  listReplyId?: string   // id del ítem de lista seleccionado
  timestamp: string
}

// ─── Nombres de paquetes ──────────────────────────────────────────────────────
const PKG_NAMES: Record<string, { es: string; en: string }> = {
  con_comida:   { es: '🍽️ Con Comida Incluida',    en: '🍽️ With Food Included' },
  solo_bebidas: { es: '🍹 Solo Bebidas',            en: '🍹 Drinks Only' },
  solo_paseo:   { es: '⛵ Solo Paseo',              en: '⛵ Tour Only' },
}

// ─── Detección de idioma ──────────────────────────────────────────────────────
function detectLang(text: string): 'es' | 'en' {
  const lower = text.toLowerCase()
  // Indicadores de inglés
  const enWords = ['hello', 'hi', 'book', 'reservation', 'cancel', 'help', 'info', 'status', 'what', 'how', 'when', 'where', 'price', 'cost', 'ticket']
  const enScore = enWords.filter((w) => lower.includes(w)).length
  return enScore >= 2 ? 'en' : 'es'
}

// ─── Formateo de fecha / hora ─────────────────────────────────────────────────
function formatDate(dateStr: string, lang: 'es' | 'en'): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  // timeStr: "09:00:00" → "9:00 AM"
  const [h, min] = timeStr.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${min.toString().padStart(2, '0')} ${suffix}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

// ─── Textos bilingüe ──────────────────────────────────────────────────────────
const T = {
  welcome: {
    es: (name: string) => `¡Hola, *${name}*! 👋 Soy el asistente del *🏴‍☠️ Barco Pirata Puerto Peñasco*.\n\n¿En qué puedo ayudarte hoy?`,
    en: (name: string) => `Hello, *${name}*! 👋 I'm the assistant for *🏴‍☠️ Barco Pirata Puerto Peñasco*.\n\nHow can I help you today?`,
  },
  welcomeNoReservation: {
    es: `¡Hola! 👋 Soy el asistente del *🏴‍☠️ Barco Pirata Puerto Peñasco*.\n\nNo encontré una reservación asociada a tu número. Puedes hacer una reservación en nuestra página web.\n\n¿Puedo ayudarte con algo más?`,
    en: `Hello! 👋 I'm the assistant for *🏴‍☠️ Barco Pirata Puerto Peñasco*.\n\nI couldn't find a reservation linked to your number. You can make a reservation on our website.\n\nIs there anything else I can help you with?`,
  },
  reservationSummary: {
    es: (r: Reservation) =>
      `✅ *Tu reservación está registrada:*\n\n` +
      `📋 *ID:* \`${r.id.slice(0, 8).toUpperCase()}\`\n` +
      `👤 *Nombre:* ${r.contact_name}\n` +
      `📅 *Fecha:* ${formatDate(r.date, 'es')}\n` +
      `⏰ *Hora:* ${formatTime(r.time)}\n` +
      `👥 *Personas:* ${r.number_of_people}\n` +
      `🎟️ *Paquete:* ${PKG_NAMES[r.package_id]?.es ?? r.package_id}\n` +
      `💰 *Total:* ${formatCurrency(r.total)}\n\n` +
      `Estado actual: *${statusLabel(r.status, 'es')}*`,
    en: (r: Reservation) =>
      `✅ *Your reservation is registered:*\n\n` +
      `📋 *ID:* \`${r.id.slice(0, 8).toUpperCase()}\`\n` +
      `👤 *Name:* ${r.contact_name}\n` +
      `📅 *Date:* ${formatDate(r.date, 'en')}\n` +
      `⏰ *Time:* ${formatTime(r.time)}\n` +
      `👥 *People:* ${r.number_of_people}\n` +
      `🎟️ *Package:* ${PKG_NAMES[r.package_id]?.en ?? r.package_id}\n` +
      `💰 *Total:* ${formatCurrency(r.total)}\n\n` +
      `Current status: *${statusLabel(r.status, 'en')}*`,
  },
  menuButtons: {
    es: [
      { id: 'btn_status',   title: '📋 Mi reservación' },
      { id: 'btn_faq',      title: '❓ Preguntas frecuentes' },
      { id: 'btn_cancel',   title: '❌ Cancelar reservación' },
    ],
    en: [
      { id: 'btn_status',   title: '📋 My reservation' },
      { id: 'btn_faq',      title: '❓ FAQ' },
      { id: 'btn_cancel',   title: '❌ Cancel reservation' },
    ],
  },
  menuPrompt: {
    es: '¿Qué deseas hacer?',
    en: 'What would you like to do?',
  },
  faqList: {
    es: {
      header: '❓ Preguntas Frecuentes',
      prompt: 'Elige un tema:',
      button: 'Ver preguntas',
      sections: [
        {
          title: 'Información general',
          rows: [
            { id: 'faq_schedule',  title: '🕒 Horarios',          description: '¿A qué hora salen los tours?' },
            { id: 'faq_location',  title: '📍 Ubicación',          description: '¿Dónde abordo el barco?' },
            { id: 'faq_capacity',  title: '👥 Capacidad',          description: '¿Cuántas personas caben?' },
            { id: 'faq_packages',  title: '🎟️ Paquetes y precios', description: '¿Qué incluye cada paquete?' },
          ],
        },
        {
          title: 'Políticas',
          rows: [
            { id: 'faq_kids',     title: '👶 Niños',        description: '¿Pueden ir menores de edad?' },
            { id: 'faq_weather',  title: '🌧️ Clima',        description: '¿Qué pasa si hay mal tiempo?' },
            { id: 'faq_discount', title: '💸 Descuentos',   description: '¿Hay descuento por grupo?' },
          ],
        },
      ],
    },
    en: {
      header: '❓ Frequently Asked Questions',
      prompt: 'Choose a topic:',
      button: 'See questions',
      sections: [
        {
          title: 'General info',
          rows: [
            { id: 'faq_schedule',  title: '🕒 Schedule',        description: 'What time do the tours depart?' },
            { id: 'faq_location',  title: '📍 Location',         description: 'Where do I board the ship?' },
            { id: 'faq_capacity',  title: '👥 Capacity',         description: 'How many people fit on the boat?' },
            { id: 'faq_packages',  title: '🎟️ Packages & prices', description: 'What does each package include?' },
          ],
        },
        {
          title: 'Policies',
          rows: [
            { id: 'faq_kids',     title: '👶 Children',    description: 'Can children attend?' },
            { id: 'faq_weather',  title: '🌧️ Weather',     description: 'What if there is bad weather?' },
            { id: 'faq_discount', title: '💸 Discounts',   description: 'Are there group discounts?' },
          ],
        },
      ],
    },
  },
  faqAnswers: {
    faq_schedule: {
      es: '🕒 *Horarios de salida:*\n• 9:00 AM 🌅\n• 11:00 AM ☀️\n• 1:00 PM 🌞\n• 3:00 PM 🌤️\n• 5:00 PM 🌇\n\nOperamos *Martes a Domingo*. Los lunes no hay salidas.',
      en: '🕒 *Departure times:*\n• 9:00 AM 🌅\n• 11:00 AM ☀️\n• 1:00 PM 🌞\n• 3:00 PM 🌤️\n• 5:00 PM 🌇\n\nWe operate *Tuesday to Sunday*. No tours on Mondays.',
    },
    faq_location: {
      es: '📍 *Ubicación:* Recinto Portuario, Puerto Peñasco, Sonora.\n\nNos encontramos en el muelle principal. Llega 15 minutos antes de tu salida.',
      en: '📍 *Location:* Recinto Portuario, Puerto Peñasco, Sonora.\n\nWe are at the main dock. Please arrive 15 minutes before your departure.',
    },
    faq_capacity: {
      es: '👥 *Capacidad máxima:* 40 personas por salida.\n\nPor seguridad no podemos exceder ese número.',
      en: '👥 *Maximum capacity:* 40 people per tour.\n\nFor safety reasons we cannot exceed that number.',
    },
    faq_packages: {
      es: '🎟️ *Paquetes disponibles:*\n\n🍽️ *Con Comida* — $450/persona\nPaseo + buffet de mariscos a bordo\n\n🍹 *Solo Bebidas* — $350/persona\nPaseo + barra de bebidas\n\n⛵ *Solo Paseo* — $250/persona\nRecorrido panorámico por el litoral\n\n💸 Grupos de 5+ personas: 10% de descuento automático.',
      en: '🎟️ *Available packages:*\n\n🍽️ *With Food* — $450/person\nTour + seafood buffet on board\n\n🍹 *Drinks Only* — $350/person\nTour + open bar\n\n⛵ *Tour Only* — $250/person\nScenic coastal tour\n\n💸 Groups of 5+ people: automatic 10% discount.',
    },
    faq_kids: {
      es: '👶 *Niños:* Sí pueden venir menores de edad acompañados de un adulto responsable.\n\nEl precio es el mismo por persona sin importar la edad.',
      en: '👶 *Children:* Yes, minors are welcome accompanied by a responsible adult.\n\nThe price is the same per person regardless of age.',
    },
    faq_weather: {
      es: '🌧️ *Mal tiempo:* Si las condiciones climáticas no son seguras para navegar, cancelamos el tour y te avisamos con anticipación para reagendar tu reservación sin costo.',
      en: '🌧️ *Bad weather:* If weather conditions are unsafe for sailing, we cancel the tour and notify you in advance so you can reschedule at no extra cost.',
    },
    faq_discount: {
      es: '💸 *Descuento grupal:* Grupos de 5 o más personas reciben un *10% de descuento* automático en el total.\n\nEl descuento se aplica al hacer tu reservación en línea.',
      en: '💸 *Group discount:* Groups of 5 or more people automatically receive a *10% discount* on the total.\n\nThe discount is applied when booking online.',
    },
  } as Record<string, { es: string; en: string }>,
  cancelConfirm: {
    es: (r: Reservation) =>
      `¿Estás seguro de que deseas cancelar tu reservación del *${formatDate(r.date, 'es')}* a las *${formatTime(r.time)}*?\n\nEsta acción la revisará nuestro equipo.`,
    en: (r: Reservation) =>
      `Are you sure you want to cancel your reservation on *${formatDate(r.date, 'en')}* at *${formatTime(r.time)}*?\n\nOur team will review this request.`,
  },
  cancelButtons: {
    es: [
      { id: 'btn_cancel_yes', title: '✅ Sí, cancelar' },
      { id: 'btn_cancel_no',  title: '❌ No, mantener' },
    ],
    en: [
      { id: 'btn_cancel_yes', title: '✅ Yes, cancel' },
      { id: 'btn_cancel_no',  title: '❌ No, keep it' },
    ],
  },
  cancelDone: {
    es: '✅ Tu solicitud de cancelación ha sido registrada. Nuestro equipo la revisará pronto y te confirmará por este medio.',
    en: '✅ Your cancellation request has been registered. Our team will review it soon and confirm here.',
  },
  cancelAborted: {
    es: '👍 Tu reservación sigue activa. ¡Te esperamos a bordo!',
    en: '👍 Your reservation is still active. We look forward to seeing you on board!',
  },
  noReservationForAction: {
    es: 'No encontré una reservación activa asociada a tu número de WhatsApp. Si crees que es un error, contáctanos directamente.',
    en: "I couldn't find an active reservation linked to your WhatsApp number. If you think this is an error, please contact us directly.",
  },
  fallback: {
    es: 'No entendí tu mensaje 😅. Puedo ayudarte con:\n• Tu reservación\n• Preguntas frecuentes\n• Cancelar una reservación\n\nEscribe *menú* para ver las opciones.',
    en: "I didn't understand your message 😅. I can help you with:\n• Your reservation\n• Frequently asked questions\n• Canceling a reservation\n\nType *menu* to see the options.",
  },
  confirmed: {
    es: '✅ ¡Tu reservación ha sido confirmada! Te esperamos a bordo. ⚓',
    en: '✅ Your reservation has been confirmed! We look forward to seeing you on board. ⚓',
  },
}

function statusLabel(status: string, lang: 'es' | 'en'): string {
  const labels: Record<string, { es: string; en: string }> = {
    pendiente:  { es: '⏳ Pendiente',  en: '⏳ Pending'   },
    confirmada: { es: '✅ Confirmada', en: '✅ Confirmed'  },
    pagada:     { es: '💰 Pagada',    en: '💰 Paid'       },
    cancelada:  { es: '❌ Cancelada', en: '❌ Cancelled'  },
  }
  return labels[status]?.[lang] ?? status
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function handleMessage(msg: IncomingMessage): Promise<void> {
  const { from, messageId, text, buttonReplyId, listReplyId } = msg

  await markAsRead(messageId)

  // Sesión persistida en Supabase (sobrevive reinicios, sin crecimiento ilimitado)
  const session = await getSession(from)
  const rawText = (text ?? '').trim()
  const lower   = rawText.toLowerCase()

  // Detectar idioma y persistir si cambió
  const detectedLang = rawText ? detectLang(rawText) : session.lang
  if (detectedLang !== session.lang) {
    await updateSession(from, { lang: detectedLang })
  }
  const lang = detectedLang

  // ─── Botones de confirmación de cancelación ────────────────────────────────
  if (buttonReplyId === 'btn_cancel_yes' && session.awaiting_cancel_confirm) {
    await updateSession(from, { awaiting_cancel_confirm: false })
    const reservation = await getReservationByPhone(from)
    if (!reservation) {
      await sendTextMessage(from, T.noReservationForAction[lang])
      return
    }
    await requestCancellation(reservation.id, 'Solicitada por el cliente vía WhatsApp')
    await sendTextMessage(from, T.cancelDone[lang])
    return
  }

  if (buttonReplyId === 'btn_cancel_no' && session.awaiting_cancel_confirm) {
    await updateSession(from, { awaiting_cancel_confirm: false })
    await sendTextMessage(from, T.cancelAborted[lang])
    return
  }

  // ─── Botón: ver estado de reservación ─────────────────────────────────────
  if (buttonReplyId === 'btn_status') {
    const reservation = await getReservationByPhone(from)
    if (!reservation) {
      await sendTextMessage(from, T.noReservationForAction[lang])
      return
    }
    await sendTextMessage(from, T.reservationSummary[lang](reservation))
    return
  }

  // ─── Botón: ver FAQ ────────────────────────────────────────────────────────
  if (buttonReplyId === 'btn_faq') {
    const faq = T.faqList[lang]
    await sendListMessage(from, faq.header, faq.prompt, faq.button, faq.sections)
    return
  }

  // ─── Botón: iniciar cancelación ────────────────────────────────────────────
  if (buttonReplyId === 'btn_cancel') {
    const reservation = await getReservationByPhone(from)
    if (!reservation) {
      await sendTextMessage(from, T.noReservationForAction[lang])
      return
    }
    await updateSession(from, { awaiting_cancel_confirm: true })
    await sendButtonMessage(from, T.cancelConfirm[lang](reservation), T.cancelButtons[lang])
    return
  }

  // ─── Respuestas del menú FAQ ───────────────────────────────────────────────
  if (listReplyId && T.faqAnswers[listReplyId]) {
    const answer = T.faqAnswers[listReplyId][lang]
    await sendTextMessage(from, answer)
    await sendButtonMessage(from, T.menuPrompt[lang], T.menuButtons[lang])
    return
  }

  // ─── Palabras clave: menú ──────────────────────────────────────────────────
  const menuKeywords = ['menú', 'menu', 'hola', 'hello', 'hi', 'inicio', 'start', 'help', 'ayuda']
  if (menuKeywords.some((k) => lower.includes(k)) || !rawText) {
    const reservation = await getReservationByPhone(from)

    if (!reservation) {
      await sendTextMessage(from, T.welcomeNoReservation[lang])
      return
    }

    if (reservation.status === 'pendiente') {
      await confirmReservation(reservation.id)
      reservation.status = 'confirmada'
      const summary = T.reservationSummary[lang](reservation)
      await sendTextMessage(from, `${T.welcome[lang](reservation.contact_name)}\n\n${summary}\n\n${T.confirmed[lang]}`)
    } else {
      await sendTextMessage(from, T.welcome[lang](reservation.contact_name))
    }

    await sendButtonMessage(from, T.menuPrompt[lang], T.menuButtons[lang])
    return
  }

  // ─── Palabras clave: estado ────────────────────────────────────────────────
  const statusKeywords = ['reservación', 'reservacion', 'reservation', 'estado', 'status', 'booking', 'mi reserva']
  if (statusKeywords.some((k) => lower.includes(k))) {
    const reservation = await getReservationByPhone(from)
    if (!reservation) {
      await sendTextMessage(from, T.noReservationForAction[lang])
      return
    }
    await sendTextMessage(from, T.reservationSummary[lang](reservation))
    await sendButtonMessage(from, T.menuPrompt[lang], T.menuButtons[lang])
    return
  }

  // ─── Palabras clave: cancelar ──────────────────────────────────────────────
  const cancelKeywords = ['cancelar', 'cancel', 'cancela', 'baja', 'eliminar']
  if (cancelKeywords.some((k) => lower.includes(k))) {
    const reservation = await getReservationByPhone(from)
    if (!reservation) {
      await sendTextMessage(from, T.noReservationForAction[lang])
      return
    }
    await updateSession(from, { awaiting_cancel_confirm: true })
    await sendButtonMessage(from, T.cancelConfirm[lang](reservation), T.cancelButtons[lang])
    return
  }

  // ─── Palabras clave: FAQ ───────────────────────────────────────────────────
  const faqKeywords = ['precio', 'price', 'horario', 'schedule', 'dónde', 'where', 'ubicacion', 'niños', 'children', 'clima', 'weather', 'descuento', 'discount', 'paquete', 'package']
  if (faqKeywords.some((k) => lower.includes(k))) {
    const faq = T.faqList[lang]
    await sendListMessage(from, faq.header, faq.prompt, faq.button, faq.sections)
    return
  }

  // ─── Fallback ──────────────────────────────────────────────────────────────
  await sendTextMessage(from, T.fallback[lang])
}

// ─── Handler para mensajes entrantes de la app (redirección post-reserva) ─────
export async function handleInitialRedirect(
  from: string,
  messageId: string,
  reservationId: string,
): Promise<void> {
  await markAsRead(messageId)

  const session     = await getSession(from)
  const reservation = await getReservationByPhone(from)

  if (!reservation || reservation.id !== reservationId) {
    await sendTextMessage(from, T.welcomeNoReservation[session.lang])
    return
  }

  if (reservation.status === 'pendiente') {
    await confirmReservation(reservation.id)
    reservation.status = 'confirmada'
  }

  const lang    = session.lang
  const summary = T.reservationSummary[lang](reservation)
  await sendTextMessage(
    from,
    `${T.welcome[lang](reservation.contact_name)}\n\n${summary}\n\n${T.confirmed[lang]}`,
  )
  await sendButtonMessage(from, T.menuPrompt[lang], T.menuButtons[lang])
}
