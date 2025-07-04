"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { User, Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  
  // Ref para controlar se já tentamos refresh
  const hasAttemptedRefresh = useRef(false)

  // Função para refresh manual (apenas quando necessário)
  const refreshSession = useCallback(async () => {
    // Evitar múltiplas tentativas de refresh
    if (refreshing || hasAttemptedRefresh.current) {
      return session
    }

    try {
      hasAttemptedRefresh.current = true
      setRefreshing(true)
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        // Se for rate limit, não tentar novamente
        if (error.message.includes('rate limit')) {
          return session
        }
        
        // Se o refresh falhar, fazer logout
        await supabase.auth.signOut()
        router.push('/login')
        return null
      }
      
      return data.session
          } catch {
        await supabase.auth.signOut()
        router.push('/login')
        return null
    } finally {
      setRefreshing(false)
    }
  }, [supabase.auth, router, session, refreshing])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
        } else {
          setSession(null)
          setUser(null)
        }
              } catch {
          setSession(null)
          setUser(null)
        } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
       
        
        if (event === 'TOKEN_REFRESHED') {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          hasAttemptedRefresh.current = false // Reset para permitir novo refresh se necessário
        } else if (event === 'SIGNED_IN') {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          hasAttemptedRefresh.current = false
        } else if (event === 'SIGNED_OUT') {
          // Limpar dados do localStorage quando o usuário faz logout
          try {
            localStorage.removeItem('nifSelecionado')
            localStorage.removeItem('filialSelecionada')
          } catch {
            // Ignorar erro de localStorage
          }
          
          setSession(null)
          setUser(null)
          hasAttemptedRefresh.current = false
          router.push('/login')
        } else if (event === 'USER_UPDATED') {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router])

  const signOut = async () => {
    try {
      // Limpar dados do localStorage antes do logout
      try {
        localStorage.removeItem('nifSelecionado')
        localStorage.removeItem('filialSelecionada')
      } catch {
        // Ignorar erro de localStorage
      }
      
      await supabase.auth.signOut()
      // O redirect será feito automaticamente pelo onAuthStateChange
    } catch {
      // Forçar redirect mesmo se houver erro
      router.push('/login')
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  return { 
    user, 
    session,
    loading, 
    refreshing,
    signOut, 
    signIn,
    refreshSession 
  }
} 