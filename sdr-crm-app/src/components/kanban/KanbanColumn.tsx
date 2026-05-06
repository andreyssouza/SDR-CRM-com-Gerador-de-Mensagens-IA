import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeadCard } from './LeadCard'
import type { KanbanColumn as KanbanColumnType } from '@/lib/types'

interface KanbanColumnProps {
  column: KanbanColumnType
  onAddLead: (stageId: string) => void
}

export function KanbanColumn({ column, onAddLead }: KanbanColumnProps) {
  const { stage, leads } = column
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-gray-700 truncate">{stage.name}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 font-medium">
            {leads.length}
          </span>
        </div>
        <button
          onClick={() => onAddLead(stage.id)}
          className="text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded p-0.5 transition-colors"
          title="Adicionar lead"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-[120px] rounded-lg p-2 transition-colors',
          isOver ? 'bg-brand-50 border-2 border-dashed border-brand-300' : 'bg-gray-50/60',
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <button
            onClick={() => onAddLead(stage.id)}
            className="flex items-center justify-center gap-1 h-14 rounded-md border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
          >
            <Plus size={12} />
            Adicionar lead
          </button>
        )}
      </div>
    </div>
  )
}
