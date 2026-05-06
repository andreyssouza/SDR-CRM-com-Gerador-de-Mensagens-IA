// ============================================================
// SDR CRM — Tipos globais (espelham o schema do banco)
// ============================================================

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member'
export type LeadStatus          = 'active' | 'inactive' | 'archived'
export type MessageStatus       = 'draft' | 'sent' | 'archived'
export type CampaignChannel     = 'email' | 'linkedin' | 'whatsapp' | 'other'
export type ActivityType =
  | 'lead_created' | 'lead_moved'   | 'lead_updated'
  | 'message_generated'             | 'message_sent'
  | 'campaign_applied'

// ── Workspace ────────────────────────────────────────────────

export interface Workspace {
  id:         string
  name:       string
  slug:       string
  logo_url:   string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id:           string
  workspace_id: string
  user_id:      string
  role:         WorkspaceMemberRole
  invited_by:   string | null
  joined_at:    string
}

// ── Pipeline ─────────────────────────────────────────────────

export interface PipelineStage {
  id:           string
  workspace_id: string
  name:         string
  position:     number
  color:        string
  is_trigger:   boolean
  is_default:   boolean
  created_at:   string
}

// ── Leads ────────────────────────────────────────────────────

export interface Lead {
  id:           string
  workspace_id: string
  stage_id:     string
  assigned_to:  string | null
  name:         string
  email:        string | null
  phone:        string | null
  company:      string | null
  role:         string | null
  linkedin_url: string | null
  website:      string | null
  notes:        string | null
  status:       LeadStatus
  created_by:   string
  created_at:   string
  updated_at:   string
  // joins opcionais
  stage?:            PipelineStage
  custom_values?:    LeadCustomValue[]
}

export interface LeadCustomField {
  id:           string
  workspace_id: string
  name:         string
  field_key:    string
  field_type:   'text' | 'number' | 'boolean' | 'select' | 'date'
  options:      string[] | null
  is_required:  boolean
  position:     number
  created_at:   string
}

export interface LeadCustomValue {
  id:       string
  lead_id:  string
  field_id: string
  value:    string | null
  // join
  field?: LeadCustomField
}

// ── Campaigns ────────────────────────────────────────────────

export interface Campaign {
  id:               string
  workspace_id:     string
  name:             string
  description:      string | null
  channel:          CampaignChannel
  context:          string
  prompt:           string
  trigger_stage_id: string | null
  is_active:        boolean
  created_by:       string
  created_at:       string
  updated_at:       string
}

// ── Generated Messages ───────────────────────────────────────

export interface GeneratedMessage {
  id:           string
  workspace_id: string
  lead_id:      string
  campaign_id:  string
  generated_by: string
  content:      string
  variation:    number
  status:       MessageStatus
  prompt_used:  string | null
  model_used:   string
  sent_at:      string | null
  created_at:   string
}

// ── Activity Logs ────────────────────────────────────────────

export interface ActivityLog {
  id:           string
  workspace_id: string
  lead_id:      string | null
  user_id:      string | null
  type:         ActivityType
  metadata:     Record<string, unknown>
  created_at:   string
}

// ── Utilitários ──────────────────────────────────────────────

export interface KanbanColumn {
  stage:  PipelineStage
  leads:  Lead[]
}

export interface GenerateMessagesPayload {
  lead_id:     string
  campaign_id: string
}

export interface GenerateMessagesResponse {
  messages: GeneratedMessage[]
}

export interface DashboardMetrics {
  total_leads:     number
  leads_by_stage:  { stage: PipelineStage; count: number }[]
  messages_sent:   number
  active_campaigns: number
}
