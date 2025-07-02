"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { api } from "@/utils/api"
import { APP_CONFIG } from "@/lib/constants"
import {  ProdutosResponse } from "@/app/types/faturas"
import { useApiNif } from "@/hooks/useApiNif"

async function getProdutos(periodo: string, nif: string): Promise<ProdutosResponse> {
  const cacheKey = `produtos_data_${nif}_${periodo}`
  
  // Verificar cache
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    if (now - timestamp < APP_CONFIG.api.cacheExpiry) {
      return data
    }
  }
  
  const urlPath = '/products'
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}?route=${urlPath}&nif=${nif}&periodo=${periodo}`
  
  const response = await api.get(url)
  
  const dados = response[0]
  
  // Salvar no cache
  localStorage.setItem(cacheKey, JSON.stringify({
    data: dados,
    timestamp: Date.now()
  }))
  
  return dados
}

export default function ProdutosPage() {
  const [periodo, setPeriodo] = useState("2") // Começa com "Esta Semana"
  const [data, setData] = useState<ProdutosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiNif = useApiNif()

  useEffect(() => {
    setLoading(true)
    setError(null)
    getProdutos(periodo, apiNif)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [periodo, apiNif])

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>
  if (!data) return null

  // Ordenar produtos por montante (maior para menor)
  const produtosOrdenados = [...data.itens].sort((a, b) => b.montante - a.montante)

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  // Função para formatar porcentagens
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-gray-800 text-xl font-semibold">Produtos Vendidos</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div className="relative">
              <select
                className="appearance-none border rounded px-3 py-1 pr-8 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
              >
                {APP_CONFIG.periods.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Período</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date(data.data_inicio).toLocaleDateString('pt-BR')} - {new Date(data.data_fim).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Total de Itens</div>
              <div className="text-lg font-semibold text-gray-900">{data.total_itens}</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Total de Vendas</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(data.total_montante)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Produtos */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Produto</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Quantidade</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Montante</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">% do Total</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosOrdenados.map((produto, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {produto.produto}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {produto.quantidade.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-medium">
                        {formatCurrency(produto.montante)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {formatPercentage(produto.porcentagem_montante)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {produtosOrdenados.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum produto encontrado para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 