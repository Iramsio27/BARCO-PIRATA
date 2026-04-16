import { z } from 'zod'
import { format, addDays } from 'date-fns'

const todayStr = () => format(new Date(), 'yyyy-MM-dd')
const maxDateStr = () => format(addDays(new Date(), 90), 'yyyy-MM-dd')

export const reservationSchema = z.object({
  contactName: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'El nombre solo puede contener letras'),

  contactPhone: z
    .string()
    .regex(/^(\+52)?[\s-]?(\d{3})[\s-]?(\d{3})[\s-]?(\d{4})$/, 'Ingresa un número de celular válido (10 dígitos)'),

  date: z
    .string()
    .refine((d) => d >= todayStr(), { message: 'La fecha no puede ser anterior a hoy' })
    .refine((d) => d <= maxDateStr(), { message: 'No se pueden hacer reservaciones con más de 90 días de anticipación' }),

  time: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido'),

  numberOfPeople: z
    .number({ invalid_type_error: 'Ingresa un número de personas' })
    .int()
    .min(1, 'Debe haber al menos 1 persona')
    .max(50, 'Máximo 50 personas por reservación'),

  packageId: z.enum(['CON_COMIDA', 'SOLO_BEBIDAS', 'SOLO_PASEO'], {
    required_error: 'Selecciona un paquete',
  }),

  serviceType: z.enum(['individual', 'grupal']),

  notes: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional(),
})

export type ReservationFormValues = z.infer<typeof reservationSchema>
