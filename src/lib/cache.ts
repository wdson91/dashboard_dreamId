// Cache utilities para centralizar toda a lógica de cache

export interface CacheData<T> {
  data: T
  timestamp: number
  lastUpdate: string // Armazenar como string para localStorage
  periodo?: string // Adicionar período para controle de cache
}

export class CacheManager {
  private static CACHE_DURATION_TODAY = 3 * 60 * 1000 // 3 minutos para hoje
  private static CACHE_DURATION_OTHER_PERIODS = 24 * 60 * 60 * 1000 // 24 horas para outros períodos

  // Obter duração do cache baseada no período
  private static getCacheDuration(periodo?: string): number {
    if (periodo === '0') {
      return this.CACHE_DURATION_TODAY
    }
    return this.CACHE_DURATION_OTHER_PERIODS
  }

  // Verificar se os dados em cache ainda são válidos
  static isValidCache(cacheKey: string, periodo?: string): boolean {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return false

    try {
      const { timestamp } = JSON.parse(cached) as CacheData<unknown>
      const now = Date.now()
      const cacheDuration = this.getCacheDuration(periodo)
      return (now - timestamp) < cacheDuration
    } catch {
      localStorage.removeItem(cacheKey)
      return false
    }
  }

  // Obter dados do cache se válidos
  static getCache<T>(cacheKey: string, periodo?: string): CacheData<T> | null {
    if (!this.isValidCache(cacheKey, periodo)) return null

    try {
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return null
      
      const cacheData = JSON.parse(cached) as CacheData<T>
      return cacheData
    } catch {
      localStorage.removeItem(cacheKey)
      return null
    }
  }

  // Salvar dados no cache
  static setCache<T>(cacheKey: string, data: T, periodo?: string): void {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      periodo
    }

    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  }

  // Limpar cache específico
  static clearCache(cacheKey: string): void {
    localStorage.removeItem(cacheKey)
  }

  // Obter última atualização do cache
  static getLastUpdate(cacheKey: string): Date | null {
    const cached = this.getCache(cacheKey)
    return cached ? new Date(cached.lastUpdate) : null
  }

  // Obter última atualização global
  static getGlobalLastUpdate(): Date | null {
    const globalUpdate = localStorage.getItem('global_last_update')
    return globalUpdate ? new Date(globalUpdate) : null
  }

  // Atualizar última atualização global
  static updateGlobalLastUpdate(): void {
    localStorage.setItem('global_last_update', new Date().toISOString())
  }

  // Limpar todos os caches e sincronizar última atualização
  static clearAllCaches(): void {
    // Limpar todos os caches de páginas
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('_data_') || key.includes('dashboard_data_') || key.includes('produtos_data_') || key.includes('faturas_data_')) {
        localStorage.removeItem(key)
      }
    })
    
    // Atualizar última atualização global
    this.updateGlobalLastUpdate()
  }

  // Função para fazer fetch com cache
  static async fetchWithCache<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    forceRefresh = false,
    periodo?: string
  ): Promise<{ data: T; lastUpdate: Date }> {
    // Se não é refresh forçado, tentar usar cache
    if (!forceRefresh) {
      const cached = this.getCache<T>(cacheKey, periodo)
      if (cached) {
        return {
          data: cached.data,
          lastUpdate: this.getGlobalLastUpdate() || new Date(cached.lastUpdate)
        }
      }
    } else {
      // Se é refresh forçado, limpar cache primeiro
      this.clearCache(cacheKey)
    }

    // Fazer fetch dos dados
    const data = await fetchFunction()
    
    // Salvar no cache com período
    this.setCache(cacheKey, data, periodo)
    
    // Atualizar última atualização global
    this.updateGlobalLastUpdate()
    
    return {
      data,
      lastUpdate: new Date()
    }
  }
} 