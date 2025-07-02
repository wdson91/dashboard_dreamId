"use client"

import { useState, useEffect } from "react"
import {  Umbrella, DollarSign, Receipt, ShoppingCart, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FaturasResponse } from "../types/faturas"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { api } from "@/utils/api"
import { APP_CONFIG, formatCurrency } from "@/lib/constants"

async function getData(filtro: string): Promise<FaturasResponse['dados']> {
  const cacheKey = `dashboard_data_${filtro}`
  
  // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  const urlPath = '/stats/resumo'
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}?route=${urlPath}&nif=${APP_CONFIG.api.nif}&periodo=${filtro}`
  
  const response = await api.get(url)
  const dados = response[0]

  
  // Salvar no cache
  localStorage.setItem(cacheKey, JSON.stringify({
    data: dados,
    timestamp: Date.now()
  }))
  
  return dados
}

export default function Component() {
  const [filtro, setFiltro] = useState("0")
  const [data, setData] = useState<FaturasResponse['dados'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getData(filtro)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>
  if (!data) return null

  // Verificar se todos os dados necessários existem
  if (!data.total_vendas || !data.itens_vendidos || !data.numero_recibos || !data.ticket_medio || !data.comparativo_por_hora) {
    return <div className="p-8 text-center text-red-500">Dados incompletos recebidos da API</div>
  }

  const {
    comparativo_por_hora,
    itens_vendidos,
    numero_recibos,
    ticket_medio,
    total_vendas,
    //periodo,
  } = data

  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3">
          <h1 className="text-gray-800 text-xl font-semibold">S.Martino (Leix...</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              className="border rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            >
              {APP_CONFIG.periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Vendas em Aberto */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Umbrella className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-gray-700 font-medium">Vendas em Aberto</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-sm text-gray-500">Mesas em Aberto: 0</div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Consolidadas */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-gray-700 font-medium">Vendas Consolidadas</span>
              </div>
              <span className="text-sm font-medium " style={{ color: total_vendas?.cor || '#666' }}>{total_vendas?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-sm text-gray-500">Período Anterior: {formatCurrency(total_vendas?.ontem || 0)}</div>
              <div className="text-sm text-gray-400">Vendas do dia</div>
            </div>
          </CardContent>
        </Card>

        {/* Número de Recibos */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-gray-700 font-medium">Número de Faturas</span>
              </div>
              <span className="text-sm font-medium " style={{ color: numero_recibos?.cor || '#666' }}>{numero_recibos?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">{numero_recibos?.valor || 0}</div>
              <div className="text-sm text-gray-500">Período Anterior: {numero_recibos?.ontem || 0}</div>
              <div className="text-sm text-gray-400">Transações realizadas</div>
            </div>
          </CardContent>
        </Card>

        {/* Itens Vendidos */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-gray-700 font-medium">Itens Vendidos</span>
              </div>
              <span className="text-sm font-medium " style={{ color: itens_vendidos?.cor || '#666' }}>{itens_vendidos?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(itens_vendidos?.valor || 0)}</div>
              <div className="text-sm text-gray-500">Período Anterior: {formatCurrency(itens_vendidos?.ontem || 0)}</div>
              <div className="text-sm text-gray-400">Produtos vendidos</div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-gray-700 font-medium">Ticket Médio</span>
              </div>
              <span className="text-sm font-medium " style={{ color: ticket_medio?.cor || '#666' }}>{ticket_medio?.variacao || '0%'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(ticket_medio?.valor || 0)}</div>
              <div className="text-sm text-gray-500">Período Anterior: {formatCurrency(ticket_medio?.ontem || 0)}</div>
              <div className="text-sm text-gray-400">Valor por recibo</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de comparativo por hora */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">Comparativo por Hora</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparativo_por_hora || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis tickFormatter={v => `€${v}`} />
            <Tooltip formatter={(value) => [`€${value}`, '']} />
            <Legend />
            <Line type="monotone" dataKey="hoje" stroke="#8884d8" name="Atual" />
            <Line type="monotone" dataKey="ontem" stroke="#82ca9d" name="Anterior" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
