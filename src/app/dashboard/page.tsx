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
import { useLanguage } from "@/app/components/LanguageContext"
import Link from "next/link"
//import HeatmapComponent from "@/app/components/HeatmapComponent"

// Componente separado para o gráfico
// eslint-disable-next-line
const ChartComponent = ({ data, title }: { data: any[]; title: string }) => {
  return (
    <div className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] rounded-lg shadow-sm  mt-6">
      <h2 className="text-xl font-semibold text-[var(--color-card-text-green)] mb-4 p-2">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border-green)" />
          <XAxis dataKey="hora" stroke="var(--color-card-text-green)" />
          <YAxis tickFormatter={v => `€${v}`} stroke="var(--color-card-text-green)" />
          <Tooltip 
            formatter={(value) => [`€${value}`, '']}
            contentStyle={{
              backgroundColor: 'var(--color-card-white)',
              border: '1px solid var(--color-card-border-green)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--color-card-text-green)' }}
            itemStyle={{ color: 'var(--color-card-border-green)' }}
          />
          <Legend />
          <Line type="monotone" dataKey="hoje" stroke="var(--color-card-border-green)" name="Atual" strokeWidth={2} />
          <Line type="monotone" dataKey="ontem" stroke="var(--color-chart-previous)" name="Anterior" strokeWidth={2} />
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
  const { t, getTranslatedPeriods } = useLanguage()

  // Memoizar os dados do gráfico para evitar re-renders desnecessários
  const chartData = useMemo(() => {
    if (!data || !data.comparativo_por_hora) {
      return []
    }
    return data.comparativo_por_hora
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.comparativo_por_hora])

  const getBadgeClass = (variation: string | undefined) => {
    if (!variation) {
      return 'bg-warning text-warning-foreground'; // Pendente
    }
    const value = parseFloat(variation.replace('%', ''));
    if (value > 0) {
      return 'bg-muted text-foreground'; // Concluído (Positivo)
    }
    if (value < 0) {
      return 'bg-destructive-muted text-destructive-muted-foreground'; // Negativo
    }
    return 'bg-warning text-warning-foreground'; // Pendente (Zero)
  }

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
    return <div className="p-8 text-center text-white">{t('dashboard.loading')}</div>
  }

  // Se não há NIF selecionado, mostrar mensagem
  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">{t('dashboard.no_establishment')}</h2>
          <p className="text-white mb-6">
            {t('dashboard.no_establishment_message')}
          </p>
          <a 
            href="/estabelecimentos" 
            className="inline-flex items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            {t('dashboard.go_to_establishments')}
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-white">{t('dashboard.loading_data')}</div>
  if (error) return <div className="p-8 text-center text-red-300">{t('dashboard.error')}: {error}</div>
  if (!data) {
    return <div className="p-8 text-center text-white">{t('dashboard.no_data')}</div>
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
      <div className="p-8 text-center text-red-300">
        <div>{t('dashboard.incomplete_data')}</div>
        <div className="text-sm mt-2">{t('dashboard.missing_fields')}: {camposFaltando.join(', ')}</div>
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
    <div className="min-h-screen bg-white p-1 sm:p-2 md:p-4 lg:p-6">
              {/* Header */}
        <div className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] rounded-lg shadow-sm px-2 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
        <h1 className="text-[var(--color-card-text-green)] text-xl font-semibold">{t('dashboard.title')}</h1>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[var(--color-card-text-green)]" />
            <div className="relative">
              <select
                className="appearance-none border border-[var(--color-card-border-green)] rounded-lg px-4 py-2 pr-10 text-[var(--color-card-text-green)] focus:outline-none focus:ring-2 focus:ring-[var(--color-card-border-green)] focus:border-[var(--color-card-border-green)] bg-[var(--color-card-white)] shadow-sm"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              >
                {getTranslatedPeriods().map(period => (
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
              {t('dashboard.last_update')}: {lastUpdate.toLocaleString('pt-BR', { 
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
      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Vendas em Aberto */}
        <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
          <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-3 bg-[var(--color-card-border-green)] rounded-xl border border-[var(--color-card-border-green)]">
                  <Umbrella className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <span className="text-[var(--color-card-text-green)] font-semibold text-sm md:text-base">{t('dashboard.open_sales')}</span>
              </div>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-card-text-green)]">
                {formatCurrency(total_vendas?.valor || 0)}
              </div>
              <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.open_tables')}: 0</div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Consolidadas */}
        <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
          <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="p-2 md:p-3 bg-[var(--color-card-border-green)] rounded-xl border border-[var(--color-card-border-green)] flex-shrink-0">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <span className="text-[var(--color-card-text-green)] font-semibold text-sm md:text-base truncate">{t('dashboard.consolidated_sales')}</span>
              </div>
              <span className={`text-xs md:text-sm font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(total_vendas?.variacao)}`}>
                {total_vendas?.variacao || '0%'}
              </span>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-card-text-green)]">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {formatCurrency(total_vendas?.ontem || 0)}</div>
              <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.daily_sales')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Número de Recibos */}
        <Link href="/faturas" className="block">
          <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className="p-2 md:p-3 bg-[var(--color-card-border-green)] rounded-xl border border-[var(--color-card-border-green)] flex-shrink-0">
                    <Receipt className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <span className="text-[var(--color-card-text-green)] font-semibold text-sm md:text-base truncate">{t('dashboard.invoices')}</span>
                </div>
                <span className={`text-xs md:text-sm font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(numero_recibos?.variacao)}`}>
                  {numero_recibos?.variacao || '0%'}
                </span>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div className="text-2xl md:text-3xl font-bold text-[var(--color-card-text-green)]">{numero_recibos?.valor || 0}</div>
                <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {numero_recibos?.ontem || 0}</div>
                <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.transactions')}</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Itens Vendidos */}
        <Link href="/produtos" className="block">
          <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className="p-2 md:p-3 bg-[var(--color-card-border-green)] rounded-xl border border-[var(--color-card-border-green)] flex-shrink-0">
                    <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <span className="text-[var(--color-card-text-green)] font-semibold text-sm md:text-base truncate">{t('dashboard.products_sold')}</span>
                </div>
                <span className={`text-xs md:text-sm font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(itens_vendidos?.variacao)}`}>
                  {itens_vendidos?.variacao || '0%'}
                </span>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div className="text-2xl md:text-3xl font-bold text-[var(--color-card-text-green)]">{itens_vendidos?.valor || 0}</div>
                <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {itens_vendidos?.ontem || 0}</div>
                <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.products_sold_count')}</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Ticket Médio */}
        <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
          <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="p-2 md:p-3 bg-[var(--color-card-border-green)] rounded-xl border border-[var(--color-card-border-green)] flex-shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <span className="text-[var(--color-card-text-green)] font-semibold text-sm md:text-base truncate">{t('dashboard.average_ticket')}</span>
              </div>
              <span className={`text-xs md:text-sm font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(ticket_medio?.variacao)}`}>
                {ticket_medio?.variacao || '0%'}
              </span>
            </div>
            <div className="space-y-1 md:space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-card-text-green)]">{formatCurrency(ticket_medio?.valor || 0)}</div>
              <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {formatCurrency(ticket_medio?.ontem || 0)}</div>
              <div className="text-xs md:text-sm text-[var(--color-card-text-green-muted)]">{t('dashboard.value_per_receipt')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de comparativo por hora */}
      <ChartComponent data={chartData} title={t('dashboard.hourly_comparison')} />

      {/* Heatmap de Horários */}
      {/* <div className="mt-6">
        <HeatmapComponent />
      </div> */}
    </div>
  )
}
