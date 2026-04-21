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
   - 5.4 [Procesamiento del pago](#54-procesamiento-del-pago)
   - 5.5 [Envío del comprobante por correo](#55-envío-del-comprobante-por-correo)
   - 5.6 [Exportación de reportes](#56-exportación-de-reportes)
6. [Diseño de la base de datos](#6-diseño-de-la-base-de-datos)
   - 6.1 [Modelo entidad-relación](#61-modelo-entidad-relación)
   - 6.2 [Diccionario de datos](#62-diccionario-de-datos)
   - 6.3 [Reglas de negocio implementadas](#63-reglas-de-negocio-implementadas)
7. [Plan de seguridad](#7-plan-de-seguridad)
   - 7.1 [Bitácora de operaciones](#71-bitácora-de-operaciones-logging)
   - 7.2 [Plan de respaldos](#72-plan-de-respaldos-backup)
   - 7.3 [Plan de recuperación](#73-plan-de-recuperación-recovery)
   - 7.4 [Controles de acceso](#74-controles-de-acceso-rls)
   - 7.5 [Aislamiento de rutas públicas y administrativas](#75-aislamiento-de-rutas-públicas-y-administrativas)
   - 7.6 [Defensa contra OWASP Top 10](#76-defensa-contra-owasp-top-10)
8. [Conclusiones y recomendaciones](#8-conclusiones-y-recomendaciones)
9. [Referencias](#9-referencias)
10. [Anexos](#10-anexos)

<div style="page-break-after: always;"></div>

---

## 1. Introducción

El turismo náutico representa uno de los pilares económicos de **Puerto Peñasco**, Sonora. Entre los servicios más populares se encuentra el recorrido en **"Barco Pirata"**, una embarcación temática que ofrece paseos guiados por la costa del Golfo de California con tres modalidades de paquete: solo paseo, paseo con bebidas incluidas y paseo con comida y bebidas.

Actualmente, la operación de este servicio se lleva a cabo de manera artesanal: las reservaciones se toman por teléfono o en persona, los cobros se registran en cuadernos de contabilidad y los reportes diarios se elaboran manualmente al cierre del turno. Este modelo ocasiona errores humanos, sobreventa de cupos, pérdida de comprobantes y dificultad para generar estadísticas.

El presente proyecto documenta el diseño, desarrollo e implementación de un **sistema web integral** que automatiza la toma de reservaciones, el cobro al cliente (en efectivo o con tarjeta), la emisión de comprobantes, su envío automático al correo del cliente y la generación de reportes consolidados exportables a Excel y PDF. La solución se construye con **React + TypeScript** en el frontend y **PostgreSQL administrado por Supabase** en el backend, con **Edge Functions** en Deno para la lógica sensible (procesamiento de pagos y envío de correos vía Resend).

A lo largo del documento se abordan: el problema del negocio y su justificación, los objetivos del proyecto, la arquitectura de la solución, el diseño detallado de la base de datos (con diagrama entidad-relación y diccionario de datos) y un **plan de seguridad integral** que contempla bitácora, respaldos, recuperación, aislamiento de rutas administrativas y políticas de acceso a nivel de fila (RLS). Los anexos incluyen la guía rápida de usuario final y la guía técnica para el equipo de operaciones.

> **Nota sobre el procesamiento con tarjeta.** En la versión entregada, el flujo de pago con tarjeta corre en **modo simulado**: la interfaz reproduce fielmente la experiencia (formulario con validaciones, animación de tarjeta, indicador de procesamiento y comprobante final) pero no realiza un cargo real. Esto permite mostrar el sistema completo sin depender de la activación comercial de una pasarela. La arquitectura está diseñada para conectar un proveedor real (Stripe, Mercado Pago, Conekta, etc.) sustituyendo únicamente la Edge Function de procesamiento.

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
| 8 | **Comprobantes en papel únicamente** | El cliente los pierde y no hay forma de recuperarlos |

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
- El comprobante se entrega tanto en pantalla como por **correo electrónico**, eliminando la dependencia del papel.

### 3.2 Justificación económica
- Habilita el **pago con tarjeta** (en modo simulado en esta versión, listo para integrarse con un proveedor real). Según Banxico (2024), el pago con tarjeta representa el **40 %** del gasto turístico en México.
- El descuento automático del **10 % para grupos de 5 o más personas** incentiva la venta cruzada sin intervención del vendedor.
- La exportación a Excel/PDF facilita el proceso contable y fiscal.

### 3.3 Justificación tecnológica
- **Supabase** provee una base PostgreSQL en la nube con respaldos automáticos, Auth incorporado y Row Level Security nativa, reduciendo el costo de mantenimiento.
- **Resend** ofrece un API moderno de envío de correos transaccionales con plan gratuito generoso (3 000 correos/mes), trazabilidad y verificación SPF/DKIM.
- La separación entre **frontend público**, **frontend administrativo** y **Edge Functions** permite aislar completamente el código sensible y aplicar el principio de mínimo privilegio.
- **React + TypeScript** ofrece tipado estricto, ecosistema maduro y facilita la incorporación de nuevos desarrolladores.

<div style="page-break-after: always;"></div>

---

## 4. Objetivos

### 4.1 Objetivo general

Diseñar, desarrollar e implementar un sistema web de reservaciones y punto de venta para el tour turístico "Barco Pirata de Puerto Peñasco" que automatice la toma de reservaciones, el cobro al cliente (efectivo y tarjeta), la emisión y envío de comprobantes con folio único y la generación de reportes diarios, con un nivel alto de seguridad y trazabilidad.

### 4.2 Objetivos específicos

1. **Diseñar una base de datos relacional** en PostgreSQL que modele reservaciones, pagos, usuarios administrativos y bitácora, aplicando normalización hasta 3FN.
2. **Desarrollar una interfaz pública** donde el cliente pueda reservar en **menos de 1 minuto** (fecha, hora, número de personas, paquete y datos de contacto).
3. **Implementar dos métodos de cobro**: efectivo (atendido por el vendedor) y tarjeta (formulario simulado con validaciones reales que prepara el camino para integrar una pasarela en producción).
4. **Capturar el correo del cliente** al momento del pago y entregar el comprobante por correo electrónico con un folio único usando una Edge Function que invoca Resend.
5. **Implementar un panel administrativo** aislado del flujo público, con dashboard, gestión de reservaciones, venta presencial con comprobante imprimible y generación de reportes con filtros por periodo.
6. **Aplicar un plan de seguridad** que contemple bitácora de operaciones, respaldos automáticos, plan de recuperación, Row Level Security y aislamiento estricto entre rutas públicas y administrativas.
7. **Documentar el sistema** mediante guía rápida de usuario y guía técnica, disponibles como anexos del presente caso práctico.

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
│  i18next (ES/EN)       ·   React Router 6 (público vs admin)    │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS / JWT Bearer
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Supabase)                         │
│   • Auth (JWT, bcrypt)   • PostgreSQL 17   • RLS políticas      │
│   • Edge Functions (Deno)                  • Storage             │
│      ├── create-payment-intent  (procesa pago, simulado)         │
│      └── send-receipt           (envía correo vía Resend)        │
└───────────────┬──────────────────────────────┬──────────────────┘
                │                              │
                ▼                              ▼
       ┌──────────────┐              ┌──────────────────┐
       │   Resend     │              │  Respaldos PITR  │
       │ (correo SMTP)│              │ (Point-in-time)  │
       └──────────────┘              └──────────────────┘
```

**Decisiones arquitectónicas clave:**

1. **Vertical slices (feature-based)**: el código se organiza por feature (`reservations/`, `payments/`, `reports/`) en lugar de por capa técnica. Facilita mantenimiento y onboarding.
2. **Aislamiento público / administrativo**: las rutas `/admin/*` están envueltas en un `ProtectedRoute` con `AuthProvider`; el flujo de pago siempre redirige a `/recibo/:id` (ruta pública), nunca a `/admin/venta/:id`. Esto cierra la vulnerabilidad detectada y corregida durante el desarrollo (sección 7.5).
3. **Server-side amount verification**: el cliente nunca envía el monto a cobrar. La Edge Function lee el total directamente de la reservación en la BD. Previene manipulación mediante DevTools.
4. **Row Level Security**: las tablas sensibles no son accesibles con la `anon_key` de Supabase. El motor de PostgreSQL aplica las políticas antes de servir cualquier fila.
5. **Audit log vía triggers**: cada `INSERT/UPDATE/DELETE` sobre `reservations` y `payments` genera una entrada en `audit_log` con valores anteriores y nuevos, capturada por la propia base de datos (no depende de la app).
6. **Envío de correos no bloqueante**: si la Edge Function `send-receipt` falla o no tiene proveedor configurado, el flujo de pago continúa normalmente; el comprobante en pantalla siempre se muestra.

### 5.2 Stack tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Lenguaje | TypeScript | 5.8 | Tipado estricto |
| Framework UI | React | 18.3 | Biblioteca de componentes |
| Build | Vite (Rolldown) | 8.0 | Dev server + bundler |
| Estilos | Tailwind CSS | 3.4 | Utility-first CSS |
| Componentes | Radix UI + lucide-react | last | Primitivas accesibles |
| Estado cliente | Zustand | 5.0 | Store minimalista |
| Estado servidor | TanStack Query | 5.x | Cache + sync |
| Formularios | React Hook Form + Zod | 7 / 3 | Validación type-safe |
| Internacionalización | i18next + react-i18next | last | ES/EN |
| Ruteo | React Router | 6 | SPA routing con lazy load |
| BaaS | Supabase | cloud | PostgreSQL 17 + Auth + Edge Functions |
| Correos | Resend (vía Edge Function) | API v1 | Envío transaccional |
| Export | xlsx + jsPDF + jspdf-autotable | last | Excel/PDF |
| Seguridad | DOMPurify | 3 | Sanitización anti-XSS |
| Fechas | date-fns (es-MX) | 3 | Formateo localizado |

> **Nota:** la integración con Stripe (pasarela real) no se incluye en esta versión por decisión del equipo. El formulario de tarjeta simula la experiencia completa con validaciones de algoritmo de Luhn, formato de expiración y CVC. Para conectar un proveedor real basta con sustituir la Edge Function `create-payment-intent` y el componente `SimulatedCardForm` por el SDK del proveedor elegido.

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
  /pago/:id  ──► Captura de correo obligatoria
                       │
                       ├──► [Efectivo] confirmar con vendedor
                       │
                       └──► [Tarjeta] formulario simulado
                                    │
                                    ▼
                       ▼
                  reservations.status = 'pagada'
                  send-receipt (correo con folio)
                       │
                       ▼
                  /recibo/:id   (ruta PÚBLICA, no admin)
```

#### 5.3.2 Flujo administrativo: gestión y reportes

```
  Staff
    │
    ▼
  /admin/login  ──► Supabase Auth (JWT)
    │
    ▼  ProtectedRoute valida sesión + rol
  /admin/dashboard  ──► KPIs del día (reservaciones, ingresos, personas)
    │
    ├──► /admin/reservaciones  ──► Lista + cambio de estado + venta presencial
    │         │
    │         ▼
    │    Trigger audit → audit_log
    │
    ├──► /admin/reportes  ──► PeriodPicker (día/mes/año/rango libre)
    │         │
    │         ├──► KPIs + gráficas (línea, barras, donut)
    │         ├──► Exportar a Excel (xlsx)
    │         └──► Exportar a PDF (jsPDF + autoTable)
    │
    └──► /admin/ajustes  ──► Tema (claro/oscuro/sistema), color de acento, densidad
```

### 5.4 Procesamiento del pago

El flujo de pago corre bajo el principio de **confianza cero hacia el cliente**:

```
1. Cliente abre /pago/:id
2. PaymentPage carga la reserva con useReservation(id)
3. PaymentPage exige captura de email (obligatorio para continuar)
   - Validación Zod + regex EMAIL_RE
   - Al confirmar, reservationService.updateEmail(id, email)
     guarda contact_email en la fila
4. El cliente elige método:

   ─── EFECTIVO ──────────────────────────────────────
   a) Pulsa "Confirmar pago en efectivo"
   b) Llamada a paymentService.process({ reservationId, method: 'efectivo' })
   c) Edge Function (o RPC) actualiza reservation.status = 'pagada'
   d) Trigger audit_trigger registra el cambio

   ─── TARJETA (simulada) ────────────────────────────
   a) Se muestra <SimulatedCardForm>: tarjeta visual + 3 campos
   b) Validaciones client-side:
      - Número con algoritmo de Luhn
      - Fecha futura en formato MM/AA
      - CVC de 3-4 dígitos
      - Nombre del titular no vacío
   c) Indicador de procesamiento (1.5 s simulando latencia real)
   d) paymentService.process({ reservationId, method: 'tarjeta' })

5. Tras el éxito de cualquiera de los dos métodos:
   - Llama a receiptService.send(id, email)  → Edge Function send-receipt
   - Navega a /recibo/:id  (NUNCA a /admin/*)
```

> ⚠️ **Importante:** durante el desarrollo se detectó que el flujo original navegaba al cliente final hacia `/admin/venta/:id`, lo que daba acceso lateral al panel administrativo a cualquier visitante que completara un pago. Esta vulnerabilidad fue **corregida** creando una ruta pública dedicada `/recibo/:id` (componente `ReceiptPage`) que muestra el comprobante sin exponer rutas internas. Ver detalle en sección 7.5.

### 5.5 Envío del comprobante por correo

Para que el cliente conserve evidencia del pago aunque cierre el navegador, el sistema integra un envío automático de correo transaccional:

**Componentes involucrados:**

- **Migración 00006** (`reservation_email.sql`) — añade la columna `contact_email text` a `reservations` con un CHECK que valida formato RFC compatible.
- **`reservationService.updateEmail(id, email)`** — método del frontend que persiste el correo en la fila correspondiente.
- **`receiptService.send(reservationId, email)`** — wrapper de TypeScript que invoca la Edge Function.
- **Edge Function `send-receipt`** — corre en Deno, lee la reservación con la `service_role_key`, construye un HTML branded (navy/gold) y envía vía API de Resend.
- **`ReceiptPage`** — muestra un banner verde "Enviamos copia a `email@dominio.com`" cuando `reservation.contactEmail` no es nulo.

**Flujo del envío:**

```
PaymentPage  ──invoke──►  Edge Function send-receipt
                                │
                                ▼
                       service-role select * from reservations where id = ?
                                │
                                ▼
                       buildHtml(reservation)  ──► HTML con folio, totales, badge
                                │
                                ▼
                       fetch https://api.resend.com/emails
                            (Authorization: Bearer RESEND_API_KEY)
                                │
                                ▼
                       respuesta:
                       ├── { sent: true, id, to }       ← correo enviado
                       ├── { sent: false, simulated: true } ← sin API key (modo demo)
                       └── { sent: false, error }       ← fallo del proveedor
```

**Modo demo (sin API key):**
Si la variable de entorno `RESEND_API_KEY` no está configurada, la Edge Function responde `{ simulated: true }` y el frontend muestra el flujo completo sin error. Esto permite presentar el proyecto sin depender de la activación de la cuenta de Resend.

**Tolerancia a fallos:**
El envío del correo está envuelto en `try/catch` y nunca bloquea el flujo de pago; si Resend está caído o devuelve error, el cliente igual ve su recibo en pantalla y la reservación queda marcada como pagada en la BD.

### 5.6 Exportación de reportes

Al pulsar **"Generar reporte"** en `/admin/reportes`:

1. El cliente selecciona un periodo con el `PeriodPicker` (día, mes, año o rango libre).
2. El frontend llama a `reportService.getRangeReport(from, to)` que internamente consulta `reservations` filtrando por fecha.
3. Se renderizan en pantalla:
   - **4 KPIs** (reservaciones, personas, ingresos, mejor periodo)
   - **Gráfica de línea** de ingresos por día
   - **Gráfica de barras** de personas por día
   - **2 donas** con distribución por paquete y por método de pago
   - **Tabla detalle** con todas las reservas del periodo
4. El usuario exporta:
   - **Excel** generado con `xlsx`, dos hojas (resumen + detalle).
   - **PDF** generado con `jsPDF + jspdf-autotable`, encabezado branded, tabla y pie con totales.

Ambos archivos se descargan localmente (nunca se suben al servidor).

> **Nota técnica:** el bundler Rolldown (Vite 8) presenta una incompatibilidad menor con el default export de `jspdf-autotable`. Se resolvió con un wrapper que prueba primero el default export y luego el método inyectado en el prototipo de jsPDF, lanzando un error descriptivo si ninguno funciona. Detalle en `src/features/reports/services/reportService.ts`.

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
│ contact_email  ◄─NEW │          │ status               │
│ date · time          │          │ external_payment_id  │
│ number_of_people     │          │ receipt_url          │
│ package_id           │          │ processed_at         │
│ service_type         │          │ processed_by FK ──┐  │
│ subtotal · discount  │          │ created_at        │  │
│ total                │          └───────────────────┼──┘
│ status               │                              │
│ payment_method       │                              │
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
| id | uuid | PK, default uuid_generate_v4() | Identificador único (folio) |
| contact_name | text | NOT NULL | Nombre del cliente |
| contact_phone | text | NOT NULL | Teléfono MX (validado client-side) |
| **contact_email** | text | nullable, CHECK regex RFC | Correo del cliente (capturado al pagar) |
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

**Índices:** `idx_reservations_date`, `idx_reservations_status`, `idx_reservations_phone`, `idx_reservations_contact_email`

#### Tabla `payments`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | uuid | PK | |
| reservation_id | uuid | FK→reservations, NOT NULL, ON DELETE CASCADE | |
| method | enum payment_method | NOT NULL | 'efectivo' \| 'tarjeta' |
| amount | numeric(10,2) | CHECK ≥ 0, NOT NULL | |
| status | enum payment_status | default 'pendiente' | 'pendiente' \| 'completado' \| 'fallido' \| 'reembolsado' |
| external_payment_id | text | nullable | ID externo (proveedor de pago, cuando se conecte uno) |
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
| 6 | Email obligatorio al pagar (formato RFC) | `EMAIL_RE` en `PaymentPage` + CHECK en BD |
| 7 | No se puede pagar una reserva ya pagada | RLS policy `insert_payment_only_for_unpaid_reservation` |
| 8 | Solo el admin puede eliminar reservaciones o pagos | RLS con helper `is_admin()` |
| 9 | Clientes anónimos solo leen reservaciones de ≤ 30 días | RLS `anon_select_recent_reservation` |
| 10 | El monto del pago se calcula server-side | Edge Function `create-payment-intent` |
| 11 | Toda modificación deja rastro en audit_log | Trigger `audit_trigger` |
| 12 | Tras pagar, el cliente va a `/recibo/:id` (público), nunca a `/admin/*` | `PaymentPage.handleEfectivo / handleTarjeta` |

<div style="page-break-after: always;"></div>

---

## 7. Plan de seguridad

El plan de seguridad se estructura en **seis** componentes complementarios: **bitácora**, **respaldos**, **recuperación**, **control de acceso**, **aislamiento de rutas** y **mitigación OWASP**.

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
| **Export a almacenamiento offline** (opcional) | Mensual | 24 meses | Administrador DB |

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
| Ataque de ransomware | 4 h | ≤ 24 h | Restaurar desde backup offline + rotar credenciales |

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
npx supabase functions deploy create-payment-intent --no-verify-jwt
npx supabase functions deploy send-receipt          --no-verify-jwt

# 4. Rotar secrets (RESEND_API_KEY, anon_key)
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

### 7.5 Aislamiento de rutas públicas y administrativas

Durante el desarrollo se identificó una **vulnerabilidad crítica**: el flujo de pago navegaba al cliente final hacia `/admin/venta/:id` para mostrar el comprobante. Esa ruta forma parte del panel administrativo y, aunque la mayoría de las acciones administrativas requieren JWT, la **navegación lateral** desde el sidebar del layout admin permitía a cualquier visitante ver páginas internas (dashboard, reportes, ajustes) sin autenticación.

**Causa raíz:** el componente de ticket vivía dentro del árbol `<AdminLayout>` y se navegaba con `navigate('/admin/venta/' + id)` desde el flujo público.

**Corrección aplicada:**

1. **Nueva ruta pública** `/recibo/:reservationId` (componente `ReceiptPage`) que vive bajo `<PublicLayout>`. Diseño tipo ticket con folio, totales, badge de estado y botón de impresión. **Sin** sidebar ni navegación administrativa.
2. **`PaymentPage`** ahora navega siempre a `/recibo/${id}` después de procesar (en cualquiera de los dos métodos).
3. **Verificación:** cualquier intento de acceder directamente a `/admin/*` sin sesión válida es interceptado por `<ProtectedRoute>` que redirige a `/admin/login`.
4. **Pruebas manuales:** se confirmó que el flujo de pago en efectivo y tarjeta termina en la ruta pública y que no hay enlace alguno desde el flujo público al panel admin.

**Lección aprendida:** las rutas administrativas y públicas deben vivir en árboles de layout separados desde el inicio del proyecto, no compartir componentes de presentación entre ambos contextos.

### 7.6 Defensa contra OWASP Top 10

| Riesgo OWASP | Mitigación en Barco Pirata |
|--------------|----------------------------|
| **A01 Broken Access Control** | RLS a nivel de BD + JWT con `aud='authenticated'` + helpers `is_staff()`/`is_admin()` + aislamiento de árboles públicos/admin (sección 7.5) |
| **A02 Cryptographic Failures** | TLS 1.3 (Supabase), bcrypt para contraseñas, sin almacenar tarjetas (datos del formulario simulado nunca se persisten) |
| **A03 Injection** | Queries parametrizadas (supabase-js), CHECK constraints, enums tipados |
| **A04 Insecure Design** | Server-side amount verification, monto nunca se envía desde el cliente |
| **A05 Security Misconfiguration** | `search_path` fijo en funciones, RLS en todas las tablas públicas, secrets en vault de Supabase (no en `.env` del frontend) |
| **A06 Vulnerable Components** | `npm audit` en CI, lockfile versionado |
| **A07 Identification / Auth Failures** | Supabase Auth (JWT + refresh), bloqueo por rate-limit, email verification |
| **A08 Software / Data Integrity** | Sourcemaps off en build, paquetes con lockfile, build reproducible |
| **A09 Logging / Monitoring Failures** | Audit log + Supabase logs + logs de Edge Functions |
| **A10 Server-Side Request Forgery** | Edge Functions solo hablan con dominios fijos (Resend, futuro Stripe); no hacen fetch arbitrario |

<div style="page-break-after: always;"></div>

---

## 8. Conclusiones y recomendaciones

### 8.1 Conclusiones

El desarrollo del sistema "Barco Pirata de Puerto Peñasco" demuestra que es factible, en un plazo corto, migrar una operación turística completamente manual a una plataforma web segura, escalable y de bajo costo operativo, utilizando herramientas modernas de código abierto y servicios gestionados.

Los **objetivos planteados** se cumplieron satisfactoriamente:

1. La base de datos está modelada en **3FN**, con enums fuertes, CHECK constraints e índices en los campos de búsqueda frecuente.
2. El flujo público permite reservar en **menos de 1 minuto** con validación en tiempo real mediante Zod.
3. Se implementaron los **dos métodos de cobro** requeridos: efectivo (con confirmación del vendedor) y tarjeta (formulario simulado con validaciones reales y experiencia idéntica a una pasarela en producción).
4. El sistema **captura el correo del cliente** al momento del pago y entrega el comprobante por correo electrónico con folio único, usando una Edge Function que invoca Resend.
5. El panel administrativo está **aislado** del flujo público; ofrece KPIs del día, gestión completa de reservaciones, ajustes de tema y exportación a Excel/PDF con un solo clic.
6. El plan de seguridad cubre **bitácora, respaldos, recuperación, RLS y aislamiento de rutas**, alineado con las diez categorías del OWASP Top 10.
7. La documentación se complementa con dos anexos: guía rápida de usuario (operativa) y guía técnica (despliegue y mantenimiento).

**Aprendizajes clave:**

- La combinación de **RLS en PostgreSQL + Supabase Auth** ofrece seguridad comparable a backends tradicionales con una fracción del código.
- Los **triggers de auditoría** son preferibles al logging a nivel de aplicación porque no dependen de la disciplina del desarrollador.
- La **separación feature-based** facilita que nuevos desarrolladores se integren al proyecto sin tener que entender toda la arquitectura.
- **Aislar las rutas públicas y administrativas en árboles de layout separados desde el día uno** evita vulnerabilidades por navegación lateral.
- Diseñar las integraciones externas (correo, pagos) con un **modo simulado por defecto** permite avanzar el desarrollo y la presentación sin depender de la activación de cuentas comerciales.

### 8.2 Recomendaciones

**Para producción inmediata:**

- Conectar una pasarela de pagos real (Stripe, Mercado Pago o Conekta) reemplazando la Edge Function `create-payment-intent` y `SimulatedCardForm`. La estructura de `payments` ya prevé un campo `external_payment_id` para almacenar el ID del proveedor.
- Configurar `RESEND_API_KEY` y verificar un dominio propio en Resend para que el remitente sea `noreply@barcopirata.mx` en vez de `onboarding@resend.dev`.
- Pasar Supabase a plan Pro para activar PITR de 7 días.
- Configurar alertas de error con Sentry o LogRocket.

**Mejoras incrementales sugeridas:**

- Notificaciones por WhatsApp al confirmar la reserva (Twilio / Meta Cloud API).
- Webhook del proveedor de pagos para reconciliación asíncrona.
- Panel de auditoría con filtros y exportación.
- App móvil con Capacitor aprovechando el mismo backend.
- Módulo de capacidad por horario (`available_slots`) para bloquear horarios llenos.
- Dashboard de KPIs en tiempo real con WebSocket.
- Programa de fidelización con códigos de descuento.

<div style="page-break-after: always;"></div>

---

## 9. Referencias

1. **Supabase Inc.** (2024). *Supabase Documentation — Row Level Security*. https://supabase.com/docs/guides/auth/row-level-security
2. **PostgreSQL Global Development Group.** (2024). *PostgreSQL 17 Documentation*. https://www.postgresql.org/docs/17/
3. **Resend.** (2024). *Resend API — Send Emails*. https://resend.com/docs/api-reference/emails/send-email
4. **OWASP Foundation.** (2021). *OWASP Top 10 — 2021*. https://owasp.org/www-project-top-ten/
5. **React Team / Meta.** (2024). *React 18 — Documentation*. https://react.dev/
6. **Vercel.** (2024). *Vite — Next Generation Frontend Tooling*. https://vitejs.dev/
7. **Banco de México.** (2024). *Reporte sobre el Sistema Financiero — Pagos con tarjeta*. México: Banxico.
8. **Instituto Nacional de Estadística y Geografía (INEGI).** (2024). *Estadísticas de turismo en Sonora*. México: INEGI.
9. **TC39.** (2024). *ECMAScript 2024 Language Specification*. https://tc39.es/ecma262/
10. **Zod.** (2024). *TypeScript-first schema validation*. https://zod.dev/
11. **Deno Land Inc.** (2024). *Deno Runtime — Standard Library*. https://deno.land/std
12. **TanStack.** (2024). *TanStack Query v5 Documentation*. https://tanstack.com/query/v5

<div style="page-break-after: always;"></div>

---

## 10. Anexos

- **Anexo A — Guía rápida de usuario:** `docs/GUIA_USUARIO.md`
  Dirigida al personal operativo (admin y vendedores) y al cliente final. Cubre cómo reservar, cobrar, recibir el comprobante por correo, generar reportes y tareas cotidianas con capturas de pantalla.

- **Anexo B — Guía técnica:** `docs/GUIA_TECNICA.md`
  Dirigida al equipo de tecnología. Cubre requerimientos, instalación local, despliegue a producción, operación, Edge Functions, integración con Resend y solución de problemas.

- **Anexo C — Plan de seguridad extendido:** `docs/SECURITY.md`
  Complemento del capítulo 7 con matriz detallada de políticas RLS y procedimientos paso a paso.

- **Anexo D — Documentación de arquitectura:** `docs/ARCHITECTURE.md`
  Diagramas de componentes, capas y convenciones de código.

- **Anexo E — Diagrama Entidad-Relación detallado:** `docs/DIAGRAMA_ER.md`
  Versión extendida del diagrama del capítulo 6 con cardinalidades, anotaciones y diccionario por tabla.

---

<div align="center">

*Fin del documento.*

**Puerto Peñasco, Sonora — Abril 2026**

</div>
