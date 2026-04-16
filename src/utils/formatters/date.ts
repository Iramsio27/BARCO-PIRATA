import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '–'
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: es })
}

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '–'
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '–'
  return format(d, "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export const formatTime = (time: string): string => {
  // Converts "14:30" → "2:30 PM"
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd')
