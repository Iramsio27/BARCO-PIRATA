# 🤖 Chatbot WhatsApp — Guía de Configuración

Chatbot del Barco Pirata Puerto Peñasco integrado con **Meta (WhatsApp) Cloud API** y **Supabase Edge Functions**.

---

## Archivos creados

```
supabase/functions/whatsapp-bot/
├── index.ts        ← Webhook handler (punto de entrada)
├── bot-logic.ts    ← Lógica del bot (ES/EN, estados, FAQ)
├── meta-api.ts     ← Helper para enviar mensajes por Meta API
└── db.ts           ← Acceso directo a Supabase (reservaciones)

src/features/reservations/hooks/
└── useWhatsAppRedirect.ts  ← Hook React para redirigir a WhatsApp
```

---

## Paso 1 — Configurar Meta for Developers

> Necesitas tener acceso a la cuenta de WhatsApp Business (+52 638 112 3686).

1. Entra a [developers.facebook.com](https://developers.facebook.com) con la cuenta del negocio.
2. Ve a **My Apps → Create App → Business**.
3. Agrega el producto **WhatsApp**.
4. En **WhatsApp → API Setup** anota:
   - `Phone Number ID` → será `META_PHONE_NUMBER_ID`
   - `WhatsApp Business Account ID`
5. Genera un **System User Access Token** (permanente) en Business Settings → System Users.
   - Ese token será `META_ACCESS_TOKEN`.
6. Inventa un token de verificación (cualquier string seguro, ej: `barco-pirata-2026`).
   - Ese será `META_VERIFY_TOKEN`.

---

## Paso 2 — Variables de entorno en Supabase

En el dashboard de Supabase → **Settings → Edge Functions → Secrets**, agrega:

| Variable                    | Valor                                      |
|-----------------------------|--------------------------------------------|
| `META_VERIFY_TOKEN`         | El token que inventaste en el paso 1       |
| `META_ACCESS_TOKEN`         | System User Access Token de Meta           |
| `META_PHONE_NUMBER_ID`      | ID del número de teléfono en Meta          |
| `SUPABASE_URL`              | Ya existe por defecto en Edge Functions    |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role key          |

---

## Paso 3 — Desplegar la Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy whatsapp-bot --no-verify-jwt
```

Después de desplegarlo, la URL del webhook será:
```
https://<tu-proyecto>.supabase.co/functions/v1/whatsapp-bot
```

---

## Paso 4 — Registrar el Webhook en Meta

1. En Meta Developers → **WhatsApp → Configuration → Webhook**.
2. Haz clic en **Edit**.
3. Ingresa:
   - **Callback URL:** `https://<tu-proyecto>.supabase.co/functions/v1/whatsapp-bot`
   - **Verify Token:** el mismo valor que pusiste en `META_VERIFY_TOKEN`
4. Haz clic en **Verify and Save**.
5. En **Webhook fields**, suscríbete a: `messages`.

---

## Flujo completo del chatbot

```
Cliente hace reserva en la app
        ↓
ConfirmationPage muestra resumen
        ↓
Cliente toca "Confirmar por WhatsApp"
        ↓
Se abre WhatsApp con mensaje: "RESERVA:<uuid>"
        ↓
Edge Function recibe el mensaje
        ↓
Busca la reserva por número de teléfono
        ↓
Cambia status: pendiente → confirmada en Supabase
        ↓
Responde con resumen + botones de menú
        ↓
Panel de admin ve status actualizado en tiempo real
```

---

## Funcionalidades del bot

| Función | Cómo activarla |
|---------|---------------|
| Ver mi reservación | Botón "📋 Mi reservación" |
| Confirmar reserva automáticamente | Al llegar desde la app |
| FAQ (horarios, precios, etc.) | Botón "❓ Preguntas frecuentes" |
| Solicitar cancelación | Botón "❌ Cancelar reservación" |
| Idioma automático | Detecta ES / EN por el texto |

---

## Agregar o editar preguntas frecuentes

Las FAQs están en `supabase/functions/whatsapp-bot/bot-logic.ts`, objeto `T.faqAnswers`.

Para agregar una FAQ:

1. Agrega una entrada en `T.faqList.es.sections` y `T.faqList.en.sections` con un `id` único.
2. Agrega la respuesta en `T.faqAnswers` con el mismo `id`.

---

## Notas importantes

- **Sin pagos:** El chatbot NO procesa pagos, solo gestiona reservaciones.
- **Cancelaciones:** El bot registra la solicitud con una nota y deja el status como `pendiente` para que el admin la revise y cancele definitivamente desde el panel.
- **Sesión en RAM:** El estado de conversación (ej: "esperando confirmación de cancelación") se guarda en memoria. Si la Edge Function se reinicia, el estado se pierde. Para mayor robustez en producción, se puede migrar a una tabla Supabase o Deno KV.
- **Teléfono:** La identificación del cliente es automática por número de WhatsApp. Se normalizan los prefijos (+52, 52, 521) para evitar falsos negativos.
