# 🛠️ Guía técnica — Barco Pirata

> **Anexo B** del Caso Práctico C3.
> **Dirigido a:** desarrolladores, equipo de DevOps y administradores del sistema.
> **Prerequisitos:** Node.js ≥ 18, Git, cuenta de Supabase y (opcional) cuenta de Resend para envío real de correos.

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
                                          ├──►  Resend API   (correo transaccional)
                                          └──►  (Pasarela de pago futura)
```

- **Frontend:** SPA desplegada en Vercel/Netlify. Consume Supabase vía `@supabase/supabase-js`.
- **Backend:** todo en Supabase — tablas con RLS, funciones PL/pgSQL, Edge Functions Deno.
- **Correo:** Resend. La Edge Function `send-receipt` es la única que conoce la `RESEND_API_KEY`.
- **Pago con tarjeta:** simulación client-side. La estructura está lista para conectar Stripe/Mercado Pago/Conekta sustituyendo la Edge Function `create-payment-intent`.

Ver `docs/ARCHITECTURE.md` para diagramas detallados.

---

## 2. Requerimientos de software

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 18.x | Recomendado 20 LTS |
| npm | 10.x | Viene con Node 20 |
| Git | 2.40 | |
| Supabase CLI | 1.x | `npm i -g supabase` (opcional si usas dashboard) |
| Deno | 1.40 | Solo si vas a editar/probar Edge Functions localmente |
| Navegador | Chrome/Edge/Firefox | Versiones actuales con ES2020+ |

### Cuentas necesarias

- **Supabase** — https://supabase.com (gratis)
- **Resend** — https://resend.com (gratis hasta 3 000 correos/mes; opcional, hay modo simulado)
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
npm run build        # ✔ tsc + build de Vite
```

---

## 4. Variables de entorno

Archivo: `.env.local` (gitignored).

| Variable | Obligatoria | Valor |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key (pública) de Supabase |
| `VITE_API_URL` | ✅ | Base URL de Edge Functions (`<supabase-url>/functions/v1`) |
| `VITE_APP_ENV` | ✅ | `development` \| `production` |

> **Nota:** ya **no** se requiere `VITE_STRIPE_PUBLISHABLE_KEY` porque el formulario de tarjeta es simulado en esta versión. Si conectas un proveedor real, agrega la variable correspondiente.

### Secretos server-side (solo en Supabase, no en el repo)

| Secret | Dónde | Para qué |
|--------|-------|----------|
| `RESEND_API_KEY` | Supabase secrets | Edge Function `send-receipt` (envío real de correo) |
| `RECEIPT_FROM` | Supabase secrets | Remitente del correo. Ej: `Barco Pirata <noreply@tudominio.com>` o `Barco Pirata <onboarding@resend.dev>` para pruebas |
| *(futuro)* `STRIPE_SECRET_KEY` | Supabase secrets | Pasarela de pago real, cuando se conecte |

Cargar con CLI:

```bash
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set "RECEIPT_FROM=Barco Pirata <onboarding@resend.dev>"
```

O desde el dashboard: `Project Settings → Edge Functions → Secrets`.

> **Sin `RESEND_API_KEY`:** la Edge Function `send-receipt` responde `{ simulated: true }` y el flujo continúa sin error. Útil para demos.

---

## 5. Estructura del proyecto

```
barco-pirata/
├── public/                    # Assets estáticos (logo, favicon)
├── src/
│   ├── app/                   # Providers, router, layouts
│   │   ├── providers/         # QueryProvider, AuthProvider, AdminThemeProvider
│   │   └── router/            # Rutas con lazy-load
│   ├── components/            # UI reutilizable
│   │   ├── ui/                # Button, Input, Card, Badge, Spinner
│   │   ├── layout/            # PublicLayout / AdminLayout + Header + Footer
│   │   └── common/            # ProtectedRoute, ErrorBoundary
│   ├── features/              # Slices verticales (core del dominio)
│   │   ├── reservations/      # services + hooks
│   │   ├── payments/          # services (paymentService, receiptService)
│   │   └── reports/           # services (export Excel/PDF)
│   ├── pages/                 # Páginas (importadas por el router)
│   │   ├── public/            # Home, Reservar, Confirmación, Pago, Recibo
│   │   └── admin/             # Login, Dashboard, Reservaciones, Venta, Reportes, Ajustes
│   ├── lib/
│   │   ├── supabase/
│   │   └── i18n/              # ES/EN locales
│   ├── utils/                 # Helpers puros
│   │   ├── pricing.ts         # calculatePrice()
│   │   ├── security/          # sanitize, logging
│   │   └── validators/        # Esquemas Zod
│   ├── types/                 # Tipos globales
│   ├── constants/             # PACKAGES, ROUTES, COMPANY
│   └── styles/                # globals.css (vars CSS, dark mode, accent)
├── supabase/
│   ├── migrations/            # 6 archivos SQL
│   ├── functions/
│   │   ├── create-payment-intent/   # (futuro) procesamiento real
│   │   └── send-receipt/            # envío de correo vía Resend
│   └── seed.sql               # Datos demo (dev)
├── docs/
│   ├── CASO_PRACTICO.md       # Documento principal
│   ├── GUIA_USUARIO.md        # Anexo A
│   ├── GUIA_TECNICA.md        # Anexo B (este archivo)
│   ├── SECURITY.md            # Plan de seguridad extendido
│   ├── ARCHITECTURE.md
│   └── DIAGRAMA_ER.md
├── entregables/               # Documentos .docx generados + scripts
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

---

## 7. Base de datos y migraciones

### 7.1 Migraciones

Se aplican en orden alfabético de nombre de archivo.

```
supabase/migrations/
├── 00001_initial_schema.sql           # tablas, enums, índices
├── 00002_triggers_and_functions.sql   # updated_at, auditoría, daily_report
├── 00003_row_level_security.sql       # políticas RLS
├── 00004_security_hardening.sql       # is_staff/is_admin, restricciones finas
├── 00005_capacity_validation.sql      # validación de cupo por horario
└── 00006_reservation_email.sql        # columna contact_email + índice
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

| Tipo | Comando / Procedimiento |
|------|------------------------|
| **Automático** | Supabase los hace diario (Project Settings → Database → Backups) |
| **Manual** | `pg_dump "$DATABASE_URL" --format=custom -f backups/barco_$(date +%Y%m%d).dump` |
| **PITR (plan Pro)** | Continuo, ventana de 7 días |

### 7.6 Restauración

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname="$DATABASE_URL" backups/<archivo>.dump
```

---

## 8. Edge Functions

### 8.1 `send-receipt`

**Ruta:** `supabase/functions/send-receipt/index.ts`
**Invocación:** desde el frontend vía
```ts
supabase.functions.invoke('send-receipt', {
  body: { reservationId, email },
})
```

**Lógica:**
1. Valida `reservationId` y formato de `email`.
2. Lee la reservación con `service_role_key` (salta RLS).
3. Construye HTML branded (navy/gold) con folio, totales, badge de estado.
4. Envía vía `POST https://api.resend.com/emails`.
5. Devuelve:
   - `{ sent: true, id, to }` si Resend aceptó.
   - `{ sent: false, simulated: true }` si no hay `RESEND_API_KEY` (modo demo).
   - `{ sent: false, error }` si el proveedor falló.

**Desplegar:**

```bash
npx supabase functions deploy send-receipt --no-verify-jwt
```

> Se usa `--no-verify-jwt` porque los clientes anónimos deben poder disparar el envío de su propio recibo.

**Tolerancia a fallos:** el wrapper en el frontend (`receiptService.send`) atrapa cualquier error y devuelve `{ sent: false, error }`. El flujo de pago **nunca se interrumpe** por un fallo de correo.

### 8.2 `create-payment-intent` (preparado para pasarela real)

**Ruta:** `supabase/functions/create-payment-intent/index.ts`

En esta versión está como esqueleto listo para conectar Stripe/Mercado Pago/Conekta. Cuando se active:

1. Validar reservación.
2. Verificar que no esté `pagada` ni `cancelada`.
3. Crear intent en el proveedor con `amount = reservation.total * 100` (centavos).
4. Devolver `{ clientSecret, amount, currency }`.

Mientras tanto, el frontend usa `paymentService.process` que actualiza `reservations.status = 'pagada'` directamente, simulando el éxito.

### 8.3 Logs

```bash
npx supabase functions logs send-receipt --tail
```

O desde Supabase Dashboard → Functions → logs.

### 8.4 Probar localmente (requiere Docker)

```bash
npx supabase functions serve send-receipt --env-file .env.local
```

---

## 9. Despliegue a producción

### 9.1 Frontend en Vercel

1. Conecta el repo en Vercel.
2. En **Environment Variables** añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`
   - `VITE_APP_ENV=production`
3. Deploy — Vercel detecta Vite automáticamente.

### 9.2 Frontend en Netlify

```bash
npm run build           # genera dist/
netlify deploy --prod --dir=dist
```

### 9.3 Backend

Supabase ya está en la nube — no requiere despliegue adicional salvo:

```bash
npx supabase db push                                    # migraciones
npx supabase functions deploy send-receipt --no-verify-jwt
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set "RECEIPT_FROM=Barco Pirata <noreply@tudominio.com>"
```

### 9.4 Configurar dominio en Resend (opcional pero recomendado)

Para enviar a cualquier dominio (no solo a tu propio correo):

1. Ve a https://resend.com → Domains → **Add Domain**.
2. Sigue las instrucciones para añadir registros **SPF**, **DKIM** y **DMARC** en tu DNS.
3. Espera a que aparezcan como "Verified" (suele tardar < 1 hora).
4. Cambia `RECEIPT_FROM` en Supabase a `Barco Pirata <noreply@tudominio.com>`.

### 9.5 Checklist pre-producción

- [ ] Cuenta Resend activa con dominio verificado
- [ ] `RESEND_API_KEY` y `RECEIPT_FROM` configurados en Supabase
- [ ] Edge Function `send-receipt` desplegada
- [ ] Migración `00006_reservation_email.sql` aplicada
- [ ] Dominio propio con SSL (Vercel/Netlify lo dan automáticamente)
- [ ] Supabase en plan Pro (para PITR de 7 días)
- [ ] Respaldos verificados (restaurar en staging)
- [ ] Contraseñas de seed cambiadas o usuarios recreados
- [ ] Políticas RLS revisadas una vez más
- [ ] Si vas a conectar pasarela real: `STRIPE_SECRET_KEY` (o equivalente) configurado y `create-payment-intent` actualizada

---

## 10. Operación y mantenimiento

### 10.1 Monitoreo

- **Supabase Dashboard** → Database → Query Performance, Logs, Auth logs.
- **Supabase Dashboard** → Functions → logs de `send-receipt`.
- **Resend Dashboard** → Logs (https://resend.com/logs) — entregados, rebotados, abiertos.

### 10.2 Rotación de credenciales

Cada 90 días como buena práctica:

1. Rota `RESEND_API_KEY` desde Resend Dashboard → API Keys → **Regenerate**.
2. Actualiza el secret en Supabase.
3. Si `SUPABASE_ANON_KEY` se compromete, en Supabase Dashboard → Settings → API → **Reset anon key** y actualiza en el frontend.

### 10.3 Auditoría periódica

Mensualmente:

```sql
-- ¿Cuántas ediciones ha hecho cada usuario?
select user_email, action, count(*) from public.audit_log
where created_at >= now() - interval '30 days'
group by user_email, action order by count desc;

-- Reservaciones con correo capturado vs. sin correo
select count(*) filter (where contact_email is not null) as con_correo,
       count(*) filter (where contact_email is null)     as sin_correo
from public.reservations
where created_at >= now() - interval '30 days';
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
| `Missing Supabase credentials` | Falta `.env.local` o variables mal nombradas | Copia `.env.example` → `.env.local` y completa |
| El recibo no llega al correo | Falta `RESEND_API_KEY`, dominio no verificado, o el correo está en spam | Revisa logs en https://resend.com/logs |
| `send-receipt` responde `{ simulated: true }` | No hay `RESEND_API_KEY` configurada | Configura el secret en Supabase |
| Login rechaza credenciales válidas | Usuario no confirmado o RLS bloquea perfil | `update auth.users set email_confirmed_at = now() where email = 'x'` |
| `new row violates row-level security policy` | Falta política o el user no tiene perfil | Revisa que exista fila en `user_profiles` con ese `auth.uid()` |
| Dashboard muestra 0 reservaciones | RLS bloquea lectura | Revisa que el usuario esté en `user_profiles`; `is_staff()` debe devolver `true` |
| Vite se queja de puerto ocupado | Otro proceso en 3000 | Mata el proceso o cambia el puerto |
| `autoTable is not a function` al exportar PDF | Incompatibilidad de Rolldown con default export de jspdf-autotable | Ya resuelto con wrapper en `reportService.ts` |
| El cliente ve el panel admin después de pagar | Estás en una versión antigua sin el fix de seguridad | Verifica que `PaymentPage` navegue a `/recibo/:id` (no a `/admin/venta/:id`) |
| El check constraint del email rechaza correos válidos | Regex demasiado estricto | Revisa el CHECK en migración 00006; relajalo si tu caso lo requiere |

### 11.1 Depurar Edge Function

```bash
npx supabase functions logs send-receipt --tail
```

### 11.2 Probar Resend manualmente

```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":"tu@correo.com","subject":"Test","html":"<p>Hola</p>"}'
```

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
| Servicios | camelCase | `reservationService.ts`, `receiptService.ts` |
| Tipos/Interfaces | PascalCase | `Reservation`, `ProcessPaymentDto`, `SendReceiptResult` |
| Columnas BD | snake_case | `contact_phone`, `contact_email`, `created_at` |
| Props frontend | camelCase | `reservationId`, `processedAt`, `contactEmail` |

### 12.3 Git

- Una rama por feature: `feat/<nombre>`, `fix/<nombre>`, `chore/<nombre>`.
- Commits atómicos con conventional commits: `feat(payments): añadir captura de email obligatoria`.
- PR con checklist de `npm run build`, capturas si aplica UI.

### 12.4 Formularios y validación

- **Toda entrada pública** pasa por:
  1. Zod schema (`src/utils/validators`)
  2. DOMPurify (`src/utils/security/sanitize`)
  3. CHECK constraints en BD

### 12.5 Errores

- Usa `throw new Error('mensaje corto')` en services.
- Atrapa en el hook o page, muestra `toast` al usuario.
- Nunca expongas stack traces en producción.
- Las llamadas no críticas (envío de correo) van envueltas en `try/catch` y registran con `console.error` sin propagar.

---

## 📚 Referencias cruzadas

- `docs/CASO_PRACTICO.md` — Documento principal del caso práctico.
- `docs/GUIA_USUARIO.md` — Para el personal operativo y cliente final.
- `docs/SECURITY.md` — Plan de seguridad extendido.
- `docs/ARCHITECTURE.md` — Diagramas y decisiones de diseño.
- `docs/DIAGRAMA_ER.md` — Modelo entidad-relación detallado.
- `supabase/README.md` — Estado del backend.

---

*Última actualización: abril 2026 — versión 2.0 (sin Stripe, con Resend).*
