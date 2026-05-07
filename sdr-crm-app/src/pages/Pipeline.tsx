import { useState } from 'react'
import {
  Plus, ChevronUp, ChevronDown, Trash2, Edit2, Save, X,
  Zap, RefreshCw, GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePipeline } from '@/hooks/usePipeline'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/lib/types'

const PRESET_COLORS = [
  '#6b7280', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
]

interface StageFormState {
  name: string
  color: string
  is_trigger: boolean
}

export function Pipeline() {
  const {
    stages, isLoading, error,
    createStage, updateStage, deleteStage,
    moveStageUp, moveStageDown,
    refetch,
  } = usePipeline()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<StageFormState>({ name: '', color: '#6b7280', is_trigger: false })
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState<StageFormState>({ name: '', color: '#3b82f6', is_trigger: false })
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function startEdit(stage: PipelineStage) {
    setEditingId(stage.id)
    setEditForm({ name: stage.name, color: stage.color, is_trigger: stage.is_trigger })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) return
    setSaving(id)
    await updateStage(id, editForm)
    setSaving(null)
    setEditingId(null)
  }

  async function handleCreate() {
    if (!newForm.name.trim()) return
    setSaving('new')
    await createStage(newForm)
    setSaving(null)
    setShowNewForm(false)
    setNewForm({ name: '', color: '#3b82f6', is_trigger: false })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir etapa "${name}"? Os leads nesta etapa precisarão ser movidos manualmente.`)) return
    setDeleting(id)
    await deleteStage(id)
    setDeleting(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funil de Vendas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure as etapas do seu processo de pré-vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refetch}>
            <RefreshCw size={14} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => { setShowNewForm(true); setEditingId(null) }}>
            <Plus size={14} />
            Nova etapa
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Zap size={12} className="text-amber-500" />
          Gatilho automático — gera mensagens ao mover lead para esta etapa
        </span>
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={cn(
              'bg-white rounded-lg border transition-colors',
              editingId === stage.id ? 'border-brand-400' : 'border-gray-200',
            )}
          >
            {editingId === stage.id ? (
              /* ── Edit form inline ── */
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da etapa"
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(stage.id) }}
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">Cor:</span>
                  <div className="flex gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditForm(prev => ({ ...prev, color: c }))}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 transition-transform',
                          editForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-5 h-5 rounded cursor-pointer border border-gray-300"
                      title="Cor personalizada"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.is_trigger}
                    onChange={e => setEditForm(prev => ({ ...prev, is_trigger: e.target.checked }))}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <Zap size={13} className="text-amber-500" />
                    Gatilho automático de mensagens
                  </span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={cancelEdit}>
                    <X size={13} /> Cancelar
                  </Button>
                  <Button size="sm" onClick={() => handleSaveEdit(stage.id)} loading={saving === stage.id}>
                    <Save size={13} /> Salvar
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Stage row ── */
              <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical size={14} className="text-gray-300 shrink-0" />

                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />

                {/* Position */}
                <span className="text-xs text-gray-400 w-5 shrink-0 font-mono">{idx + 1}</span>

                {/* Name */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">{stage.name}</span>
                  {stage.is_trigger && (
                    <Zap size={12} className="text-amber-500 shrink-0" title="Gatilho automático" />
                  )}
                  {stage.is_default && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                      padrão
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveStageUp(stage.id)}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded hover:bg-gray-100"
                    title="Mover para cima"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => moveStageDown(stage.id)}
                    disabled={idx === stages.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded hover:bg-gray-100"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    onClick={() => startEdit(stage)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id, stage.name)}
                    disabled={deleting === stage.id}
                    className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                    title="Excluir"
                  >
                    {deleting === stage.id
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── New stage form ── */}
        {showNewForm && (
          <div className="bg-white rounded-lg border border-brand-400 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Nova etapa</p>
            <input
              autoFocus
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newForm.name}
              onChange={e => setNewForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome da etapa"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500">Cor:</span>
              <div className="flex gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewForm(prev => ({ ...prev, color: c }))}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 transition-transform',
                      newForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={newForm.color}
                  onChange={e => setNewForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300"
                  title="Cor personalizada"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newForm.is_trigger}
                onChange={e => setNewForm(prev => ({ ...prev, is_trigger: e.target.checked }))}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Zap size={13} className="text-amber-500" />
                Gatilho automático de mensagens
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setShowNewForm(false); setNewForm({ name: '', color: '#3b82f6', is_trigger: false }) }}
              >
                <X size={13} /> Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} loading={saving === 'new'} disabled={!newForm.name.trim()}>
                <Plus size={13} /> Criar etapa
              </Button>
            </div>
          </div>
        )}
      </div>

      {stages.length === 0 && !showNewForm && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Nenhuma etapa configurada</p>
          <button onClick={() => setShowNewForm(true)} className="text-xs text-brand-600 hover:underline mt-1">
            Criar primeira etapa
          </button>
        </div>
      )}
    </div>
  )
}
