"use client"

import { useState, useEffect } from "react"
import {  Umbrella, DollarSign, Receipt, ShoppingCart, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FaturasResponse } from "../types/faturas"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { api } from "@/utils/api"
import { APP_CONFIG, formatCurrency } from "@/lib/constants"
import { useApiNif } from "@/hooks/useApiNif"

async function getData(filtro: string, nif: string): Promise<FaturasResponse['dados']> {
  const cacheKey = `dashboard_data_${nif}_${filtro}`
  
  // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  const urlPath = '/api/stats/resumo'
  //const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}?route=${urlPath}&nif=${nif}&periodo=${filtro}`
  
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${urlPath}?nif=${nif}&periodo=${filtro}`
 
  
  const response = await api.get(url)
  
  const dados = response
  
  
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
  const apiNif = useApiNif()

  useEffect(() => {
    // Se não há NIF selecionado, não fazer a chamada da API
    if (!apiNif) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    getData(filtro, apiNif)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filtro, apiNif])

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
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Vendas em Aberto */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <Umbrella className="h-6 w-6 text-yellow-600" />
                </div>
                <span className="text-gray-800 font-semibold">Vendas em Aberto</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-sm text-gray-600">Mesas em Aberto: 0</div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Consolidadas */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-gray-800 font-semibold">Vendas Consolidadas</span>
              </div>
              <span className="text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: total_vendas?.cor || '#666',
                backgroundColor: total_vendas?.cor ? `${total_vendas.cor}20` : '#f3f4f6'
              }}>{total_vendas?.variacao || '0%'}</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(total_vendas?.valor || 0)}</div>
              <div className="text-sm text-gray-600">Período Anterior: {formatCurrency(total_vendas?.ontem || 0)}</div>
              <div className="text-sm text-gray-500">Vendas do dia</div>
            </div>
          </CardContent>
        </Card>

        {/* Número de Recibos */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-gray-800 font-semibold">Número de Faturas</span>
              </div>
              <span className="text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: numero_recibos?.cor || '#666',
                backgroundColor: numero_recibos?.cor ? `${numero_recibos.cor}20` : '#f3f4f6'
              }}>{numero_recibos?.variacao || '0%'}</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">{numero_recibos?.valor || 0}</div>
              <div className="text-sm text-gray-600">Período Anterior: {numero_recibos?.ontem || 0}</div>
              <div className="text-sm text-gray-500">Transações realizadas</div>
            </div>
          </CardContent>
        </Card>

        {/* Itens Vendidos */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-gray-800 font-semibold">Itens Vendidos</span>
              </div>
              <span className="text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: itens_vendidos?.cor || '#666',
                backgroundColor: itens_vendidos?.cor ? `${itens_vendidos.cor}20` : '#f3f4f6'
              }}>{itens_vendidos?.variacao || '0%'}</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(itens_vendidos?.valor || 0)}</div>
              <div className="text-sm text-gray-600">Período Anterior: {formatCurrency(itens_vendidos?.ontem || 0)}</div>
              <div className="text-sm text-gray-500">Produtos vendidos</div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-gray-800 font-semibold">Ticket Médio</span>
              </div>
              <span className="text-sm font-semibold px-2 py-1 rounded-full" style={{ 
                color: ticket_medio?.cor || '#666',
                backgroundColor: ticket_medio?.cor ? `${ticket_medio.cor}20` : '#f3f4f6'
              }}>{ticket_medio?.variacao || '0%'}</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(ticket_medio?.valor || 0)}</div>
              <div className="text-sm text-gray-600">Período Anterior: {formatCurrency(ticket_medio?.ontem || 0)}</div>
              <div className="text-sm text-gray-500">Valor por recibo</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de comparativo por hora */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Comparativo por Hora</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparativo_por_hora || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
    </div>
  )
}
