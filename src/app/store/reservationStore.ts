import { create } from 'zustand'
import type { Reservation } from '@app-types/index'

interface ReservationStore {
  /** Reservación recién creada (para flujo de confirmación → pago) */
  pendingReservation: Reservation | null
  setPendingReservation: (r: Reservation | null) => void

  /** Fecha seleccionada en el filtro del dashboard */
  selectedDate: string
  setSelectedDate: (date: string) => void
}

export const useReservationStore = create<ReservationStore>((set) => ({
  pendingReservation: null,
  setPendingReservation: (r) => set({ pendingReservation: r }),

  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
}))
