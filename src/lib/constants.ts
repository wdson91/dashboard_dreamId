// Configurações da aplicação
export const APP_CONFIG = {
  name: 'Dashboard App',
  description: 'Aplicação de dashboard com autenticação e análise de dados',
  api: {
    baseUrl: 'http://13.48.69.154:8000',
    nif: '514757876',
    cacheExpiry: 3 * 60 * 1000, // 3 minutos
  },
  auth: {
    refreshTokenExpiry: 10 * 60 * 1000, // 10 minutos antes de expirar (aumentado)
    autoRefreshInterval: 8 * 60 * 1000, // 8 minutos (aumentado)
    sessionTimeout: 60 * 60 * 1000, // 1 hora
    minRefreshInterval: 30 * 1000, // 30 segundos mínimo entre refreshes
    rateLimitWaitTime: 60 * 1000, // 60 segundos para aguardar após rate limit
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
  return new Intl.NumberFormat('pt-PT', {
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