"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar} from "lucide-react"
import { api } from "@/utils/api"
import { APP_CONFIG } from "@/lib/constants"
import { useApiNif } from "@/hooks/useApiNif"
import { UpdateButton } from "@/app/components/UpdateButton"

// Tipo para a resposta da API de produtos
interface ProdutosResponse {
  data_inicio: string
  data_fim: string
  total_itens: number
  total_montante: number
  itens: Array<{
    produto: string
    quantidade: number
    montante: number
    percentagem?: number
  }>
}

async function getProdutos(periodo: string, apiParams: { nif: string; filial?: string }): Promise<ProdutosResponse> {
  const cacheKey = `produtos_data_${apiParams.nif}_${apiParams.filial || 'all'}_${periodo}`
  
  // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  const urlPath = '/api/products'
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

export default function ProdutosPage() {
  const [periodo, setPeriodo] = useState("0") // Começa com "Hoje"
  const [data, setData] = useState<ProdutosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const apiNif = useApiNif()

  const fetchData = useCallback(async (clearCache = false) => {
    // Se não há NIF selecionado, não fazer a chamada da API
    if (!apiNif) {
      setLoading(false)
      return
    }

    if (clearCache) {
      // Limpar cache específico para este período e NIF
      const cacheKey = `produtos_data_${apiNif.nif}_${apiNif.filial || 'all'}_${periodo}`
      localStorage.removeItem(cacheKey)
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)
    
    try {
      const result = await getProdutos(periodo, apiNif)
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

  // Se não há NIF selecionado, mostrar mensagem
  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">Nenhum estabelecimento selecionado</h2>
          <p className="text-white mb-6">
            Para visualizar os produtos, você precisa selecionar um estabelecimento.
          </p>
          <a 
            href="/estabelecimentos" 
            className="inline-flex items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            Ir para Estabelecimentos
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-white">Carregando...</div>
  if (error) return <div className="p-8 text-center text-red-300">Erro: {error}</div>
  if (!data) return null

  // Ordenar produtos por montante (maior para menor)
  const produtosOrdenados = [...data.itens].sort((a, b) => b.montante - a.montante)

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  // Função para formatar porcentagens
  const formatPercentage = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%'
    }
    return `${value.toFixed(1)}%`
  }

  // Função para formatar datas com "/"
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      // Se não conseguir formatar, retornar a string original
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[var(--color-card-white)] border border-[var(--color-card-border-green)] rounded-lg shadow-sm px-6 py-4 mb-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-[var(--color-card-text-green)] text-2xl font-semibold">Produtos Vendidos</h1>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[var(--color-card-text-green)]" />
            <div className="relative">
              <select
                className="appearance-none border border-[var(--color-card-border-green)] rounded-lg px-4 py-2 pr-10 text-[var(--color-card-text-green)] focus:outline-none focus:ring-2 focus:ring-[var(--color-card-border-green)] focus:border-[var(--color-card-border-green)] bg-[var(--color-card-white)] shadow-sm"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
              >
                {APP_CONFIG.periods.map(period => (
                  <option key={period.value} value={period.value} className="bg-[var(--color-card-white)] text-[var(--color-card-text-green)]">
                    {period.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-card-text-green)]">
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
            <div className="text-sm text-[var(--color-card-text-green-muted)]">
              Última atualização: {lastUpdate.toLocaleString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Período</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatDate(data.data_inicio)} - {formatDate(data.data_fim)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total de Itens</div>
              <div className="text-2xl font-bold text-gray-900">
                {data.total_itens.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Montante</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.total_montante)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Produtos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h2>
          
          {produtosOrdenados.map((produto, index) => (
            <Card key={index} className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{produto.produto}</h3>
                        <p className="text-gray-600 text-sm">
                          Quantidade: {produto.quantidade.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(produto.montante)}
                    </div>
                    {produto.percentagem && (
                      <div className="text-sm text-gray-600">
                        {formatPercentage(produto.percentagem)} do total
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
} 