import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { GeneratedMessage } from '@/lib/types'

export interface MessageWithLead extends GeneratedMessage {
  lead: { id: string; name: string; company: string | null; email: string | null } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useMessages(campaignId: string | null) {
  const { workspace, user } = useAuth()
  const [messages, setMessages] = useState<MessageWithLead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!workspace || !campaignId) { setMessages([]); return }
    setIsLoading(true)
    const { data, error } = await supabase
      .from('generated_messages')
      .select('*, lead:leads(id, name, company, email)')
      .eq('campaign_id', campaignId)
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setMessages((data ?? []) as MessageWithLead[])
    setIsLoading(false)
  }, [workspace, campaignId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  async function generateForLead(leadId: string): Promise<boolean> {
    if (!campaignId) return false
    setIsGenerating(true)
    setError(null)

    const { data, error } = await supabase.functions.invoke('generate-messages', {
      body: { lead_id: leadId, campaign_id: campaignId, variations: 3 },
    })

    setIsGenerating(false)
    if (error) {
      const detail = data?.error ?? data?.detail ?? error.message
      setError(detail)
      console.error('generateForLead error:', error, data)
      return false
    }
    await fetchMessages()
    return true
  }

  async function markSent(id: string): Promise<boolean> {
    const sentAt = new Date().toISOString()
    const { error } = await db
      .from('generated_messages')
      .update({ status: 'sent', sent_at: sentAt })
      .eq('id', id)
    if (error) { setError(error.message); return false }

    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'sent' as const, sent_at: sentAt } : m))

    if (user && workspace) {
      const msg = messages.find(m => m.id === id)
      if (msg) {
        await db.from('activity_logs').insert({
          workspace_id: workspace.id,
          lead_id: msg.lead_id,
          user_id: user.id,
          type: 'message_sent',
          metadata: { campaign_id: msg.campaign_id, message_id: id },
        })

        // Move lead to the trigger stage ("Tentando Contato") if not already there
        const { data: triggerStage } = await db
          .from('pipeline_stages')
          .select('id')
          .eq('workspace_id', workspace.id)
          .eq('is_trigger', true)
          .order('position', { ascending: true })
          .limit(1)
          .single()

        if (triggerStage) {
          const { data: lead } = await db
            .from('leads')
            .select('stage_id')
            .eq('id', msg.lead_id)
            .single()

          if (lead && lead.stage_id !== triggerStage.id) {
            await db.from('leads').update({ stage_id: triggerStage.id }).eq('id', msg.lead_id)
            await db.from('activity_logs').insert({
              workspace_id: workspace.id,
              lead_id: msg.lead_id,
              user_id: user.id,
              type: 'lead_moved',
              metadata: {
                from_stage_id: lead.stage_id,
                to_stage_id: triggerStage.id,
                triggered_by: 'message_sent',
              },
            })
          }
        }
      }
    }
    return true
  }

  async function archiveMessage(id: string): Promise<boolean> {
    const { error } = await db
      .from('generated_messages')
      .update({ status: 'archived' })
      .eq('id', id)
    if (error) { setError(error.message); return false }
    setMessages(prev => prev.filter(m => m.id !== id))
    return true
  }

  return { messages, isLoading, isGenerating, error, fetchMessages, generateForLead, markSent, archiveMessage }
}
