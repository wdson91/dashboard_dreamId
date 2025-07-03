"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface EstabelecimentoContextType {
  nifSelecionado: string | null
  setNifSelecionado: (nif: string) => void
  isLoaded: boolean
  autoSelectFirstEstabelecimento: () => Promise<void>
}

const EstabelecimentoContext = createContext<EstabelecimentoContextType | undefined>(undefined)

// Função para verificar se estamos no browser
const isBrowser = typeof window !== 'undefined'

// Função para obter NIF do localStorage de forma segura
const getNifFromStorage = (): string | null => {
  if (!isBrowser) return null
  try {
    return localStorage.getItem('nifSelecionado')
  } catch (error) {
    console.error('Erro ao acessar localStorage:', error)
    return null
  }
}

// Função para salvar NIF no localStorage de forma segura
const saveNifToStorage = (nif: string): void => {
  if (!isBrowser) return
  try {
    localStorage.setItem('nifSelecionado', nif)
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error)
  }
}

export function EstabelecimentoProvider({ children }: { children: ReactNode }) {
  const [nifSelecionado, setNifSelecionadoState] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Função para buscar e selecionar automaticamente o primeiro estabelecimento
  const autoSelectFirstEstabelecimento = async () => {
    try {
      // Importar o cliente Supabase dinamicamente
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Buscar a lista de NIFs do usuário
      const { data, error } = await supabase
        .from('usuarios')
        .select('nif')
        .eq('id', user.id)
        .maybeSingle()

      if (error || !data?.nif) {
        // Usuário não tem estabelecimentos cadastrados, não selecionar nenhum
        return
      }

      // Processar a lista de NIFs
      let nifList: string[] = []
      
      if (typeof data.nif === 'string') {
        try {
          nifList = JSON.parse(data.nif)
        } catch {
          nifList = [data.nif]
        }
      } else if (Array.isArray(data.nif)) {
        nifList = data.nif
      }

      // Só selecionar se realmente há estabelecimentos
      if (nifList.length > 0) {
        const primeiroNif = nifList[0]
        setNifSelecionado(primeiroNif)
      }
      // Se nifList está vazio, não selecionar nenhum estabelecimento
    } catch (error) {
      console.error('Erro ao selecionar automaticamente o primeiro estabelecimento:', error)
    }
  }

  // Reagir às mudanças de autenticação
  useEffect(() => {
    const setupAuthListener = async () => {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      
      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        // Usuário não autenticado, limpar dados
        setNifSelecionadoState(null)
        setIsLoaded(true)
        return
      }

      // Usuário autenticado, verificar se há NIF salvo
      const savedNif = getNifFromStorage()
      
      if (savedNif) {
        setNifSelecionadoState(savedNif)
        setIsLoaded(true)
      } else {
        // Se não há NIF salvo, tentar selecionar automaticamente o primeiro
        await autoSelectFirstEstabelecimento()
        setIsLoaded(true)
      }

      // Listener para mudanças de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            // Usuário fez login, buscar estabelecimentos
            const savedNif = getNifFromStorage()
            
            if (savedNif) {
              setNifSelecionadoState(savedNif)
              setIsLoaded(true)
            } else {
              await autoSelectFirstEstabelecimento()
              setIsLoaded(true)
            }
          } else if (event === 'SIGNED_OUT') {
            // Usuário fez logout, limpar dados
            setNifSelecionadoState(null)
            setIsLoaded(true)
          }
        }
      )

      return subscription
    }
    
    let subscription: { unsubscribe: () => void } | null = null
    
    setupAuthListener().then((sub) => {
      if (sub) {
        subscription = sub
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  })

  const setNifSelecionado = (nif: string) => {
    
    setNifSelecionadoState(nif)
    saveNifToStorage(nif)
  }

  return (
    <EstabelecimentoContext.Provider value={{ nifSelecionado, setNifSelecionado, isLoaded, autoSelectFirstEstabelecimento }}>
      {children}
    </EstabelecimentoContext.Provider>
  )
}

export function useEstabelecimento() {
  const context = useContext(EstabelecimentoContext)
  if (!context) {
    throw new Error('useEstabelecimento deve ser usado dentro de um EstabelecimentoProvider')
  }
  return context
} 