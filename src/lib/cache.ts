// Cache utilities para centralizar toda a lógica de cache
import { APP_CONFIG } from './constants'

export interface CacheData<T> {
  data: T
  timestamp: number
  lastUpdate: string // Armazenar como string para localStorage
}

export class CacheManager {
  private static CACHE_DURATION = APP_CONFIG.api.cacheExpiry // 3 minutos

  // Verificar se os dados em cache ainda são válidos
  static isValidCache(cacheKey: string): boolean {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return false

    try {
      const { timestamp } = JSON.parse(cached) as CacheData<unknown>
      const now = Date.now()
      return (now - timestamp) < this.CACHE_DURATION
    } catch {
      localStorage.removeItem(cacheKey)
      return false
    }
  }

  // Obter dados do cache se válidos
  static getCache<T>(cacheKey: string): CacheData<T> | null {
    if (!this.isValidCache(cacheKey)) return null

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
  static setCache<T>(cacheKey: string, data: T): void {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString()
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
    forceRefresh = false
  ): Promise<{ data: T; lastUpdate: Date }> {
    // Se não é refresh forçado, tentar usar cache
    if (!forceRefresh) {
      const cached = this.getCache<T>(cacheKey)
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
    
    // Salvar no cache
    this.setCache(cacheKey, data)
    
    // Atualizar última atualização global
    this.updateGlobalLastUpdate()
    
    return {
      data,
      lastUpdate: new Date()
    }
  }
} 