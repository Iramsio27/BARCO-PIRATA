# 🔒 Chatbot WhatsApp — Seguridad

Auditoría de seguridad aplicada al chatbot de WhatsApp del Barco Pirata.  
Cada problema está clasificado por nivel de riesgo, con la solución implementada y cómo verificarla.

---

## Resumen de cambios

| # | Problema | Nivel | Estado |
|---|----------|-------|--------|
| 1 | Sin validación de firma de Meta | 🔴 Alto | ✅ Corregido |
| 2 | Estado de sesión en RAM (Map) | 🔴 Alto | ✅ Corregido |
| 3 | Sin rate limiting | 🟡 Medio | ✅ Corregido |
| 4 | UUID sin validar en redirección | 🟡 Medio | ✅ Corregido |
| 5 | Notas de cancelación sin sanitizar | 🟢 Bajo | ✅ Corregido |

---

## Problema 1 — Sin validación de firma de Meta 🔴

### ¿Cuál era el riesgo?
La URL del webhook (`https://<proyecto>.supabase.co/functions/v1/whatsapp-bot`) es pública. Cualquier persona que conociera esa URL podía enviarle un POST con un payload falso y el bot lo procesaría como si fuera un mensaje real de WhatsApp. Eso significa que alguien podía:
- Enviar un mensaje falso que active el flujo de cancelación de cualquier reservación.
- Confirmar reservaciones que no existen.
- Saturar el sistema con requests inventados.

### ¿Cómo se corrigió?
Meta firma cada request con el header `X-Hub-Signature-256: sha256=<hex>` usando tu `META_APP_SECRET` como clave HMAC. Ahora `index.ts` verifica esa firma antes de procesar cualquier mensaje.

```
Request de Meta → index.ts lee el body como texto crudo
                → calcula HMAC-SHA256(body, META_APP_SECRET)
                → compara con X-Hub-Signature-256 en tiempo constante
                → si no coincide → 401 Unauthorized, no se procesa nada
```

La comparación es **en tiempo constante** (`timingSafeEqual`) para evitar ataques de timing, donde un atacante podría adivinar la firma comparando tiempos de respuesta.

### Variable de entorno nueva que debes agregar
En Supabase → Settings → Edge Functions → Secrets:

```
META_APP_SECRET = <App Secret de tu app en Meta for Developers>
```

Lo encuentras en: Meta Developers → Tu App → Settings → Basic → **App Secret**.

### Cómo verificarlo
1. Envía un POST manual a la URL del webhook sin el header de firma:
   ```bash
   curl -X POST https://<proyecto>.supabase.co/functions/v1/whatsapp-bot \
     -H "Content-Type: application/json" \
     -d '{"entry":[]}'
   ```
2. Debe responder `401 Unauthorized`.
3. Los mensajes reales de Meta siguen funcionando porque ellos sí incluyen la firma correcta.

---

## Problema 2 — Estado de sesión en RAM 🔴

### ¿Cuál era el riesgo?
El estado de conversación (si el bot está esperando confirmación de cancelación, el idioma detectado) vivía en un `Map` de JavaScript dentro de la Edge Function. Esto causaba dos problemas:

**Crecimiento ilimitado de memoria:** Cada número de teléfono que escribiera al bot agregaba una entrada al Map. Con suficientes usuarios (o un atacante enviando mensajes desde muchos números), la función se quedaba sin memoria y crasheaba.

**Pérdida de estado en reinicios:** Las Edge Functions de Supabase se reinician periódicamente. Si el bot estaba esperando que el cliente confirmara una cancelación y la función se reiniciaba, el bot "olvidaba" ese contexto y el cliente quedaba atascado.

### ¿Cómo se corrigió?
Se creó la tabla `bot_sessions` en Supabase (migración `00006_bot_sessions.sql`). Ahora el estado de cada conversación se persiste en la base de datos. La Edge Function ya no guarda nada en memoria entre requests.

```
Antes:  Map<phone, { lang, awaitingCancel }> en RAM
Ahora:  SELECT * FROM bot_sessions WHERE phone = $1
        UPDATE bot_sessions SET ... WHERE phone = $1
```

La tabla también tiene una función `cleanup_bot_sessions()` que elimina sesiones inactivas por más de 24 horas, evitando que crezca indefinidamente.

### Cómo aplicar la migración
```bash
supabase db push
# o directamente en el SQL editor de Supabase:
# copiar y ejecutar el contenido de supabase/migrations/00006_bot_sessions.sql
```

### Cómo verificarlo
1. Inicia el flujo de cancelación con el bot (presiona "❌ Cancelar").
2. Verifica en la tabla `bot_sessions` que `awaiting_cancel_confirm = true`.
3. Reinicia manualmente la Edge Function (redeploy).
4. Continúa la conversación — el bot debe recordar que estaba esperando la confirmación.

---

## Problema 3 — Sin rate limiting 🟡

### ¿Cuál era el riesgo?
Sin límite de mensajes, alguien (o un script automatizado) podía enviar miles de mensajes por segundo al bot. Cada mensaje generaba consultas a Supabase y llamadas a la Meta API. Esto tiene consecuencias económicas directas ya que tanto Supabase como Meta cobran por uso, y también puede degradar el servicio para usuarios reales.

### ¿Cómo se corrigió?
Se usa la misma tabla `bot_sessions` para implementar una ventana deslizante. El límite es de **20 mensajes por número en 60 segundos**. Si se supera ese límite, el mensaje se ignora silenciosamente (no se responde nada, para no confirmar al atacante que el límite fue alcanzado).

La lógica está en `db.ts → isRateLimited()` y se ejecuta en `index.ts` antes de cualquier procesamiento.

### Ajustar los límites
En `db.ts` están las constantes:
```typescript
const RATE_LIMIT_MAX      = 20   // mensajes máximos por ventana
const RATE_LIMIT_WINDOW_S = 60   // ventana en segundos
```
Ajústalos según el comportamiento esperado de tus clientes.

---

## Problema 4 — UUID sin validar en mensajes de redirección 🟡

### ¿Cuál era el riesgo?
El mensaje inicial desde la app tiene el formato `RESERVA:<uuid>`. Si alguien enviaba manualmente un mensaje con ese formato pero con un ID malformado o con caracteres especiales, ese string se pasaba directamente a la consulta de base de datos sin validación previa.

### ¿Cómo se corrigió?
Antes de buscar la reservación, `index.ts` valida que el ID sea un UUID v4 con una expresión regular estricta:

```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(candidate)) {
  console.warn('[whatsapp-bot] ID de reserva inválido:', candidate)
  continue  // ignorar silenciosamente
}
```

Si el formato es inválido, el mensaje se descarta y se registra en logs.

---

## Problema 5 — Notas de cancelación sin sanitizar 🟢

### ¿Cuál era el riesgo?
El texto que el cliente escribe cuando solicita cancelar su reservación se guardaba directamente en la columna `notes` de la tabla `reservations`. No había SQL injection (el cliente de Supabase usa queries parametrizadas), pero texto malicioso podía aparecer en el panel del admin y causar confusión o problemas de visualización.

### ¿Cómo se corrigió?
En `db.ts → requestCancellation()`, el texto pasa por un proceso de limpieza antes de guardarse:

```typescript
const safeReason = reason
  .replace(/[<>]/g, '')       // eliminar caracteres HTML
  .replace(/\n{2,}/g, '\n')   // colapsar saltos de línea múltiples
  .trim()
  .slice(0, 300)              // límite de 300 caracteres
```

---

## Qué NO se cambió (y por qué)

**El `service_role` key sigue siendo necesario.** La Edge Function necesita saltarse RLS para poder actualizar reservaciones desde el servidor. La clave está en variables de entorno de Supabase, que son seguras y no se exponen en los logs ni en el código. Nunca pongas esta clave en el frontend o en el repositorio.

**La identificación por teléfono sigue siendo el único método.** Meta garantiza que el número `from` en el payload no puede ser falsificado por un usuario normal. El riesgo de suplantación es teórico y requeriría acceso a infraestructura de Meta.

---

## Lista de variables de entorno requeridas (actualizada)

| Variable | Dónde obtenerla |
|----------|----------------|
| `META_VERIFY_TOKEN` | Lo inventas tú (cualquier string seguro) |
| `META_APP_SECRET` | Meta Developers → App → Settings → Basic → App Secret |
| `META_ACCESS_TOKEN` | Meta Developers → System User Access Token |
| `META_PHONE_NUMBER_ID` | Meta Developers → WhatsApp → API Setup |
| `SUPABASE_URL` | Ya existe automáticamente en Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |

---

## Próximos pasos recomendados (no implementados aún)

Estas mejoras son opcionales pero aumentarían la seguridad a futuro:

- **Cron job de limpieza:** Programar `SELECT cleanup_bot_sessions()` diariamente para mantener la tabla pequeña.
- **Logs de auditoría:** Registrar en `audit_log` cada vez que el bot confirma o registra una cancelación.
- **Alerta de rate limit:** Notificar al admin (por email o Slack) cuando un número supera el límite de mensajes.
