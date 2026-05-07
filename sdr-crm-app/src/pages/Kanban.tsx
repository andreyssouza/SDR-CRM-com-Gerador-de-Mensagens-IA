import { useState, useCallback, useMemo } from 'react'
import { Plus, RefreshCw, Search, X, Filter } from 'lucide-react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { LeadForm } from '@/components/kanban/LeadForm'
import { Button } from '@/components/ui/Button'
import { useLeads } from '@/hooks/useLeads'
import { usePipeline } from '@/hooks/usePipeline'
import { useAuth } from '@/context/AuthContext'

// Opções de responsável disponíveis sem precisar de tabela de perfis extra
type AssignedFilter = 'all' | 'mine' | 'unassigned'

const ASSIGNED_LABELS: Record<AssignedFilter, string> = {
  all:        'Todos os responsáveis',
  mine:       'Atribuídos a mim',
  unassigned: 'Sem responsável',
}

export function Kanban() {
  const { stages, isLoading: stagesLoading } = usePipeline()
  const { leads, isLoading: leadsLoading, fetchLeads, createLead, moveLead } = useLeads()
  const { user } = useAuth()

  const [showNewLead,  setShowNewLead]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [stageFilter,  setStageFilter]  = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>('all')
  const [showFilters,  setShowFilters]  = useState(false)

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // text search
      const q = search.trim().toLowerCase()
      if (q) {
        const matchText =
          l.name.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
        if (!matchText) return false
      }
      // stage filter
      if (stageFilter !== 'all' && l.stage_id !== stageFilter) return false
      // assigned_to filter
      if (assignedFilter === 'mine'      && l.assigned_to !== user?.id)  return false
      if (assignedFilter === 'unassigned' && l.assigned_to !== null)     return false
      return true
    })
  }, [leads, search, stageFilter, assignedFilter, user])

  const handleMoveLead = useCallback(
    (leadId: string, newStageId: string) => moveLead(leadId, newStageId, stages),
    [moveLead, stages],
  )

  const isLoading = stagesLoading || leadsLoading

  const hasActiveFilters = stageFilter !== 'all' || assignedFilter !== 'all'

  function clearFilters() {
    setStageFilter('all')
    setAssignedFilter('all')
    setSearch('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funil de Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredLeads.length !== leads.length
              ? `${filteredLeads.length} de ${leads.length} lead${leads.length !== 1 ? 's' : ''}`
              : `${leads.length} lead${leads.length !== 1 ? 's' : ''} ativo${leads.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Toggle filtros */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className={hasActiveFilters ? 'ring-2 ring-brand-400' : ''}
          >
            <Filter size={14} />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {(stageFilter !== 'all' ? 1 : 0) + (assignedFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>

          <Button variant="secondary" size="sm" onClick={fetchLeads}>
            <RefreshCw size={14} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewLead(true)}>
            <Plus size={14} />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="shrink-0 bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end">
          {/* Stage filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Etapa do funil</label>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="all">Todas as etapas</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Assigned filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Responsável</label>
            <select
              value={assignedFilter}
              onChange={e => setAssignedFilter(e.target.value as AssignedFilter)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {(Object.entries(ASSIGNED_LABELS) as [AssignedFilter, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium pb-1.5"
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          stages={stages}
          leads={filteredLeads}
          onMoveLead={handleMoveLead}
          onCreateLead={async input => {
            const lead = await createLead(input)
            return lead
          }}
        />
      </div>

      {showNewLead && (
        <LeadForm
          stages={stages}
          onSubmit={async input => {
            await createLead(input)
            setShowNewLead(false)
          }}
          onClose={() => setShowNewLead(false)}
        />
      )}
    </div>
  )
}
