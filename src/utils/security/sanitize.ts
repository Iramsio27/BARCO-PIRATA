import DOMPurify from 'dompurify'

/**
 * Sanitiza una cadena eliminando cualquier HTML o scripts maliciosos.
 * Usar antes de mostrar contenido generado por el usuario.
 */
export const sanitizeString = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Sanitiza un objeto con múltiples campos string de forma recursiva.
 */
export const sanitizeObject = <T extends object>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeString(value) : value,
    ])
  ) as T
}

/**
 * Limpia un número de teléfono dejando solo dígitos y el signo +.
 */
export const sanitizePhone = (phone: string): string =>
  phone.replace(/[^\d+]/g, '').slice(0, 15)
