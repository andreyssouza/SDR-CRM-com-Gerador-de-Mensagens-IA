import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { CreateLeadInput } from '@/hooks/useLeads'
import type { PipelineStage } from '@/lib/types'

interface LeadFormProps {
  stages: PipelineStage[]
  initialStageId?: string
  onSubmit: (data: CreateLeadInput) => Promise<void>
  onClose: () => void
}

export function LeadForm({ stages, initialStageId, onSubmit, onClose }: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<CreateLeadInput>({
    name: '',
    email: null,
    phone: null,
    company: null,
    role: null,
    linkedin_url: null,
    website: null,
    notes: null,
    stage_id: initialStageId ?? stages[0]?.id ?? '',
  })

  function set<K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) {
    setForm(prev => ({ ...prev, [key]: value || null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setIsSubmitting(true)
    await onSubmit(form)
    setIsSubmitting(false)
  }

  return (
    <Modal open title="Novo Lead" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="João da Silva"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={e => set('email', e.target.value)}
            placeholder="joao@empresa.com"
          />
          <Input
            label="Telefone"
            value={form.phone ?? ''}
            onChange={e => set('phone', e.target.value)}
            placeholder="+55 11 99999-0000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Empresa"
            value={form.company ?? ''}
            onChange={e => set('company', e.target.value)}
            placeholder="Acme Corp"
          />
          <Input
            label="Cargo"
            value={form.role ?? ''}
            onChange={e => set('role', e.target.value)}
            placeholder="CEO"
          />
        </div>

        <Input
          label="LinkedIn"
          value={form.linkedin_url ?? ''}
          onChange={e => set('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.stage_id}
            onChange={e => set('stage_id', e.target.value)}
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            rows={3}
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            placeholder="Contexto sobre o lead..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.name.trim()}>
            Criar Lead
          </Button>
        </div>
      </form>
    </Modal>
  )
}
