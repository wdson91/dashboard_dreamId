import { useCallback } from 'react'
import { useApiNif } from './useApiNif'

// Tipos para as faturas
export interface Fatura {
  id: string
  numero_fatura: string
  data: string
  hora: string
  total: number
  nif_cliente: string
  filial?: string
}

export interface FaturasResponse {
  faturas: Fatura[]
  periodo: {
    nome: string
    codigo: number
    inicio: string
    fim: string
  }
  estatisticas: {
    total_faturas: number
    total_montante: number
    ticket_medio: number
  }
  message?: string
}

// Hook para consumir a API de faturas
export function useFaturas() {
  const apiNif = useApiNif()
  
  const fetchFaturas = useCallback(async (periodo: string): Promise<FaturasResponse> => {
    if (!apiNif) {
      throw new Error('NIF não selecionado')
    }
    
    let url = `/api/faturas?nif=${apiNif.nif}&periodo=${periodo}`
    
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

  const downloadPDF = useCallback(async (numeroFatura: string): Promise<void> => {
    const url = `/api/faturas/pdf?numero_fatura=${encodeURIComponent(numeroFatura)}`
    
    const response = await fetch(url, {
      method: 'GET',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(errorData.error || `Erro ${response.status}`)
    }
    
    // Criar blob e fazer download
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `fatura_${numeroFatura}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }, [])
  
  return {
    apiNif,
    fetchFaturas,
    downloadPDF
  }
} 