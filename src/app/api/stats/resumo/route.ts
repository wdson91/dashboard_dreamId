import { NextRequest, NextResponse } from 'next/server'
import { 
  is_valid_nif,
  get_periodo_datas,
  parse_periodo,
  buscar_faturas_periodo,
  processar_faturas_otimizado,
  calcular_variacao_dados,
  type Fatura,
  type DadosProcessados,
  type VariacaoDados
} from '../utils'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (comentado para desenvolvimento)
    // const supabase = await createClient()
    // const { data: { session } } = await supabase.auth.getSession()
    
    // Descomente a linha abaixo para habilitar autenticação
    // if (!session) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }
    
    // Obter parâmetros da query
    const { searchParams } = new URL(request.url)
    const nif = searchParams.get('nif')?.trim() || ''
    const filial = searchParams.get('filial')?.trim() || null
    const periodo = searchParams.get('periodo') || '0'
    
    // Validações
    if (!is_valid_nif(nif)) {
      return NextResponse.json({ error: 'NIF inválido' }, { status: 400 })
    }
    
    let p: number
    try {
      p = parseInt(periodo)
    } catch {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 })
    }
    
    // Obter datas dos períodos
    let di: Date, df: Date, dia: Date, dfan: Date
    try {
      [di, df, dia, dfan] = get_periodo_datas(p)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no período' }, { status: 400 })
    }
    
    // OTIMIZAÇÃO: Uma única chamada ao banco para ambos os períodos
    const data_mais_antiga = new Date(Math.min(dia.getTime(), di.getTime()))
    const data_mais_recente = new Date(Math.max(dfan.getTime(), df.getTime()))
    
    // Buscar faturas
    const faturas_completas = await buscar_faturas_periodo(nif, data_mais_antiga, data_mais_recente, filial || undefined)
    
    // Processar dados
    const dados_processados = processar_faturas_otimizado(faturas_completas, di, df, dia, dfan)
    
    // Extrair dados processados
    const [total_at, rec_at, it_at, tk_at] = dados_processados.stats_atual
    const [total_bt, rec_bt, it_bt, tk_bt] = dados_processados.stats_anterior
    const comp = dados_processados.comparativo_por_hora
    
    // Preparar resposta
    const data = {
      periodo: parse_periodo(p),
      total_vendas: calcular_variacao_dados(total_at, total_bt),
      numero_recibos: calcular_variacao_dados(rec_at, rec_bt),
      itens_vendidos: calcular_variacao_dados(it_at, it_bt),
      ticket_medio: calcular_variacao_dados(tk_at, tk_bt),
      comparativo_por_hora: comp
    }
    
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('Erro na API /api/stats/resumo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}

// Suporte para OPTIONS (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    },
  })
} 