"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Search, FileText } from "lucide-react"
import { api } from "@/utils/api"
import { APP_CONFIG, formatCurrency } from "@/lib/constants"
import {  FaturasListResponse } from "@/app/types/faturas"
import { useApiNif } from "@/hooks/useApiNif"
import { UpdateButton } from "@/app/components/UpdateButton"

async function getFaturas(periodo: string, apiParams: { nif: string; filial?: string }): Promise<FaturasListResponse> {
  const cacheKey = `faturas_data_${apiParams.nif}_${apiParams.filial || 'all'}_${periodo}`
  
  // // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  
  const urlPath = '/api/faturas'
  let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${urlPath}?nif=${apiParams.nif}&periodo=${periodo}`
  
  // Adicionar parâmetro de filial se existir
  if (apiParams.filial) {
    url += `&filial=${apiParams.filial}`
  }
  
  const response = await api.get(url)
  
  const dados = response
  
  // Salvar no cache
  localStorage.setItem(cacheKey, JSON.stringify({
    data: dados,
    timestamp: Date.now()
  }))
  
  return dados
}

// Função para fazer download do PDF
async function downloadPDF(numeroFatura: string) {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/faturas/pdf?numero_fatura=${numeroFatura}`
    
    // Obter token de autenticação
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado')
    }
    
    // Fazer a requisição para obter o PDF
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/pdf'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }
      throw new Error(`Erro ao baixar PDF: ${response.status} ${response.statusText}`)
    }

    // Verificar se a resposta é realmente um PDF
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('pdf')) {
      throw new Error('Resposta não é um PDF válido')
    }

    // Obter o blob do PDF
    const blob = await response.blob()
    
    // Criar URL do blob
    const urlBlob = window.URL.createObjectURL(blob)
    
    // Criar link de download
    const link = document.createElement('a')
    link.href = urlBlob
    link.download = `fatura_${numeroFatura}.pdf`
    
    // Simular clique para iniciar download
    document.body.appendChild(link)
    link.click()
    
    // Limpar
    document.body.removeChild(link)
    window.URL.revokeObjectURL(urlBlob)
    
    
  } catch (error) {
    if (error instanceof Error) {
      alert(`Erro ao baixar o PDF: ${error.message}`)
    } else {
      alert('Erro ao baixar o PDF. Tente novamente.')
    }
  }
}



export default function FaturasPage() {
  const [periodo, setPeriodo] = useState("0")
  const [searchTerm, setSearchTerm] = useState("")
  const [data, setData] = useState<FaturasListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const apiNif = useApiNif()

  const fetchData = useCallback(async (clearCache = false) => {
    if (!apiNif) {
      setLoading(false)
      return
    }

    if (clearCache) {
      // Limpar cache específico para este período e NIF
      const cacheKey = `faturas_data_${apiNif.nif}_${apiNif.filial || 'all'}_${periodo}`
      localStorage.removeItem(cacheKey)
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    setError(null)
    
    try {
      const result = await getFaturas(periodo, apiNif)
      setData(result)
      setLastUpdate(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodo, apiNif])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDownloadPDF = async (numeroFatura: string) => {
    setDownloadingPDF(numeroFatura)
    try {
      await downloadPDF(numeroFatura)
    } finally {
      setDownloadingPDF(null)
    }
  }

  // Se não há NIF selecionado, mostrar mensagem
  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nenhum estabelecimento selecionado</h2>
          <p className="text-gray-600 mb-6">
            Para visualizar as faturas, você precisa selecionar um estabelecimento.
          </p>
          <a 
            href="/estabelecimentos" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ir para Estabelecimentos
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (error) {
    // Verificar se é o erro específico de "Nenhuma fatura encontrada"
    if (error.includes("Nenhuma fatura encontrada")) {
      return (
        <div className="min-h-screen">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-gray-900 text-2xl font-semibold">Lista de Faturas</h1>
              
              {/* Dropdown de período */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div className="relative">
                  <select
                    className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                    value={periodo}
                    onChange={e => setPeriodo(e.target.value)}
                  >
                    {APP_CONFIG.periods.map(period => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="mb-4">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Sem faturas disponíveis
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Não há faturas disponíveis para o período selecionado. Tente alterar o período ou verificar se existem transações.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
    return <div className="p-8 text-center text-red-500">Erro: {error}</div>
  }
  if (!data) return null

  // Filtrar faturas baseado no termo de busca
  const filteredFaturas = data.faturas.filter(fatura =>
    fatura.numero_fatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fatura.nif_cliente.toLowerCase().includes(searchTerm.toLowerCase())
  )



  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-gray-900 text-2xl font-semibold">Lista de Faturas</h1>
          
          {/* Dropdown de período e botão de atualizar */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="relative">
              <select
                className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
              >
                {APP_CONFIG.periods.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
            
            {/* Botão de atualizar */}
            <UpdateButton
              onUpdate={() => fetchData(true)}
              disabled={refreshing || loading}
              refreshing={refreshing}
            />
          </div>
          
          {/* Informação da última atualização */}
          {lastUpdate && (
            <div className="text-sm text-gray-500">
              Última atualização: {lastUpdate.toLocaleString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
          )}
          
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número da fatura ou NIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm w-full max-w-md"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Número da Fatura</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">NIF Cliente</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaturas.map((fatura, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {new Date(fatura.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {fatura.hora.substring(0, 5)}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-mono text-sm">
                        {fatura.numero_fatura}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-mono text-sm">
                        {fatura.nif_cliente}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                        {formatCurrency(fatura.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDownloadPDF(fatura.numero_fatura)}
                          disabled={downloadingPDF === fatura.numero_fatura}
                          className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Baixar PDF da fatura"
                        >
                          {downloadingPDF === fatura.numero_fatura ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredFaturas.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="mb-4">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {searchTerm ? 'Nenhuma fatura encontrada' : 'Sem faturas disponíveis'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {searchTerm 
                      ? 'Não foram encontradas faturas com o número ou NIF pesquisado. Tente com outros termos.'
                      : 'Não há faturas disponíveis para o período selecionado. Tente alterar o período ou verificar se existem transações.'
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 