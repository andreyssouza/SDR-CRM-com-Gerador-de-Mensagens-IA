-- ============================================================
-- SDR CRM — Migration 003: Seed de desenvolvimento
-- ============================================================
-- ATENÇÃO: Rode apenas em ambiente de desenvolvimento.
-- Em produção, o trigger handle_new_user() cria os dados
-- automaticamente no cadastro do primeiro usuário.
-- ============================================================

-- Exemplo de campos customizados úteis para SDR
-- (executar após criar um workspace real via signup)

-- Exemplo comentado — substitua <WORKSPACE_ID> pelo ID real:
/*
insert into lead_custom_fields (workspace_id, name, field_key, field_type, position) values
  ('<WORKSPACE_ID>', 'Número de Funcionários', 'employee_count',  'select', 0),
  ('<WORKSPACE_ID>', 'Segmento',               'segment',         'select', 1),
  ('<WORKSPACE_ID>', 'Tecnologia Usada',        'tech_stack',      'text',   2),
  ('<WORKSPACE_ID>', 'Budget Estimado',         'budget',          'text',   3),
  ('<WORKSPACE_ID>', 'Fonte do Lead',           'lead_source',     'select', 4);

update lead_custom_fields
set options = '["1-10","11-50","51-200","201-500","500+"]'::jsonb
where field_key = 'employee_count';

update lead_custom_fields
set options = '["SaaS","E-commerce","Fintech","Saúde","Indústria","Outro"]'::jsonb
where field_key = 'segment';

update lead_custom_fields
set options = '["Orgânico","LinkedIn","Indicação","Evento","Cold Email","Outro"]'::jsonb
where field_key = 'lead_source';
*/
