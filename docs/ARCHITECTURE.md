# 🏗️ Arquitectura – Barco Pirata

## Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React 18 + TS + Vite + Tailwind                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │  │
│  │  │  Pages   │→ │ Features │→ │ Services │→ │    Lib    │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────┬─────┘ │  │
│  └──────────────────────────────────────────────────┼───────┘  │
└─────────────────────────────────────────────────────┼──────────┘
                                                      │
                    ┌─────────────────────────────────┼────────────┐
                    ▼                                 ▼            ▼
         ┌────────────────────┐         ┌─────────────────────┐  ┌─────────┐
         │    Supabase        │         │   Edge Functions    │  │ Stripe  │
         │  ┌──────────────┐  │         │    (Deno runtime)   │→ │   API   │
         │  │ PostgreSQL   │  │         │                     │  │         │
         │  │  + RLS       │  │◄────────│  create-payment-    │  └─────────┘
         │  │  + Triggers  │  │         │    intent           │
         │  └──────────────┘  │         │                     │
         │  ┌──────────────┐  │         │ STRIPE_SECRET_KEY   │
         │  │    Auth      │  │         │ (solo server-side)  │
         │  │   (JWT)      │  │         └─────────────────────┘
         │  └──────────────┘  │
         │  ┌──────────────┐  │
         │  │  Storage     │  │
         │  │ (recibos)    │  │
         │  └──────────────┘  │
         └────────────────────┘
```

## Flujo completo: Reservación → Pago → Comprobante

```
┌─────────┐                                    ┌──────────┐
│ Cliente │                                    │   Admin  │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │ 1. Llena formulario (/reservar)              │
     │ ─────────────────────────────► Supabase      │
     │                                (INSERT rsv)  │
     │                                              │
     │ 2. Confirmación con ID                       │
     │ ◄─────────────────────────────               │
     │                                              │
     │ 3. Va a /pago/:id                            │
     │                                              │
     ├─── Si EFECTIVO: ─────────────────────────────┤
     │                                              │
     │                    4a. Presenta comprobante  │
     │                        en /admin/venta/:id ──┘
     │                                              │
     │                    5a. Admin confirma cobro
     │                        Supabase: status = 'pagada'
     │                                              │
     └─── Si TARJETA: ──────────────────────────────┘
                                                    │
     4b. POST /functions/create-payment-intent      │
        (Edge Function crea PaymentIntent)          │
                                                    │
     5b. Stripe PaymentElement cobra tarjeta        │
                                                    │
     6b. Frontend registra payment + actualiza rsv  │
         Supabase: status = 'pagada'                │
                                                    │
     7. Descarga comprobante PDF                    │
```

## Capas de la aplicación

### 1. Presentation (`pages/`, `components/`)
Componentes que renderizan UI. Sin lógica de negocio.

### 2. Features (`features/*/`)
Vertical slices que agrupan toda la lógica de un dominio:
- `components/` → componentes específicos del feature
- `hooks/` → lógica de React (TanStack Query, estado local)
- `services/` → llamadas a la API
- `types/` → tipos TS del feature

### 3. Infrastructure (`lib/`)
Clientes configurados para servicios externos:
- `supabase/` → cliente PostgREST + Auth
- `stripe/` → loader de Stripe.js
- `axios/` → HTTP con interceptores

### 4. Domain (`types/`, `constants/`, `utils/`)
Reglas de negocio puras. Sin dependencias externas:
- Cálculo de precios + descuentos (`utils/pricing.ts`)
- Constantes de paquetes y reglas (`constants/`)
- Validación con Zod (`utils/validators/`)

## Escalabilidad futura

| Necesidad | Plan |
|-----------|------|
| Múltiples sucursales | Agregar tabla `branches` + columna `branch_id` en reservations |
| App móvil | Reusar `features/*/services/` con React Native (expo) |
| Notificaciones WhatsApp | Edge Function con Twilio al confirmar reservación |
| Dashboard de ocupación en vivo | Supabase Realtime en `reservations` |
| Loyalty / cupones | Tabla `coupons` + `coupon_redemptions`, hook en pricing |
| Multi-idioma | `react-i18next` (la estructura ya lo permite) |
