import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, Mail, Phone, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/types'

interface LeadCardProps {
  lead: Lead
  isDragging?: boolean
}

export function LeadCard({ lead, isDragging = false }: LeadCardProps) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 shadow-sm select-none',
        'hover:border-brand-400 hover:shadow-md transition-all duration-150',
        (isDragging || isSortableDragging) ? 'opacity-50 rotate-1 shadow-lg border-brand-400 cursor-grabbing' : 'cursor-grab',
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-gray-300 shrink-0">
          <GripVertical size={14} />
        </div>

        <div
          className="flex-1 min-w-0"
          onClick={(e) => { if (!isSortableDragging) { e.stopPropagation(); navigate(`/leads/${lead.id}`) } }}
        >
          <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>

          {lead.company && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Building2 size={11} />
              <span className="truncate">{lead.company}</span>
              {lead.role && <span className="text-gray-400">· {lead.role}</span>}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {lead.email && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Mail size={10} />
                <span className="truncate max-w-[120px]">{lead.email}</span>
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Phone size={10} />
                {lead.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
