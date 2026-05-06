import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Lead, PipelineStage } from '@/lib/types'

export type CreateLeadInput = Pick<
  Lead,
  'name' | 'email' | 'phone' | 'company' | 'role' | 'linkedin_url' | 'website' | 'notes' | 'stage_id'
>

// Supabase Database stub uses Record<string,unknown> for all tables — the
// compiler infers insert/update payloads as `never` via the generic chain.
// We cast only the write-path to `any`; reads are fine because .select() returns Row.
// This cast will be removed once `supabase gen types typescript` produces real types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useLeads() {
  const { workspace, user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    if (!workspace) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*, stage:pipeline_stages(*)')
      .eq('workspace_id', workspace.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setLeads((data ?? []) as Lead[])
    setIsLoading(false)
  }, [workspace])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function createLead(input: CreateLeadInput): Promise<Lead | null> {
    if (!workspace || !user) return null

    const { data, error } = await db
      .from('leads')
      .insert({ ...input, workspace_id: workspace.id, created_by: user.id, status: 'active' })
      .select('*, stage:pipeline_stages(*)')
      .single()

    if (error) { setError(error.message); return null }
    const lead = data as Lead
    setLeads(prev => [lead, ...prev])

    await db.from('activity_logs').insert({
      workspace_id: workspace.id,
      lead_id: lead.id,
      user_id: user.id,
      type: 'lead_created',
      metadata: { stage_id: lead.stage_id },
    })

    return lead
  }

  async function updateLead(id: string, patch: Partial<CreateLeadInput>): Promise<boolean> {
    const { error } = await db.from('leads').update(patch).eq('id', id)
    if (error) { setError(error.message); return false }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    return true
  }

  async function moveLead(leadId: string, newStageId: string, stages?: PipelineStage[]): Promise<boolean> {
    if (!workspace || !user) return false
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stage_id === newStageId) return true

    const { error } = await db.from('leads').update({ stage_id: newStageId }).eq('id', leadId)
    if (error) { setError(error.message); return false }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: newStageId } : l))

    await db.from('activity_logs').insert({
      workspace_id: workspace.id,
      lead_id: leadId,
      user_id: user.id,
      type: 'lead_moved',
      metadata: { from_stage_id: lead.stage_id, to_stage_id: newStageId },
    })

    // Auto-trigger: if the destination stage has is_trigger=true, generate messages
    // for every active campaign in the workspace (fire-and-forget, non-blocking)
    const destStage = stages?.find(s => s.id === newStageId)
    if (destStage?.is_trigger) {
      const { data: activeCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)

      if (activeCampaigns?.length) {
        Promise.allSettled(
          activeCampaigns.map(c =>
            supabase.functions.invoke('generate-messages', {
              body: { lead_id: leadId, campaign_id: c.id },
            })
          )
        )
      }
    }

    return true
  }

  async function archiveLead(id: string): Promise<boolean> {
    const { error } = await db.from('leads').update({ status: 'archived' }).eq('id', id)
    if (error) { setError(error.message); return false }
    setLeads(prev => prev.filter(l => l.id !== id))
    return true
  }

  return { leads, isLoading, error, fetchLeads, createLead, updateLead, moveLead, archiveLead }
}
