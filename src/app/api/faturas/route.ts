import { NextRequest, NextResponse } from 'next/server'
import { 
  is_valid_nif,
  get_periodo_datas,
  parse_periodo
} from '../stats/utils'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros da query
    const { searchParams } = new URL(request.url)
    const nif = searchParams.get('nif')?.trim() || ''
    const filial = searchParams.get('filial')?.trim() || null
    const periodoRaw = searchParams.get('periodo') || '0'

    // Validações
    if (!is_valid_nif(nif)) {
      return NextResponse.json({ error: 'NIF é obrigatório e deve conter apenas números' }, { status: 400 })
    }

    let periodo: number
    try {
      periodo = parseInt(periodoRaw)
    } catch {
      return NextResponse.json({ error: 'Período inválido. Deve ser um número inteiro.' }, { status: 400 })
    }

    // Obter datas dos períodos
    let dataInicio: Date, dataFim: Date
    try {
      [dataInicio, dataFim] = get_periodo_datas(periodo)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no período' }, { status: 400 })
    }

    // Conectar ao Supabase
    const supabase = await createClient()

    // Consulta no Supabase
    let query = supabase
      .from('faturas_fatura')
      .select('id, data, total, numero_fatura, hora, nif_cliente, filial')
      .eq('nif', nif)
      .gte('data', dataInicio.toISOString().split('T')[0])
      .lte('data', dataFim.toISOString().split('T')[0])
      .order('data', { ascending: false })

    if (filial) {
      query = query.eq('filial', filial)
    }

    const { data: faturas, error } = await query

    if (error) {
      console.error('Erro na consulta Supabase:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    if (!faturas || faturas.length === 0) {
      return NextResponse.json({ 
        message: 'Nenhuma fatura encontrada para esse período.',
        faturas: [],
        periodo: {
          nome: parse_periodo(periodo),
          codigo: periodo,
          inicio: dataInicio.toISOString().split('T')[0],
          fim: dataFim.toISOString().split('T')[0]
        },
        estatisticas: {
          total_faturas: 0,
          total_montante: 0,
          ticket_medio: 0
        }
      }, { status: 200 })
    }

    // Calcular estatísticas
    const totalFaturas = faturas.length
    const totalMontante = faturas.reduce((sum, fatura) => sum + parseFloat(fatura.total.toString()), 0)
    const ticketMedio = totalFaturas > 0 ? totalMontante / totalFaturas : 0

    const data = {
      faturas: faturas.map(fatura => ({
        id: fatura.id,
        numero_fatura: fatura.numero_fatura,
        data: fatura.data,
        hora: fatura.hora,
        total: parseFloat(fatura.total.toString()),
        nif_cliente: fatura.nif_cliente,
        filial: fatura.filial
      })),
      periodo: {
        nome: parse_periodo(periodo),
        codigo: periodo,
        inicio: dataInicio.toISOString().split('T')[0],
        fim: dataFim.toISOString().split('T')[0]
      },
      estatisticas: {
        total_faturas: totalFaturas,
        total_montante: Math.round(totalMontante * 100) / 100,
        ticket_medio: Math.round(ticketMedio * 100) / 100
      }
    }

    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    console.error('Erro na API /api/faturas:', error)
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