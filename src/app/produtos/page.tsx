"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar} from "lucide-react"
// APP_CONFIG removido - agora usamos CacheManager
import { useProdutosApi, type ProdutosResponse } from "@/hooks/useApiNif"
import { CacheManager } from "@/lib/cache"
import { UpdateButton } from "@/app/components/UpdateButton"
import { useLanguage } from "../components/LanguageContext"
import { formatLastUpdate } from "@/lib/utils"

// Função removida - agora usamos CacheManager diretamente

export default function ProdutosPage() {
  const [periodo, setPeriodo] = useState("0") // Começa com "Hoje"
  const [data, setData] = useState<ProdutosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { apiNif, fetchProdutos } = useProdutosApi()
  const { t, getTranslatedPeriods } = useLanguage()
  const isLoadingRef = useRef(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Se não há NIF selecionado, não fazer a chamada da API
    if (!apiNif || isLoadingRef.current) {
      setLoading(false)
      return
    }

    isLoadingRef.current = true

    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)
    
    try {
      const cacheKey = `produtos_data_${apiNif.nif}_${apiNif.filial || 'all'}_${periodo}`
      
      const result = await CacheManager.fetchWithCache(
        cacheKey,
        () => fetchProdutos(periodo),
        forceRefresh,
        periodo
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
  }, [periodo, apiNif, fetchProdutos])

  // Efeito para carregar dados quando apiNif ou período mudam
  useEffect(() => {
    if (apiNif && !isLoadingRef.current) {
      fetchData()
    }
  }, [apiNif, periodo, fetchData])

  // Se não há NIF selecionado, mostrar mensagem
  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">{t('products.no_establishment')}</h2>
          <p className="text-white mb-6">
            {t('products.no_establishment_message')}
          </p>
          <a 
            href="/estabelecimentos" 
            className="inline-flex items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            {t('products.go_to_establishments')}
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-white">{t('products.loading')}</div>
  if (error) return <div className="p-8 text-center text-red-300">{t('products.error')}: {error}</div>
  if (!data) return null

  // Produtos já vêm ordenados da API
  const produtosOrdenados = data.itens

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
          <h1 className="text-[var(--color-card-text-green)] text-2xl font-semibold">{t('products.title')}</h1>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[var(--color-card-text-green)]" />
            <div className="relative">
              <select
                className="appearance-none border border-[var(--color-card-border-green)] rounded-lg px-4 py-2 pr-10 text-[var(--color-card-text-green)] focus:outline-none focus:ring-2 focus:ring-[var(--color-card-border-green)] focus:border-[var(--color-card-border-green)] bg-[var(--color-card-white)] shadow-sm"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
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
              {t('products.last_update')}: {formatLastUpdate(lastUpdate)}
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('products.period')}</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatDate(data.data_inicio)} - {formatDate(data.data_fim)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('products.total_items')}</div>
              <div className="text-2xl font-bold text-gray-900">
                {data.total_itens.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('products.total_amount')}</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.total_montante)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Produtos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('products.best_sellers')}</h2>
          
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
                          {t('products.quantity')}: {produto.quantidade.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(produto.montante)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatPercentage(produto.porcentagem_montante)} {t('products.of_total')}
                    </div>
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