"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {  Umbrella, DollarSign, Receipt, ShoppingCart, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FaturasResponse } from "../types/faturas"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

import { formatCurrency } from "@/lib/constants"
import { CacheManager } from "@/lib/cache"
import { formatLastUpdate } from "@/lib/utils"
import { useApiNif } from "@/hooks/useApiNif"
import { useEstabelecimento } from "@/app/components/EstabelecimentoContext"
import { UpdateButton } from "@/app/components/UpdateButton"
import { useLanguage } from "@/app/components/LanguageContext"
import Link from "next/link"
//import HeatmapComponent from "@/app/components/HeatmapComponent"

// Componente customizado para o tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; name: string; value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--color-card-white)] border border-[var(--color-card-border-green)] rounded-lg p-3 shadow-lg">
        <p className="text-[var(--color-card-text-green)] font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p 
            key={index} 
            className="text-sm"
            style={{ color: entry.dataKey === 'hoje' ? 'var(--color-card-border-green)' : 'var(--color-chart-previous)' }}
          >
            {entry.name}: €{entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Componente separado para o gráfico
// eslint-disable-next-line
const ChartComponent = ({ data, title, t }: { data: any[]; title: string; t: any }) => {
  return (
    <div className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] rounded-lg shadow-sm mt-4">
      <h2 className="text-lg font-semibold text-[var(--color-card-text-green)] mb-3 p-3">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border-green)" />
          <XAxis dataKey="hora" stroke="var(--color-card-text-green)" />
          <YAxis tickFormatter={v => `€${v}`} stroke="var(--color-card-text-green)" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="hoje" stroke="var(--color-card-border-green)" name={t('dashboard.chart_current')} strokeWidth={2} />
          <Line type="monotone" dataKey="ontem" stroke="var(--color-chart-previous)" name={t('dashboard.chart_previous')} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

async function getData(filtro: string, apiParams: { nif: string; filial?: string }): Promise<FaturasResponse['dados']> {
  // Usar a nova API local
  let url = `/api/stats/resumo?nif=${apiParams.nif}&periodo=${filtro}`
  
  // Adicionar parâmetro de filial se existir
  if (apiParams.filial) {
    url += `&filial=${apiParams.filial}`
  }
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
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
  const lastCallRef = useRef<number>(0)
  const isLoadingRef = useRef<boolean>(false)

  // Memoizar os dados do gráfico para evitar re-renders desnecessários
  const chartData = useMemo(() => {
    if (!data || !data.comparativo_por_hora) {
      return []
    }
    return data.comparativo_por_hora
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.comparativo_por_hora])

  const getBadgeClass = (data: { variacao?: string } | string | undefined) => {
    let variationStr: string | undefined
    
    if (typeof data === 'string') {
      variationStr = data
    } else if (data && typeof data === 'object' && data.variacao) {
      variationStr = data.variacao
    }
    
    if (!variationStr) {
      return 'bg-yellow-100 text-yellow-800'; // Pendente
    }

    // Extrair o valor numérico da variação (manter o sinal)
    const value = parseFloat(variationStr.replace('%', ''));

    if (value > 0) {
      return 'bg-green-100 text-green-800'; // Verde para valores positivos
    }
    if (value < 0) {
      return 'bg-red-100 text-red-800'; // Vermelho para valores negativos
    }
    return 'bg-yellow-100 text-yellow-800'; // Amarelo para zero
  }

  const fetchData = useCallback(async (forceRefresh = false) => {
    
    // Se não há NIF selecionado ou não carregou ainda, não fazer a chamada da API
    if (!apiNif || !isLoaded) {
      setLoading(false)
      return
    }

    // Prevenir múltiplas chamadas muito próximas (menos de 500ms)
    const now = Date.now()
    if (!forceRefresh && (now - lastCallRef.current < 500)) {
      return
    }

    // Evitar chamadas duplicadas se já está carregando
    if (isLoadingRef.current && !forceRefresh) {
      return
    }

    lastCallRef.current = now
    isLoadingRef.current = true

    // Se estamos fazendo refresh ou não está carregando, definir loading como true
    if (forceRefresh || !loading) {
      setLoading(true)
    }

    if (forceRefresh) {
      setRefreshing(true)
    }

    setError(null)
    
    try {
      
      const cacheKey = `dashboard_data_${apiNif.nif}_${apiNif.filial || 'all'}_${filtro}`
      
      const result = await CacheManager.fetchWithCache(
        cacheKey,
        () => getData(filtro, apiNif),
        forceRefresh,
        filtro
      )
      
      setData(result.data)
      setLastUpdate(CacheManager.getGlobalLastUpdate() || result.lastUpdate)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setRefreshing(false)
      isLoadingRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, apiNif, isLoaded])

  // Efeito principal - consolidado para evitar múltiplas chamadas
  useEffect(() => {
    // Só fazer fetch se há apiNif disponível e isLoaded é true
    if (apiNif && isLoaded && !isLoadingRef.current) {
      fetchData(false) // false = usar cache se disponível
    } else {
      // Se não há apiNif, garantir que loading seja false
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNif?.nif, apiNif?.filial, isLoaded, filtro]) // Consolidado: reage a mudanças de NIF, filial, carregamento E filtro

  // Detectar quando o usuário volta para a página
  useEffect(() => {
    const handleFocus = () => {
      if (apiNif && isLoaded && !loading) {
        // Verificar se o cache está expirado usando o CacheManager
        const cacheKey = `dashboard_data_${apiNif.nif}_${apiNif.filial || 'all'}_${filtro}`
        if (!CacheManager.isValidCache(cacheKey, filtro)) {
          fetchData(true) // true = forçar refresh
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
    <div className="min-h-screen bg-white p-1 sm:p-2 md:p-3 lg:p-4">
              {/* Header */}
        <div className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] rounded-lg shadow-sm px-2 sm:px-3 md:px-4 py-2 sm:py-3 mb-3 sm:mb-4">
        <div className="flex flex-col gap-2">
        <h1 className="text-[var(--color-card-text-green)] text-lg font-semibold">{t('dashboard.title')}</h1>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--color-card-text-green)]" />
            <div className="relative">
              <select
                className="appearance-none border border-[var(--color-card-border-green)] rounded-lg px-3 py-1.5 pr-8 text-sm text-[var(--color-card-text-green)] focus:outline-none focus:ring-2 focus:ring-[var(--color-card-border-green)] focus:border-[var(--color-card-border-green)] bg-[var(--color-card-white)] shadow-sm"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              >
                {getTranslatedPeriods().map(period => (
                  <option key={period.value} value={period.value} className="bg-[var(--color-card-white)] text-[var(--color-card-text-green)]">
                    {period.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-card-text-green)]">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
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
              {t('dashboard.last_update')}: {formatLastUpdate(lastUpdate)}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4 lg:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Vendas em Aberto */}
        <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 md:p-2 bg-[var(--color-card-border-green)] rounded-lg border border-[var(--color-card-border-green)]">
                  <Umbrella className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <span className="text-[var(--color-card-text-green)] font-semibold text-xs md:text-sm">{t('dashboard.open_sales')}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-bold text-[var(--color-card-text-green)]">
                {formatCurrency(total_vendas?.valor || 0)}
              </div>
              <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.open_tables')}: 0</div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Consolidadas */}
        <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 md:p-2 bg-[var(--color-card-border-green)] rounded-lg border border-[var(--color-card-border-green)] flex-shrink-0">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <span className="text-[var(--color-card-text-green)] font-semibold text-xs md:text-sm truncate">{t('dashboard.consolidated_sales')}</span>
              </div>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(total_vendas)}`}>
                {total_vendas?.variacao || '0%'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-bold text-[var(--color-card-text-green)]">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {formatCurrency(total_vendas?.ontem || 0)}</div>
              <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.daily_sales')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Número de Recibos */}
        <Link href="/faturas" className="block">
          <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="p-2 sm:p-3 md:p-4">
              <div className="flex items-start justify-between mb-2 md:mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 md:p-2 bg-[var(--color-card-border-green)] rounded-lg border border-[var(--color-card-border-green)] flex-shrink-0">
                    <Receipt className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <span className="text-[var(--color-card-text-green)] font-semibold text-xs md:text-sm truncate">{t('dashboard.invoices')}</span>
                </div>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(numero_recibos)}`}>
                  {numero_recibos?.variacao || '0%'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xl md:text-2xl font-bold text-[var(--color-card-text-green)]">{numero_recibos?.valor || 0}</div>
                <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {numero_recibos?.ontem || 0}</div>
                <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.transactions')}</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Itens Vendidos */}
        <Link href="/produtos" className="block">
          <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)] hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="p-2 sm:p-3 md:p-4">
              <div className="flex items-start justify-between mb-2 md:mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 md:p-2 bg-[var(--color-card-border-green)] rounded-lg border border-[var(--color-card-border-green)] flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <span className="text-[var(--color-card-text-green)] font-semibold text-xs md:text-sm truncate">{t('dashboard.products_sold')}</span>
                </div>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(itens_vendidos)}`}>
                  {itens_vendidos?.variacao || '0%'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xl md:text-2xl font-bold text-[var(--color-card-text-green)]">{itens_vendidos?.valor || 0}</div>
                <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {itens_vendidos?.ontem || 0}</div>
                <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.products_sold_count')}</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Ticket Médio */}
        <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 md:p-2 bg-[var(--color-card-border-green)] rounded-lg border border-[var(--color-card-border-green)] flex-shrink-0">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <span className="text-[var(--color-card-text-green)] font-semibold text-xs md:text-sm truncate">{t('dashboard.average_ticket')}</span>
              </div>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${getBadgeClass(ticket_medio?.variacao)}`}>
                {ticket_medio?.variacao || '0%'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xl md:text-2xl font-bold text-[var(--color-card-text-green)]">{formatCurrency(ticket_medio?.valor || 0)}</div>
              <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.previous_period')}: {formatCurrency(ticket_medio?.ontem || 0)}</div>
              <div className="text-xs text-[var(--color-card-text-green-muted)]">{t('dashboard.value_per_receipt')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de comparativo por hora */}
      <ChartComponent data={chartData} title={t('dashboard.hourly_comparison')} t={t} />

      {/* Heatmap de Horários */}
      {/* <div className="mt-6">
        <HeatmapComponent />
      </div> */}
    </div>
  )
}
