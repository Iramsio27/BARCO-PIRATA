# 🔐 Plan de Seguridad – Barco Pirata

## 1. Modelo de amenazas

| Actor | Amenaza | Mitigación |
|-------|---------|------------|
| Cliente anónimo | Inyección SQL en formularios | Zod + parámetros preparados (Supabase SDK) |
| Cliente anónimo | XSS vía nombre/notas | DOMPurify antes de persistir y al renderizar |
| Cliente anónimo | Spam de reservaciones falsas | Rate limiting en Supabase + CAPTCHA (futuro) |
| Atacante externo | Robo de credenciales de pago | **Secret key de Stripe solo en Edge Functions** |
| Atacante externo | Manipulación de monto al pagar | El Edge Function calcula el monto desde la BD, no del request |
| Usuario autenticado (vendedor) | Acceso a datos de otros | Row Level Security (RLS) por rol |
| Usuario autenticado | Borrado malicioso | Bitácora `audit_log` con trigger inmutable |
| Sesión | Secuestro de token | Sesiones firmadas + refresh automático de Supabase |

## 2. Bitácora (audit_log)

La tabla `public.audit_log` registra:

- Usuario (`user_id`, `user_email`)
- Acción (`INSERT` / `UPDATE` / `DELETE`)
- Tabla y registro afectados
- Valores anteriores y nuevos (`jsonb`)
- IP y User-Agent
- Timestamp

Triggers activos en: `reservations`, `payments`.

Consulta de auditoría diaria:

```sql
select user_email, action, table_name, record_id, created_at
from public.audit_log
where created_at >= now() - interval '24 hours'
order by created_at desc;
```

## 3. Respaldo y recuperación

### Respaldo automático (Supabase)

Supabase realiza **respaldos diarios automáticos** retenidos por 7 días en el
plan gratuito y hasta 30 días en planes superiores.

### Respaldo manual (recomendado semanal)

```bash
# Export completo de la BD
supabase db dump -f backups/$(date +%Y%m%d).sql

# O solo datos (sin esquema)
supabase db dump --data-only -f backups/$(date +%Y%m%d)_data.sql
```

Los backups deben almacenarse **cifrados** en:
- Google Drive / OneDrive empresarial, o
- Almacenamiento S3 con versionado y cifrado at-rest.

### Recuperación

```bash
# Restaurar desde backup SQL
psql $SUPABASE_DB_URL < backups/YYYYMMDD.sql

# Restaurar punto en el tiempo (PITR, planes pagados)
# Desde el dashboard de Supabase: Database → Backups → Restore
```

**RPO objetivo:** 24 horas
**RTO objetivo:** 4 horas

## 4. Seguridad de pagos (PCI DSS via Stripe)

- El frontend **nunca** toca datos de tarjeta directamente; todo pasa por
  `PaymentElement` de Stripe (iframe aislado).
- La secret key se configura como secreto de Supabase:
  ```bash
  supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
  ```
- Webhook de Stripe (futuro) para confirmar pagos del lado del servidor y
  reconciliar la tabla `payments`.

## 5. Secretos y variables

- ❌ Nunca commitear `.env.local`
- ✅ Solo variables con prefijo `VITE_` son públicas
- ✅ Claves sensibles → Supabase secrets, no en el cliente
- ✅ Rotación de claves cada 90 días

## 6. Actualizaciones

```bash
npm audit                      # Revisar vulnerabilidades
npm audit fix                  # Auto-fix
npm outdated                   # Paquetes desactualizados
```
