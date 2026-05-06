import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Workspace } from '@/lib/types'

interface AuthContextValue {
  session:          Session | null
  user:             User | null
  workspace:        Workspace | null
  setWorkspace:     (w: Workspace) => void
  isLoading:        boolean
  signOut:          () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session,   setSession]   = useState<Session | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadWorkspace(data.session.user.id)
      else setIsLoading(false)
    })

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        if (newSession) loadWorkspace(newSession.user.id)
        else { setWorkspace(null); setIsLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function loadWorkspace(userId: string) {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(*)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single()

    if (data && (data as Record<string, unknown>).workspace) {
      setWorkspace((data as Record<string, unknown>).workspace as Workspace)
    }
    setIsLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setWorkspace(null)
  }

  return (
    <AuthContext.Provider value={{
      session,
      user:     session?.user ?? null,
      workspace,
      setWorkspace,
      isLoading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
