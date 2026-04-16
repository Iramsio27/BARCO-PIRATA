# 🏴‍☠️ Barco Pirata de Puerto Peñasco

Sistema de reservaciones y venta de boletos para paseos en barco, desarrollado
como proyecto integrador de la asignatura **Administración de Base de Datos**.

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Routing** | React Router v6 (lazy routes) |
| **Estado cliente** | Zustand |
| **Estado servidor** | TanStack Query v5 |
| **UI / Estilos** | Tailwind CSS v3 + Radix UI + lucide-react |
| **Formularios** | React Hook Form + Zod |
| **HTTP** | Axios (con interceptores) |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Edge Functions + Realtime) |
| **Pasarela de pago** | Stripe (PaymentElement) |
| **Exportación** | xlsx (Excel) + jsPDF + jspdf-autotable (PDF) |
| **Seguridad** | DOMPurify, Zod, RLS, JWT, CSP |

## 📁 Estructura del Proyecto

```
barco-pirata/
├── public/
├── src/
│   ├── app/                    ← configuración global (providers, router, store)
│   │   ├── providers/          ← QueryProvider, AuthProvider
│   │   ├── router/             ← react-router config
│   │   └── store/              ← Zustand stores
│   ├── assets/                 ← imágenes, íconos
│   ├── components/             ← componentes compartidos
│   │   ├── common/             ← ProtectedRoute, etc.
│   │   ├── layout/             ← PublicLayout, AdminLayout, Header, Footer
│   │   └── ui/                 ← Button, Input, Badge, Card, Spinner
│   ├── features/               ← módulos de negocio (vertical slices)
│   │   ├── auth/               ← autenticación
│   │   ├── reservations/       ← reservaciones
│   │   ├── payments/           ← pagos (efectivo + Stripe)
│   │   ├── reports/            ← reportes + exportación
│   │   └── admin/              ← panel de administración
│   ├── hooks/                  ← hooks compartidos
│   ├── lib/                    ← configuración de librerías externas
│   │   ├── axios/
│   │   ├── stripe/
│   │   └── supabase/
│   ├── pages/                  ← páginas por ruta
│   │   ├── public/             ← Home, Reservar, Confirmación, Pago
│   │   └── admin/              ← Dashboard, Reservaciones, Reportes, Venta
│   ├── services/               ← servicios globales
│   ├── types/                  ← tipos TypeScript globales
│   ├── utils/                  ← utilidades puras
│   │   ├── formatters/         ← fechas, moneda
│   │   ├── security/           ← sanitización
│   │   └── validators/         ← esquemas Zod
│   ├── constants/              ← constantes de negocio
│   ├── styles/                 ← CSS global / Tailwind
│   └── main.tsx                ← entry point
├── supabase/
│   ├── migrations/             ← esquema SQL
│   └── functions/              ← Edge Functions (Deno)
│       └── create-payment-intent/
├── docs/                       ← documentación del proyecto
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### 💡 ¿Por qué esta estructura?

Seguimos el patrón **feature-based (vertical slices)**:

- Cada feature (`reservations`, `payments`, …) es autocontenido, con sus propios
  `components/`, `hooks/`, `services/` y `types/`.
- Los componentes en `components/ui` son **primitivos reutilizables** sin lógica
  de negocio.
- Los alias (`@features/`, `@components/`, …) evitan los `../../../..` y hacen
  que mover archivos no rompa imports.
- La capa `lib/` aísla proveedores externos para que, si cambiamos de Supabase
  a otro backend, solo se toquen esos archivos.

## 🔒 Seguridad

El proyecto implementa múltiples capas:

1. **Row Level Security (RLS)** en Supabase → políticas por tabla y por rol.
2. **JWT automático** en todas las requests autenticadas (interceptor Axios).
3. **Validación doble** con Zod en cliente + CHECK constraints en BD.
4. **Sanitización** de inputs con DOMPurify antes de persistir.
5. **Bitácora automática** (`audit_log`) de INSERT/UPDATE/DELETE con
   usuario, IP y valores previos/nuevos.
6. **Stripe server-side** → la secret key vive solo en Edge Functions; el
   frontend nunca la ve. El PaymentIntent se crea con el monto verificado
   en servidor, no el enviado por el cliente.
7. **Headers de seguridad** → `X-Content-Type-Options`, `Referrer-Policy`,
   `Permissions-Policy` y meta `theme-color`.
8. **Sesiones persistentes y refresh automático** por Supabase Auth.
9. **Rutas protegidas** con `<ProtectedRoute>` que redirige al login.
10. **Code splitting** → menos superficie de ataque por chunk.

## ⚙️ Setup Local

### Prerequisitos

- Node.js 20+
- Cuenta gratuita de [Supabase](https://supabase.com/)
- Cuenta gratuita de [Stripe](https://stripe.com/) (modo test)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# edita .env.local con tus credenciales
```

### 3. Crear el esquema de base de datos

En el SQL Editor de Supabase, ejecuta el contenido de
`supabase/migrations/00001_initial_schema.sql`.

### 4. Desplegar la Edge Function de Stripe

```bash
# Instala Supabase CLI si no la tienes
npm i -g supabase

# Login y link al proyecto
supabase login
supabase link --project-ref <project-id>

# Configura la secret key de Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Deploy
supabase functions deploy create-payment-intent
```

### 5. Crear un usuario administrador

En la sección **Authentication → Users** de Supabase crea un usuario, luego:

```sql
insert into public.user_profiles(id, email, full_name, role)
values ('<uuid-del-usuario>', 'admin@barcopirata.mx', 'Administrador', 'admin');
```

### 6. Levantar la app

```bash
npm run dev
```

Abre http://localhost:3000

## 📜 Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (http://localhost:3000) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build local |
| `npm run type-check` | Valida tipos sin emitir |

## 🧭 Rutas

### Públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing con paquetes |
| `/reservar` | Formulario de reservación |
| `/reservar/confirmacion` | Confirmación de reservación creada |
| `/pago/:reservationId` | Pasarela de pago (efectivo o tarjeta) |

### Admin (protegidas)

| Ruta | Descripción |
|------|-------------|
| `/admin/login` | Login |
| `/admin` | Dashboard con KPIs del día |
| `/admin/reservaciones` | Listado de reservaciones |
| `/admin/venta/:id` | Comprobante / cobro |
| `/admin/reportes` | Reportes con exportación Excel/PDF |

## 📄 Licencia

Proyecto académico – Uso educativo.
