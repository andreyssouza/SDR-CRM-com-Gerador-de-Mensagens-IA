-- ============================================================
-- SDR CRM — Migration 002: Row Level Security
-- ============================================================
-- Habilitar RLS em todas as tabelas de negócio
alter table workspaces          enable row level security;
alter table workspace_members   enable row level security;
alter table pipeline_stages     enable row level security;
alter table leads               enable row level security;
alter table lead_custom_fields  enable row level security;
alter table lead_custom_values  enable row level security;
alter table campaigns           enable row level security;
alter table generated_messages  enable row level security;
alter table activity_logs       enable row level security;

-- ============================================================
-- HELPER FUNCTION
-- Retorna os workspace_ids que o usuário logado é membro
-- ============================================================

create or replace function get_user_workspace_ids()
returns setof uuid language sql stable security definer as $$
  select workspace_id
  from   workspace_members
  where  user_id = auth.uid();
$$;

-- ============================================================
-- WORKSPACES
-- ============================================================

-- Leitura: apenas workspaces onde é membro
create policy "workspaces: members can view"
  on workspaces for select
  using (id in (select get_user_workspace_ids()));

-- Criação: qualquer usuário autenticado pode criar workspace
create policy "workspaces: authenticated can create"
  on workspaces for insert
  with check (auth.uid() = created_by);

-- Atualização: somente owner/admin
create policy "workspaces: owner/admin can update"
  on workspaces for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspaces.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Exclusão: somente owner
create policy "workspaces: owner can delete"
  on workspaces for delete
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspaces.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================

create policy "workspace_members: members can view"
  on workspace_members for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "workspace_members: owner/admin can insert"
  on workspace_members for insert
  with check (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

create policy "workspace_members: owner can update roles"
  on workspace_members for update
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

create policy "workspace_members: owner/admin can delete"
  on workspace_members for delete
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- PIPELINE STAGES
-- ============================================================

create policy "pipeline_stages: members can view"
  on pipeline_stages for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "pipeline_stages: owner/admin can manage"
  on pipeline_stages for all
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = pipeline_stages.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- LEADS
-- ============================================================

create policy "leads: members can view"
  on leads for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "leads: members can create"
  on leads for insert
  with check (
    workspace_id in (select get_user_workspace_ids())
    and auth.uid() = created_by
  );

create policy "leads: members can update"
  on leads for update
  using (workspace_id in (select get_user_workspace_ids()));

create policy "leads: owner/admin can delete"
  on leads for delete
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = leads.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- LEAD CUSTOM FIELDS
-- ============================================================

create policy "custom_fields: members can view"
  on lead_custom_fields for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "custom_fields: owner/admin can manage"
  on lead_custom_fields for all
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = lead_custom_fields.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- LEAD CUSTOM VALUES
-- ============================================================

-- Acesso via lead (precisa que o lead seja do workspace do usuário)
create policy "custom_values: members can view"
  on lead_custom_values for select
  using (
    exists (
      select 1 from leads
      where leads.id = lead_custom_values.lead_id
        and leads.workspace_id in (select get_user_workspace_ids())
    )
  );

create policy "custom_values: members can manage"
  on lead_custom_values for all
  using (
    exists (
      select 1 from leads
      where leads.id = lead_custom_values.lead_id
        and leads.workspace_id in (select get_user_workspace_ids())
    )
  );

-- ============================================================
-- CAMPAIGNS
-- ============================================================

create policy "campaigns: members can view"
  on campaigns for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "campaigns: members can create"
  on campaigns for insert
  with check (
    workspace_id in (select get_user_workspace_ids())
    and auth.uid() = created_by
  );

create policy "campaigns: owner/admin can update"
  on campaigns for update
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = campaigns.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "campaigns: owner/admin can delete"
  on campaigns for delete
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = campaigns.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- GENERATED MESSAGES
-- ============================================================

create policy "messages: members can view"
  on generated_messages for select
  using (workspace_id in (select get_user_workspace_ids()));

create policy "messages: members can create"
  on generated_messages for insert
  with check (
    workspace_id in (select get_user_workspace_ids())
    and auth.uid() = generated_by
  );

-- Apenas atualizar status (ex: marcar como enviada)
create policy "messages: members can update status"
  on generated_messages for update
  using (workspace_id in (select get_user_workspace_ids()));

create policy "messages: owner/admin can delete"
  on generated_messages for delete
  using (
    workspace_id in (select get_user_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = generated_messages.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

create policy "activity_logs: members can view"
  on activity_logs for select
  using (workspace_id in (select get_user_workspace_ids()));

-- Inserção permitida a qualquer membro (e via service_role para automações)
create policy "activity_logs: members can insert"
  on activity_logs for insert
  with check (workspace_id in (select get_user_workspace_ids()));

-- Logs nunca devem ser atualizados nem deletados por usuários
-- (somente via service_role, ex: retenção/purge)
