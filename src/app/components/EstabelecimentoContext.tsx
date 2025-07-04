"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'

interface EstabelecimentoContextType {
  nifSelecionado: string | null
  filialSelecionada: string | null
  setNifSelecionado: (nif: string) => void
  setFilialSelecionada: (filial: string | null) => void
  isLoaded: boolean
  autoSelectFirstEstabelecimento: () => Promise<void>
  getApiParams: () => { nif: string; filial?: string } | null
}

const EstabelecimentoContext = createContext<EstabelecimentoContextType | undefined>(undefined)

// Função para verificar se estamos no browser
const isBrowser = typeof window !== 'undefined'

// Função para obter dados do localStorage de forma segura
const getDataFromStorage = (): { nif: string | null; filial: string | null } => {
  if (!isBrowser) return { nif: null, filial: null }
  try {
    const nif = localStorage.getItem('nifSelecionado')
    const filial = localStorage.getItem('filialSelecionada')
    return { nif, filial }
  } catch {
    return { nif: null, filial: null }
  }
}

// Função para salvar dados no localStorage de forma segura
const saveDataToStorage = (nif: string, filial: string | null = null): void => {
  if (!isBrowser) return
  try {
    localStorage.setItem('nifSelecionado', nif)
    if (filial) {
      localStorage.setItem('filialSelecionada', filial)
    } else {
      localStorage.removeItem('filialSelecionada')
    }
  } catch {
    // Ignorar erro de localStorage
  }
}

export function EstabelecimentoProvider({ children }: { children: ReactNode }) {
  const [nifSelecionado, setNifSelecionadoState] = useState<string | null>(null)
  const [filialSelecionada, setFilialSelecionadaState] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Função para obter parâmetros da API
  const getApiParams = useCallback((): { nif: string; filial?: string } | null => {
    if (!nifSelecionado) return null
    
    if (filialSelecionada) {
      return { nif: nifSelecionado, filial: filialSelecionada }
    } else {
      return { nif: nifSelecionado }
    }
  }, [nifSelecionado, filialSelecionada])

  // Função para buscar e selecionar automaticamente o primeiro estabelecimento
  const autoSelectFirstEstabelecimento = useCallback(async () => {
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
        setNifSelecionadoState(primeiroNif)
        // Não selecionar filial automaticamente - deixar para o usuário escolher
        setFilialSelecionadaState(null)
        saveDataToStorage(primeiroNif, null)
      }
      // Se nifList está vazio, não selecionar nenhum estabelecimento
    } catch {
      // Ignorar erro de seleção automática
    }
  }, [])

  // Reagir às mudanças de autenticação
  useEffect(() => {
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null
    
    const setupAuthListener = async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        
        // Obter sessão atual
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (!session?.user) {
          // Usuário não autenticado, limpar dados
          setNifSelecionadoState(null)
          setFilialSelecionadaState(null)
          setIsLoaded(true)
          return
        }

        // Usuário autenticado, verificar se há dados salvos
        const savedData = getDataFromStorage()
        
        if (savedData.nif) {
          setNifSelecionadoState(savedData.nif)
          setFilialSelecionadaState(savedData.filial)
          setIsLoaded(true)
        } else {
          // Se não há dados salvos, tentar selecionar automaticamente o primeiro
          await autoSelectFirstEstabelecimento()
          if (isMounted) {
            setIsLoaded(true)
          }
        }

        // Listener para mudanças de autenticação
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return
            
            if (event === 'SIGNED_IN' && session?.user) {
              // Usuário fez login, buscar estabelecimentos
              const savedData = getDataFromStorage()
              
              if (savedData.nif) {
                setNifSelecionadoState(savedData.nif)
                setFilialSelecionadaState(savedData.filial)
                setIsLoaded(true)
              } else {
                await autoSelectFirstEstabelecimento()
                if (isMounted) {
                  setIsLoaded(true)
                }
              }
            } else if (event === 'SIGNED_OUT') {
              // Usuário fez logout, limpar dados
              setNifSelecionadoState(null)
              setFilialSelecionadaState(null)
              setIsLoaded(true)
            }
          }
        )

        subscription = authSubscription
      } catch {
        if (isMounted) {
          setIsLoaded(true)
        }
      }
    }
    
    setupAuthListener()

    return () => {
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [autoSelectFirstEstabelecimento])

  const setNifSelecionado = (nif: string) => {
    setNifSelecionadoState(nif)
    // Quando muda o NIF, limpar a filial selecionada
    setFilialSelecionadaState(null)
    saveDataToStorage(nif, null)
  }

  const setFilialSelecionada = (filial: string | null) => {
    setFilialSelecionadaState(filial)
    if (nifSelecionado) {
      saveDataToStorage(nifSelecionado, filial)
    }
  }

  return (
    <EstabelecimentoContext.Provider value={{ 
      nifSelecionado, 
      filialSelecionada,
      setNifSelecionado, 
      setFilialSelecionada,
      isLoaded, 
      autoSelectFirstEstabelecimento,
      getApiParams
    }}>
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