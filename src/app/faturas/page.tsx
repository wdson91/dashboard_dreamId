"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Search, FileText } from "lucide-react"
import { APP_CONFIG, formatCurrency } from "@/lib/constants"
import { useFaturas, type FaturasResponse } from "@/hooks/useFaturas"
import { UpdateButton } from "@/app/components/UpdateButton"
import { useLanguage } from "../components/LanguageContext"

async function getFaturasWithCache(periodo: string, fetchFaturas: (periodo: string) => Promise<FaturasResponse>, nif: string, filial?: string): Promise<FaturasResponse> {
  const cacheKey = `faturas_data_${nif}_${filial || 'all'}_${periodo}`
  
  // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  // Buscar dados da API
  const dados = await fetchFaturas(periodo)
  
  // Salvar no cache
  localStorage.setItem(cacheKey, JSON.stringify({
    data: dados,
    timestamp: Date.now()
  }))
  
  return dados
}

export default function FaturasPage() {
  const [periodo, setPeriodo] = useState("0")
  const [searchTerm, setSearchTerm] = useState("")
  const [data, setData] = useState<FaturasResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { apiNif, fetchFaturas, downloadPDF } = useFaturas()
  const { t, getTranslatedPeriods } = useLanguage()
  const isLoadingRef = useRef(false)

  const fetchData = useCallback(async (clearCache = false) => {
    if (!apiNif || isLoadingRef.current) {
      setLoading(false)
      return
    }

    isLoadingRef.current = true

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
      const result = await getFaturasWithCache(periodo, fetchFaturas, apiNif.nif, apiNif.filial)
      setData(result)
      setLastUpdate(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setRefreshing(false)
      isLoadingRef.current = false
    }
  }, [periodo, apiNif, fetchFaturas])

  useEffect(() => {
    if (apiNif && !isLoadingRef.current) {
      fetchData()
    }
  }, [apiNif, periodo, fetchData])

  const handleDownloadPDF = async (numeroFatura: string) => {
    setDownloadingPDF(numeroFatura)
    try {
      await downloadPDF(numeroFatura)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido ao baixar PDF'
      alert(`Erro ao baixar PDF: ${errorMsg}`)
    } finally {
      setDownloadingPDF(null)
    }
  }

  // Se não há NIF selecionado, mostrar mensagem
  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">{t('invoices.no_establishment')}</h2>
          <p className="text-white mb-6">
            {t('invoices.no_establishment_message')}
          </p>
          <a 
            href="/estabelecimentos" 
            className="inline-flex items-center px-4 py-2 bg-white text-green-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            {t('invoices.go_to_establishments')}
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-gray-600">{t('invoices.loading')}</div>
  if (error) {
    // Verificar se é o erro específico de "Nenhuma fatura encontrada"
    if (error.includes("Nenhuma fatura encontrada")) {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="bg-[var(--color-card-white)] border border-[var(--color-card-border-green)] rounded-lg shadow-sm px-6 py-4 mb-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-[var(--color-card-text-green)] text-2xl font-semibold">{t('invoices.title')}</h1>
              
              {/* Dropdown de período */}
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
            </div>
          </div>
          
          {/* Mensagem de erro */}
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('invoices.no_invoices_found')}</h3>
            <p className="text-gray-600 mb-4">
              {t('invoices.no_invoices_message')}
            </p>
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-gray-700 text-sm">
                {t('invoices.try_different_period')}
              </p>
            </div>
          </div>
        </div>
      )
    }
    
    return <div className="p-8 text-center text-red-500">{t('invoices.error')}: {error}</div>
  }
  
  if (!data) return null

  // Garantir que estatisticas existe (fallback para dados antigos)
  const estatisticas = data.estatisticas || {
    total_faturas: data.faturas?.length || 0,
    total_montante: data.faturas?.reduce((sum, f) => sum + f.total, 0) || 0,
    ticket_medio: 0
  }
  if (estatisticas.total_faturas > 0 && estatisticas.ticket_medio === 0) {
    estatisticas.ticket_medio = estatisticas.total_montante / estatisticas.total_faturas
  }

  // Filtrar faturas baseado no termo de busca
  const filteredFaturas = data.faturas.filter(fatura =>
    fatura.numero_fatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fatura.nif_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fatura.data?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="bg-[var(--color-card-white)] border border-[var(--color-card-border-green)] rounded-lg shadow-sm px-6 py-4 mb-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-[var(--color-card-text-green)] text-2xl font-semibold">{t('invoices.title')}</h1>
          
          {/* Dropdown de período */}
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
              {t('invoices.last_update')}: {lastUpdate.toLocaleString('pt-BR', { 
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-[var(--color-card-white)] border-[var(--color-card-border-green)]">
          <CardContent className="p-4">
            <div className="text-sm text-[var(--color-card-text-green-muted)]">{t('invoices.total_invoices')}</div>
            <div className="text-2xl font-bold text-[var(--color-card-text-green)]">
              {estatisticas.total_faturas.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--color-card-white)] border-[var(--color-card-border-green)]">
          <CardContent className="p-4">
            <div className="text-sm text-[var(--color-card-text-green-muted)]">{t('invoices.total_amount')}</div>
            <div className="text-2xl font-bold text-[var(--color-card-text-green)]">
              {formatCurrency(estatisticas.total_montante)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--color-card-white)] border-[var(--color-card-border-green)]">
          <CardContent className="p-4">
            <div className="text-sm text-[var(--color-card-text-green-muted)]">{t('invoices.average_ticket')}</div>
            <div className="text-2xl font-bold text-[var(--color-card-text-green)]">
              {formatCurrency(estatisticas.ticket_medio)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--color-card-text-green-muted)]" />
          <input
            type="text"
            placeholder={t('invoices.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--color-card-white)] border border-[var(--color-card-border-green)] rounded-lg text-[var(--color-card-text-green)] placeholder:text-[var(--color-card-text-green-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-card-border-green)] focus:border-[var(--color-card-border-green)]"
          />
        </div>
      </div>

      {/* Lista de Faturas */}
      <div className="space-y-4">
        {filteredFaturas.map((fatura, index) => (
          <Card key={index} className="bg-[var(--color-card-white)] border-[var(--color-card-border-green)] hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--color-card-border-green)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-card-text-green)] text-lg">{t('invoices.invoice_number')} #{fatura.numero_fatura}</h3>
                    <p className="text-[var(--color-card-text-green-muted)] text-sm">
                      {t('invoices.client_nif')}: {fatura.nif_cliente} • {t('invoices.date')}: {fatura.data}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--color-card-text-green)]">
                      {formatCurrency(fatura.total)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(fatura.numero_fatura)}
                    disabled={downloadingPDF === fatura.numero_fatura}
                    className="px-4 py-2 bg-[var(--color-card-border-green)] text-white rounded-lg hover:bg-[var(--color-card-text-green-light)] border border-[var(--color-card-border-green)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingPDF === fatura.numero_fatura ? t('invoices.downloading') : t('invoices.download_pdf')}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredFaturas.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-[var(--color-card-text-green-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--color-card-text-green)] mb-2">{t('invoices.no_invoices_found')}</h3>
            <p className="text-[var(--color-card-text-green-muted)]">
              {t('invoices.adjust_filters')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 