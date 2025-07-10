import { createClient } from '@/utils/supabase/server'

// Tipos baseados na estrutura real do Supabase
export interface FaturaItem {
  id: string
  nome: string
  quantidade: number
  preco_unitario: number
  total: number
}

export interface Fatura {
  id: string
  data: string
  total: number
  numero_fatura: string
  hora: string
  nif_cliente: string
  filial: string
  nif: string // NIF do estabelecimento
  faturas_itemfatura: FaturaItem[]
}

export interface DadosProcessados {
  stats_atual: [number, number, number, number] // [total, recibos, itens, ticket]
  stats_anterior: [number, number, number, number]
  comparativo_por_hora: Array<{
    hora: string
    atual: number
    anterior: number
  }>
}

export interface VariacaoDados {
  valor: number
  ontem: number
  variacao: string
  cor: string
}

// Funções auxiliares baseadas no código Python original

/**
 * Valida se o NIF é válido
 */
export function is_valid_nif(nif: string): boolean {
  return Boolean(nif && nif.length > 0)
}

/**
 * Obtém as datas dos períodos baseado no código Python
 */
export function get_periodo_datas(periodo: number): [Date, Date, Date, Date] {
  const hoje = new Date()
  const inicio_dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  
  switch (periodo) {
    case 0: // Hoje
      return [inicio_dia, hoje, inicio_dia, new Date(inicio_dia.getTime() - 24*60*60*1000)]
    case 1: // Ontem
      const ontem = new Date(inicio_dia.getTime() - 24*60*60*1000)
      const anteontem = new Date(ontem.getTime() - 24*60*60*1000)
      return [ontem, new Date(ontem.getTime() + 24*60*60*1000 - 1), ontem, anteontem]
    case 2: // Esta semana
      const inicio_semana = new Date(inicio_dia.getTime() - inicio_dia.getDay() * 24*60*60*1000)
      const fim_semana = new Date(inicio_semana.getTime() + 7*24*60*60*1000 - 1)
      const inicio_semana_anterior = new Date(inicio_semana.getTime() - 7*24*60*60*1000)
      const fim_semana_anterior = new Date(inicio_semana.getTime() - 1)
      return [inicio_semana, fim_semana, inicio_semana_anterior, fim_semana_anterior]
    case 3: // Este mês
      const inicio_mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fim_mes = hoje
      const inicio_mes_anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const fim_mes_anterior = new Date(inicio_mes.getTime() - 24*60*60*1000)
      return [inicio_mes, fim_mes, inicio_mes_anterior, fim_mes_anterior]
    case 4: // Este trimestre
      const mes_atual = hoje.getMonth()
      const trimestre_inicio_mes = 1 + 3 * Math.floor((mes_atual) / 3)
      const inicio_trimestre = new Date(hoje.getFullYear(), trimestre_inicio_mes - 1, 1)
      const fim_trimestre = hoje
      const inicio_trimestre_anterior = new Date(hoje.getFullYear(), trimestre_inicio_mes - 4, 1)
      const fim_trimestre_anterior = new Date(inicio_trimestre.getTime() - 24*60*60*1000)
      return [inicio_trimestre, fim_trimestre, inicio_trimestre_anterior, fim_trimestre_anterior]
    case 5: // Este ano
      const inicio_ano = new Date(hoje.getFullYear(), 0, 1)
      const fim_ano = hoje
      const inicio_ano_anterior = new Date(hoje.getFullYear() - 1, 0, 1)
      const fim_ano_anterior = new Date(inicio_ano.getTime() - 24*60*60*1000)
      return [inicio_ano, fim_ano, inicio_ano_anterior, fim_ano_anterior]
    default:
      throw new Error('Período inválido')
  }
}

/**
 * Converte código do período para nome legível
 */
export function parse_periodo(periodo: number): string {
  switch (periodo) {
    case 0: return 'Hoje'
    case 1: return 'Ontem'
    case 2: return 'Esta Semana'
    case 3: return 'Este Mês'
    case 4: return 'Este Trimestre'
    case 5: return 'Este Ano'
    default: return 'Período Desconhecido'
  }
}

/**
 * Busca faturas de um período específico
 * Baseado na função Python buscar_faturas_periodo
 */
export async function buscar_faturas_periodo(
  nif: string, 
  data_inicio: Date, 
  data_fim: Date, 
  filial?: string
): Promise<Fatura[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('faturas_fatura')
    .select('id, data, total, numero_fatura, hora, nif_cliente, filial, nif, faturas_itemfatura(id, nome, quantidade, preco_unitario, total)')
    .eq('nif', nif)
    .gte('data', data_inicio.toISOString())
    .lte('data', data_fim.toISOString())
  
  if (filial) {
    query = query.eq('filial', filial)
  }
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Erro ao buscar faturas: ${error.message}`)
  }
  
  return data || []
}

/**
 * Calcula estatísticas otimizadas para ambos os períodos
 * Baseado na função Python calcular_stats_otimizado
 */
export function calcular_stats_otimizado(
  faturas_completas: Fatura[], 
  data_inicio: Date, 
  data_fim: Date, 
  data_inicio_anterior: Date, 
  data_fim_anterior: Date
): [[number, number, number, number], [number, number, number, number]] {
  let total_atual = 0, total_anterior = 0
  let recibos_atual = 0, recibos_anterior = 0
  let itens_atual = 0, itens_anterior = 0
  
  for (const fatura of faturas_completas) {
    const data_fatura = new Date(fatura.data)
    const total_fatura = parseFloat(fatura.total.toString())
    const itens_fatura = fatura.faturas_itemfatura.reduce((sum, item) => sum + item.quantidade, 0)
    
    // Determinar a qual período pertence
    if (data_inicio <= data_fatura && data_fatura <= data_fim) {
      total_atual += total_fatura
      recibos_atual += 1
      itens_atual += itens_fatura
    } else if (data_inicio_anterior <= data_fatura && data_fatura <= data_fim_anterior) {
      total_anterior += total_fatura
      recibos_anterior += 1
      itens_anterior += itens_fatura
    }
  }
  
  // Calcular ticket médio
  const ticket_atual = recibos_atual > 0 ? total_atual / recibos_atual : 0
  const ticket_anterior = recibos_anterior > 0 ? total_anterior / recibos_anterior : 0
  
  return [
    [total_atual, recibos_atual, itens_atual, ticket_atual],
    [total_anterior, recibos_anterior, itens_anterior, ticket_anterior]
  ]
}

/**
 * Agrupa vendas por hora para ambos os períodos
 * Baseado na função Python agrupar_por_hora_otimizado
 */
export function agrupar_por_hora_otimizado(
  faturas_completas: Fatura[], 
  data_inicio: Date, 
  data_fim: Date, 
  data_inicio_anterior: Date, 
  data_fim_anterior: Date
): [Map<number, number>, Map<number, number>] {
  const vendas_por_hora_atual = new Map<number, number>()
  const vendas_por_hora_anterior = new Map<number, number>()
  
  for (const fatura of faturas_completas) {
    const data_fatura = new Date(fatura.data)
    const hora_str = fatura.hora
    
    if (!hora_str) continue
    
    try {
      const hora = parseInt(hora_str.split(':')[0])
      const total_fatura = parseFloat(fatura.total.toString())
      
      // Determinar a qual período pertence
      if (data_inicio <= data_fatura && data_fatura <= data_fim) {
        vendas_por_hora_atual.set(hora, (vendas_por_hora_atual.get(hora) || 0) + total_fatura)
      } else if (data_inicio_anterior <= data_fatura && data_fatura <= data_fim_anterior) {
        vendas_por_hora_anterior.set(hora, (vendas_por_hora_anterior.get(hora) || 0) + total_fatura)
      }
    } catch (error) {
      // Ignorar horas inválidas
      continue
    }
  }
  
  return [vendas_por_hora_atual, vendas_por_hora_anterior]
}

/**
 * Gera comparativo por hora
 * Baseado na função Python gerar_comparativo_por_hora
 */
export function gerar_comparativo_por_hora(
  vendas_por_hora_atual: Map<number, number>,
  vendas_por_hora_anterior: Map<number, number>
): Array<{ hora: string; atual: number; anterior: number }> {
  const comparativo = []
  
  for (let hora = 0; hora < 24; hora++) {
    const hora_str = `${hora.toString().padStart(2, '0')}:00`
    const atual = vendas_por_hora_atual.get(hora) || 0
    const anterior = vendas_por_hora_anterior.get(hora) || 0
    
    comparativo.push({
      hora: hora_str,
      atual,
      anterior
    })
  }
  
  return comparativo
}

/**
 * Processa todas as faturas de uma vez
 * Baseado na função Python processar_faturas_otimizado
 */
export function processar_faturas_otimizado(
  faturas_completas: Fatura[], 
  data_inicio: Date, 
  data_fim: Date, 
  data_inicio_anterior: Date, 
  data_fim_anterior: Date
): DadosProcessados {
  // Calcular estatísticas para ambos os períodos
  const [stats_atual, stats_anterior] = calcular_stats_otimizado(
    faturas_completas, data_inicio, data_fim, data_inicio_anterior, data_fim_anterior
  )
  
  // Agrupar vendas por hora para ambos os períodos
  const [vendas_por_hora_atual, vendas_por_hora_anterior] = agrupar_por_hora_otimizado(
    faturas_completas, data_inicio, data_fim, data_inicio_anterior, data_fim_anterior
  )
  
  // Gerar comparativo por hora
  const comparativo_por_hora = gerar_comparativo_por_hora(vendas_por_hora_atual, vendas_por_hora_anterior)
  
  return {
    stats_atual,
    stats_anterior,
    comparativo_por_hora
  }
}

/**
 * Calcula variação entre dados atual e anterior
 * Baseado na função Python calcular_variacao_dados
 */
export function calcular_variacao_dados(atual: number, anterior: number): VariacaoDados {
  const variacao = atual - anterior
  const percentual = anterior > 0 ? (variacao / anterior) * 100 : 0
  
  // Formatar variação como string com sinal
  const sinal = percentual >= 0 ? '+' : ''
  const variacao_formatada = `${sinal}${Math.abs(Math.round(percentual * 10) / 10)}%`
  
  // Determinar cor baseada na variação
  const cor = percentual >= 0 ? '#28a745' : '#dc3545' // verde vs vermelho
  
  return {
    valor: Math.round(atual * 100) / 100, // Arredondar para 2 casas decimais
    ontem: Math.round(anterior * 100) / 100,
    variacao: variacao_formatada,
    cor
  }
}

/**
 * Formata variação com sinal e cor
 * Baseado na função Python format_variacao
 */
export function format_variacao(valor: number): { variacao: string; cor: string } {
  const sinal = valor >= 0 ? '+' : '-'
  const cor = valor >= 0 ? '#28a745' : '#dc3545' // verde vs vermelho
  const variacao_formatada = `${sinal}${Math.abs(Math.round(valor * 10) / 10)}%`
  
  return { variacao: variacao_formatada, cor }
} 