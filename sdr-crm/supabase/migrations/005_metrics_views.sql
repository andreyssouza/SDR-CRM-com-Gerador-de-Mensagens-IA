-- ============================================================
-- 005_metrics_views.sql — Views para métricas avançadas
-- ============================================================

-- Taxa de conversão: quantas vezes leads transitaram entre etapas
CREATE OR REPLACE VIEW stage_transition_counts AS
SELECT
  workspace_id,
  (metadata->>'from_stage_id')::uuid AS from_stage_id,
  (metadata->>'to_stage_id')::uuid   AS to_stage_id,
  COUNT(*)                            AS transition_count
FROM activity_logs
WHERE type = 'lead_moved'
  AND metadata->>'from_stage_id' IS NOT NULL
  AND metadata->>'to_stage_id'   IS NOT NULL
GROUP BY workspace_id, from_stage_id, to_stage_id;

-- Leads criados por semana (últimas 12 semanas)
CREATE OR REPLACE VIEW leads_per_week AS
SELECT
  workspace_id,
  date_trunc('week', created_at)::date AS week_start,
  COUNT(*)                              AS lead_count
FROM leads
WHERE status != 'archived'
GROUP BY workspace_id, week_start;

-- Mensagens geradas e enviadas por campanha
CREATE OR REPLACE VIEW messages_per_campaign AS
SELECT
  gm.workspace_id,
  gm.campaign_id,
  c.name                                            AS campaign_name,
  c.channel,
  COUNT(*)                                          AS total_generated,
  COUNT(*) FILTER (WHERE gm.status = 'sent')        AS total_sent,
  COUNT(*) FILTER (WHERE gm.status = 'draft')       AS total_draft,
  COUNT(*) FILTER (WHERE gm.status = 'archived')    AS total_archived
FROM generated_messages gm
JOIN campaigns c ON c.id = gm.campaign_id
GROUP BY gm.workspace_id, gm.campaign_id, c.name, c.channel;

-- Resumo de leads ativos por etapa com nome da etapa
CREATE OR REPLACE VIEW leads_by_stage_summary AS
SELECT
  l.workspace_id,
  l.stage_id,
  ps.name     AS stage_name,
  ps.color    AS stage_color,
  ps.position AS stage_position,
  COUNT(*)    AS lead_count
FROM leads l
JOIN pipeline_stages ps ON ps.id = l.stage_id
WHERE l.status = 'active'
GROUP BY l.workspace_id, l.stage_id, ps.name, ps.color, ps.position;
