import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Save, X, RefreshCw,
  Mail, Phone, Building2, Briefcase, Link, FileText,
  MessageSquare, Activity, CheckCircle, Clock, Archive,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { usePipeline } from '@/hooks/usePipeline'
import { Button } from '@/components/ui/Button'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import type { Lead, ActivityLog, GeneratedMessage, PipelineStage } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface MessageWithCampaign extends GeneratedMessage {
  campaign: { name: string; channel: string } | null
}

const ACTIVITY_LABELS: Record<string, string> = {
  lead_created:      'Lead criado',
  lead_moved:        'Movido de etapa',
  lead_updated:      'Lead atualizado',
  message_generated: 'Mensagem gerada',
  message_sent:      'Mensagem enviada',
  campaign_applied:  'Campanha aplicada',
}

const STATUS_CONFIG = {
  draft:    { label: 'Rascunho', color: 'text-amber-600 bg-amber-50', Icon: Clock },
  sent:     { label: 'Enviada',  color: 'text-green-600 bg-green-50', Icon: CheckCircle },
  archived: { label: 'Arquivada', color: 'text-gray-500 bg-gray-100', Icon: Archive },
}

const CHANNEL_LABELS: Record<string, string> = {
  email:    'Email',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  other:    'Outro',
}

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { workspace, user } = useAuth()
  const { stages } = usePipeline()

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [messages, setMessages] = useState<MessageWithCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})
  const [activeTab, setActiveTab] = useState<'info' | 'messages' | 'activity'>('info')

  useEffect(() => {
    if (id && workspace) loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, workspace])

  async function loadAll() {
    if (!id) return
    setIsLoading(true)
    const [leadRes, activitiesRes, messagesRes] = await Promise.all([
      db
        .from('leads')
        .select('*, stage:pipeline_stages(*)')
        .eq('id', id)
        .single(),
      db
        .from('activity_logs')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      db
        .from('generated_messages')
        .select('*, campaign:campaigns(name, channel)')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (leadRes.data) {
      const l = leadRes.data as Lead
      setLead(l)
      setEditForm(l)
    }
    setActivities((activitiesRes.data ?? []) as ActivityLog[])
    setMessages((messagesRes.data ?? []) as MessageWithCampaign[])
    setIsLoading(false)
  }

  function setField<K extends keyof Lead>(key: K, value: Lead[K]) {
    setEditForm(prev => ({ ...prev, [key]: value || null }))
  }

  async function handleSave() {
    if (!lead || !id) return
    setIsSaving(true)
    setSaveError(null)
    const { error } = await db.from('leads').update({
      name:         editForm.name,
      email:        editForm.email,
      phone:        editForm.phone,
      company:      editForm.company,
      role:         editForm.role,
      linkedin_url: editForm.linkedin_url,
      website:      editForm.website,
      notes:        editForm.notes,
      stage_id:     editForm.stage_id,
    }).eq('id', id)

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
      return
    }

    if (user && workspace) {
      await db.from('activity_logs').insert({
        workspace_id: workspace.id,
        lead_id: id,
        user_id: user.id,
        type: 'lead_updated',
        metadata: {},
      })
    }

    setIsEditing(false)
    setIsSaving(false)
    loadAll()
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setSaveError(null)
    if (lead) setEditForm(lead)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Lead não encontrado.</p>
        <button onClick={() => navigate('/kanban')} className="text-brand-600 hover:underline text-sm mt-2">
          Voltar ao Kanban
        </button>
      </div>
    )
  }

  const stage = stages.find(s => s.id === (isEditing ? editForm.stage_id : lead.stage_id))

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/kanban')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isEditing ? (
                  <input
                    className="border-b border-brand-400 outline-none bg-transparent text-xl font-bold text-gray-900 w-64"
                    value={editForm.name ?? ''}
                    onChange={e => setField('name', e.target.value)}
                  />
                ) : lead.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {lead.company && (
                  <span className="text-sm text-gray-500">{lead.company}</span>
                )}
                {stage && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: stage.color + '22', color: stage.color }}
                  >
                    {stage.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                  <X size={14} /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} loading={isSaving} disabled={!editForm.name?.trim()}>
                  <Save size={14} /> Salvar
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={14} /> Editar
              </Button>
            )}
          </div>
        </div>

        {saveError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {saveError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-4">
          {(['info', 'messages', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'info' && 'Informações'}
              {tab === 'messages' && `Mensagens (${messages.length})`}
              {tab === 'activity' && `Atividade (${activities.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Tab: Informações ── */}
        {activeTab === 'info' && (
          <div className="max-w-2xl space-y-6">
            {/* Etapa (só em modo edição) */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  value={editForm.stage_id ?? ''}
                  onChange={e => setField('stage_id', e.target.value)}
                >
                  {stages.map((s: PipelineStage) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Contato */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contato</h3>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                <FieldRow
                  icon={<Mail size={15} />}
                  label="Email"
                  value={lead.email}
                  editValue={editForm.email ?? ''}
                  isEditing={isEditing}
                  onChange={v => setField('email', v)}
                  type="email"
                  placeholder="joao@empresa.com"
                />
                <FieldRow
                  icon={<Phone size={15} />}
                  label="Telefone"
                  value={lead.phone}
                  editValue={editForm.phone ?? ''}
                  isEditing={isEditing}
                  onChange={v => setField('phone', v)}
                  placeholder="+55 11 99999-0000"
                />
                <FieldRow
                  icon={<Link size={15} />}
                  label="LinkedIn"
                  value={lead.linkedin_url}
                  editValue={editForm.linkedin_url ?? ''}
                  isEditing={isEditing}
                  onChange={v => setField('linkedin_url', v)}
                  placeholder="https://linkedin.com/in/..."
                  isLink
                />
                <FieldRow
                  icon={<Link size={15} />}
                  label="Website"
                  value={lead.website}
                  editValue={editForm.website ?? ''}
                  isEditing={isEditing}
                  onChange={v => setField('website', v)}
                  placeholder="https://empresa.com"
                  isLink
                />
              </div>
            </section>

            {/* Empresa */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Empresa</h3>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                <FieldRow
                  icon={<Building2 size={15} />}
                  label="Empresa"
                  value={lead.company}
                  editValue={editForm.company ?? ''}
                  isEditing={isEditing}
                  onChange={v => setField('company', v)}
                  placeholder="Acme Corp"
                />
                <FieldRow
                  icon={<Briefcase size={15} />}
                  label="Cargo"
                  value={lead.role}
                  editValue={editForm.role ?? ''}
                  isEditing={isEditing}
                  onChange={v => setField('role', v)}
                  placeholder="CEO"
                />
              </div>
            </section>

            {/* Notas */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Notas</h3>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                {isEditing ? (
                  <textarea
                    className="w-full text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 rounded p-1"
                    rows={4}
                    value={editForm.notes ?? ''}
                    onChange={e => setField('notes', e.target.value)}
                    placeholder="Contexto sobre o lead..."
                  />
                ) : lead.notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sem notas</p>
                )}
              </div>
            </section>

            {/* Metadata */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sistema</h3>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <FileText size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-500 w-28">Criado em</span>
                  <span className="text-sm text-gray-700">{formatDate(lead.created_at)}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <FileText size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-500 w-28">Atualizado</span>
                  <span className="text-sm text-gray-700">{formatDate(lead.updated_at)}</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Tab: Mensagens ── */}
        {activeTab === 'messages' && (
          <div className="max-w-2xl space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma mensagem gerada para este lead</p>
                <p className="text-xs mt-1">Vá para Campanhas e selecione este lead para gerar</p>
              </div>
            ) : (
              messages.map(m => {
                const cfg = STATUS_CONFIG[m.status]
                return (
                  <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {m.campaign?.name ?? 'Campanha removida'}
                        </span>
                        {m.campaign?.channel && (
                          <span className="text-xs text-gray-400">
                            {CHANNEL_LABELS[m.campaign.channel] ?? m.campaign.channel}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">Variação {m.variation}</span>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0', cfg.color)}>
                        <cfg.Icon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(m.created_at)}</p>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Tab: Atividade ── */}
        {activeTab === 'activity' && (
          <div className="max-w-xl">
            {activities.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Activity size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <ol className="relative border-l border-gray-200 space-y-6 ml-3">
                {activities.map(a => (
                  <li key={a.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border border-white bg-brand-500" />
                    <p className="text-sm font-medium text-gray-800">
                      {ACTIVITY_LABELS[a.type] ?? a.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(a.created_at)}</p>
                    {a.type === 'lead_moved' && a.metadata && (
                      <ActivityMovedDetail metadata={a.metadata} stages={stages} />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

interface FieldRowProps {
  icon: React.ReactNode
  label: string
  value: string | null
  editValue: string
  isEditing: boolean
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  isLink?: boolean
}

function FieldRow({ icon, label, value, editValue, isEditing, onChange, type, placeholder, isLink }: FieldRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-sm text-gray-500 w-24 shrink-0">{label}</span>
      {isEditing ? (
        <input
          type={type ?? 'text'}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : value ? (
        isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="text-sm text-gray-700 truncate">{value}</span>
        )
      ) : (
        <span className="text-sm text-gray-400 italic">—</span>
      )}
    </div>
  )
}

function ActivityMovedDetail({ metadata, stages }: { metadata: Record<string, unknown>; stages: PipelineStage[] }) {
  const from = stages.find(s => s.id === metadata.from_stage_id)
  const to = stages.find(s => s.id === metadata.to_stage_id)
  if (!from && !to) return null
  return (
    <p className="text-xs text-gray-500 mt-0.5">
      {from?.name ?? '?'} → {to?.name ?? '?'}
      {metadata.triggered_by === 'message_sent' && ' (via envio de mensagem)'}
    </p>
  )
}
