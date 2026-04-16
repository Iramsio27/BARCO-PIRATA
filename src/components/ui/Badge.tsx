import { clsx } from 'clsx'
import type { ReservationStatus } from '@app-types/index'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  className?: string
}

const variantClasses = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger:  'bg-red-100 text-red-800',
  info:    'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={clsx('badge', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

// Mapa rápido de estados de reservación → variante de badge
const statusVariantMap: Record<ReservationStatus, BadgeProps['variant']> = {
  pendiente:  'warning',
  confirmada: 'info',
  pagada:     'success',
  cancelada:  'danger',
}

const statusLabels: Record<ReservationStatus, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  pagada:     'Pagada',
  cancelada:  'Cancelada',
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge variant={statusVariantMap[status]}>
      {statusLabels[status]}
    </Badge>
  )
}
