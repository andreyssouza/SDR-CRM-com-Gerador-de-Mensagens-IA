import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { PipelineStage, ActivityLog } from '@/lib/types'

export interface StageCount {
  stage: PipelineStage
  count: number
}

export interface DashboardData {
  totalLeads: number
  messagesSent: number
  activeCampaigns: number
  leadsByStage: StageCount[]
  recentActivity: ActivityLog[]
}

export function useDashboard() {
  const { workspace } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!workspace) return
    setIsLoading(true)
    setError(null)

    const [stagesRes, leadsRes, messagesRes, campaignsRes, activityRes] = await Promise.all([
      supabase
        .from('pipeline_stages')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('position', { ascending: true }),
      supabase
        .from('leads')
        .select('id, stage_id')
        .eq('workspace_id', workspace.id)
        .eq('status', 'active'),
      supabase
        .from('generated_messages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('status', 'sent'),
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('is_active', true),
      supabase
        .from('activity_logs')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const firstError = [stagesRes, leadsRes, messagesRes, campaignsRes, activityRes]
      .find(r => r.error)?.error
    if (firstError) { setError(firstError.message); setIsLoading(false); return }

    const stages = (stagesRes.data ?? []) as PipelineStage[]
    const leads  = (leadsRes.data ?? []) as { id: string; stage_id: string }[]

    const leadsByStage: StageCount[] = stages.map(stage => ({
      stage,
      count: leads.filter(l => l.stage_id === stage.id).length,
    }))

    setData({
      totalLeads:      leads.length,
      messagesSent:    messagesRes.count ?? 0,
      activeCampaigns: campaignsRes.count ?? 0,
      leadsByStage,
      recentActivity:  (activityRes.data ?? []) as ActivityLog[],
    })
    setIsLoading(false)
  }, [workspace])

  useEffect(() => { fetch() }, [fetch])

  return { data, isLoading, error, refetch: fetch }
}
