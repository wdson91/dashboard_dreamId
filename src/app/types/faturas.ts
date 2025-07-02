// Tipos para dados de faturas e dashboard

export interface ComparativoHora {
  cor: string
  hoje: number
  hora: string
  hora_num: number
  ontem: number
  variacao: string
}

export interface CardResumo {
  cor: string
  ontem: number
  valor: number
  variacao: string
}

export interface FaturasResponse {
  dados: {
    comparativo_por_hora: ComparativoHora[]
    itens_vendidos: CardResumo
    numero_recibos: CardResumo
    ticket_medio: CardResumo
    total_vendas: CardResumo
    periodo: string
  }
}

// Tipos para produtos
export interface Produto {
  montante: number
  porcentagem_montante: number
  produto: string
  quantidade: number
}

export interface ProdutosResponse {
  data_fim: string
  data_inicio: string
  itens: Produto[]
  periodo: string
  total_itens: number
  total_montante: number
}

// Tipos para faturas
export interface Fatura {
  data: string
  hora: string
  numero_fatura: string
  total: number
}

export interface FaturasListResponse {
  faturas: Fatura[]
}
  