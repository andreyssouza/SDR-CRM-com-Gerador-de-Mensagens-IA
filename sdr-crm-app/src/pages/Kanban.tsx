import { useState, useCallback, useMemo } from 'react'
import { Plus, RefreshCw, Search, X } from 'lucide-react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { LeadForm } from '@/components/kanban/LeadForm'
import { Button } from '@/components/ui/Button'
import { useLeads } from '@/hooks/useLeads'
import { usePipeline } from '@/hooks/usePipeline'

export function Kanban() {
  const { stages, isLoading: stagesLoading } = usePipeline()
  const { leads, isLoading: leadsLoading, fetchLeads, createLead, moveLead } = useLeads()
  const [showNewLead, setShowNewLead] = useState(false)
  const [search, setSearch] = useState('')

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    )
  }, [leads, search])

  // Wrap moveLead so it always receives the current stages array for trigger detection
  const handleMoveLead = useCallback(
    (leadId: string, newStageId: string) => moveLead(leadId, newStageId, stages),
    [moveLead, stages],
  )

  const isLoading = stagesLoading || leadsLoading

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
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funil de Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredLeads.length !== leads.length
              ? `${filteredLeads.length} de ${leads.length} lead${leads.length !== 1 ? 's' : ''}`
              : `${leads.length} lead${leads.length !== 1 ? 's' : ''} ativo${leads.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLeads}
          >
            <RefreshCw size={14} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewLead(true)}>
            <Plus size={14} />
            Novo Lead
          </Button>
        </div>
      </div>

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

      {/* Global new lead modal (no pre-selected stage) */}
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
