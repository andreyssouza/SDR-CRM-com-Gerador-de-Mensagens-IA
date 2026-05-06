import { useState } from 'react'
import { Send, Archive, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { MessageWithLead } from '@/hooks/useMessages'

interface MessageCardProps {
  message: MessageWithLead
  onMarkSent: (id: string) => Promise<boolean>
  onArchive: (id: string) => Promise<boolean>
}

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'text-amber-600 bg-amber-50', Icon: Clock },
  sent:  { label: 'Enviada',  color: 'text-green-600 bg-green-50', Icon: CheckCircle },
  archived: { label: 'Arquivada', color: 'text-gray-500 bg-gray-100', Icon: Archive },
}

export function MessageCard({ message, onMarkSent, onArchive }: MessageCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const { label, color, Icon } = STATUS_CONFIG[message.status]

  async function handleSend() {
    setIsSending(true)
    await onMarkSent(message.id)
    setIsSending(false)
  }

  async function handleArchive() {
    setIsArchiving(true)
    await onArchive(message.id)
    setIsArchiving(false)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm text-gray-900 truncate">
              {message.lead?.name ?? 'Lead desconhecido'}
            </span>
            {message.lead?.company && (
              <span className="text-xs text-gray-400 truncate">· {message.lead.company}</span>
            )}
          </div>
          <p className={cn(
            'text-sm text-gray-600 leading-relaxed whitespace-pre-wrap',
            !expanded && 'line-clamp-3',
          )}>
            {message.content}
          </p>
          {message.content.length > 200 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-brand-600 hover:text-brand-700 mt-1"
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1', color)}>
            <Icon size={10} />
            {label}
          </span>
          {message.status === 'draft' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleArchive}
                loading={isArchiving}
                title="Arquivar"
              >
                <Archive size={13} />
              </Button>
              <Button size="sm" onClick={handleSend} loading={isSending}>
                <Send size={13} />
                Enviar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
