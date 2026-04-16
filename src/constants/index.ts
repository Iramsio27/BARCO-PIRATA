// ─── Paquetes y precios ────────────────────────────────────────────────────
export const PACKAGES = {
  CON_COMIDA: {
    id: 'con_comida',
    label: 'Con Comida Incluida',
    description: 'Paseo + buffet de mariscos a bordo',
    pricePerPerson: 450,
    icon: '🍽️',
  },
  SOLO_BEBIDAS: {
    id: 'solo_bebidas',
    label: 'Solo Bebidas',
    description: 'Paseo + barra de bebidas a bordo',
    pricePerPerson: 350,
    icon: '🍹',
  },
  SOLO_PASEO: {
    id: 'solo_paseo',
    label: 'Solo Paseo',
    description: 'Recorrido panorámico por el litoral',
    pricePerPerson: 250,
    icon: '⛵',
  },
} as const

export type PackageId = keyof typeof PACKAGES

// ─── Reglas de negocio ────────────────────────────────────────────────────
export const DISCOUNT_MIN_PEOPLE = 5
export const DISCOUNT_RATE = 0.10  // 10%

// ─── Tipos de pago ────────────────────────────────────────────────────────
export const PAYMENT_METHODS = {
  EFECTIVO: 'efectivo',
  TARJETA: 'tarjeta',
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

// ─── Estados de reservación ───────────────────────────────────────────────
export const RESERVATION_STATUS = {
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  PAGADA: 'pagada',
  CANCELADA: 'cancelada',
} as const

export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS]

// ─── Rutas de la app ──────────────────────────────────────────────────────
export const ROUTES = {
  HOME: '/',
  RESERVAR: '/reservar',
  CONFIRMACION: '/reservar/confirmacion',
  PAGO: '/pago/:reservationId',
  LOGIN: '/admin/login',
  ADMIN: {
    DASHBOARD: '/admin',
    RESERVACIONES: '/admin/reservaciones',
    REPORTES: '/admin/reportes',
    VENTA: '/admin/venta/:reservationId',
  },
} as const

// ─── Empresa ──────────────────────────────────────────────────────────────
export const COMPANY = {
  name: 'Barco Pirata de Puerto Peñasco',
  shortName: 'Barco Pirata',
  location: 'Recinto Portuario, Puerto Peñasco, Sonora',
  phone: '+52 638 000 0000',
  email: 'contacto@barcopirata.mx',
  schedule: 'Martes a Domingo, 9:00 AM – 5:00 PM',
} as const

// ─── Paginación ───────────────────────────────────────────────────────────
export const PAGE_SIZE = 20
