<!--
═══════════════════════════════════════════════════════════════════════════
  CASO PRÁCTICO C3 — ADMINISTRACIÓN DE BASES DE DATOS
  Sistema de Reservaciones "Barco Pirata de Puerto Peñasco"
═══════════════════════════════════════════════════════════════════════════
-->

<div align="center">

# Sistema de Reservaciones y Punto de Venta
## "Barco Pirata de Puerto Peñasco"

**Caso Práctico C3 — Administración de Bases de Datos**

---

**Institución:** *[Nombre de la institución]*
**Materia:** Administración de Bases de Datos
**Docente:** *[Nombre del docente]*
**Estudiante:** *[Tu nombre completo]*
**Matrícula:** *[Tu matrícula]*
**Grupo:** *[Tu grupo]*
**Fecha de entrega:** 26 de abril de 2026

---

![Logo](../public/barco-logo.png)

*Puerto Peñasco, Sonora, México — Abril 2026*

</div>

<div style="page-break-after: always;"></div>

---

## Índice

1. [Introducción](#1-introducción)
2. [Planteamiento del problema](#2-planteamiento-del-problema)
3. [Justificación](#3-justificación)
4. [Objetivos](#4-objetivos)
   - 4.1 [Objetivo general](#41-objetivo-general)
   - 4.2 [Objetivos específicos](#42-objetivos-específicos)
5. [Desarrollo](#5-desarrollo)
   - 5.1 [Arquitectura general](#51-arquitectura-general)
   - 5.2 [Stack tecnológico](#52-stack-tecnológico)
   - 5.3 [Flujos del sistema](#53-flujos-del-sistema)
   - 5.4 [Pasarela de pagos](#54-pasarela-de-pagos)
   - 5.5 [Exportación de reportes](#55-exportación-de-reportes)
6. [Diseño de la base de datos](#6-diseño-de-la-base-de-datos)
   - 6.1 [Modelo entidad-relación](#61-modelo-entidad-relación)
   - 6.2 [Diccionario de datos](#62-diccionario-de-datos)
   - 6.3 [Reglas de negocio implementadas](#63-reglas-de-negocio-implementadas)
7. [Plan de seguridad](#7-plan-de-seguridad)
   - 7.1 [Bitácora de operaciones](#71-bitácora-de-operaciones-logging)
   - 7.2 [Plan de respaldos](#72-plan-de-respaldos-backup)
   - 7.3 [Plan de recuperación](#73-plan-de-recuperación-recovery)
   - 7.4 [Controles de acceso](#74-controles-de-acceso-rls)
   - 7.5 [Defensa contra OWASP Top 10](#75-defensa-contra-owasp-top-10)
8. [Conclusiones](#8-conclusiones)
9. [Referencias](#9-referencias)
10. [Anexos](#10-anexos)

<div style="page-break-after: always;"></div>

---

## 1. Introducción

El turismo náutico representa uno de los pilares económicos de **Puerto Peñasco**, Sonora. Entre los servicios más populares se encuentra el recorrido en **"Barco Pirata"**, una embarcación temática que ofrece paseos guiados por la costa del Golfo de California con tres modalidades de paquete: sólo paseo, paseo con bebidas incluidas y paseo con comida y bebidas.

Actualmente, la operación de este servicio se lleva a cabo de manera artesanal: las reservaciones se toman por teléfono o en persona, los cobros se registran en cuadernos de contabilidad y los reportes diarios se elaboran manualmente al cierre del turno. Este modelo ocasiona errores humanos, sobreventa de cupos, pérdida de comprobantes y dificultad para generar estadísticas.

El presente proyecto documenta el diseño, desarrollo e implementación de un **sistema web integral** que automatiza la toma de reservaciones, el cobro al cliente (en efectivo o con tarjeta), la emisión de comprobantes y la generación de reportes consolidados exportables a Excel y PDF. La solución se construye con **React + TypeScript** en el frontend, **PostgreSQL administrado por Supabase** en el backend y **Stripe** como pasarela de pagos.

A lo largo del documento se abordan: el problema del negocio y su justificación, los objetivos del proyecto, la arquitectura de la solución, el diseño detallado de la base de datos (con diagrama entidad-relación y diccionario de datos) y un **plan de seguridad integral** que contempla bitácora, respaldos, recuperación y políticas de acceso a nivel de fila (RLS). Los anexos incluyen la guía rápida de usuario final y la guía técnica para el equipo de operaciones.

<div style="page-break-after: always;"></div>

---

## 2. Planteamiento del problema

La empresa que opera el Barco Pirata de Puerto Peñasco enfrenta los siguientes problemas operativos:

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Reservaciones manuales** tomadas por teléfono/WhatsApp sin sistema central | Sobreventa, dobles reservas, olvidos |
| 2 | **Cobros en efectivo** sin control de tickets físicos | Descuadres de caja, posibles faltantes |
| 3 | **No se aceptan tarjetas** | Se pierden clientes sin efectivo |
| 4 | **Reportes diarios hechos a mano** | 30–45 min al cierre, propensos a error |
| 5 | **Sin segmentación por tipo de pago** | No hay visibilidad sobre efectivo vs. tarjeta |
| 6 | **Sin bitácora de cambios** | No se puede rastrear quién modificó qué |
| 7 | **Datos sensibles en papel** | Riesgo de extravío y de incumplimiento normativo |

El problema central puede resumirse así:

> **La operación manual del Barco Pirata impide escalar el negocio, controlar el flujo de efectivo y ofrecer una experiencia moderna al cliente.**

<div style="page-break-after: always;"></div>

---

## 3. Justificación

La implementación de un sistema digital de reservaciones y punto de venta se justifica por tres ejes:

### 3.1 Justificación operativa
- Reduce el tiempo de captura de una reservación de **~5 min** (manual) a **< 1 min**.
- Elimina la sobreventa gracias a la validación centralizada de fecha/hora/cupo.
- Automatiza el cierre de caja y el reporte diario con un solo clic.

### 3.2 Justificación económica
- Habilita el **pago con tarjeta**, que —según Banxico, 2024— representa el 40 % del gasto turístico en México.
- El descuento automático del **10 % para grupos de 5 o más personas** incentiva la venta cruzada sin intervención del vendedor.
- La exportación a Excel/PDF facilita el proceso contable y fiscal.

### 3.3 Justificación tecnológica
- **Supabase** provee una base PostgreSQL en la nube con respaldos automáticos, Auth incorporado y Row Level Security nativa, reduciendo el costo de mantenimiento.
- **Stripe** es el proveedor de pagos con mejor cumplimiento **PCI-DSS Nivel 1** del mercado y permite al comercio evitar almacenar tarjetas.
- **React + TypeScript** ofrece tipado estricto, ecosistema maduro y facilita la incorporación de nuevos desarrolladores.

<div style="page-break-after: always;"></div>

---

## 4. Objetivos

### 4.1 Objetivo general

Diseñar, desarrollar e implementar un sistema web de reservaciones y punto de venta para el tour turístico "Barco Pirata de Puerto Peñasco" que automatice la toma de reservaciones, el cobro al cliente (efectivo y tarjeta), la emisión de comprobantes y la generación de reportes diarios, con un nivel alto de seguridad y trazabilidad.

### 4.2 Objetivos específicos

1. **Diseñar una base de datos relacional** en PostgreSQL que modele reservaciones, pagos, usuarios administrativos y bitácora, aplicando normalización hasta 3FN.
2. **Desarrollar una interfaz pública** donde el cliente pueda reservar en **menos de 1 minuto** (fecha, hora, número de personas, paquete y datos de contacto).
3. **Integrar Stripe** como pasarela de pagos con verificación del monto **server-side** para prevenir manipulación.
4. **Implementar un panel administrativo** con dashboard, gestión de reservaciones, venta presencial con comprobante imprimible y generación de reportes.
5. **Aplicar un plan de seguridad** que contemple bitácora de operaciones, respaldos automáticos, plan de recuperación y Row Level Security a nivel de base de datos.
6. **Documentar el sistema** mediante guía rápida de usuario y guía técnica, disponibles como anexos del presente caso práctico.

<div style="page-break-after: always;"></div>

---

## 5. Desarrollo

### 5.1 Arquitectura general

La solución sigue una **arquitectura de tres capas** con separación estricta de responsabilidades:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Navegador)                      │
│  React 18 + TypeScript + Vite + Tailwind CSS + Radix UI         │
│  Zustand (estado UI)   ·   TanStack Query (estado servidor)     │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS / JWT Bearer
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Supabase)                         │
│   • Auth (JWT, bcrypt)   • PostgreSQL 17   • RLS políticas      │
│   • Edge Functions (Deno)                  • Storage             │
└───────────────┬──────────────────────────────┬──────────────────┘
                │                              │
                ▼                              ▼
       ┌──────────────┐              ┌──────────────────┐
       │   Stripe     │              │  Respaldos S3    │
       │ (PCI-DSS L1) │              │ (Point-in-time)  │
       └──────────────┘              └──────────────────┘
```

**Decisiones arquitectónicas clave:**

1. **Vertical slices (feature-based)**: el código se organiza por feature (`reservations/`, `payments/`, `reports/`) en lugar de por capa técnica. Facilita mantenimiento y onboarding.
2. **Server-side amount verification**: el cliente nunca envía el monto a cobrar. La Edge Function lee el total directamente de la reservación en la BD. Previene manipulación mediante DevTools.
3. **Row Level Security**: las tablas sensibles no son accesibles con la `anon_key` de Supabase. El motor de PostgreSQL aplica las políticas antes de servir cualquier fila.
4. **Audit log vía triggers**: cada `INSERT/UPDATE/DELETE` sobre `reservations` y `payments` genera una entrada en `audit_log` con valores anteriores y nuevos, capturada por la propia base de datos (no depende de la app).

### 5.2 Stack tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Lenguaje | TypeScript | 5.8 | Tipado estricto |
| Framework UI | React | 18.3 | Biblioteca de componentes |
| Build | Vite | 8.0 | Dev server + bundler |
| Estilos | Tailwind CSS | 3.4 | Utility-first CSS |
| Componentes | Radix UI + lucide-react | last | Primitivas accesibles |
| Estado cliente | Zustand | 5.0 | Store minimalista |
| Estado servidor | TanStack Query | 5.x | Cache + sync |
| Formularios | React Hook Form + Zod | 7 / 3 | Validación type-safe |
| Ruteo | React Router | 6 | SPA routing con lazy load |
| BaaS | Supabase | cloud | PostgreSQL + Auth + Edge Functions |
| Pagos | Stripe + @stripe/react-stripe-js | 2024 | Pasarela PCI-DSS L1 |
| Export | xlsx + jsPDF + jspdf-autotable | last | Excel/PDF |
| Seguridad | DOMPurify | 3 | Sanitización anti-XSS |
| Fechas | date-fns (es-MX) | 3 | Formateo localizado |

### 5.3 Flujos del sistema

#### 5.3.1 Flujo público: reservación del cliente

```
  Cliente
    │
    ▼
  /reservar  ──► Formulario (fecha, hora, personas, paquete, contacto)
    │                │
    │                ▼
    │         Validación Zod + DOMPurify
    │                │
    │                ▼
    │         Cálculo local de precio (con descuento grupal)
    │                │
    │                ▼
    │         POST anonymous → reservations  (RLS permite)
    │                │
    │                ▼
    │         Trigger audit_trigger → audit_log
    │
    ▼
  /confirmacion/:id  ──► Mensaje + resumen + "Pagar ahora"
    │
    ▼
  /pago/:id  ──► [Efectivo] o [Tarjeta con Stripe]
```

#### 5.3.2 Flujo administrativo: gestión y reportes

```
  Staff
    │
    ▼
  /admin/login  ──► Supabase Auth (JWT)
    │
    ▼
  /admin/dashboard  ──► KPIs del día (reservaciones, ingresos, personas)
    │
    ├──► /admin/reservaciones  ──► Lista + cambio de estado + venta presencial
    │         │
    │         ▼
    │    Trigger audit → audit_log
    │
    └──► /admin/reportes  ──► RPC daily_report(fecha)
              │
              ├──► Exportar a Excel (xlsx)
              └──► Exportar a PDF (jsPDF + autoTable)
```

### 5.4 Pasarela de pagos

El flujo con **Stripe** está diseñado bajo el principio de **confianza cero hacia el cliente**:

```
1. Cliente pulsa "Pagar con tarjeta" en /pago/:id
2. Frontend llama a la Edge Function `create-payment-intent`
     enviando solo el reservationId
3. Edge Function (Deno):
     a) Lee la reservación con service_role_key
     b) Verifica que no esté ya "pagada" ni "cancelada"
     c) Usa reservation.total (¡no lo recibe del cliente!)
     d) Crea el PaymentIntent en Stripe (MXN, metadata)
     e) Devuelve solo el clientSecret
4. Frontend monta <PaymentElement> con el clientSecret
5. Stripe.js tokeniza la tarjeta (nunca pasa por nuestro servidor)
6. Stripe responde con success → payments INSERT + reservation UPDATE
7. Audit log registra ambos eventos
```

**Llaves de prueba utilizadas** (modo test):

| Tipo | Prefijo | Ubicación |
|------|---------|-----------|
| Publishable key | `pk_test_...` | `.env.local` (frontend) |
| Secret key | `sk_test_...` | Supabase secrets (backend) |

### 5.5 Exportación de reportes

Al pulsar **"Generar reporte"** en `/admin/reportes`:

1. El cliente llama al RPC `daily_report(fecha)` vía Supabase.
2. PostgreSQL agrega reservaciones, totales y detalle en un único JSONB.
3. El frontend recibe el JSON y ofrece dos exportaciones:
   - **Excel**: generado con `xlsx`, incluye hoja de resumen + hoja de detalle.
   - **PDF**: generado con `jsPDF + jspdf-autotable`, incluye encabezado, tabla y pie con totales.

Ambos archivos se descargan localmente (nunca se suben al servidor).

<div style="page-break-after: always;"></div>

---

## 6. Diseño de la base de datos

### 6.1 Modelo entidad-relación

```
┌──────────────────────┐          ┌──────────────────────┐
│     auth.users       │ 1      1 │   user_profiles      │
│ (gestionada por      │◄─────────│ id (FK→auth.users)   │
│  Supabase Auth)      │          │ email UNIQUE         │
└──────────────────────┘          │ full_name            │
                                   │ role (admin/vendedor)│
                                   └──────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│    reservations      │ 1      N │      payments        │
│ id PK                │◄─────────│ reservation_id FK    │
│ contact_name         │          │ method               │
│ contact_phone        │          │ amount               │
│ date · time          │          │ status               │
│ number_of_people     │          │ stripe_payment_      │
│ package_id           │          │   intent_id          │
│ service_type         │          │ receipt_url          │
│ subtotal · discount  │          │ processed_at         │
│ total                │          │ processed_by FK ──┐  │
│ status               │          │ created_at        │  │
│ payment_method       │          └───────────────────┼──┘
│ payment_id           │                              │
│ notes                │                              │
│ created_by FK ───────┼──────────┐                   │
│ created_at           │          │                   │
│ updated_at           │          │                   │
└──────────────────────┘          │                   │
         │                        ▼                   ▼
         │ auditado por     ┌──────────────────────────┐
         ▼                  │       audit_log          │
┌──────────────────────┐    │ id PK                    │
│   audit_trigger()    │───►│ user_id FK               │
│ (PL/pgSQL trigger)   │    │ user_email               │
└──────────────────────┘    │ action (INSERT/UPDATE/   │
                            │         DELETE)          │
                            │ table_name               │
                            │ record_id                │
                            │ old_values JSONB         │
                            │ new_values JSONB         │
                            │ ip_address               │
                            │ user_agent               │
                            │ created_at               │
                            └──────────────────────────┘
```

**Relaciones:**
- `user_profiles 1:1 auth.users` (extiende el usuario de Supabase Auth)
- `reservations 1:N payments` (una reserva puede tener varios intentos de pago)
- `reservations 1:N audit_log` (generado automáticamente por trigger)
- `payments 1:N audit_log` (generado automáticamente por trigger)

### 6.2 Diccionario de datos

#### Tabla `user_profiles`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | uuid | PK, FK→auth.users | Mismo UUID que Supabase Auth |
| email | text | UNIQUE, NOT NULL | Email del usuario |
| full_name | text | NOT NULL | Nombre completo |
| role | enum user_role | NOT NULL, default 'vendedor' | 'admin' \| 'vendedor' |
| created_at | timestamptz | NOT NULL, default now() | Fecha de alta |
| updated_at | timestamptz | NOT NULL, default now() | Última modificación (auto) |

#### Tabla `reservations`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Identificador único |
| contact_name | text | NOT NULL | Nombre del cliente |
| contact_phone | text | NOT NULL | Teléfono MX (validado client-side) |
| date | date | NOT NULL | Fecha del tour |
| time | time | NOT NULL | Hora del tour |
| number_of_people | int | CHECK 1–50, NOT NULL | Número de personas |
| package_id | enum package_id | NOT NULL | 'CON_COMIDA' \| 'SOLO_BEBIDAS' \| 'SOLO_PASEO' |
| service_type | text | CHECK in ('individual','grupal') | Tipo de servicio |
| subtotal | numeric(10,2) | CHECK ≥ 0, NOT NULL | Precio antes de descuento |
| discount | numeric(10,2) | CHECK ≥ 0, default 0 | Descuento aplicado (10 % grupal) |
| total | numeric(10,2) | CHECK ≥ 0, NOT NULL | Total a cobrar |
| status | enum reservation_status | default 'pendiente' | 'pendiente' \| 'confirmada' \| 'pagada' \| 'cancelada' |
| payment_method | enum payment_method | nullable | 'efectivo' \| 'tarjeta' |
| payment_id | uuid | nullable | FK lógica al pago finalizado |
| notes | text | nullable | Observaciones libres |
| created_by | uuid | FK→auth.users | Usuario creador (null si anónimo) |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Índices:** `idx_reservations_date`, `idx_reservations_status`, `idx_reservations_phone`

#### Tabla `payments`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | uuid | PK | |
| reservation_id | uuid | FK→reservations, NOT NULL, ON DELETE CASCADE | |
| method | enum payment_method | NOT NULL | 'efectivo' \| 'tarjeta' |
| amount | numeric(10,2) | CHECK ≥ 0, NOT NULL | |
| status | enum payment_status | default 'pendiente' | 'pendiente' \| 'completado' \| 'fallido' \| 'reembolsado' |
| stripe_payment_intent_id | text | nullable | ID de PaymentIntent de Stripe |
| receipt_url | text | nullable | URL del comprobante |
| processed_at | timestamptz | nullable | Cuándo se confirmó |
| processed_by | uuid | FK→auth.users, nullable | Vendedor que procesó |
| created_at | timestamptz | NOT NULL | |

**Índices:** `idx_payments_reservation`, `idx_payments_status`

#### Tabla `audit_log`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK→auth.users | Quién hizo la acción (null si anónimo) |
| user_email | text | Email del actor |
| action | text | INSERT \| UPDATE \| DELETE \| LOGIN |
| table_name | text | Tabla afectada |
| record_id | uuid | ID del registro afectado |
| old_values | jsonb | Estado anterior (para UPDATE/DELETE) |
| new_values | jsonb | Estado nuevo (para INSERT/UPDATE) |
| ip_address | text | Dirección IP |
| user_agent | text | Navegador/cliente |
| created_at | timestamptz | Fecha del evento |

**Índices:** `idx_audit_log_created` (desc), `idx_audit_log_user`, `idx_audit_log_table`

### 6.3 Reglas de negocio implementadas

| # | Regla | Dónde se aplica |
|---|-------|-----------------|
| 1 | Paquetes: CON_COMIDA=$450, SOLO_BEBIDAS=$350, SOLO_PASEO=$250 | `src/constants/index.ts` |
| 2 | Descuento grupal: 10 % si personas ≥ 5 | `src/utils/pricing.ts` |
| 3 | Personas entre 1 y 50 | CHECK constraint en BD + Zod |
| 4 | Fecha entre hoy y +90 días | Zod schema |
| 5 | Teléfono MX válido (regex) | Zod + DOMPurify |
| 6 | No se puede pagar una reserva ya pagada | RLS policy `insert_payment_only_for_unpaid_reservation` |
| 7 | Solo el admin puede eliminar reservaciones o pagos | RLS con helper `is_admin()` |
| 8 | Clientes anónimos solo leen reservaciones de ≤ 30 días | RLS `anon_select_recent_reservation` |
| 9 | El monto del pago se calcula server-side | Edge Function `create-payment-intent` |
| 10 | Toda modificación deja rastro en audit_log | Trigger `audit_trigger` |

<div style="page-break-after: always;"></div>

---

## 7. Plan de seguridad

El plan de seguridad se estructura en cinco componentes complementarios: **bitácora**, **respaldos**, **recuperación**, **control de acceso** y **mitigación OWASP**.

### 7.1 Bitácora de operaciones (*logging*)

**Objetivo:** registrar todas las operaciones sensibles con trazabilidad usuario–acción–fecha.

**Implementación:**
- Función PL/pgSQL `audit_trigger()` con `SECURITY DEFINER` y `search_path` fijo.
- Triggers `AFTER INSERT OR UPDATE OR DELETE` sobre `reservations` y `payments`.
- Cada evento se graba en `audit_log` con:
  - `user_id` y `user_email` (resueltos vía `auth.uid()`)
  - `action` (INSERT/UPDATE/DELETE)
  - `table_name`, `record_id`
  - `old_values` y `new_values` como `jsonb`
  - `created_at`

**Retención:** 365 días en línea; histórico archivado a almacenamiento frío.

**Consulta típica** (solo admins la pueden ejecutar por RLS):

```sql
select created_at, user_email, action, table_name, record_id
from public.audit_log
where created_at >= now() - interval '7 days'
order by created_at desc;
```

### 7.2 Plan de respaldos (*backup*)

| Tipo | Frecuencia | Retención | Responsable |
|------|-----------|-----------|-------------|
| **Backup automático diario** (Supabase) | Cada 24 h | 7 días (plan Free) / 30 días (Pro) | Supabase |
| **Point-in-Time Recovery** (PITR, plan Pro) | Continuo | 7 días | Supabase |
| **Export manual SQL** (`pg_dump`) | Semanal | 12 semanas | Administrador DB |
| **Export a S3 cifrado** (opcional) | Mensual | 24 meses | Administrador DB |

**Comando de backup manual:**

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner \
  --file=backups/barco_$(date +%Y%m%d).dump
```

**Verificación de integridad:** cada respaldo se restaura en un entorno de pruebas **dentro de las primeras 24 h** para validar que no esté corrupto.

### 7.3 Plan de recuperación (*recovery*)

#### Escenarios cubiertos

| Escenario | RTO* | RPO** | Procedimiento |
|-----------|------|-------|---------------|
| Borrado accidental de un registro | 5 min | 0 | Usar `old_values` de `audit_log` para reinsertar |
| Corrupción de tabla | 30 min | 24 h | Restaurar backup diario al último estado válido |
| Caída total del proyecto Supabase | 2 h | 24 h | Crear nuevo proyecto, restaurar `pg_dump` |
| Ataque de ransomware | 4 h | ≤ 24 h | Restaurar desde S3 offline + rotar credenciales |

\* **RTO** (Recovery Time Objective): tiempo máximo aceptable fuera de servicio.
\** **RPO** (Recovery Point Objective): pérdida de datos máxima aceptable.

#### Procedimiento de restauración completa

```bash
# 1. Crear proyecto nuevo en Supabase
# 2. Restaurar el dump más reciente
pg_restore --clean --if-exists --no-owner \
  --dbname="$NEW_DATABASE_URL" \
  backups/barco_YYYYMMDD.dump

# 3. Re-desplegar Edge Functions
npx supabase functions deploy create-payment-intent

# 4. Rotar secrets (STRIPE_SECRET_KEY, anon_key)
# 5. Actualizar .env.local del frontend
# 6. Redeploy del frontend (Vercel/Netlify)
```

#### Simulacros

Un simulacro de restauración completa se ejecuta **cada trimestre**; se documenta tiempo real, incidencias y se actualiza este plan.

### 7.4 Controles de acceso (*RLS*)

Las cuatro tablas públicas tienen **Row Level Security habilitada**. Las políticas se resumen en:

| Tabla | anon | authenticated (staff) | admin |
|-------|------|----------------------|-------|
| `reservations` | INSERT libre; SELECT últimos 30 d | SELECT/UPDATE all | DELETE all |
| `payments` | INSERT solo si reserva no pagada | SELECT/UPDATE all | DELETE all |
| `user_profiles` | — | SELECT propio | SELECT/INSERT/UPDATE/DELETE all |
| `audit_log` | — | — | SELECT all |

**Helpers implementados:**

```sql
create function public.is_staff() returns boolean
  as $$ select exists(select 1 from user_profiles where id = auth.uid()) $$
  language sql security definer stable set search_path = public, pg_catalog;

create function public.is_admin() returns boolean
  as $$ select exists(select 1 from user_profiles where id = auth.uid() and role='admin') $$
  language sql security definer stable set search_path = public, pg_catalog;
```

### 7.5 Defensa contra OWASP Top 10

| Riesgo OWASP | Mitigación en Barco Pirata |
|--------------|----------------------------|
| **A01 Broken Access Control** | RLS a nivel de BD + JWT con `aud='authenticated'` + helpers `is_staff()`/`is_admin()` |
| **A02 Cryptographic Failures** | TLS 1.3 (Supabase), bcrypt para contraseñas, sin almacenar tarjetas (delegado a Stripe) |
| **A03 Injection** | Queries parametrizadas (supabase-js), CHECK constraints, enums tipados |
| **A04 Insecure Design** | Server-side amount verification, monto nunca se envía desde el cliente |
| **A05 Security Misconfiguration** | `search_path` fijo en funciones, RLS en todas las tablas públicas, secrets en vault |
| **A06 Vulnerable Components** | `npm audit` en CI, Dependabot activo |
| **A07 Identification / Auth Failures** | Supabase Auth (JWT + refresh), bloqueo por rate-limit, email verification |
| **A08 Software / Data Integrity** | Sourcemaps off en build, paquetes con lockfile, firma de commits (opcional) |
| **A09 Logging / Monitoring Failures** | Audit log + Supabase logs + alertas de Edge Function |
| **A10 Server-Side Request Forgery** | Edge Function solo habla con Stripe (dominio fijo); no hace fetch arbitrario |

<div style="page-break-after: always;"></div>

---

## 8. Conclusiones

El desarrollo del sistema "Barco Pirata de Puerto Peñasco" demuestra que es factible, en un plazo corto, migrar una operación turística completamente manual a una plataforma web segura, escalable y de bajo costo operativo, utilizando herramientas modernas de código abierto y servicios gestionados.

Los **objetivos planteados** se cumplieron satisfactoriamente:

1. La base de datos está modelada en **3FN**, con enums fuertes, CHECK constraints e índices en los campos de búsqueda frecuente.
2. El flujo público permite reservar en **menos de 1 minuto** con validación en tiempo real mediante Zod.
3. La integración con Stripe aplica **verificación server-side** del monto, eliminando la posibilidad de manipulación desde el cliente.
4. El panel administrativo ofrece KPIs del día, gestión completa de reservaciones y exportación a Excel/PDF con un solo clic.
5. El plan de seguridad cubre **bitácora, respaldos, recuperación y RLS**, alineado con las diez categorías del OWASP Top 10.
6. La documentación se complementa con dos anexos: guía rápida de usuario (operativa) y guía técnica (despliegue y mantenimiento).

**Aprendizajes clave:**
- La combinación de **RLS en PostgreSQL + Supabase Auth** ofrece seguridad comparable a backends tradicionales con una fracción del código.
- Los **triggers de auditoría** son preferibles al logging a nivel de aplicación porque no dependen de la disciplina del desarrollador.
- La **separación feature-based** facilita que nuevos desarrolladores se integren al proyecto sin tener que entender toda la arquitectura.

**Trabajo futuro sugerido:**
- Notificaciones por WhatsApp al confirmar la reserva (Twilio / Meta Cloud API).
- Webhook de Stripe (`stripe-webhook`) para reconciliación asíncrona.
- Panel de auditoría con filtros y exportación.
- App móvil con Capacitor aprovechando el mismo backend.
- Módulo de capacidad (`available_slots`) para bloquear horarios llenos.

<div style="page-break-after: always;"></div>

---

## 9. Referencias

1. **Supabase Inc.** (2024). *Supabase Documentation — Row Level Security*. Recuperado de https://supabase.com/docs/guides/auth/row-level-security
2. **PostgreSQL Global Development Group.** (2024). *PostgreSQL 17 Documentation*. Recuperado de https://www.postgresql.org/docs/17/
3. **Stripe, Inc.** (2024). *Stripe Payments API Reference — PaymentIntents*. Recuperado de https://stripe.com/docs/api/payment_intents
4. **OWASP Foundation.** (2021). *OWASP Top 10 — 2021*. Recuperado de https://owasp.org/www-project-top-ten/
5. **React Team / Meta.** (2024). *React 18 — Documentation*. Recuperado de https://react.dev/
6. **Vercel.** (2024). *Vite — Next Generation Frontend Tooling*. Recuperado de https://vitejs.dev/
7. **Banco de México.** (2024). *Reporte sobre el Sistema Financiero — Pagos con tarjeta*. México: Banxico.
8. **Instituto Nacional de Estadística y Geografía (INEGI).** (2024). *Estadísticas de turismo en Sonora*. México: INEGI.
9. **TC39.** (2024). *ECMAScript 2024 Language Specification*. Recuperado de https://tc39.es/ecma262/
10. **Zod.** (2024). *TypeScript-first schema validation*. Recuperado de https://zod.dev/

<div style="page-break-after: always;"></div>

---

## 10. Anexos

- **Anexo A — Guía rápida de usuario:** `docs/GUIA_USUARIO.md`
  Dirigida al personal operativo (admin y vendedores). Cubre cómo reservar, cobrar, generar reportes y tareas cotidianas con capturas de pantalla.

- **Anexo B — Guía técnica:** `docs/GUIA_TECNICA.md`
  Dirigida al equipo de tecnología. Cubre requerimientos, instalación local, despliegue a producción, operación y solución de problemas.

- **Anexo C — Plan de seguridad extendido:** `docs/SECURITY.md`
  Complemento del capítulo 7 con matriz detallada de políticas RLS y procedimientos paso a paso.

- **Anexo D — Documentación de arquitectura:** `docs/ARCHITECTURE.md`
  Diagramas de componentes, capas y convenciones de código.

- **Anexo E — Configuración de Stripe:** `docs/STRIPE_SETUP.md`
  Procedimiento de alta de cuenta, obtención de llaves y pruebas.

---

<div align="center">

*Fin del documento.*

**Puerto Peñasco, Sonora — Abril 2026**

</div>
