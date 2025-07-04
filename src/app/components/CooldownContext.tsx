"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'

interface CooldownContextType {
  lastRefreshTime: number
  cooldownCountdown: number
  isInCooldown: boolean
  triggerRefresh: () => void
}

const CooldownContext = createContext<CooldownContextType | undefined>(undefined)

export function CooldownProvider({ children }: { children: React.ReactNode }) {
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(() => {
    // Recuperar o timestamp do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('global_last_refresh')
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })
  
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(() => {
    // Inicializar o countdown baseado no lastRefreshTime
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('global_last_refresh')
      if (saved) {
        const lastRefresh = parseInt(saved, 10)
        const timeSinceLastRefresh = Date.now() - lastRefresh
        const remainingTime = Math.max(0, Math.ceil((30000 - timeSinceLastRefresh) / 1000))
        // Se o tempo já expirou, retornar 0
        return remainingTime > 0 ? remainingTime : 0
      }
    }
    return 0
  })
  
  const minInterval = 30000 // 30 segundos
  
  // Calcular isInCooldown baseado no countdown
  const isInCooldown = useMemo(() => {
    const result = cooldownCountdown > 0
    return result
  }, [cooldownCountdown])
  
  // Atualizar o contador do cooldown
  useEffect(() => {
    const updateCountdown = () => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime
      const remainingTime = Math.max(0, Math.ceil((minInterval - timeSinceLastRefresh) / 1000))
      
      setCooldownCountdown(remainingTime)
      
      if (remainingTime > 0) {
        return setTimeout(updateCountdown, 1000)
      } else {
        // Garantir que o countdown seja zerado quando expira
        setCooldownCountdown(0)
        return null
      }
    }
    
    // Inicializar o countdown imediatamente
    const timer = updateCountdown()
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [lastRefreshTime, minInterval])
  
  const triggerRefresh = useCallback(() => {
    const now = Date.now()
    setLastRefreshTime(now)
    // Salvar no localStorage para persistir entre navegações
    localStorage.setItem('global_last_refresh', now.toString())
  }, [])
  
  // Memoizar o valor do contexto para evitar re-renders desnecessários
  const contextValue = useMemo(() => ({
    lastRefreshTime,
    cooldownCountdown,
    isInCooldown,
    triggerRefresh
  }), [lastRefreshTime, cooldownCountdown, isInCooldown, triggerRefresh])
  
  return (
    <CooldownContext.Provider value={contextValue}>
      {children}
    </CooldownContext.Provider>
  )
}

export function useCooldown() {
  const context = useContext(CooldownContext)
  if (context === undefined) {
    throw new Error('useCooldown must be used within a CooldownProvider')
  }
  return context
} 