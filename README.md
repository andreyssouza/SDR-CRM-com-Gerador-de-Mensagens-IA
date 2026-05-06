# SDR CRM

Sistema de CRM para SDRs (Sales Development Representatives) com funil Kanban, geração automática de mensagens via IA e dashboard de métricas.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Estilo | Tailwind CSS v3 |
| Drag & Drop | @dnd-kit/core |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Edge Functions | Deno (Supabase Functions) |
| IA | OpenAI `gpt-4o-mini` |
| Roteamento | React Router v7 |

---

## Funcionalidades

- **Autenticação** — cadastro e login com Supabase Auth; workspace criado automaticamente no primeiro acesso
- **Funil Kanban** — arrastar e soltar leads entre etapas do pipeline com @dnd-kit
- **Geração de mensagens com IA** — ao mover um lead para uma etapa com `is_trigger = true`, o sistema dispara automaticamente a Edge Function para cada campanha ativa do workspace, gerando mensagens personalizadas via OpenAI
- **Campanhas** — CRUD completo; suporte a Email, LinkedIn, WhatsApp e Outro; prompts e contexto configuráveis por campanha
- **Dashboard** — métricas em tempo real: total de leads, mensagens enviadas, campanhas ativas, leads por etapa e atividade recente
- **Multi-tenant** — todos os dados são isolados por `workspace_id` com Row Level Security no Postgres

---

## Estrutura do projeto

```
Prova Vibe coding/
├── sdr-crm-app/          # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── campaigns/    # CampaignForm, MessageCard
│   │   │   ├── kanban/       # KanbanBoard, KanbanColumn, LeadCard, LeadForm
│   │   │   ├── layout/       # AppLayout, Sidebar, AuthGuard
│   │   │   └── ui/           # Button, Input, Modal
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── useCampaigns.ts
│   │   │   ├── useDashboard.ts
│   │   │   ├── useLeads.ts
│   │   │   ├── useMessages.ts
│   │   │   └── usePipeline.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── types.ts
│   │   └── pages/
│   │       ├── auth/         # Login, Register
│   │       ├── Campaigns.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Kanban.tsx
│   │       └── LeadDetail.tsx
│   └── .env.local            # variáveis de ambiente (ver abaixo)
│
└── sdr-crm/              # Supabase
    └── supabase/
        ├── functions/
        │   └── generate-messages/   # Edge Function OpenAI
        └── migrations/
            ├── 001_schema.sql       # Tabelas, índices, triggers
            ├── 002_rls.sql          # Políticas Row Level Security
            └── 003_seed.sql         # Dados de exemplo (opcional)
```

---

## Configuração local

### Pré-requisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Conta no [Supabase](https://supabase.com) (free tier é suficiente)
- Chave de API da [OpenAI](https://platform.openai.com)

### 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd "Prova Vibe coding/sdr-crm-app"
npm install
```

### 2. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. No painel do projeto, vá em **Settings → API** e copie:
   - `Project URL`
   - `anon / public` key

### 3. Configurar variáveis de ambiente

Crie o arquivo `sdr-crm-app/.env.local`:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Aplicar as migrations

No painel do Supabase, acesse **SQL Editor** e execute os arquivos na ordem:

```
sdr-crm/supabase/migrations/001_schema.sql
sdr-crm/supabase/migrations/002_rls.sql
sdr-crm/supabase/migrations/003_seed.sql   ← opcional
```

Ou via CLI:

```bash
cd "Prova Vibe coding/sdr-crm"
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

### 5. Rodar em desenvolvimento

```bash
cd "Prova Vibe coding/sdr-crm-app"
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) e crie uma conta. O workspace e as etapas do funil são criados automaticamente.

---

## Deploy da Edge Function

A Edge Function `generate-messages` precisa da chave da OpenAI configurada como secret no Supabase.

### Via CLI

```bash
cd "Prova Vibe coding/sdr-crm"

# Configurar o secret da OpenAI
supabase secrets set OPENAI_API_KEY=sk-...

# Deploy da função
supabase functions deploy generate-messages
```

### Via painel

1. **Settings → Edge Functions → Secrets**: adicione `OPENAI_API_KEY` com sua chave
2. **Edge Functions → Deploy**: faça upload do arquivo `sdr-crm/supabase/functions/generate-messages/index.ts`

---

## Deploy do frontend

### Vercel (recomendado)

```bash
cd "Prova Vibe coding/sdr-crm-app"
npx vercel
```

Configure as variáveis de ambiente no painel da Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Build estático

```bash
npm run build
# Arquivos gerados em sdr-crm-app/dist/
# Faça upload para qualquer host estático (Netlify, GitHub Pages, S3...)
```

---

## Como funciona o gatilho automático de IA

1. O usuário arrasta um lead para a etapa **"Tentando Contato"** (ou qualquer etapa com `is_trigger = true` no banco)
2. `useLeads.moveLead` detecta que a etapa de destino tem `is_trigger = true`
3. Busca todas as campanhas ativas do workspace
4. Dispara `supabase.functions.invoke('generate-messages', { lead_id, campaign_id })` para cada campanha via `Promise.allSettled` (não bloqueia a UI)
5. A Edge Function autentica o usuário, busca lead + campanha, substitui variáveis no prompt (`{{nome}}`, `{{empresa}}`, `{{cargo}}`, `{{email}}`), chama o OpenAI `gpt-4o-mini` e persiste a mensagem gerada com `status = 'draft'`
6. As mensagens aparecem na aba **Campanhas** prontas para revisar e marcar como enviadas

---

## Variáveis de template nos prompts

Ao criar uma campanha, use estas variáveis no campo **Prompt** — elas são substituídas automaticamente pelos dados do lead:

| Variável | Substituído por |
|---|---|
| `{{nome}}` | Nome do lead |
| `{{empresa}}` | Empresa do lead |
| `{{cargo}}` | Cargo do lead |
| `{{email}}` | E-mail do lead |

---

## Etapas do funil (padrão)

Criadas automaticamente para cada novo workspace:

| Etapa | Gatilho IA |
|---|---|
| Base | — |
| Lead Mapeado | — |
| Tentando Contato | ⚡ sim |
| Conexão Iniciada | — |
| Qualificado | — |
| Reunião Agendada | — |
| Desqualificado | — |
