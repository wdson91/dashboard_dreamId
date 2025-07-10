import { useEstabelecimento } from '@/app/components/EstabelecimentoContext'
import { useMemo, useCallback } from "react"

export function useApiNif() {
  const { nifSelecionado, filialSelecionada, isLoaded } = useEstabelecimento()
  
  return useMemo(() => {
    // Só retornar dados se estiver carregado E tiver um NIF selecionado
    if (!isLoaded || !nifSelecionado) {
      return null
    }
    
    if (filialSelecionada) {
      return { nif: nifSelecionado, filial: filialSelecionada }
    }
    return { nif: nifSelecionado }
  }, [isLoaded, nifSelecionado, filialSelecionada])
}

// Hook específico para consumir a API de produtos
export function useProdutosApi() {
  const apiNif = useApiNif()
  
  const fetchProdutos = useCallback(async (periodo: string): Promise<ProdutosResponse> => {
    if (!apiNif) {
      throw new Error('NIF não selecionado')
    }
    
    let url = `/api/produtos?nif=${apiNif.nif}&periodo=${periodo}`
    
    if (apiNif.filial) {
      url += `&filial=${apiNif.filial}`
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(errorData.error || `Erro ${response.status}`)
    }
    
    return response.json()
  }, [apiNif])
  
  return {
    apiNif,
    fetchProdutos
  }
}

// Tipo para a resposta da API de produtos
export interface ProdutosResponse {
  data_inicio: string
  data_fim: string
  periodo: string
  total_itens: number
  total_montante: number
  itens: Array<{
    produto: string
    quantidade: number
    montante: number
    porcentagem_montante: number
  }>
} 