# 🔐 Plan de Seguridad — Barco Pirata

> **Anexo C** del Caso Práctico C3.
> Complementa el capítulo 7 del documento principal con la matriz detallada de amenazas, políticas RLS, procedimientos de bitácora y respaldo, y procedimientos de recuperación paso a paso.

---

## 1. Modelo de amenazas

| Actor | Amenaza | Mitigación |
|-------|---------|------------|
| Cliente anónimo | Inyección SQL en formularios | Zod + parámetros preparados (Supabase SDK) |
| Cliente anónimo | XSS vía nombre/notas | DOMPurify antes de persistir y al renderizar |
| Cliente anónimo | Spam de reservaciones falsas | Rate limiting en Supabase + validación de cupo + CAPTCHA (futuro) |
| Cliente anónimo | **Navegación lateral al panel admin tras pagar** | Corregido: el flujo de pago navega a `/recibo/:id` (ruta pública) nunca a `/admin/*` |
| Atacante externo | Robo de credenciales de correo | `RESEND_API_KEY` solo en Supabase secrets (vault) |
| Atacante externo | Manipulación de monto al pagar | La Edge Function calcula el monto desde la BD, no del request |
| Atacante externo | Flood de correos | Resend aplica rate limit por API key + Edge Function valida un correo por reservación |
| Usuario autenticado (vendedor) | Acceso a datos que no le corresponden | Row Level Security (RLS) por rol con helpers `is_staff()` / `is_admin()` |
| Usuario autenticado | Borrado malicioso | Bitácora `audit_log` con trigger inmutable |
| Sesión | Secuestro de token | Sesiones firmadas + refresh automático de Supabase Auth |
| Desarrollador | Commit accidental de secretos | `.env.local` en `.gitignore` + revisión de PRs |

---

## 2. Bitácora (audit_log)

La tabla `public.audit_log` registra:

- Usuario (`user_id`, `user_email`)
- Acción (`INSERT` / `UPDATE` / `DELETE`)
- Tabla y registro afectados
- Valores anteriores y nuevos (`jsonb`)
- IP y User-Agent
- Timestamp

Triggers activos en: `reservations`, `payments`.

### Consultas típicas

**Eventos de las últimas 24 h:**

```sql
select user_email, action, table_name, record_id, created_at
from public.audit_log
where created_at >= now() - interval '24 hours'
order by created_at desc;
```

**Reservaciones eliminadas en los últimos 30 días:**

```sql
select created_at, user_email, record_id, old_values
from public.audit_log
where table_name = 'reservations'
  and action     = 'DELETE'
  and created_at >= now() - interval '30 days';
```

**Actividad por usuario:**

```sql
select user_email, action, count(*) as total
from public.audit_log
where created_at >= now() - interval '7 days'
group by user_email, action
order by total desc;
```

### Retención

- **En línea:** 365 días (sin purga automática).
- **Archivo frío:** export mensual a almacenamiento offline (CSV/Parquet) para análisis histórico.
- **Legal:** si la operación requiere cumplimiento fiscal, conservar al menos 5 años en frío.

---

## 3. Respaldo y recuperación

### 3.1 Respaldo automático (Supabase)

Supabase realiza **respaldos diarios automáticos** retenidos por 7 días en el plan gratuito y hasta 30 días en planes superiores. Point-in-Time Recovery (PITR) de 7 días en plan Pro.

### 3.2 Respaldo manual (recomendado semanal)

```bash
# Export completo de la BD en formato custom (más eficiente)
pg_dump "$DATABASE_URL" --format=custom --no-owner \
  --file=backups/barco_$(date +%Y%m%d).dump

# Solo datos, sin esquema
pg_dump "$DATABASE_URL" --data-only \
  --file=backups/barco_$(date +%Y%m%d)_data.sql
```

Los backups deben almacenarse **cifrados** en:

- Google Drive / OneDrive empresarial, o
- Almacenamiento S3 con versionado y cifrado at-rest, o
- Disco duro externo offline (air-gapped) para protección contra ransomware.

### 3.3 Verificación de integridad

Cada respaldo se restaura en un entorno de pruebas **dentro de las primeras 24 h** para validar que no esté corrupto:

```bash
# Crea proyecto de test
createdb barco_test
pg_restore --clean --if-exists --no-owner \
  --dbname=barco_test backups/barco_YYYYMMDD.dump

# Verifica conteos básicos
psql barco_test -c "select count(*) from reservations;"
psql barco_test -c "select count(*) from payments;"
psql barco_test -c "select count(*) from audit_log;"
```

### 3.4 Recuperación

```bash
# Desde dump custom
pg_restore --clean --if-exists --no-owner \
  --dbname="$DATABASE_URL" backups/barco_YYYYMMDD.dump

# Desde SQL plano
psql "$DATABASE_URL" < backups/YYYYMMDD.sql

# Desde el dashboard de Supabase
# Database → Backups → Restore → seleccionar fecha
```

### 3.5 Objetivos de nivel de servicio

| Métrica | Objetivo | Notas |
|---------|----------|-------|
| **RPO** (Recovery Point Objective) | 24 horas | Respaldo diario garantiza no perder más de un día |
| **RTO** (Recovery Time Objective) | 4 horas | Tiempo típico de restauración completa |
| **PITR** (con plan Pro) | 5 min | Restauración a cualquier punto en ventana de 7 días |

### 3.6 Simulacros trimestrales

Cada 3 meses se ejecuta un simulacro de restauración completa:

1. Crear proyecto Supabase nuevo.
2. Restaurar el dump más reciente.
3. Redesplegar Edge Functions (`send-receipt`, `create-payment-intent`).
4. Rotar secrets (`RESEND_API_KEY`, `anon_key`).
5. Redeploy del frontend apuntando al nuevo proyecto.
6. Validar con suite de pruebas manuales (crear reservación, pagar, recibir correo).
7. Documentar tiempo real vs. RTO objetivo y actualizar este plan.

---

## 4. Seguridad de pagos

### 4.1 Estado actual: formulario simulado

El formulario de pago con tarjeta (`SimulatedCardForm`) **no persiste los datos de la tarjeta** en ninguna parte. Los campos existen solo en el estado local del componente React y se descartan al terminar el flujo. La reservación se marca como `pagada` sin contactar ninguna pasarela externa.

**Protecciones aplicadas:**

- El monto a "cobrar" se lee siempre de `reservation.total` (servidor), nunca del input del cliente.
- El cliente no puede cambiar `status` directamente: solo la Edge Function `create-payment-intent` (o el RPC equivalente) tiene permiso de escritura gracias a RLS.
- El formulario valida Luhn, fecha futura y CVC antes de simular el procesamiento.

### 4.2 Cuando se conecte una pasarela real (Stripe / Mercado Pago / Conekta)

- El frontend **nunca** tocará datos de tarjeta directamente; todo pasará por el elemento de iframe aislado del proveedor (`PaymentElement` en Stripe, `Checkout` en Mercado Pago).
- La secret key se configurará como secreto de Supabase:
  ```bash
  supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
  ```
- Se implementará un webhook (ej. `stripe-webhook`) para confirmar pagos del lado del servidor y reconciliar la tabla `payments`.

---

## 5. Seguridad del envío de correos

### 5.1 Principios

- La `RESEND_API_KEY` vive únicamente como secret de Supabase, nunca en el frontend ni en el repo.
- La Edge Function `send-receipt` es la única que la usa.
- El correo del cliente se valida con regex y CHECK constraint en BD antes de ser usado.
- Los correos solo contienen HTML estático generado server-side: **no se inyecta contenido del cliente sin escapar**.
- Si Resend está caído o no responde, el flujo de pago **no se interrumpe**.

### 5.2 Prevención de abuso

- Resend aplica rate limiting por API key.
- La Edge Function solo acepta un `reservationId` válido existente en BD.
- El correo de destino es el que el cliente mismo capturó (no puede enviar a direcciones arbitrarias masivamente).

### 5.3 Verificación de dominio

Para producción se verifica el dominio propio en Resend (SPF + DKIM + DMARC), mejorando entregabilidad y evitando que los correos caigan en spam.

---

## 6. Aislamiento de rutas públicas y administrativas

**Vulnerabilidad corregida durante el desarrollo:** el flujo de pago original navegaba al cliente final hacia `/admin/venta/:id`, dando acceso lateral al panel administrativo vía la navegación del sidebar.

### 6.1 Corrección aplicada

1. **Nueva ruta pública** `/recibo/:reservationId` (componente `ReceiptPage`) que vive bajo `<PublicLayout>`.
2. **`PaymentPage`** navega siempre a `/recibo/${id}` después de procesar cualquier método.
3. **`<ProtectedRoute>`** intercepta accesos directos a `/admin/*` sin sesión válida y redirige a `/admin/login`.
4. **Verificación manual:** se confirmó que desde el flujo público no existe enlace alguno al panel admin.

### 6.2 Política de diseño

- Las rutas administrativas y públicas viven en **árboles de layout separados** (`<AdminLayout>` vs `<PublicLayout>`).
- No se comparten componentes con navegación entre ambos contextos.
- Toda nueva página se ubica conscientemente en uno de los dos árboles.

---

## 7. Row Level Security (RLS) — Matriz detallada

| Tabla | Política | Quién | Qué puede hacer |
|-------|----------|-------|-----------------|
| `reservations` | `anon_insert_reservation` | anon | INSERT propio |
| `reservations` | `anon_select_recent_reservation` | anon | SELECT de reservas de ≤ 30 días (por UUID exacto) |
| `reservations` | `staff_select_all` | authenticated | SELECT todo |
| `reservations` | `staff_update_all` | authenticated | UPDATE todo |
| `reservations` | `admin_delete` | admin | DELETE |
| `payments` | `anon_insert_if_unpaid` | anon | INSERT solo si `reservation.status != 'pagada'` |
| `payments` | `staff_select_all` | authenticated | SELECT |
| `payments` | `staff_update_all` | authenticated | UPDATE |
| `payments` | `admin_delete` | admin | DELETE |
| `user_profiles` | `self_select` | authenticated | SELECT propio |
| `user_profiles` | `admin_all` | admin | SELECT/INSERT/UPDATE/DELETE |
| `audit_log` | `admin_select` | admin | SELECT |
| `audit_log` | *(ninguna INSERT manual)* | nadie | Solo triggers `SECURITY DEFINER` escriben |

### Helpers SQL

```sql
create or replace function public.is_staff() returns boolean as $$
  select exists(select 1 from user_profiles where id = auth.uid());
$$ language sql security definer stable set search_path = public, pg_catalog;

create or replace function public.is_admin() returns boolean as $$
  select exists(
    select 1 from user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public, pg_catalog;
```

---

## 8. Secretos y variables

- ❌ **Nunca** commitear `.env.local`.
- ✅ Solo variables con prefijo `VITE_` son públicas (expuestas en el bundle).
- ✅ Claves sensibles (`RESEND_API_KEY`, `STRIPE_SECRET_KEY` si aplica) → Supabase secrets, no en el cliente.
- ✅ Rotación de claves cada **90 días** (calendarizada en el equipo).
- ✅ Al rotar, actualizar todos los entornos (staging, producción) antes de invalidar la vieja.

---

## 9. Mantenimiento y actualizaciones

```bash
npm audit                      # Revisar vulnerabilidades
npm audit fix                  # Auto-fix (solo parches menores)
npm outdated                   # Paquetes desactualizados
npm update                     # Parches seguros
```

Dependabot o Renovate pueden automatizar parte de este proceso con PRs semanales.

---

## 10. Checklist de seguridad pre-producción

- [ ] Todas las tablas públicas tienen RLS **habilitada** (no solo políticas definidas).
- [ ] Helpers `is_staff()` y `is_admin()` existen con `SECURITY DEFINER` y `search_path` fijo.
- [ ] Trigger `audit_trigger` instalado en `reservations` y `payments`.
- [ ] `RESEND_API_KEY` y `RECEIPT_FROM` configurados en Supabase secrets.
- [ ] Migración `00006_reservation_email.sql` aplicada.
- [ ] CHECK constraint de `contact_email` valida formato RFC.
- [ ] `.env.local` está en `.gitignore`.
- [ ] Secretos **no** están commiteados en el historial (revisa con `git log --all -p | grep -i 'key\|secret'`).
- [ ] Build de producción no incluye sourcemaps.
- [ ] `PaymentPage` navega a `/recibo/:id` (nunca a `/admin/*`).
- [ ] `<ProtectedRoute>` envuelve todas las rutas `/admin/*`.
- [ ] Respaldo manual más reciente se restauró exitosamente en ambiente de pruebas.
- [ ] Plan de rotación de credenciales documentado y calendarizado.

---

*Última actualización: abril 2026 — versión 2.0.*
