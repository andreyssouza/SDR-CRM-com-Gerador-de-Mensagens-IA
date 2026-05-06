import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { PipelineStage } from '@/lib/types'

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

  return { stages, isLoading, error, refetch: fetchStages }
}
