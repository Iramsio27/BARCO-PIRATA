import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentService } from '../services/paymentService'
import { reservationService } from '@features/reservations/services/reservationService'
import type { ProcessPaymentDto } from '@app-types/index'
import { reservationKeys } from '@features/reservations/hooks/useReservations'

export const paymentKeys = {
  byReservation: (id: string) => ['payments', 'reservation', id] as const,
}

export function usePaymentByReservation(reservationId: string) {
  return useQuery({
    queryKey: paymentKeys.byReservation(reservationId),
    queryFn: () => paymentService.getByReservation(reservationId),
    enabled: !!reservationId,
  })
}

export function useProcessPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: ProcessPaymentDto) => {
      const payment = await paymentService.recordPayment(dto)
      const nextStatus = dto.method === 'efectivo' && !dto.adminConfirm
        ? 'confirmada'
        : 'pagada'
      await reservationService.updateStatus(dto.reservationId, nextStatus, dto.method, payment.id)
      return payment
    },
    onSuccess: (_payment, dto) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.byReservation(dto.reservationId) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.byId(dto.reservationId) })
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    },
  })
}

export function useCreateStripeIntent() {
  return useMutation({
    mutationFn: (reservationId: string) => paymentService.createStripeIntent(reservationId),
  })
}
