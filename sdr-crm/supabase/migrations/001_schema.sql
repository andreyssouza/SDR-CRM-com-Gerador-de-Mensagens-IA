-- ============================================================
-- SDR CRM — Migration 001: Schema Principal
-- ============================================================
-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type workspace_member_role as enum ('owner', 'admin', 'member');
create type lead_status           as enum ('active', 'inactive', 'archived');
create type message_status        as enum ('draft', 'sent', 'archived');
create type campaign_channel      as enum ('email', 'linkedin', 'whatsapp', 'other');
create type activity_type         as enum (
  'lead_created',
  'lead_moved',
  'lead_updated',
  'message_generated',
  'message_sent',
  'campaign_applied'
);

-- ============================================================
-- WORKSPACES
-- ============================================================

create table workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text        not null,
  slug        text        not null unique,
  logo_url    text,
  created_by  uuid        not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_workspaces_slug       on workspaces(slug);
create index idx_workspaces_created_by on workspaces(created_by);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================

create table workspace_members (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid                  not null references workspaces(id) on delete cascade,
  user_id      uuid                  not null references auth.users(id)  on delete cascade,
  role         workspace_member_role not null default 'member',
  invited_by   uuid                           references auth.users(id)  on delete set null,
  joined_at    timestamptz           not null default now(),

  constraint uq_workspace_member unique (workspace_id, user_id)
);

create index idx_workspace_members_workspace on workspace_members(workspace_id);
create index idx_workspace_members_user      on workspace_members(user_id);

-- ============================================================
-- PIPELINE STAGES
-- ============================================================

create table pipeline_stages (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid    not null references workspaces(id) on delete cascade,
  name         text    not null,
  position     integer not null default 0,
  color        text    not null default '#6366f1',
  is_trigger   boolean not null default false, -- dispara geração automática de mensagem
  is_default   boolean not null default false, -- etapa inicial dos leads
  created_at   timestamptz not null default now(),

  constraint uq_stage_position unique (workspace_id, position)
);

create index idx_pipeline_stages_workspace on pipeline_stages(workspace_id);
create index idx_pipeline_stages_position  on pipeline_stages(workspace_id, position);

-- ============================================================
-- LEADS
-- ============================================================

create table leads (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid        not null references workspaces(id)       on delete cascade,
  stage_id     uuid        not null references pipeline_stages(id)  on delete restrict,
  assigned_to  uuid                 references auth.users(id)        on delete set null,

  -- Dados básicos
  name         text        not null,
  email        text,
  phone        text,
  company      text,
  role         text,        -- cargo
  linkedin_url text,
  website      text,
  notes        text,

  -- Controle
  status       lead_status not null default 'active',
  created_by   uuid        not null references auth.users(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint chk_lead_email_format check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$')
);

create index idx_leads_workspace  on leads(workspace_id);
create index idx_leads_stage      on leads(stage_id);
create index idx_leads_assigned   on leads(assigned_to);
create index idx_leads_status     on leads(workspace_id, status);
create index idx_leads_company    on leads(workspace_id, company);
create index idx_leads_created_at on leads(workspace_id, created_at desc);

-- Busca full-text
create index idx_leads_search on leads using gin(
  to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(company,'') || ' ' || coalesce(email,''))
);

-- ============================================================
-- LEAD CUSTOM FIELDS (definição por workspace)
-- ============================================================

create table lead_custom_fields (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid    not null references workspaces(id) on delete cascade,
  name         text    not null,
  field_key    text    not null,            -- snake_case, usado no prompt da IA
  field_type   text    not null default 'text'
    check (field_type in ('text', 'number', 'boolean', 'select', 'date')),
  options      jsonb,                       -- para type = 'select'
  is_required  boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),

  constraint uq_custom_field_key unique (workspace_id, field_key)
);

create index idx_custom_fields_workspace on lead_custom_fields(workspace_id);

-- ============================================================
-- LEAD CUSTOM VALUES (valores por lead)
-- ============================================================

create table lead_custom_values (
  id       uuid primary key default uuid_generate_v4(),
  lead_id  uuid not null references leads(id)              on delete cascade,
  field_id uuid not null references lead_custom_fields(id) on delete cascade,
  value    text,

  constraint uq_custom_value unique (lead_id, field_id)
);

create index idx_custom_values_lead  on lead_custom_values(lead_id);
create index idx_custom_values_field on lead_custom_values(field_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================

create table campaigns (
  id             uuid primary key default uuid_generate_v4(),
  workspace_id   uuid             not null references workspaces(id) on delete cascade,
  name           text             not null,
  description    text,
  channel        campaign_channel not null default 'linkedin',
  context        text             not null, -- contexto do produto/serviço para a IA
  prompt         text             not null, -- instrução de tom/objetivo para a IA
  trigger_stage_id uuid           references pipeline_stages(id) on delete set null,
  is_active      boolean          not null default true,
  created_by     uuid             not null references auth.users(id) on delete restrict,
  created_at     timestamptz      not null default now(),
  updated_at     timestamptz      not null default now()
);

create index idx_campaigns_workspace     on campaigns(workspace_id);
create index idx_campaigns_trigger_stage on campaigns(trigger_stage_id);
create index idx_campaigns_active        on campaigns(workspace_id, is_active);

-- ============================================================
-- GENERATED MESSAGES
-- ============================================================

create table generated_messages (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid           not null references workspaces(id)  on delete cascade,
  lead_id      uuid           not null references leads(id)        on delete cascade,
  campaign_id  uuid           not null references campaigns(id)    on delete cascade,
  generated_by uuid           not null references auth.users(id)   on delete restrict,

  content      text           not null,
  variation    smallint       not null check (variation between 1 and 5),
  status       message_status not null default 'draft',
  prompt_used  text,          -- snapshot do prompt usado (auditoria)
  model_used   text           not null default 'gpt-4o',

  sent_at      timestamptz,
  created_at   timestamptz    not null default now()
);

create index idx_messages_workspace  on generated_messages(workspace_id);
create index idx_messages_lead       on generated_messages(lead_id);
create index idx_messages_campaign   on generated_messages(campaign_id);
create index idx_messages_status     on generated_messages(workspace_id, status);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

create table activity_logs (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid          not null references workspaces(id) on delete cascade,
  lead_id      uuid                   references leads(id)       on delete set null,
  user_id      uuid                   references auth.users(id)  on delete set null,
  type         activity_type not null,
  metadata     jsonb         not null default '{}',
  created_at   timestamptz   not null default now()
);

create index idx_activity_workspace  on activity_logs(workspace_id);
create index idx_activity_lead       on activity_logs(lead_id);
create index idx_activity_user       on activity_logs(user_id);
create index idx_activity_type       on activity_logs(workspace_id, type);
create index idx_activity_created_at on activity_logs(workspace_id, created_at desc);

-- ============================================================
-- UPDATED_AT TRIGGER (reutilizável)
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_workspaces_updated_at
  before update on workspaces
  for each row execute function set_updated_at();

create trigger trg_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

-- ============================================================
-- AUTO-CREATE WORKSPACE ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_workspace_id uuid;
  v_slug         text;
  v_name         text;
begin
  -- Nome do workspace a partir do email
  v_name := split_part(new.email, '@', 1);
  v_slug := lower(regexp_replace(v_name, '[^a-z0-9]', '-', 'g'))
            || '-' || substr(new.id::text, 1, 8);

  -- Cria workspace padrão
  insert into workspaces (name, slug, created_by)
  values (v_name || '''s workspace', v_slug, new.id)
  returning id into v_workspace_id;

  -- Adiciona como owner
  insert into workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  -- Cria etapas padrão do funil
  insert into pipeline_stages (workspace_id, name, position, color, is_default, is_trigger) values
    (v_workspace_id, 'Base',               0, '#94a3b8', true,  false),
    (v_workspace_id, 'Lead Mapeado',        1, '#60a5fa', false, false),
    (v_workspace_id, 'Tentando Contato',    2, '#f59e0b', false, true),
    (v_workspace_id, 'Conexão Iniciada',    3, '#a78bfa', false, false),
    (v_workspace_id, 'Qualificado',         4, '#34d399', false, false),
    (v_workspace_id, 'Reunião Agendada',    5, '#10b981', false, false),
    (v_workspace_id, 'Desqualificado',      6, '#f87171', false, false);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
