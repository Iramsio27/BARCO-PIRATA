# 🗄️ Supabase – Base de datos y Edge Functions

Estructura de este directorio:

```
supabase/
├── migrations/
│   ├── 00001_initial_schema.sql           ← tablas, enums, índices
│   ├── 00002_triggers_and_functions.sql   ← updated_at, auditoría, daily_report
│   ├── 00003_row_level_security.sql       ← políticas RLS
│   └── 00004_security_hardening.sql       ← is_staff/is_admin + restricciones
├── functions/
│   └── create-payment-intent/             ← Edge Function para Stripe
└── seed.sql                               ← datos demo + usuarios test
```

## 📌 Estado actual (proyecto `foaimrzqvsgiffmvyebr`)

- ✅ 4 migraciones aplicadas
- ✅ 2 usuarios de prueba creados
- ✅ 9 reservaciones demo insertadas
- ✅ Edge Function `create-payment-intent` desplegada
- ⏳ `STRIPE_SECRET_KEY` pendiente (ver `docs/STRIPE_SETUP.md`)

## 👥 Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Admin** | `admin@barcopirata.mx` | `BarcoPirata2026!` |
| **Vendedor** | `vendedor@barcopirata.mx` | `Vendedor2026!` |

> ⚠️ **Cámbialas antes de producción.** Son contraseñas de desarrollo.

Para cambiar una contraseña desde SQL:

```sql
update auth.users
set encrypted_password = crypt('NUEVA_CONTRASEÑA', gen_salt('bf'))
where email = 'admin@barcopirata.mx';
```

## 🔄 Reaplicar en un proyecto nuevo

```bash
# 1. Link al proyecto
npx supabase link --project-ref <tu-project-ref>

# 2. Push de migraciones
npx supabase db push

# 3. Cargar datos demo (solo dev)
psql "$SUPABASE_DB_URL" -f supabase/seed.sql

# 4. Deploy de Edge Function
npx supabase functions deploy create-payment-intent --no-verify-jwt

# 5. Configurar secret de Stripe
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

## 📊 Diagrama ER

Ver `docs/ARCHITECTURE.md` sección "Modelo de datos".

## 🔒 Seguridad

Ver `docs/SECURITY.md` para:
- Matriz de permisos RLS
- Plan de bitácora, respaldo y recuperación
- Medidas contra OWASP Top 10
