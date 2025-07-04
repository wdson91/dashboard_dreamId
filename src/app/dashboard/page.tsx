"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {  Umbrella, DollarSign, Receipt, ShoppingCart, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FaturasResponse } from "../types/faturas"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { api } from "@/utils/api"
import { APP_CONFIG, formatCurrency } from "@/lib/constants"
import { useApiNif } from "@/hooks/useApiNif"
import { useEstabelecimento } from "@/app/components/EstabelecimentoContext"
import { UpdateButton } from "@/app/components/UpdateButton"

// Componente separado para o gráfico
// eslint-disable-next-line
const ChartComponent = ({ data }: { data: any[] }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Comparativo por Hora</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="hora" stroke="#6b7280" />
          <YAxis tickFormatter={v => `€${v}`} stroke="#6b7280" />
          <Tooltip 
            formatter={(value) => [`€${value}`, '']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="hoje" stroke="#3b82f6" name="Atual" strokeWidth={2} />
          <Line type="monotone" dataKey="ontem" stroke="#10b981" name="Anterior" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

async function getData(filtro: string, apiParams: { nif: string; filial?: string }, clearCache = false): Promise<FaturasResponse['dados']> {
  const cacheKey = `dashboard_data_${apiParams.nif}_${apiParams.filial || 'all'}_${filtro}`
  
  // Verificar cache apenas se não for um refresh
  const cached = localStorage.getItem(cacheKey)
  if (cached && !clearCache) {
    try {
      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()
      if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
        return data
      }
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }
  
  const urlPath = '/api/stats/resumo'
  
  // Verificar se a variável de ambiente está definida
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://13.48.69.154:8000'
  
  let url = `${apiBaseUrl}${urlPath}?nif=${apiParams.nif}&periodo=${filtro}`
  
  // Adicionar parâmetro de filial se existir
  if (apiParams.filial) {
    url += `&filial=${apiParams.filial}`
  }
  
    try {
    const response = await api.get(url)
    
    
          // Verificar se a resposta tem a estrutura esperada
      let dados
      if (response && typeof response === 'object') {
        // Se a resposta tem uma propriedade 'dados', usar ela
        if ('dados' in response) {
          dados = response.dados
        } else {
          // Se não tem 'dados', usar a resposta diretamente
          dados = response
        }
      } else {
        throw new Error('Resposta da API inválida')
      }
    
    // Salvar no cache
    localStorage.setItem(cacheKey, JSON.stringify({
      data: dados,
      timestamp: Date.now()
    }))
    
    return dados
  } catch (error) {
    throw error
  }
}

export default function Component() {
  const [filtro, setFiltro] = useState("0")
  const [data, setData] = useState<FaturasResponse['dados'] | null>(null)
  const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { isLoaded } = useEstabelecimento()
  const apiNif = useApiNif()

  // Memoizar os dados do gráfico para evitar re-renders desnecessários
  const chartData = useMemo(() => {
    if (!data || !data.comparativo_por_hora) {
      return []
    }
    return data.comparativo_por_hora
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.comparativo_por_hora])

  const fetchData = useCallback(async (clearCache = false) => {
    
    // Se não há NIF selecionado ou não carregou ainda, não fazer a chamada da API
    if (!apiNif || !isLoaded) {
      setLoading(false)
      return
    }

    // Evitar chamadas duplicadas apenas se não for um refresh
    if (loading && !clearCache) {
      return
    }

    // Se estamos fazendo refresh ou não está carregando, definir loading como true
    if (clearCache || !loading) {
      setLoading(true)
    }

    if (clearCache) {
      // Limpar cache específico para este filtro e NIF
      const cacheKey = `dashboard_data_${apiNif.nif}_${apiNif.filial || 'all'}_${filtro}`
      localStorage.removeItem(cacheKey)
      setRefreshing(true)
    }

    setError(null)
    
    try {
      const result = await getData(filtro, apiNif, clearCache)
      setData(result)
      setLastUpdate(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, apiNif, isLoaded])

  useEffect(() => {
    // Só fazer fetch se há apiNif disponível e isLoaded é true
    if (apiNif && isLoaded) {
      // Sempre fazer fetch quando entrar na página (sem cache)
      fetchData(true)
    } else {
      // Se não há apiNif, garantir que loading seja false
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNif, isLoaded]) // Removido fetchData das dependências para evitar loops

  // useEffect para reagir a mudanças no filtro
  useEffect(() => {
    if (apiNif && isLoaded) {
      // Buscar dados quando o filtro mudar
      fetchData(true)
    }
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, apiNif, isLoaded])

  // Detectar quando o usuário volta para a página
  useEffect(() => {
    const handleFocus = () => {
      if (apiNif && isLoaded && !loading) {
        // Verificar se o cache está expirado
        const cacheKey = `dashboard_data_${apiNif.nif}_${apiNif.filial || 'all'}_${filtro}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            const { timestamp } = JSON.parse(cached)
            const now = Date.now()
            if (now - timestamp >= APP_CONFIG.api.cacheExpiry) {
              fetchData(true)
            }
          } catch {
            // Ignorar erro de cache
          }
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNif, isLoaded, loading, filtro])

  // Se ainda não carregou, mostrar loading
  if (!isLoaded) {
    return <div className="p-8 text-center">Carregando...</div>
  }

  // Se não há NIF selecionado, mostrar mensagem
  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nenhum estabelecimento selecionado</h2>
          <p className="text-gray-600 mb-6">
            Para visualizar o dashboard, você precisa selecionar um estabelecimento.
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

  if (loading) return <div className="p-8 text-center">Carregando dados...</div>
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>
  if (!data) {
    return <div className="p-8 text-center">Nenhum dado disponível</div>
  }

  // Verificar se todos os dados necessários existem
  const camposObrigatorios = {
    total_vendas: !!data.total_vendas,
    itens_vendidos: !!data.itens_vendidos,
    numero_recibos: !!data.numero_recibos,
    ticket_medio: !!data.ticket_medio,
    comparativo_por_hora: !!data.comparativo_por_hora
  }
  
  const camposFaltando = Object.entries(camposObrigatorios)
    .filter(([, existe]) => !existe)
    .map(([campo]) => campo)
  
  if (camposFaltando.length > 0) {
    return (
      <div className="p-8 text-center text-red-500">
        <div>Dados incompletos recebidos da API</div>
        <div className="text-sm mt-2">Campos faltando: {camposFaltando.join(', ')}</div>
      </div>
    )
  }

  const {
    //comparativo_por_hora,
    itens_vendidos,
    numero_recibos,
    ticket_medio,
    total_vendas,
    //periodo,
  } = data

  
  return (
    <div>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
        <div className="flex flex-col gap-3">
        <h1 className="text-gray-800 text-xl font-semibold">Dashboard</h1>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="relative">
              <select
                className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
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
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Vendas em Aberto */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <Umbrella className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm md:text-base">Vendas em Aberto</span>
              </div>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">
                {formatCurrency(total_vendas?.valor || 0)}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Mesas em Aberto: 0</div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Consolidadas */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-green-50 rounded-xl border border-green-200">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm md:text-base">Vendas Consolidadas</span>
              </div>
              <span className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: total_vendas?.cor || '#666',
                backgroundColor: total_vendas?.cor ? `${total_vendas.cor}20` : '#f3f4f6'
              }}>{total_vendas?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-xs md:text-sm text-gray-600">Período Anterior: {formatCurrency(total_vendas?.ontem || 0)}</div>
              <div className="text-xs md:text-sm text-gray-500">Vendas do dia</div>
            </div>
          </CardContent>
        </Card>

        {/* Número de Recibos */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <Receipt className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm md:text-base">Número de Faturas</span>
              </div>
              <span className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: numero_recibos?.cor || '#666',
                backgroundColor: numero_recibos?.cor ? `${numero_recibos.cor}20` : '#f3f4f6'
              }}>{numero_recibos?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{numero_recibos?.valor || 0}</div>
              <div className="text-xs md:text-sm text-gray-600">Período Anterior: {numero_recibos?.ontem || 0}</div>
              <div className="text-xs md:text-sm text-gray-500">Transações realizadas</div>
            </div>
          </CardContent>
        </Card>

        {/* Itens Vendidos */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm md:text-base">Itens Vendidos</span>
              </div>
              <span className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: itens_vendidos?.cor || '#666',
                backgroundColor: itens_vendidos?.cor ? `${itens_vendidos.cor}20` : '#f3f4f6'
              }}>{itens_vendidos?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(itens_vendidos?.valor || 0)}</div>
              <div className="text-xs md:text-sm text-gray-600">Período Anterior: {formatCurrency(itens_vendidos?.ontem || 0)}</div>
              <div className="text-xs md:text-sm text-gray-500">Produtos vendidos</div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm md:text-base">Ticket Médio</span>
              </div>
              <span className="text-xs md:text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: ticket_medio?.cor || '#666',
                backgroundColor: ticket_medio?.cor ? `${ticket_medio.cor}20` : '#f3f4f6'
              }}>{ticket_medio?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(ticket_medio?.valor || 0)}</div>
              <div className="text-xs md:text-sm text-gray-600">Período Anterior: {formatCurrency(ticket_medio?.ontem || 0)}</div>
              <div className="text-xs md:text-sm text-gray-500">Valor por recibo</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de comparativo por hora */}
      <ChartComponent data={chartData} />
    </div>
  )
}
