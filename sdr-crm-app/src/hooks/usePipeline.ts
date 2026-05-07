import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { PipelineStage } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface CreateStageInput {
  name: string
  color: string
  is_trigger: boolean
}

export function usePipeline() {
  const { workspace } = useAuth()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStages = useCallback(async () => {
    if (!workspace) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('position', { ascending: true })

    if (error) setError(error.message)
    else setStages(data ?? [])
    setIsLoading(false)
  }, [workspace])

  useEffect(() => { fetchStages() }, [fetchStages])

  async function createStage(input: CreateStageInput): Promise<boolean> {
    if (!workspace) return false
    const maxPosition = stages.reduce((m, s) => Math.max(m, s.position), 0)
    const { error } = await db.from('pipeline_stages').insert({
      workspace_id: workspace.id,
      name: input.name,
      color: input.color,
      is_trigger: input.is_trigger,
      is_default: false,
      position: maxPosition + 1,
    })
    if (error) { setError(error.message); return false }
    await fetchStages()
    return true
  }

  async function updateStage(id: string, patch: Partial<CreateStageInput>): Promise<boolean> {
    const { error } = await db.from('pipeline_stages').update(patch).eq('id', id)
    if (error) { setError(error.message); return false }
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    return true
  }

  async function deleteStage(id: string): Promise<boolean> {
    const { error } = await db.from('pipeline_stages').delete().eq('id', id)
    if (error) { setError(error.message); return false }
    setStages(prev => prev.filter(s => s.id !== id))
    return true
  }

  async function moveStageUp(id: string): Promise<boolean> {
    const idx = stages.findIndex(s => s.id === id)
    if (idx <= 0) return true
    const a = stages[idx]
    const b = stages[idx - 1]
    await db.from('pipeline_stages').update({ position: b.position }).eq('id', a.id)
    await db.from('pipeline_stages').update({ position: a.position }).eq('id', b.id)
    await fetchStages()
    return true
  }

  async function moveStageDown(id: string): Promise<boolean> {
    const idx = stages.findIndex(s => s.id === id)
    if (idx < 0 || idx >= stages.length - 1) return true
    const a = stages[idx]
    const b = stages[idx + 1]
    await db.from('pipeline_stages').update({ position: b.position }).eq('id', a.id)
    await db.from('pipeline_stages').update({ position: a.position }).eq('id', b.id)
    await fetchStages()
    return true
  }

  return {
    stages, isLoading, error, refetch: fetchStages,
    createStage, updateStage, deleteStage, moveStageUp, moveStageDown,
  }
}
