import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'
import { LeadForm } from './LeadForm'
import type { Lead, PipelineStage, KanbanColumn as KanbanColumnType } from '@/lib/types'
import type { CreateLeadInput } from '@/hooks/useLeads'

interface KanbanBoardProps {
  stages: PipelineStage[]
  leads: Lead[]
  onMoveLead: (leadId: string, newStageId: string) => Promise<boolean>
  onCreateLead: (input: CreateLeadInput) => Promise<Lead | null>
}

export function KanbanBoard({ stages, leads, onMoveLead, onCreateLead }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addToStageId, setAddToStageId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const columns = useMemo<KanbanColumnType[]>(() =>
    stages.map(stage => ({
      stage,
      leads: leads.filter(l => l.stage_id === stage.id),
    })),
    [stages, leads],
  )

  const activeLead = useMemo(
    () => leads.find(l => l.id === activeId) ?? null,
    [leads, activeId],
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const leadId = String(active.id)
    const overId = String(over.id)

    // over.id can be a stage id or another lead id
    const targetStageId = stages.find(s => s.id === overId)?.id
      ?? leads.find(l => l.id === overId)?.stage_id

    if (targetStageId) await onMoveLead(leadId, targetStageId)
  }

  async function handleCreateLead(input: CreateLeadInput) {
    await onCreateLead(input)
    setAddToStageId(null)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {columns.map(col => (
            <KanbanColumn
              key={col.stage.id}
              column={col}
              onAddLead={stageId => setAddToStageId(stageId)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && <LeadCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>

      {addToStageId && (
        <LeadForm
          stages={stages}
          initialStageId={addToStageId}
          onSubmit={handleCreateLead}
          onClose={() => setAddToStageId(null)}
        />
      )}
    </>
  )
}
