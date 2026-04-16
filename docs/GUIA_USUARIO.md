# 📘 Guía rápida de usuario — Barco Pirata

> **Anexo A** del Caso Práctico C3.
> **Dirigido a:** personal operativo (administradores y vendedores) del Barco Pirata de Puerto Peñasco.
> **Tiempo de lectura:** 10 minutos.

---

## Índice

1. [¿Qué hace el sistema?](#1-qué-hace-el-sistema)
2. [Perfiles de usuario](#2-perfiles-de-usuario)
3. [Acceso al panel administrativo](#3-acceso-al-panel-administrativo)
4. [Dashboard — pantalla principal](#4-dashboard--pantalla-principal)
5. [Reservar por un cliente](#5-reservar-por-un-cliente-público)
6. [Cobrar en efectivo (venta presencial)](#6-cobrar-en-efectivo-venta-presencial)
7. [Cobrar con tarjeta](#7-cobrar-con-tarjeta)
8. [Gestión de reservaciones](#8-gestión-de-reservaciones)
9. [Generar reporte diario](#9-generar-reporte-diario)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)

---

## 1. ¿Qué hace el sistema?

El sistema **Barco Pirata** administra:

- 📅 **Reservaciones** de clientes (desde la página pública o desde el panel).
- 💵 **Cobros** en efectivo o con tarjeta.
- 🧾 **Comprobantes** imprimibles y estilizados.
- 📊 **Reportes diarios** con exportación a Excel y PDF.
- 🔐 **Bitácora** automática de todas las operaciones.

---

## 2. Perfiles de usuario

| Perfil | Qué puede hacer |
|--------|----------------|
| 🔴 **Administrador** | Todo: gestiona usuarios, ve la bitácora, elimina registros, consulta reportes históricos. |
| 🟢 **Vendedor** | Crea y modifica reservaciones, cobra (efectivo o tarjeta), imprime comprobantes, genera reportes del día. |
| ⚪ **Cliente (público)** | Solo crea su propia reservación desde `/reservar`. No necesita cuenta. |

---

## 3. Acceso al panel administrativo

1. Abre el navegador (Chrome, Edge o Firefox).
2. Visita `http://localhost:3000/admin/login` (o tu URL de producción).
3. Ingresa tu **email** y **contraseña**.
4. Pulsa **Iniciar sesión**.

> 💡 **Si olvidaste tu contraseña,** pide al administrador que la reinicie desde Supabase Dashboard.

### Cerrar sesión

Pulsa tu nombre en la esquina superior derecha → **Cerrar sesión**.

---

## 4. Dashboard — pantalla principal

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

## 5. Reservar por un cliente (público)

**Cuándo:** si el cliente llega al puerto sin reservación previa y quieres darlo de alta sin cobrar aún.

1. Desde el panel, pulsa **"Nueva reservación"** o abre `/reservar`.
2. Llena los campos:
   - **Nombre completo** del cliente.
   - **Teléfono** (formato: `+52 638 123 4567` o `6381234567`).
   - **Fecha** del tour (hoy hasta 90 días en adelante).
   - **Hora** (bloques de 30 minutos).
   - **Número de personas** (1–50).
   - **Paquete:**
     - 🍽️ **CON_COMIDA** — $450 por persona (paseo + bebidas + comida).
     - 🍹 **SOLO_BEBIDAS** — $350 por persona (paseo + bebidas).
     - ⛵ **SOLO_PASEO** — $250 por persona.
   - **Notas** (opcional: alergias, cumpleaños, etc.).
3. Pulsa **"Reservar"**.
4. Verás el resumen y un código de reservación (UUID). **Guárdalo o léelo al cliente.**

> 🎁 **Descuento automático:** si son 5 o más personas, el sistema aplica el **10 % de descuento grupal**.

---

## 6. Cobrar en efectivo (venta presencial)

**Flujo típico:** el cliente llega con una reservación o quiere crearla y pagar al instante.

1. Ve a **Reservaciones** → busca la reserva por nombre o teléfono.
2. Pulsa **"Ir a venta"**.
3. Verifica el total con el cliente.
4. Selecciona **"Efectivo"**.
5. Pulsa **"Registrar pago"**.
6. Se abre el **comprobante imprimible**.
7. Pulsa **"Imprimir"** o **Ctrl+P**.

> 🧾 **El comprobante incluye:** logo, fecha, datos del cliente, paquete, total, método de pago y leyenda de agradecimiento.

**La reservación queda marcada como `pagada` automáticamente.**

---

## 7. Cobrar con tarjeta

1. En la página de venta, selecciona **"Tarjeta"**.
2. Se abre el formulario seguro de **Stripe** dentro de la app.
3. El cliente ingresa:
   - Número de tarjeta
   - Fecha de expiración
   - CVC
   - Código postal
4. Pulsa **"Pagar $X,XXX"**.
5. Si la tarjeta es válida, verás **"Pago exitoso"** y se genera el comprobante.

> ⚠️ **Nunca anotes ni guardes datos de tarjeta fuera del formulario de Stripe.** El sistema cumple con **PCI-DSS Nivel 1**: los datos viajan directamente a Stripe, nunca pasan por nuestro servidor.

### Si la tarjeta es rechazada

- Verifica con el cliente el saldo/límite.
- Ofrece pagar con otra tarjeta o en efectivo.
- El sistema muestra el mensaje exacto de Stripe (ej.: "Fondos insuficientes", "Código CVC incorrecto").

---

## 8. Gestión de reservaciones

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

## 9. Generar reporte diario

1. Ve a **Reportes**.
2. Selecciona la **fecha** (por defecto, hoy).
3. Verás la tabla con todas las reservaciones del día.
4. Pulsa **"Exportar a Excel"** o **"Exportar a PDF"**.
5. El archivo se descarga a tu computadora con el nombre `reporte_YYYY-MM-DD.xlsx` / `.pdf`.

### ¿Qué incluye el reporte?

- Encabezado con fecha y total de reservaciones, personas e ingresos.
- Tabla detalle: hora, cliente, personas, paquete, método de pago, total, estado.
- Totales al pie.

> 📊 **Tip:** usa el reporte PDF para imprimir al cierre de turno y firmar con el administrador.

---

## 10. Preguntas frecuentes

### ❓ ¿Puedo modificar una reserva ya pagada?

Solo puedes cambiar las **notas**. El monto y la fecha quedan bloqueados para evitar fraudes. Si necesitas reembolsar, pide a un administrador.

### ❓ ¿Qué pasa si un cliente quiere cambiar de paquete?

Si aún **no ha pagado**: cancela la reservación original y crea una nueva.
Si **ya pagó**: un administrador debe procesar el reembolso en Stripe y crear la nueva.

### ❓ ¿Puedo ver las reservaciones de días pasados?

Sí, desde **Reservaciones** con el filtro de fecha. El panel admin no tiene límite histórico.

### ❓ ¿Cómo veo cuánto se vendió en efectivo vs. tarjeta?

En el **reporte diario** (Excel o PDF), la columna "Método de pago" permite separar. También puedes filtrar en Excel.

### ❓ ¿Qué hago si la pantalla de pago con tarjeta no carga?

- Verifica tu conexión a internet.
- Desactiva bloqueadores de anuncios (Stripe los bloquea).
- Si persiste, cobra en efectivo y reporta al equipo técnico.

### ❓ ¿Puedo usar el sistema desde el celular?

Sí, es **responsive**. Tanto el panel como la página pública se adaptan a pantallas pequeñas.

### ❓ ¿Cómo cambio mi contraseña?

Pide al administrador que te la resetee desde Supabase. En una versión futura habrá un flujo de "¿Olvidaste tu contraseña?".

---

## 📞 Soporte

| Contacto | Para |
|----------|------|
| Administrador | Permisos, usuarios, reembolsos |
| Equipo técnico | Errores del sistema, caídas, performance |
| Stripe Support | Problemas de cobro con tarjeta (https://support.stripe.com) |

---

*Documento vivo — última actualización: abril 2026.*
