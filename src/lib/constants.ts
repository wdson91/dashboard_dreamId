// Configurações da aplicação
export const APP_CONFIG = {
  name: 'Dashboard App',
  description: 'Aplicação de dashboard com autenticação e análise de dados',
  api: {
    baseUrl: 'http://13.48.69.154:8000',
    nif: '514757876',
    cacheExpiry: 3 * 60 * 1000, // 3 minutos
  },
  periods: [
    { value: '0', label: 'Hoje' },
    { value: '1', label: 'Ontem' },
    { value: '2', label: 'Esta Semana' },
    { value: '3', label: 'Este Mês' },
    { value: '4', label: 'Este Trimestre' },
    { value: '5', label: 'Este Ano' },
  ],
} as const

// Funções utilitárias de formatação
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

export const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`
}

export const formatNumber = (value: number) => {
  return value.toLocaleString('pt-BR')
} 