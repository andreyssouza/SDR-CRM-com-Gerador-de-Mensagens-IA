-- ============================================================
-- Migration 004: Fix handle_new_user trigger
-- Problema: RLS em workspace_members bloqueava o insert do trigger
-- porque novo usuário não é membro de nenhum workspace ainda.
-- Solução: desativar row security dentro da função (security definer
-- rodando como postgres/superusuário tem essa permissão).
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_slug         text;
  v_name         text;
begin
  -- Desativa RLS para esta transação (permitido para security definer / superusuário)
  set local row_security = off;

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
