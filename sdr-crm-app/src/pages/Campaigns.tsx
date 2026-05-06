import { useState } from 'react'
import { Plus, RefreshCw, Zap, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { MessageCard } from '@/components/campaigns/MessageCard'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useMessages } from '@/hooks/useMessages'
import { usePipeline } from '@/hooks/usePipeline'
import { useLeads } from '@/hooks/useLeads'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/lib/types'

const CHANNEL_LABELS = {
  email:    'Email',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  other:    'Outro',
}

const CHANNEL_COLORS = {
  email:    'bg-blue-100 text-blue-700',
  linkedin: 'bg-sky-100 text-sky-700',
  whatsapp: 'bg-green-100 text-green-700',
  other:    'bg-gray-100 text-gray-600',
}

export function Campaigns() {
  const { stages } = usePipeline()
  const { leads } = useLeads()
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useCampaigns()

  const [selected, setSelected] = useState<Campaign | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Campaign | null>(null)
  const [generateLeadId, setGenerateLeadId] = useState('')

  const {
    messages,
    isLoading: messagesLoading,
    isGenerating,
    error: messagesError,
    generateForLead,
    markSent,
    archiveMessage,
  } = useMessages(selected?.id ?? null)

  function openEdit(c: Campaign, e: React.MouseEvent) {
    e.stopPropagation()
    setEditTarget(c)
    setShowForm(true)
  }

  async function handleToggleActive(c: Campaign, e: React.MouseEvent) {
    e.stopPropagation()
    await updateCampaign(c.id, { is_active: !c.is_active })
    if (selected?.id === c.id) setSelected(prev => prev ? { ...prev, is_active: !prev.is_active } : prev)
  }

  async function handleDelete(c: Campaign, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Excluir campanha "${c.name}"?`)) return
    await deleteCampaign(c.id)
    if (selected?.id === c.id) setSelected(null)
  }

  async function handleGenerate() {
    if (!generateLeadId || !selected) return
    const ok = await generateForLead(generateLeadId)
    if (ok) setGenerateLeadId('')
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: campaign list ── */}
      <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Campanhas</h1>
            <p className="text-xs text-gray-500">
              {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Nova
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Zap size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma campanha</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-brand-600 hover:underline mt-1"
              >
                Criar primeira campanha
              </button>
            </div>
          ) : (
            campaigns.map(c => (
              <div
                key={c.id}
                onClick={() => { setSelected(c); setGenerateLeadId('') }}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-all',
                  selected?.id === c.id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', CHANNEL_COLORS[c.channel])}>
                        {CHANNEL_LABELS[c.channel]}
                      </span>
                      {!c.is_active && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c.description}</p>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={e => openEdit(c, e)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={e => handleToggleActive(c, e)}
                      className={cn('p-1 rounded hover:bg-gray-100', c.is_active ? 'text-green-500' : 'text-gray-400')}
                      title={c.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {c.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button
                      onClick={e => handleDelete(c, e)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: detail + messages ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Zap size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma campanha para ver as mensagens</p>
            </div>
          </div>
        ) : (
          <>
            {/* Campaign header */}
            <div className="border-b border-gray-200 px-6 py-4 bg-white shrink-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded', CHANNEL_COLORS[selected.channel])}>
                      {CHANNEL_LABELS[selected.channel]}
                    </span>
                    {!selected.is_active && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">inativa</span>
                    )}
                  </div>
                  {selected.description && (
                    <p className="text-sm text-gray-500">{selected.description}</p>
                  )}
                  {selected.trigger_stage_id && (
                    <p className="text-xs text-gray-400 mt-1">
                      Gatilho automático: {stages.find(s => s.id === selected.trigger_stage_id)?.name ?? '—'}
                    </p>
                  )}
                </div>

                {/* Gerar para lead */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    value={generateLeadId}
                    onChange={e => setGenerateLeadId(e.target.value)}
                  >
                    <option value="">Selecionar lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}{l.company ? ` · ${l.company}` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={!generateLeadId}
                    loading={isGenerating}
                  >
                    <Zap size={14} />
                    Gerar
                  </Button>
                </div>
              </div>

              {messagesError && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {messagesError}
                </div>
              )}
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-6">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="animate-spin text-brand-600" size={20} />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Zap size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem gerada ainda</p>
                  <p className="text-xs mt-1">Selecione um lead acima e clique em Gerar</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  <p className="text-sm text-gray-500">
                    {messages.length} mensagem{messages.length !== 1 ? 's' : ''} gerada{messages.length !== 1 ? 's' : ''}
                  </p>
                  {messages.map(m => (
                    <MessageCard
                      key={m.id}
                      message={m}
                      onMarkSent={markSent}
                      onArchive={archiveMessage}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Campaign form modal */}
      {showForm && (
        <CampaignForm
          stages={stages}
          initial={editTarget ?? undefined}
          onSubmit={async input => {
            if (editTarget) {
              await updateCampaign(editTarget.id, input)
              if (selected?.id === editTarget.id) setSelected(prev => prev ? { ...prev, ...input } : prev)
            } else {
              await createCampaign(input)
            }
            closeForm()
          }}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
