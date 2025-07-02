"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { api } from "@/utils/api"
import { APP_CONFIG, formatCurrency } from "@/lib/constants"
import {  FaturasListResponse } from "@/app/types/faturas"

async function getFaturas(periodo: string): Promise<FaturasListResponse> {
  const cacheKey = `faturas_data_${periodo}`
  
  // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  
  const urlPath = '/faturas/todas'
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}?route=${urlPath}&nif=${APP_CONFIG.api.nif}&periodo=${periodo}`
  
  const response = await api.get(url)
  
  const dados = response[0]
  
  // Salvar no cache
  localStorage.setItem(cacheKey, JSON.stringify({
    data: dados,
    timestamp: Date.now()
  }))
  
  return dados
}

export default function FaturasPage() {
  const [periodo, setPeriodo] = useState("0")
  const [data, setData] = useState<FaturasListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getFaturas(periodo)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [periodo])

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>
  if (!data) return null



  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3">
          <h1 className="text-gray-800 text-xl font-semibold">Lista de Faturas</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              className="border rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
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

      {/* Content */}
      <div className="p-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Número da Fatura</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.faturas.map((fatura, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {new Date(fatura.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {fatura.hora.substring(0, 5)}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-mono text-sm">
                        {fatura.numero_fatura}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                        {formatCurrency(fatura.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {data.faturas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma fatura encontrada para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 