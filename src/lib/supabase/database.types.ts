/**
 * Tipos generados a partir del esquema de Supabase.
 * Para regenerar: npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      reservations: {
        Row: {
          id: string
          contact_name: string
          contact_phone: string
          date: string
          time: string
          number_of_people: number
          package_id: string
          service_type: string
          subtotal: number
          discount: number
          total: number
          status: string
          payment_method: string | null
          payment_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>
      }
      payments: {
        Row: {
          id: string
          reservation_id: string
          method: string
          amount: number
          status: string
          transferencia_reference: string | null
          receipt_url: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      reservation_status: 'pendiente' | 'confirmada' | 'pagada' | 'cancelada'
      payment_method: 'efectivo' | 'transferencia'
      payment_status: 'pendiente' | 'completado' | 'fallido' | 'reembolsado'
    }
  }
}
