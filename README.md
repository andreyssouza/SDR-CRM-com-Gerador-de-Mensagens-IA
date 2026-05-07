# SDR CRM — Gerenciador de Pipeline com IA

Sistema de CRM para SDRs (Sales Development Representatives) com pipeline Kanban, geração automática de mensagens via IA e métricas em tempo real, construído em ambiente multi-tenant.

---

## Descrição do Projeto

O SDR CRM é uma aplicação web full-stack que permite a equipes de vendas gerenciar leads em um pipeline visual do tipo Kanban, criar campanhas de outreach multicanal e gerar mensagens personalizadas automaticamente com IA no momento em que um lead avança para uma etapa estratégica do funil.

A aplicação suporta múltiplos workspaces isolados (multi-tenancy), controle de acesso por papel (owner / admin / member), histórico completo de atividades e um dashboard de métricas com gráficos e KPIs.

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilização | Tailwind CSS |
| Roteamento | React Router v7 |
| Drag-and-drop | @dnd-kit (core + sortable) |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Backend / Banco | Supabase (PostgreSQL 15 + Auth + Edge Functions) |
| IA | Google Gemini 2.5 Flash (via Supabase Edge Function) |
| Runtime Edge | Deno (Supabase Edge Functions) |

---

## Decisões Técnicas

### Banco de dados — Supabase + PostgreSQL

O Supabase foi escolhido por oferecer, em uma única plataforma, banco relacional (PostgreSQL), autenticação, Row Level Security (RLS) e Edge Functions — eliminando a necessidade de um servidor backend dedicado.

O esquema foi estruturado em torno do conceito de `workspace` como raiz de isolamento multi-tenant: todas as tabelas principais (`pipeline_stages`, `leads`, `campaigns`, `generated_messages`, `activity_logs`) possuem a coluna `workspace_id` com chave estrangeira e índice. Isso garante que cada consulta naturalmente escopa os dados ao tenant correto.

Views foram criadas para as métricas do dashboard (`leads_per_week`, `messages_per_campaign`, `stage_transition_counts`, `leads_by_stage_summary`), evitando agregações pesadas em tempo de execução no cliente.

### Integração com LLM — Google Gemini via Edge Function

A geração de mensagens acontece em uma Supabase Edge Function (Deno) chamada `generate-messages`. A escolha por Edge Functions mantém a chave de API do Gemini no servidor, nunca exposta ao cliente.

O fluxo de integração é:

1. O frontend invoca `supabase.functions.invoke('generate-messages')` de forma não-bloqueante.
2. A Edge Function autentica o JWT do usuário, busca os dados do lead e da campanha.
3. Variáveis do template (`{{nome}}`, `{{empresa}}`, `{{cargo}}`, `{{email}}`) são substituídas dinamicamente no prompt.
4. A API do Gemini 2.5 Flash é chamada com `temperature: 0.9` e até 5 variações configuráveis.
5. As mensagens são salvas com `status='draft'` para revisão do SDR antes do envio.
6. A atividade é registrada no `activity_logs` com metadados JSONB.

O modelo Gemini 2.5 Flash foi escolhido pelo equilíbrio entre velocidade, custo e qualidade de texto para outreach comercial. A instrução de sistema varia por canal (LinkedIn, Email, WhatsApp), ajustando tom e formato da mensagem gerada.

### Multi-tenancy — Row Level Security

O isolamento entre tenants é implementado 100% no banco de dados via RLS, sem depender de filtros no código da aplicação. Uma função auxiliar PostgreSQL `get_user_workspace_ids()` retorna os IDs dos workspaces do usuário autenticado, e todas as policies de RLS utilizam essa função.

Cada policy segue o padrão:
- **SELECT**: somente membros do workspace podem ver os dados.
- **INSERT / UPDATE**: somente owner ou admin podem criar/editar recursos do workspace.
- **DELETE**: restrito a owners.

Na criação de conta, um trigger PostgreSQL cria automaticamente o workspace padrão do usuário e o registra como owner em `workspace_members`, garantindo que todo usuário novo tenha um ambiente isolado desde o primeiro login.

### Trigger de IA automático no Kanban

A lógica de trigger de IA está em `useLeads.ts`: quando um lead é movido para um estágio com `is_trigger = true`, o hook busca todas as campanhas ativas vinculadas àquele estágio e invoca a Edge Function para cada uma de forma assíncrona. O SDR arrasta o card e as mensagens são geradas em background, aparecendo na aba de Campanhas como rascunhos — sem bloquear a UX.

---

## Desafios Encontrados e Como Foram Resolvidos

**Isolamento multi-tenant sem vazamento de dados**
O maior risco era queries sem o filtro de `workspace_id`. A solução foi delegar o isolamento inteiramente ao PostgreSQL via RLS — se o código esquecer o filtro, o banco recusa. A função `get_user_workspace_ids()` é chamada em cada policy usando o JWT da sessão para identificar o tenant.

**Drag-and-drop com atualização imediata**
O @dnd-kit realiza a atualização visual de forma otimista no cliente. Em caso de falha na escrita no Supabase, o hook reverte o estado local, evitando inconsistência entre UI e banco.

**Evitar exposição da chave de API do Gemini**
Toda comunicação com a API do Gemini ocorre exclusivamente dentro da Edge Function Deno, cujos secrets são configurados no painel do Supabase e nunca chegam ao bundle do frontend.

**Performance no dashboard**
As queries de métricas agregavam dados de múltiplas tabelas com JOINs e GROUP BY. A solução foi criar views PostgreSQL para pré-agregar os dados, reduzindo significativamente o tempo de resposta.

**Trigger de novo usuário com race condition**
O trigger de criação automática de workspace falhava quando o perfil do usuário ainda não tinha sido persistido. Foi necessário criar uma migration específica (`004_fix_new_user_trigger.sql`) ajustando a ordem de operações e adicionando tratamento de conflito com `ON CONFLICT DO NOTHING`.

---

## Funcionalidades Implementadas

### Obrigatórias

- [x] Autenticação de usuários (cadastro, login, logout) via Supabase Auth
- [x] Pipeline Kanban com arrastar e soltar entre estágios
- [x] Criação, edição e arquivamento de leads
- [x] Gestão de estágios do pipeline (criar, renomear, reordenar)
- [x] Campanhas de outreach multicanal (Email, LinkedIn, WhatsApp, Outro)
- [x] Geração de mensagens com IA (Google Gemini 2.5 Flash)
- [x] Trigger automático de geração de mensagem ao mover lead para estágio configurado
- [x] Revisão e envio de mensagens geradas (draft → sent)
- [x] Dashboard com KPIs (total de leads, mensagens enviadas, campanhas ativas)
- [x] Histórico de atividades por lead e geral
- [x] Multi-tenancy com isolamento via RLS

### Diferenciais

- [x] Múltiplas variações de mensagem por campanha (configurável, até 5)
- [x] Prompt templates com variáveis dinâmicas do lead (`{{nome}}`, `{{empresa}}`, etc.)
- [x] Instrução de sistema diferente por canal (tom ajustado para LinkedIn, Email, WhatsApp)
- [x] Dashboard com gráfico de leads por semana (últimas 12 semanas) via Recharts
- [x] Tabela de performance por campanha (geradas, enviadas, rascunhos, arquivadas)
- [x] Filtros no Kanban (busca por nome, filtro por estágio, filtro por responsável)
- [x] Campos customizados de leads por workspace (extensão sem alteração de schema)
- [x] Views PostgreSQL para métricas pré-agregadas
- [x] Log de atividades com metadados JSONB (tipo, valores anterior/posterior, usuário)
- [x] Controle de acesso por papel: owner, admin, member

---

## Como Executar Localmente

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com)
- Chave de API do [Google Gemini](https://aistudio.google.com)

### Passo a passo

```bash
# 1. Entre na pasta do frontend
cd sdr-crm-app

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# Crie um arquivo .env.local com:
# VITE_SUPABASE_URL=https://seu-projeto.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-anon-key

# 4. Aplique as migrations no seu projeto Supabase
# Copie os arquivos de sdr-crm/supabase/migrations/ para o SQL Editor do Supabase
# e execute na ordem: 001, 002, 003, 004, 005

# 5. Configure o secret da Edge Function no painel do Supabase
# Settings > Edge Functions > Secrets: GEMINI_API_KEY=sua-chave

# 6. Faça o deploy da Edge Function (requer Supabase CLI)
supabase functions deploy generate-messages --project-ref seu-project-ref

# 7. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## Estrutura de Pastas

```
sdr-crm-app/               # Frontend React
├── src/
│   ├── components/        # Componentes UI (Kanban, Campaigns, Layout, primitivos)
│   ├── context/           # AuthContext (sessão + workspace)
│   ├── hooks/             # Camada de dados (useLeads, useCampaigns, useDashboard...)
│   ├── lib/               # Cliente Supabase, tipos TypeScript, utilitários
│   └── pages/             # Dashboard, Kanban, Campaigns, Pipeline, LeadDetail, Auth

sdr-crm/                   # Backend Supabase
└── supabase/
    ├── functions/         # Edge Function Deno (generate-messages)
    └── migrations/        # Schema SQL, RLS, seed, views de métricas
```

---

## Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:5173)
npm run build    # Build de produção → dist/
npm run preview  # Preview do build localmente
npm run lint     # ESLint
```
