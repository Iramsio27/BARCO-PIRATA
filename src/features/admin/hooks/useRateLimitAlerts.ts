// ─── useRateLimitAlerts.ts ────────────────────────────────────────────────────
// Hook que se suscribe en tiempo real a la tabla audit_log mediante Supabase
// Realtime y filtra eventos de tipo RATE_LIMIT generados por el chatbot.
//
// Retorna una lista de alertas activas y una función para descartarlas.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@lib/supabase'

export interface RateLimitAlert {
  id: string           // ID del registro en audit_log
  phone: string        // número de WhatsApp bloqueado
  blockedAt: string    // ISO timestamp
  limit: number        // límite configurado
  windowSeconds: number
}

// Máximo de alertas visibles simultáneamente para no saturar la UI
const MAX_VISIBLE = 5

export function useRateLimitAlerts() {
  const [alerts, setAlerts] = useState<RateLimitAlert[]>([])

  // Cargar alertas recientes al montar (últimas 24 h)
  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    supabase
      .from('audit_log')
      .select('id, ip_address, new_values, created_at')
      .eq('action', 'RATE_LIMIT')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_VISIBLE)
      .then(({ data }) => {
        if (!data) return
        setAlerts(data.map(rowToAlert))
      })
  }, [])

  // Suscripción Realtime: escucha nuevos INSERT en audit_log con action=RATE_LIMIT
  useEffect(() => {
    const channel = supabase
      .channel('rate-limit-alerts')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'audit_log',
          filter: 'action=eq.RATE_LIMIT',
        },
        (payload) => {
          const newAlert = rowToAlert(payload.new as AuditRow)
          setAlerts((prev) => {
            // Evitar duplicados por si llega dos veces
            if (prev.some((a) => a.id === newAlert.id)) return prev
            // Mantener máximo MAX_VISIBLE, los más recientes primero
            return [newAlert, ...prev].slice(0, MAX_VISIBLE)
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /** Descarta una alerta de la UI (no la borra de la DB). */
  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  /** Descarta todas las alertas visibles. */
  const dismissAll = useCallback(() => {
    setAlerts([])
  }, [])

  return { alerts, dismiss, dismissAll }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface AuditRow {
  id: string
  ip_address: string | null
  new_values: {
    phone?: string
    limit?: number
    window_s?: number
    blocked_at?: string
  } | null
  created_at: string
}

function rowToAlert(row: AuditRow): RateLimitAlert {
  const vals = row.new_values ?? {}
  return {
    id:            row.id,
    phone:         vals.phone ?? row.ip_address ?? 'desconocido',
    blockedAt:     vals.blocked_at ?? row.created_at,
    limit:         vals.limit ?? 20,
    windowSeconds: vals.window_s ?? 60,
  }
}
