import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import { useApiNif } from './useApiNif'

interface VariacaoDados {
  valor: number
  ontem: number
  variacao: string
  cor: string
}

interface ComparativoHora {
  hora: string
  atual: number
  anterior: number
}

interface StatsResumo {
  periodo: string
  total_vendas: VariacaoDados
  numero_recibos: VariacaoDados
  itens_vendidos: VariacaoDados
  ticket_medio: VariacaoDados
  comparativo_por_hora: ComparativoHora[]
}

interface UseStatsResumoReturn {
  data: StatsResumo | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useStatsResumo(periodo: number = 0): UseStatsResumoReturn {
  const [data, setData] = useState<StatsResumo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const apiParams = useApiNif()
  
  const fetchData = async () => {
    if (!apiParams) {
      setData(null)
      setError(null)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        nif: apiParams.nif,
        periodo: periodo.toString(),
        ...(apiParams.filial && { filial: apiParams.filial })
      })
      
      const response = await api.get(`/api/stats/resumo?${params}`)
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchData()
  }, [apiParams, periodo])
  
  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
} 