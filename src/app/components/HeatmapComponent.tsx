"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/utils/api"
import { useApiNif } from "@/hooks/useApiNif"
import { useEstabelecimento } from "./EstabelecimentoContext"

interface HeatmapData {
  hora: string
  hora_num: number
  dia_semana: string
  dia_num: number
  volume: number
  quantidade_faturas: number
  ticket_medio: number
}

interface HeatmapResponse {
  dados: HeatmapData[]
  estatisticas: {
    total_volume: number
    total_faturas: number
    periodo: string
    data_inicio: string
    data_fim: string
    quantidade_celulas_com_dados: number
    variacao_volume: {
      valor: number
      variacao: string
      cor: string
      ontem: number
    }
    variacao_faturas: {
      valor: number
      variacao: string
      cor: string
      ontem: number
    }
  }
  nomes_dias: string[]
  horas_disponiveis: string[]
}

export default function HeatmapComponent() {
  const [data, setData] = useState<HeatmapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isLoaded } = useEstabelecimento()
  const apiNif = useApiNif()

  useEffect(() => {
    const fetchHeatmapData = async () => {
      if (!apiNif || !isLoaded) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://13.48.69.154:8000'
        let url = `${apiBaseUrl}/api/heatmap?nif=${apiNif.nif}&periodo=0`
        
        if (apiNif.filial) {
          url += `&filial=${apiNif.filial}`
        }

        const response = await api.get(url)
        setData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar heatmap')
      } finally {
        setLoading(false)
      }
    }

    fetchHeatmapData()
  }, [apiNif, isLoaded])

  if (!isLoaded) {
    return <div className="p-8 text-center text-white">Carregando...</div>
  }

  if (!apiNif) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">Nenhum estabelecimento selecionado</h2>
          <p className="text-white mb-6">
            Para visualizar o heatmap, você precisa selecionar um estabelecimento.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
        <CardContent className="p-6">
          <div className="text-center text-[var(--color-card-text-green)]">Carregando heatmap...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
        <CardContent className="p-6">
          <div className="text-center text-red-500">Erro: {error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
        <CardContent className="p-6">
          <div className="text-center text-[var(--color-card-text-green)]">Nenhum dado disponível</div>
        </CardContent>
      </Card>
    )
  }

  // Preparar dados para o heatmap
  const maxVolume = Math.max(...data.dados.map(d => d.volume))
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const horas = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

  const getCellData = (dia: string, hora: string) => {
    const horaIndex = parseInt(hora.split(':')[0])
    return data.dados.find(d => d.dia_semana === dia && d.hora_num === horaIndex)
  }

  const getIntensity = (volume: number) => {
    return Math.min((volume / maxVolume) * 0.8 + 0.2, 1) // Mínimo 20%, máximo 100%
  }

  return (
    <Card className="bg-[var(--color-card-white)] border-2 border-[var(--color-card-border-green)]">
      <CardContent className="p-2 sm:p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-card-text-green)] mb-2">
            Padrões de Vendas por Horário
          </h2>
          <p className="text-sm text-[var(--color-card-text-green-muted)]">
            Visualize os horários de maior movimento da semana
          </p>
        </div>

        {/* Estatísticas em cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 sm:p-3 md:p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              €{data.estatisticas.total_volume.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-green-600 font-medium">Volume Total</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 sm:p-3 md:p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {data.estatisticas.total_faturas}
            </div>
            <div className="text-xs text-blue-600 font-medium">Faturas</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-2 sm:p-3 md:p-4 rounded-lg border border-orange-200">
            <div className="text-lg font-bold text-orange-700">
              {data.estatisticas.variacao_volume.variacao}
            </div>
            <div className="text-xs text-orange-600 font-medium">Variação</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 sm:p-3 md:p-4 rounded-lg border border-purple-200">
            <div className="text-lg font-bold text-purple-700">
              {data.estatisticas.variacao_faturas.variacao}
            </div>
            <div className="text-xs text-purple-600 font-medium">Variação Faturas</div>
          </div>
        </div>

        {/* Novo Heatmap Design */}
        <div className="space-y-4">
          {/* Header com horas */}
          <div className="grid grid-cols-8 gap-2">
            <div className="text-sm font-semibold text-[var(--color-card-text-green)]">Dia</div>
            {horas.slice(6, 23).map((hora) => (
              <div key={hora} className="text-xs text-[var(--color-card-text-green-muted)] text-center font-medium">
                {hora.slice(0, 2)}h
              </div>
            ))}
          </div>

          {/* Linhas do heatmap */}
          {diasSemana.map((dia) => (
            <div key={dia} className="grid grid-cols-8 gap-2 items-center">
              <div className="text-sm font-semibold text-[var(--color-card-text-green)]">
                {dia.slice(0, 3)}
              </div>
              {horas.slice(6, 23).map((hora) => {
                const cellData = getCellData(dia, hora)
                const intensity = cellData ? getIntensity(cellData.volume) : 0
                const hasData = cellData && cellData.volume > 0
                
                return (
                  <div
                    key={`${dia}-${hora}`}
                    className={`
                      h-12 rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer 
                      transition-all duration-300 hover:scale-110 hover:shadow-lg relative
                      ${hasData ? 'border-2 border-green-200' : 'border border-gray-100'}
                    `}
                    style={{
                      backgroundColor: hasData 
                        ? `rgba(34, 197, 94, ${intensity * 0.8 + 0.2})`
                        : '#f8fafc',
                    }}
                    title={cellData 
                      ? `${dia} ${hora}\n€${cellData.volume.toFixed(2)}\n${cellData.quantidade_faturas} faturas`
                      : `${dia} ${hora}\nSem vendas`
                    }
                  >
                    {hasData && (
                      <>
                        <div className="font-bold text-white drop-shadow-sm">
                          €{cellData.volume.toFixed(0)}
                        </div>
                        <div className="text-[10px] text-white/90">
                          {cellData.quantidade_faturas}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legenda melhorada */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-card-text-green)]">Intensidade de Vendas</span>
            <span className="text-xs text-[var(--color-card-text-green-muted)]">€0 - €{maxVolume.toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-card-text-green-muted)]">Baixo</span>
            <div className="flex-1 flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                <div
                  key={intensity}
                  className="h-3 flex-1 rounded"
                  style={{
                    backgroundColor: `rgba(34, 197, 94, ${intensity * 0.8 + 0.2})`
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-[var(--color-card-text-green-muted)]">Alto</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 