import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Função para gerar PDF simples (básico sem bibliotecas externas)
function gerarPDFSimples(textoCompleto: string): Buffer {
  // Esta é uma implementação muito básica
  // Para uma implementação completa, você deveria usar bibliotecas como jsPDF ou PDFKit
  
  const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 6 0 R
>>
stream
BT
/F1 12 Tf
72 720 Td
`

  const pdfContent = textoCompleto.replace(/\n/g, '\n') // Processar quebras de linha
  
  const pdfFooter = `
ET
endstream
endobj

6 0 obj
${pdfContent.length + 50}
endobj

xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000285 00000 n 
0000000364 00000 n 
0000000466 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
488
%%EOF`

  const pdfFinal = pdfHeader + pdfContent + pdfFooter
  return Buffer.from(pdfFinal, 'utf-8')
}

export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros da query
    const { searchParams } = new URL(request.url)
    const numeroFatura = searchParams.get('numero_fatura')?.trim()

    if (!numeroFatura) {
      return NextResponse.json({ error: 'Número da fatura é obrigatório' }, { status: 400 })
    }

    // Conectar ao Supabase
    const supabase = await createClient()

    // Buscar fatura no Supabase
    const { data: fatura, error } = await supabase
      .from('faturas_fatura')
      .select('texto_completo, qrcode, numero_fatura')
      .eq('numero_fatura', numeroFatura)
      .single()

    if (error) {
      console.error('Erro na consulta Supabase:', error)
      return NextResponse.json({ error: 'Erro ao buscar fatura' }, { status: 500 })
    }

    if (!fatura) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })
    }

    const textoCompleto = fatura.texto_completo
    if (!textoCompleto) {
      return NextResponse.json({ error: 'Texto completo da fatura não encontrado' }, { status: 404 })
    }

    // Gerar PDF
    try {
      const pdfBuffer = gerarPDFSimples(textoCompleto)
      
      // Retornar PDF como resposta
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="fatura_${numeroFatura}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    } catch (pdfError) {
      console.error('Erro ao gerar PDF:', pdfError)
      return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro na API /api/faturas/pdf:', error)
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