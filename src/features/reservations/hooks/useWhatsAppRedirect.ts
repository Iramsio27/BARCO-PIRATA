// ─── useWhatsAppRedirect.ts ───────────────────────────────────────────────────
// Hook que construye el link de WhatsApp con el mensaje prefabricado y redirige
// al cliente al finalizar el proceso de reservación.
//
// El mensaje usa el prefijo "RESERVA:<id>" que la Edge Function whatsapp-bot
// detecta para identificar la reservación automáticamente sin que el cliente
// tenga que escribir nada.

import { useCallback } from 'react'
import type { Reservation } from '@app-types/index'

// Número de WhatsApp del negocio (sin + ni espacios)
const WHATSAPP_BUSINESS_NUMBER = '526381123686'

interface UseWhatsAppRedirectReturn {
  redirectToWhatsApp: (reservation: Reservation) => void
  buildWhatsAppUrl: (reservation: Reservation) => string
}

export function useWhatsAppRedirect(): UseWhatsAppRedirectReturn {
  const buildWhatsAppUrl = useCallback((reservation: Reservation): string => {
    // El bot detecta este prefijo y confirma la reservación automáticamente
    const message = `RESERVA:${reservation.id}`
    const encoded = encodeURIComponent(message)
    return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encoded}`
  }, [])

  const redirectToWhatsApp = useCallback((reservation: Reservation): void => {
    const url = buildWhatsAppUrl(reservation)
    // Abre en nueva pestaña para no perder la sesión de la app
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [buildWhatsAppUrl])

  return { redirectToWhatsApp, buildWhatsAppUrl }
}
