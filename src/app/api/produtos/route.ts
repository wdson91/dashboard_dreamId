import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { 
  is_valid_nif,
  get_periodo_datas,
  parse_periodo,
  buscar_faturas_periodo
} from '../stats/utils'

export const GET = requireAuth(async (request: NextRequest) => {
  try {
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
    let di: Date, df: Date
    try {
      [di, df] = get_periodo_datas(p)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no período' }, { status: 400 })
    }
    
    // Buscar faturas
    const faturas_completas = await buscar_faturas_periodo(nif, di, df, filial || undefined)
    
    // Analisar produtos mais vendidos
    const produtos = new Map<string, { quantidade: number; montante: number }>()
    
    faturas_completas.forEach(fatura => {
      fatura.faturas_itemfatura.forEach(item => {
        const nome = item.nome || 'Produto Desconhecido'
        const quantidade = item.quantidade
        const montante = parseFloat(item.total.toString())
        
        const atual = produtos.get(nome) || { quantidade: 0, montante: 0 }
        produtos.set(nome, {
          quantidade: atual.quantidade + quantidade,
          montante: atual.montante + montante
        })
      })
    })
    
    // Calcular totais
    const total_montante = Array.from(produtos.values()).reduce((sum, p) => sum + p.montante, 0)
    const total_itens = Array.from(produtos.values()).reduce((sum, p) => sum + p.quantidade, 0)
    
    // Ordenar por montante e calcular porcentagens
    const itens = Array.from(produtos.entries())
      .map(([produto, dados]) => ({
        produto,
        quantidade: dados.quantidade,
        montante: Math.round(dados.montante * 100) / 100,
        porcentagem_montante: total_montante > 0 ? Math.round((dados.montante / total_montante) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.montante - a.montante)
    
    // Formatar datas para YYYY-MM-DD
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]
    }
    
    const data = {
      data_inicio: formatDate(di),
      data_fim: formatDate(df),
      periodo: parse_periodo(p),
      total_itens,
      total_montante: Math.round(total_montante * 100) / 100,
      itens
    }
    
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('Erro na API /api/produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
})

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