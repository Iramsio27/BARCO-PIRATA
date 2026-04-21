# 📘 Guía rápida de usuario — Barco Pirata

> **Anexo A** del Caso Práctico C3.
> **Dirigido a:** personal operativo (administradores y vendedores) y clientes finales del Barco Pirata de Puerto Peñasco.
> **Tiempo de lectura:** 12 minutos.

---

## Índice

1. [¿Qué hace el sistema?](#1-qué-hace-el-sistema)
2. [Perfiles de usuario](#2-perfiles-de-usuario)
3. [Flujo del cliente final (público)](#3-flujo-del-cliente-final-público)
4. [Acceso al panel administrativo](#4-acceso-al-panel-administrativo)
5. [Dashboard — pantalla principal](#5-dashboard--pantalla-principal)
6. [Reservar a nombre de un cliente](#6-reservar-a-nombre-de-un-cliente)
7. [Cobrar en efectivo (venta presencial)](#7-cobrar-en-efectivo-venta-presencial)
8. [Cobrar con tarjeta (formulario simulado)](#8-cobrar-con-tarjeta-formulario-simulado)
9. [Comprobante por correo](#9-comprobante-por-correo)
10. [Gestión de reservaciones](#10-gestión-de-reservaciones)
11. [Generar reporte por periodo](#11-generar-reporte-por-periodo)
12. [Ajustes (tema, color, idioma)](#12-ajustes-tema-color-idioma)
13. [Preguntas frecuentes](#13-preguntas-frecuentes)

---

## 1. ¿Qué hace el sistema?

El sistema **Barco Pirata** administra:

- 📅 **Reservaciones** de clientes (desde la página pública o desde el panel).
- 💵 **Cobros** en efectivo o con tarjeta (simulada).
- 🧾 **Comprobantes** imprimibles, estilizados y enviados al correo del cliente.
- 📊 **Reportes por periodo** (día, mes, año, rango libre) con exportación a Excel y PDF.
- 🔐 **Bitácora** automática de todas las operaciones.
- 🌙 **Modo claro/oscuro**, tres colores de acento y dos idiomas (ES/EN).

---

## 2. Perfiles de usuario

| Perfil | Qué puede hacer |
|--------|----------------|
| 🔴 **Administrador** | Todo: gestiona usuarios, ve la bitácora, elimina registros, consulta reportes históricos. |
| 🟢 **Vendedor** | Crea y modifica reservaciones, cobra (efectivo o tarjeta), imprime comprobantes, genera reportes. |
| ⚪ **Cliente (público)** | Reserva desde `/reservar` y paga desde `/pago/:id`. No necesita cuenta. Recibe el comprobante por correo. |

---

## 3. Flujo del cliente final (público)

El cliente recorre la página sin necesidad de iniciar sesión.

### 3.1 Reservar

1. Abre la página pública (Inicio).
2. Pulsa **"Reservar mi paseo"** o navega a `/reservar`.
3. **Paso 1:** elige fecha y hora del tour.
4. **Paso 2:** elige el paquete y el número de personas.
   - 🍽️ **CON_COMIDA** — $450 / persona (paseo + bebidas + comida).
   - 🍹 **SOLO_BEBIDAS** — $350 / persona (paseo + bebidas).
   - ⛵ **SOLO_PASEO** — $250 / persona.
   - 🎁 Si son **5 o más personas**, el sistema aplica automáticamente el **10 % de descuento grupal**.
5. **Paso 3:** ingresa nombre y teléfono.
6. Pulsa **"Enviar Reservación"**.
7. La página `/confirmacion/:id` muestra el resumen + botón **"Ir a Pagar"**.

### 3.2 Pagar

1. En `/pago/:id` el sistema pide **obligatoriamente el correo electrónico** (sin él no se permite continuar). Ahí llegará el recibo.
2. Elige el método:
   - **Efectivo** — confirma con el vendedor en el muelle.
   - **Tarjeta** — abre el formulario simulado (ver sección 8).
3. Tras confirmar, el sistema te lleva a `/recibo/:id` con tu comprobante.

> ⚠️ **Importante:** la ruta de recibo es **pública**. El cliente nunca ve ni puede acceder al panel administrativo.

---

## 4. Acceso al panel administrativo

1. Abre el navegador (Chrome, Edge o Firefox).
2. Visita `http://localhost:3000/admin/login` (o tu URL de producción).
3. Ingresa tu **email** y **contraseña**.
4. Pulsa **Iniciar sesión**.

> 💡 **Si olvidaste tu contraseña,** pide al administrador que la reinicie desde Supabase Dashboard.

### Cerrar sesión

Pulsa tu nombre en la esquina superior derecha → **Cerrar sesión**.

---

## 5. Dashboard — pantalla principal

Al entrar verás tres bloques:

```
┌─────────────────────────────────────────────────────────┐
│   📅 Reservaciones hoy    💵 Ingresos hoy   👥 Personas │
│           9                  $10,945            14      │
└─────────────────────────────────────────────────────────┘
```

- **Reservaciones hoy:** total del día (incluye pendientes y pagadas, excluye canceladas).
- **Ingresos hoy:** suma de `total` de reservaciones pagadas.
- **Personas:** número total de pasajeros agendados para hoy.

Debajo verás una lista de las próximas 5 reservaciones ordenadas por hora.

---

## 6. Reservar a nombre de un cliente

**Cuándo:** si el cliente llega al puerto sin reservación previa y quieres darlo de alta sin cobrar aún.

1. Desde el panel, pulsa **"Nueva reservación"** o abre `/reservar`.
2. Llena los campos del formulario público (mismos pasos del cliente).
3. Pulsa **"Enviar Reservación"**.
4. Verás el resumen y un código de reservación (UUID/folio). **Guárdalo o léelo al cliente.**

> 🎁 **Descuento automático:** si son 5 o más personas, el sistema aplica el **10 % de descuento grupal**.

---

## 7. Cobrar en efectivo (venta presencial)

**Flujo típico:** el cliente llega con una reservación o quiere crearla y pagar al instante.

1. Ve a **Reservaciones** → busca la reserva por nombre o teléfono.
2. Pulsa **"Ir a venta"** o entrega la URL `/pago/:id` al cliente.
3. **Pide al cliente su correo** y captúralo en el campo correspondiente (es obligatorio).
4. Verifica el total con el cliente.
5. Selecciona **"Efectivo"**.
6. Pulsa **"Confirmar pago en efectivo"**.
7. Se abre el **comprobante imprimible** en `/recibo/:id`.
8. Pulsa **"Imprimir"** o **Ctrl+P**.
9. Si tienes Resend configurado, el cliente también recibirá el comprobante en su correo automáticamente.

> 🧾 **El comprobante incluye:** logo, fecha, datos del cliente, paquete, total, método de pago, folio único y leyenda de agradecimiento.

**La reservación queda marcada como `pagada` automáticamente.**

---

## 8. Cobrar con tarjeta (formulario simulado)

> ⚠️ **Esta versión usa un formulario simulado.** No realiza un cargo real. Está diseñado para mostrar el flujo completo y prepararse para conectar un proveedor real (Stripe, Mercado Pago, Conekta) más adelante.

1. En `/pago/:id`, captura el **correo del cliente** (obligatorio).
2. Selecciona **"Tarjeta"**.
3. Aparece la **tarjeta visual** con campos de:
   - Número de tarjeta (formato `0000 0000 0000 0000`)
   - Nombre del titular
   - Vencimiento (MM/AA)
   - CVC (3-4 dígitos)
4. El sistema valida en tiempo real:
   - Algoritmo de Luhn para el número
   - Que la fecha de vencimiento sea futura
   - Formato del CVC
5. Pulsa **"Pagar $X,XXX"**.
6. Se muestra un indicador de procesamiento (~1.5 s) simulando una latencia real.
7. Al terminar, el cliente va a `/recibo/:id` con su comprobante.

### Datos de prueba sugeridos

| Campo | Valor |
|-------|-------|
| Número | `4242 4242 4242 4242` (cualquier número que pase Luhn) |
| Titular | El nombre del cliente |
| Vencimiento | Cualquier mes/año futuro (ej. `12/30`) |
| CVC | Cualquier 3 dígitos (ej. `123`) |

### Si vas a conectar una pasarela real

El formulario simulado vive en `src/pages/public/PaymentPage.tsx` (`SimulatedCardForm`). Para reemplazarlo:

1. Configura las llaves del proveedor en `.env.local` y en los secrets de Supabase.
2. Sustituye el componente por el SDK del proveedor (ej. `<PaymentElement>` de Stripe).
3. Sustituye la Edge Function `create-payment-intent` por la que crea el cargo real.

---

## 9. Comprobante por correo

### Cómo funciona

Cuando el cliente paga (efectivo o tarjeta), el sistema:

1. Guarda el correo en la columna `contact_email` de la reservación.
2. Invoca la **Edge Function `send-receipt`**.
3. La función lee la reservación, construye un correo HTML con la marca del Barco Pirata y lo envía vía **Resend**.
4. En la página `/recibo/:id` aparece un banner verde: "Enviamos copia a `correo@dominio.com`".

### Si no hay proveedor configurado

Si la variable `RESEND_API_KEY` no está configurada en Supabase, la Edge Function responde en modo **simulado**: el correo no se envía realmente, pero el flujo del cliente continúa sin interrupción y el banner aparece igual. **Útil para demos.**

### Si el correo no llega

- Pídele al cliente que revise su carpeta de **spam/correo no deseado**.
- Verifica en el panel de Resend (https://resend.com/logs) si el correo se procesó.
- Si usas el remitente de prueba `onboarding@resend.dev`, solo se entregará a tu propio correo (el que registraste en Resend). Para enviar a cualquier dominio necesitas verificar un dominio propio en Resend.

---

## 10. Gestión de reservaciones

En **Reservaciones** verás la tabla con:

| Fecha | Hora | Cliente | Personas | Paquete | Total | Estado |
|-------|------|---------|----------|---------|-------|--------|

### Filtros disponibles

- Por **fecha** (hoy, mañana, rango personalizado).
- Por **estado** (pendiente, confirmada, pagada, cancelada).
- Por **texto** (nombre o teléfono).

### Cambiar estado de una reserva

1. Pulsa los 3 puntos al final de la fila.
2. Elige:
   - **Confirmar** → pasa de `pendiente` a `confirmada`.
   - **Cancelar** → marca como `cancelada` (no se borra, queda registrada).
   - **Ir a venta** → abre la pantalla de cobro.

> 🔒 **Solo los administradores pueden eliminar reservaciones definitivamente.**

---

## 11. Generar reporte por periodo

1. Ve a **Reportes**.
2. Usa el **PeriodPicker** para elegir el rango:
   - **Día** (por defecto, hoy)
   - **Mes** (todo el mes seleccionado)
   - **Año** (todo el año)
   - **Rango libre** (fecha desde / hasta)
3. La pantalla muestra:
   - **4 KPIs**: reservaciones, personas, ingresos, mejor periodo.
   - **Gráfica de línea** con ingresos por día.
   - **Gráfica de barras** con personas por día.
   - **2 donas** con distribución por paquete y por método de pago.
   - **Tabla detalle** con todas las reservaciones del periodo.
4. Pulsa **"Exportar a Excel"** o **"Exportar a PDF"**.
5. El archivo se descarga a tu computadora con el nombre `reporte_YYYY-MM-DD_a_YYYY-MM-DD.xlsx` / `.pdf`.

### ¿Qué incluye el reporte exportado?

- Encabezado con periodo, total de reservaciones, personas e ingresos.
- Tabla detalle: fecha, hora, cliente, personas, paquete, método de pago, total, estado.
- Totales al pie.

> 📊 **Tip:** usa el reporte PDF para imprimir al cierre de turno y firmar con el administrador.

---

## 12. Ajustes (tema, color, idioma)

Desde **Ajustes** (icono ⚙️ en la barra lateral del admin) puedes personalizar:

| Opción | Valores |
|--------|---------|
| **Tema** | Claro · Oscuro · Sistema (sigue el SO) |
| **Color de acento** | Dorado (default) · Azul marino · Pirata (rojo) |
| **Densidad** | Compacto · Normal · Cómodo |
| **Banner de bienvenida** | Mostrar / Ocultar |
| **Animaciones** | Activar / Desactivar |

El cambio de **idioma** (Español / English) se hace desde el selector en la esquina superior derecha de la página pública.

---

## 13. Preguntas frecuentes

### ❓ ¿Puedo modificar una reserva ya pagada?

Solo puedes cambiar las **notas**. El monto y la fecha quedan bloqueados para evitar fraudes. Si necesitas reembolsar, pide a un administrador.

### ❓ ¿Qué pasa si un cliente quiere cambiar de paquete?

Si aún **no ha pagado**: cancela la reservación original y crea una nueva.
Si **ya pagó**: un administrador debe procesar el reembolso (cuando se conecte una pasarela real) y crear la nueva.

### ❓ ¿Puedo ver las reservaciones de días pasados?

Sí, desde **Reservaciones** con el filtro de fecha o desde **Reportes** con el PeriodPicker. El panel admin no tiene límite histórico.

### ❓ ¿Cómo veo cuánto se vendió en efectivo vs. tarjeta?

En el **reporte por periodo** la dona "Distribución por método de pago" lo muestra visualmente, y el detalle exportado a Excel lo separa por columna.

### ❓ ¿Qué hago si la pantalla de pago con tarjeta no carga?

- Verifica tu conexión a internet.
- Recarga la página con `Ctrl+F5`.
- Si persiste, cobra en efectivo y reporta al equipo técnico.

### ❓ ¿Puedo usar el sistema desde el celular?

Sí, es **responsive**. Tanto el panel como la página pública se adaptan a pantallas pequeñas.

### ❓ ¿Cómo cambio mi contraseña?

Pide al administrador que la resetee desde Supabase. En una versión futura habrá un flujo de "¿Olvidaste tu contraseña?".

### ❓ ¿El cliente puede acceder al panel administrativo después de pagar?

**No.** El comprobante se entrega en una ruta pública (`/recibo/:id`) que no tiene navegación al panel admin. El panel admin requiere iniciar sesión y está protegido por `<ProtectedRoute>`.

### ❓ ¿Por qué el correo no llega de inmediato?

Resend procesa el envío en cola. Normalmente tarda **menos de 30 segundos**. Si pasa más tiempo, revisa los logs de Resend o el spam del cliente.

---

## 📞 Soporte

| Contacto | Para |
|----------|------|
| Administrador | Permisos, usuarios, reembolsos |
| Equipo técnico | Errores del sistema, caídas, performance |
| Resend Support | Problemas de entrega de correos (https://resend.com/docs/help) |

---

*Documento vivo — última actualización: abril 2026.*
