import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase/client'

export interface SlotAvailability {
  slot_time: string   // 'HH:MM:SS'
  occupied:  number
  available: number
  is_full:   boolean
}

/**
 * Consulta la disponibilidad de los 5 slots del día elegido.
 * Usa la RPC `get_daily_availability(p_date)` que suma las reservaciones
 * activas (pendiente/confirmada/pagada) por slot y calcula el cupo restante.
 */
export function useAvailability(date: string | null | undefined) {
  return useQuery({
    queryKey: ['availability', date],
    enabled:  !!date,
    staleTime: 30_000,          // refresca cada 30s cuando la pestaña está activa
    refetchOnWindowFocus: true, // al volver a la pestaña, refresca
    queryFn: async (): Promise<SlotAvailability[]> => {
      const { data, error } = await supabase.rpc('get_daily_availability', {
        p_date: date,
      })
      if (error) throw error
      return (data ?? []) as SlotAvailability[]
    },
  })
}

/** Helper: cupo disponible para un slot específico (devuelve 0 si no se encuentra). */
export function availableInSlot(
  availability: SlotAvailability[] | undefined,
  timeHHMM: string,
): number {
  if (!availability) return 0
  // Normalizamos: la RPC regresa 'HH:MM:SS', el front usa 'HH:MM'
  const match = availability.find(s => s.slot_time.startsWith(timeHHMM))
  return match?.available ?? 0
}
