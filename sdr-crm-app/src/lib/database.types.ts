// Tipos gerados para o cliente Supabase com tipagem do banco.
// Em produção: use `supabase gen types typescript` para gerar automaticamente.
export type Database = {
  public: {
    Tables: {
      workspaces:          { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      workspace_members:   { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      pipeline_stages:     { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      leads:               { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      lead_custom_fields:  { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      lead_custom_values:  { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      campaigns:           { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      generated_messages:  { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      activity_logs:       { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
    Views:    Record<string, never>
    Functions: Record<string, never>
    Enums:    Record<string, never>
  }
}
