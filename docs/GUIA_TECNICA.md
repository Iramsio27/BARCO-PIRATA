# 🛠️ Guía técnica — Barco Pirata

> **Anexo B** del Caso Práctico C3.
> **Dirigido a:** desarrolladores, equipo de DevOps y administradores del sistema.
> **Prerequisitos:** Node.js ≥ 18, Git, cuenta de Supabase y cuenta de Stripe (modo test).

---

## Índice

1. [Arquitectura resumida](#1-arquitectura-resumida)
2. [Requerimientos de software](#2-requerimientos-de-software)
3. [Instalación local (dev)](#3-instalación-local-dev)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Scripts disponibles](#6-scripts-disponibles)
7. [Base de datos y migraciones](#7-base-de-datos-y-migraciones)
8. [Edge Functions](#8-edge-functions)
9. [Despliegue a producción](#9-despliegue-a-producción)
10. [Operación y mantenimiento](#10-operación-y-mantenimiento)
11. [Solución de problemas](#11-solución-de-problemas-troubleshooting)
12. [Convenciones de código](#12-convenciones-de-código)

---

## 1. Arquitectura resumida

```
Frontend (Vite + React 18 + TS)  ──►  Supabase (Postgres + Auth + Edge Fn)
                                          │
                                          └──►  Stripe API
```

- **Frontend:** SPA desplegada en Vercel/Netlify. Consume Supabase vía `@supabase/supabase-js`.
- **Backend:** todo en Supabase — tablas RLS, funciones PL/pgSQL, Edge Functions Deno.
- **Pagos:** Stripe. La Edge Function es la única que conoce la `STRIPE_SECRET_KEY`.

Ver `docs/ARCHITECTURE.md` para diagramas detallados.

---

## 2. Requerimientos de software

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 18.x | Recomendado 20 LTS |
| npm | 10.x | Viene con Node 20 |
| Git | 2.40 | |
| Supabase CLI | 1.x | `npm i -g supabase` (opcional si usas dashboard) |
| Stripe CLI | 1.x | Opcional, útil para probar webhooks |
| Navegador | Chrome/Edge/Firefox | Versiones actuales con ES2020+ |

### Cuentas necesarias

- **Supabase** — https://supabase.com (gratis)
- **Stripe** — https://stripe.com (modo test gratis)
- **Vercel o Netlify** — para despliegue (gratis, opcional)

---

## 3. Instalación local (dev)

### 3.1 Clonar y preparar

```bash
git clone <repo-url> barco-pirata
cd barco-pirata
npm install
```

### 3.2 Variables de entorno

```bash
cp .env.example .env.local
# edita .env.local con tus llaves (ver sección 4)
```

### 3.3 Levantar dev server

```bash
npm run dev
```

Abre → http://localhost:3000

### 3.4 Verificaciones rápidas

```bash
npm run type-check   # ✔ sin errores de TypeScript
npm run build        # ✔ build exitoso
```

---

## 4. Variables de entorno

Archivo: `.env.local` (gitignored).

| Variable | Obligatoria | Valor |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key (pública) de Supabase |
| `VITE_STRIPE_PUBLISHABLE_KEY` | 🟡 | `pk_test_…` — sin ella, el pago con tarjeta se desactiva pero el resto funciona |
| `VITE_API_URL` | ✅ | Base URL de Edge Functions (`<supabase-url>/functions/v1`) |
| `VITE_APP_ENV` | ✅ | `development` \| `production` |

### Secretos server-side (solo en Supabase, no en el repo)

| Secret | Dónde | Para qué |
|--------|-------|----------|
| `STRIPE_SECRET_KEY` | Supabase secrets | Edge Function `create-payment-intent` |
| `STRIPE_WEBHOOK_SECRET` | Supabase secrets | Edge Function `stripe-webhook` (futura) |

Cargar con:

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

---

## 5. Estructura del proyecto

```
barco-pirata/
├── public/                    # Assets estáticos (logo, favicon)
├── src/
│   ├── app/                   # Providers, router, layouts
│   │   ├── providers/         # QueryProvider, AuthProvider, AppProviders
│   │   └── router/            # Rutas con lazy-load
│   ├── components/            # UI reutilizable
│   │   ├── ui/                # Button, Input, Card, Badge, Spinner
│   │   ├── layout/            # Public/AdminLayout + Header + Footer
│   │   └── common/            # ProtectedRoute, ErrorBoundary
│   ├── features/              # Slices verticales (core del dominio)
│   │   ├── reservations/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── payments/
│   │   └── reports/
│   ├── pages/                 # Páginas (importadas por el router)
│   │   ├── public/            # Home, Reservar, Confirmación, Pago
│   │   └── admin/             # Login, Dashboard, Reservaciones, Venta, Reportes
│   ├── lib/                   # Clientes externos
│   │   ├── supabase/
│   │   ├── stripe/
│   │   └── axios/
│   ├── utils/                 # Helpers puros
│   │   ├── pricing.ts         # calculatePrice()
│   │   ├── security/          # sanitize, logging
│   │   └── validators/        # Esquemas Zod
│   ├── types/                 # Tipos globales
│   ├── constants/             # PACKAGES, ROUTES, COMPANY
│   └── styles/                # globals.css
├── supabase/
│   ├── migrations/            # 4 archivos SQL
│   ├── functions/             # Edge Functions
│   └── seed.sql               # Datos demo (dev)
├── docs/
│   ├── CASO_PRACTICO.md       # Documento principal
│   ├── GUIA_USUARIO.md        # Anexo A
│   ├── GUIA_TECNICA.md        # Anexo B (este archivo)
│   ├── SECURITY.md            # Plan de seguridad extendido
│   ├── ARCHITECTURE.md
│   └── STRIPE_SETUP.md
├── .env.example
├── package.json
├── tsconfig.json              # Config base
├── tsconfig.app.json          # Config app (strict + paths)
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 6. Scripts disponibles

| Script | Qué hace |
|--------|---------|
| `npm run dev` | Levanta Vite en `http://localhost:3000` con HMR |
| `npm run build` | Compila TS + build de producción (`dist/`) |
| `npm run preview` | Sirve `dist/` localmente para validación |
| `npm run type-check` | `tsc --noEmit` — verifica tipos sin emitir |
| `npm run lint` | Alias actual de `type-check` |

---

## 7. Base de datos y migraciones

### 7.1 Migraciones

Se aplican en orden alfabético de nombre de archivo.

```
supabase/migrations/
├── 00001_initial_schema.sql           # tablas, enums, índices
├── 00002_triggers_and_functions.sql   # updated_at, auditoría, daily_report
├── 00003_row_level_security.sql       # políticas RLS
└── 00004_security_hardening.sql       # is_staff/is_admin, restricciones finas
```

### 7.2 Aplicar en un proyecto nuevo

```bash
npx supabase link --project-ref <tu-ref>
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql   # opcional: datos demo
```

### 7.3 Crear una migración nueva

```bash
npx supabase migration new <nombre_descriptivo>
# edita el archivo recién creado
npx supabase db push
```

### 7.4 Bitácora (audit_log)

Consultar últimos 100 eventos (requiere rol `admin`):

```sql
select created_at, user_email, action, table_name, record_id
from public.audit_log
order by created_at desc
limit 100;
```

### 7.5 Respaldos

| Automático | Supabase los hace diario (ver Project Settings → Database → Backups) |
| Manual     | `pg_dump "$DATABASE_URL" --format=custom -f backups/barco_$(date +%Y%m%d).dump` |

### 7.6 Restauración

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname="$DATABASE_URL" backups/<archivo>.dump
```

---

## 8. Edge Functions

### 8.1 `create-payment-intent`

**Ruta:** `supabase/functions/create-payment-intent/index.ts`
**Invocación:** desde el frontend vía `supabase.functions.invoke('create-payment-intent', { body: { reservationId } })`
**Lógica:**
1. Valida que existe la reservación.
2. Verifica que no esté `pagada` ni `cancelada`.
3. Crea el `PaymentIntent` en Stripe con `amount = reservation.total * 100` (centavos).
4. Devuelve `{ clientSecret, amount, currency }`.

**Desplegar:**

```bash
npx supabase functions deploy create-payment-intent --no-verify-jwt
```

> Se usa `--no-verify-jwt` porque los clientes anónimos deben poder pagar.

### 8.2 Logs

```bash
npx supabase functions logs create-payment-intent --tail
```

O desde Supabase Dashboard → Functions → logs.

---

## 9. Despliegue a producción

### 9.1 Frontend en Vercel

1. Conecta el repo en Vercel.
2. En **Environment Variables** añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY` (ya con `pk_live_…` cuando pases a prod)
   - `VITE_API_URL`
   - `VITE_APP_ENV=production`
3. Deploy — Vercel detecta Vite automáticamente.

### 9.2 Frontend en Netlify

```bash
npm run build           # genera dist/
# arrastra la carpeta dist/ al dashboard o usa netlify CLI
netlify deploy --prod --dir=dist
```

### 9.3 Backend

Supabase ya está en la nube — no requiere despliegue adicional salvo:

```bash
npx supabase db push                                       # migraciones
npx supabase functions deploy create-payment-intent        # Edge Fn
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx     # prod secret
```

### 9.4 Checklist pre-producción

- [ ] Cuenta Stripe activada (no test)
- [ ] Llaves `pk_live_` y `sk_live_` configuradas
- [ ] Dominio propio con SSL (Vercel/Netlify lo dan automáticamente)
- [ ] Supabase en plan Pro (para PITR de 7 días)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado (si se implementa webhook)
- [ ] Alertas de error configuradas (Sentry/LogRocket, opcional)
- [ ] Respaldos verificados (restaurar en staging)
- [ ] Contraseñas de seed cambiadas o usuarios recreados
- [ ] Políticas RLS revisadas una vez más

---

## 10. Operación y mantenimiento

### 10.1 Monitoreo

- **Supabase Dashboard** → Database → Query Performance, Logs, Auth logs.
- **Stripe Dashboard** → Developers → Events, Logs (útil para depurar cobros).

### 10.2 Rotación de credenciales

Cada 90 días como buena práctica:

1. Rota `STRIPE_SECRET_KEY` desde Stripe Dashboard → Developers → API keys → **Roll**.
2. Actualiza el secret en Supabase.
3. Si `SUPABASE_ANON_KEY` es comprometida, en Supabase Dashboard → Settings → API → **Reset anon key** y actualiza en el frontend.

### 10.3 Auditoría periódica

Mensualmente:

```sql
-- ¿Cuántas ediciones ha hecho cada usuario?
select user_email, action, count(*) from public.audit_log
where created_at >= now() - interval '30 days'
group by user_email, action order by count desc;
```

### 10.4 Actualización de dependencias

```bash
npm outdated
npm audit
npm update        # parches seguros
npm install <paq>@latest  # mayor, requiere testing
```

---

## 11. Solución de problemas (troubleshooting)

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `Configuración de pagos incompleta` | Falta `STRIPE_SECRET_KEY` en Supabase | `npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx` |
| `Missing Supabase credentials` | Falta `.env.local` o variables mal nombradas | Copia `.env.example` → `.env.local` y completa |
| Popup de Stripe no aparece | Bloqueador de anuncios o CSP | Whitelist `js.stripe.com` y `api.stripe.com` |
| Login rechaza credenciales válidas | Usuario no confirmado o RLS bloquea perfil | `update auth.users set email_confirmed_at = now() where email = 'x'` |
| `new row violates row-level security policy` | Falta política o el user no tiene perfil | Revisa que exista fila en `user_profiles` con ese `auth.uid()` |
| Dashboard muestra 0 reservaciones | RLS bloquea lectura | Revisa que el usuario esté en `user_profiles`; `is_staff()` debe devolver `true` |
| Vite se queja de puerto ocupado | Otro proceso en 3000 | `strictPort: true` → mata el proceso o cambia el puerto |
| `No such payment_intent` | Mezclaste llaves test y live | Ambas (pk y sk) deben ser del mismo modo |

### 11.1 Depurar Edge Function

```bash
npx supabase functions logs create-payment-intent --tail
```

Levantar localmente (requiere Docker):

```bash
npx supabase functions serve create-payment-intent --env-file .env.local
```

### 11.2 Probar Stripe con tarjetas de test

| Escenario | Número | CVC | Fecha |
|-----------|--------|-----|-------|
| ✅ Éxito | `4242 4242 4242 4242` | cualquier | futura |
| ❌ Rechazada | `4000 0000 0000 0002` | cualquier | futura |
| 🔐 3D Secure | `4000 0025 0000 3155` | cualquier | futura |

Lista completa: https://stripe.com/docs/testing

---

## 12. Convenciones de código

### 12.1 TypeScript

- `strict: true` en `tsconfig.app.json`. No se permite `any` sin justificación.
- Path aliases: `@app`, `@components`, `@features`, `@lib`, `@pages`, `@utils`, `@app-types`, `@constants`, `@assets`, `@services`, `@hooks`.
- Tipos de dominio en `src/types/index.ts`. Enums reutilizables en `src/constants`.

### 12.2 Naming

| Qué | Convención | Ejemplo |
|-----|-----------|---------|
| Componentes React | PascalCase | `ReservationForm.tsx` |
| Hooks | camelCase con `use` | `useReservation.ts` |
| Servicios | camelCase | `reservationService.ts` |
| Tipos/Interfaces | PascalCase | `Reservation`, `ProcessPaymentDto` |
| Columnas BD | snake_case | `contact_phone`, `created_at` |
| Props frontend | camelCase | `reservationId`, `processedAt` |

### 12.3 Git

- Una rama por feature: `feat/<nombre>`, `fix/<nombre>`, `chore/<nombre>`.
- Commits atómicos con conventional commits: `feat(reservations): añadir validación grupal`.
- PR con checklist de `type-check`, `build`, capturas si aplica UI.

### 12.4 Formularios y validación

- **Toda entrada pública** pasa por:
  1. Zod schema (`src/utils/validators`)
  2. DOMPurify (`src/utils/security/sanitize`)
  3. CHECK constraints en BD

### 12.5 Errores

- Usa `throw new Error('mensaje corto')` en services.
- Atrapa en el hook o page, muestra `toast` al usuario.
- Nunca expongas stack traces en producción.

---

## 📚 Referencias cruzadas

- `docs/CASO_PRACTICO.md` — Documento principal del caso práctico.
- `docs/GUIA_USUARIO.md` — Para el personal operativo.
- `docs/SECURITY.md` — Plan de seguridad extendido.
- `docs/ARCHITECTURE.md` — Diagramas y decisiones de diseño.
- `docs/STRIPE_SETUP.md` — Paso a paso de alta de Stripe.
- `supabase/README.md` — Estado del backend.

---

*Última actualización: abril 2026 — versión 1.0.*
