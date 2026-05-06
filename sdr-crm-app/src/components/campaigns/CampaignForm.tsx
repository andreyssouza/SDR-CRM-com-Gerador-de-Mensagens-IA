import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { CreateCampaignInput } from '@/hooks/useCampaigns'
import type { PipelineStage, CampaignChannel, Campaign } from '@/lib/types'

const CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: 'email',     label: 'Email' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'other',     label: 'Outro' },
]

interface CampaignFormProps {
  stages: PipelineStage[]
  initial?: Campaign
  onSubmit: (data: CreateCampaignInput) => Promise<void>
  onClose: () => void
}

export function CampaignForm({ stages, initial, onSubmit, onClose }: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<CreateCampaignInput>({
    name:             initial?.name ?? '',
    description:      initial?.description ?? null,
    channel:          initial?.channel ?? 'email',
    context:          initial?.context ?? '',
    prompt:           initial?.prompt ?? '',
    trigger_stage_id: initial?.trigger_stage_id ?? null,
    is_active:        initial?.is_active ?? true,
  })

  function set<K extends keyof CreateCampaignInput>(key: K, value: CreateCampaignInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.context.trim() || !form.prompt.trim()) return
    setIsSubmitting(true)
    await onSubmit(form)
    setIsSubmitting(false)
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const selectClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const textareaClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none'

  return (
    <Modal open title={initial ? 'Editar Campanha' : 'Nova Campanha'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome da campanha *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Prospecção Q2 2025"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Canal</label>
            <select
              className={selectClass}
              value={form.channel}
              onChange={e => set('channel', e.target.value as CampaignChannel)}
            >
              {CHANNELS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Etapa gatilho</label>
            <select
              className={selectClass}
              value={form.trigger_stage_id ?? ''}
              onChange={e => set('trigger_stage_id', e.target.value || null)}
            >
              <option value="">Nenhuma (manual)</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Contexto da empresa *</label>
          <textarea
            className={textareaClass}
            rows={3}
            value={form.context}
            onChange={e => set('context', e.target.value)}
            placeholder="Somos uma empresa SaaS de automação de vendas focada em PMEs..."
            required
          />
        </div>

        <div>
          <label className={labelClass}>Prompt de geração *</label>
          <textarea
            className={textareaClass}
            rows={4}
            value={form.prompt}
            onChange={e => set('prompt', e.target.value)}
            placeholder="Gere uma mensagem de prospecção personalizada para {{nome}} que trabalha como {{cargo}} na {{empresa}}..."
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Variáveis disponíveis: {'{{nome}}'}, {'{{empresa}}'}, {'{{cargo}}'}, {'{{email}}'}
          </p>
        </div>

        <div>
          <label className={labelClass}>Descrição</label>
          <textarea
            className={textareaClass}
            rows={2}
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value || null)}
            placeholder="Campanha para leads que chegaram via LinkedIn..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={e => set('is_active', e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Campanha ativa</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!form.name.trim() || !form.context.trim() || !form.prompt.trim()}
          >
            {initial ? 'Salvar alterações' : 'Criar Campanha'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
