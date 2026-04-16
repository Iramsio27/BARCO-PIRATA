import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY'
  )
}

/**
 * Cliente Supabase singleton.
 *
 * Para habilitar types fuertes basados en tu esquema real:
 *   1) npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *   2) Importa `Database` desde './database.types' y pásalo como genérico:
 *      createClient<Database>(supabaseUrl, supabaseAnonKey, ...)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
