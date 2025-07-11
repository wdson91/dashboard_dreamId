"use client"

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { useStatsResumo } from "@/hooks/useStatsResumo"
import { useLanguage } from "./LanguageContext"
import { formatCurrency } from "@/lib/constants"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatsCardProps {
  title: string
  data: {
    valor: number
    ontem: number
    variacao: string
    cor: string
  }
  icon: React.ReactNode
}

function StatsCard({ title, data, icon }: StatsCardProps) {
  const { t } = useLanguage()
  
  const getVariationIcon = () => {
    if (data.cor === '#28a745') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (data.cor === '#dc3545') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }
  
  return (
    <Card className="bg-white border-2 border-emerald-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.valor)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {getVariationIcon()}
              <span className="text-sm font-medium" style={{ color: data.cor }}>
                {data.variacao}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {t('dashboard.previous')}: {formatCurrency(data.ontem)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StatsResumoExample() {
  const [periodo, setPeriodo] = useState(0)
  const { data, loading, error } = useStatsResumo(periodo)
  const { t, getTranslatedPeriods } = useLanguage()
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
        <p className="text-center text-gray-600">{t('dashboard.loading')}</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }
  
  if (!data) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600">{t('dashboard.no_data')}</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Seletor de Período */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {getTranslatedPeriods().map((period) => (
          <button
            key={period.value}
            onClick={() => setPeriodo(parseInt(period.value))}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              periodo === parseInt(period.value)
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
      
      {/* Período Atual */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('dashboard.period')}: {data.periodo}
        </h2>
      </div>
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('dashboard.open_sales')}
          data={data.total_vendas}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        />
        
        <StatsCard
          title={t('dashboard.invoices')}
          data={data.numero_recibos}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        />
        
        <StatsCard
          title={t('dashboard.products_sold')}
          data={data.itens_vendidos}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
        />
        
        <StatsCard
          title={t('dashboard.average_ticket')}
          data={data.ticket_medio}
          icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
        />
      </div>
      
      {/* Comparativo por Hora */}
      {data.comparativo_por_hora.length > 0 && (
        <div className="bg-white border-2 border-emerald-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.hourly_comparison')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.comparativo_por_hora.map((item, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">{item.hora}</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(item.atual)}
                </p>
                <p className="text-xs text-gray-500">
                  {t('dashboard.previous')}: {formatCurrency(item.anterior)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 