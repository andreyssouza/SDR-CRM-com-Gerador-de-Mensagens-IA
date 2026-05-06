import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Campaign, CampaignChannel } from '@/lib/types'

export type CreateCampaignInput = {
  name: string
  description: string | null
  channel: CampaignChannel
  context: string
  prompt: string
  trigger_stage_id: string | null
  is_active: boolean
}

// Same pattern as useLeads: Database stub infers insert/update as never via generics.
// Cast removed once supabase gen types typescript runs against real DB.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useCampaigns() {
  const { workspace, user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    if (!workspace) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setCampaigns((data ?? []) as Campaign[])
    setIsLoading(false)
  }, [workspace])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  async function createCampaign(input: CreateCampaignInput): Promise<Campaign | null> {
    if (!workspace || !user) return null
    const { data, error } = await db
      .from('campaigns')
      .insert({ ...input, workspace_id: workspace.id, created_by: user.id })
      .select('*')
      .single()

    if (error) { setError(error.message); return null }
    const campaign = data as Campaign
    setCampaigns(prev => [campaign, ...prev])
    return campaign
  }

  async function updateCampaign(id: string, patch: Partial<CreateCampaignInput>): Promise<boolean> {
    const { error } = await db.from('campaigns').update(patch).eq('id', id)
    if (error) { setError(error.message); return false }
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    return true
  }

  async function deleteCampaign(id: string): Promise<boolean> {
    const { error } = await db.from('campaigns').delete().eq('id', id)
    if (error) { setError(error.message); return false }
    setCampaigns(prev => prev.filter(c => c.id !== id))
    return true
  }

  return { campaigns, isLoading, error, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign }
}
