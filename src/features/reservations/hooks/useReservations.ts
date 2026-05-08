import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reservationService } from '../services/reservationService'
import type { CreateReservationDto } from '@app-types/index'
import type { PaymentMethod } from '@constants/index'

export const reservationKeys = {
  all: ['reservations'] as const,
  byDate: (date: string) => [...reservationKeys.all, 'date', date] as const,
  byId: (id: string) => [...reservationKeys.all, id] as const,
}

export function useReservationsByDate(date: string) {
  return useQuery({
    queryKey: reservationKeys.byDate(date),
    queryFn: () => reservationService.listByDate(date),
    enabled: !!date,
  })
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: reservationKeys.byId(id),
    queryFn: () => reservationService.getById(id),
    enabled: !!id,
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateReservationDto) => reservationService.create(dto),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.byDate(reservation.date) })
    },
  })
}

export function useUpdateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...dto }: Parameters<typeof reservationService.update>[1] & { id: string }) =>
      reservationService.update(id, dto),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.byDate(reservation.date) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.byId(reservation.id) })
    },
  })
}

export function useAdminCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateReservationDto & { initialStatus?: string; paymentMethod?: PaymentMethod }) =>
      reservationService.adminCreate(dto as Parameters<typeof reservationService.adminCreate>[0]),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.byDate(reservation.date) })
    },
  })
}

export function useCancelReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reservationService.cancel(id),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.byDate(reservation.date) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.byId(reservation.id) })
      queryClient.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}
