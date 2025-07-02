"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface EstabelecimentoContextType {
  nifSelecionado: string | null
  setNifSelecionado: (nif: string) => void
}

const EstabelecimentoContext = createContext<EstabelecimentoContextType | undefined>(undefined)

export function EstabelecimentoProvider({ children }: { children: ReactNode }) {
  const [nifSelecionado, setNifSelecionadoState] = useState<string | null>(null)

  // Carregar NIF do localStorage na inicialização
  useEffect(() => {
    const savedNif = localStorage.getItem('nifSelecionado')
    if (savedNif) {
      setNifSelecionadoState(savedNif)
    }
  }, [])

  const setNifSelecionado = (nif: string) => {
    setNifSelecionadoState(nif)
    localStorage.setItem('nifSelecionado', nif)
  }

  return (
    <EstabelecimentoContext.Provider value={{ nifSelecionado, setNifSelecionado }}>
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