"use client"

import { useState, useEffect } from "react"
import { Building2, Copy, Check, MapPin, Phone, Mail, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Estabelecimento } from "../types/estabelecimentos"
import { useEstabelecimento } from "../components/EstabelecimentoContext"
import { useRouter } from "next/navigation"

export default function EstabelecimentosPage() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedNif, setCopiedNif] = useState<string | null>(null)
  const { user } = useAuth()
  const { nifSelecionado, setNifSelecionado} = useEstabelecimento()
  const router = useRouter()
  const supabase = createClient()

  const copyToClipboard = async (nif: string) => {
    try {
      await navigator.clipboard.writeText(nif)
      setCopiedNif(nif)
      setTimeout(() => setCopiedNif(null), 2000)
    } catch (err) {
      console.error('Erro ao copiar NIF:', err)
    }
  }

  const selecionarEstabelecimento = (nif: string) => {
    setNifSelecionado(nif)
    router.push('/dashboard')
  }

  useEffect(() => {
    const fetchEstabelecimentos = async () => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        // Buscar o usuário logado para obter a lista de NIFs
        const { data, error: fetchError } = await supabase
          .from('usuarios')
          .select('nif')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        if (!data) {
          // Usuário não encontrado ou não tem NIFs cadastrados
          setEstabelecimentos([])
          return
        }

        // Processar a lista de NIFs
        if (data && data.nif) {
          let nifList: string[] = []
          
          if (typeof data.nif === 'string') {
            try {
              nifList = JSON.parse(data.nif)
            } catch {
              nifList = [data.nif]
            }
          } else if (Array.isArray(data.nif)) {
            nifList = data.nif
          } else {
            nifList = []
          }

          // Buscar dados completos de cada estabelecimento
          const estabelecimentosCompletos: Estabelecimento[] = []
          
          for (const nif of nifList) {
            try {
              // Buscar dados do estabelecimento pelo NIF na tabela faturas_empresa
              const { data: empresaData, error: empresaError } = await supabase
                .from('faturas_empresa')
                .select('*')
                .eq('nif', nif)
                .maybeSingle()

              if (empresaError) {
                console.error(`Erro ao buscar dados do estabelecimento ${nif}:`, empresaError)
                // Se houver erro, usar apenas o NIF
                estabelecimentosCompletos.push({
                  nif,
                  nome: `Estabelecimento ${nif}`,
                  created_at: new Date().toISOString()
                })
              } else if (!empresaData) {
                // Se não encontrar dados completos, usar apenas o NIF
                estabelecimentosCompletos.push({
                  nif,
                  nome: `Estabelecimento ${nif}`,
                  created_at: new Date().toISOString()
                })
              } else {
                estabelecimentosCompletos.push({
                  nif,
                  nome: empresaData.nome,
                  morada: empresaData.morada,
                  telefone: empresaData.telefone,
                  email: empresaData.email,
                  responsavel: empresaData.responsavel,
                  created_at: empresaData.created_at,
                  updated_at: empresaData.updated_at
                })
              }
            } catch (err) {
              // Em caso de erro, adicionar apenas o NIF
              console.info(err)
              estabelecimentosCompletos.push({
                nif,
                nome: `Estabelecimento ${nif}`,
                created_at: new Date().toISOString()
              })
            }
          }

          setEstabelecimentos(estabelecimentosCompletos)
          
          // Se não há estabelecimento selecionado e há estabelecimentos disponíveis, selecionar o primeiro
          if (!nifSelecionado && estabelecimentosCompletos.length > 0) {
            setNifSelecionado(estabelecimentosCompletos[0].nif)
          }
        } else {
          setEstabelecimentos([])
        }
      } catch (err) {
        console.error('Erro ao carregar estabelecimentos:', err)
        if (err instanceof Error) {
          if (err.message.includes('JSON object requested, multiple (or no) rows returned')) {
            setError('Erro na consulta: múltiplos registros ou nenhum registro encontrado. Entre em contato com o administrador.')
          } else {
            setError(`Erro ao carregar estabelecimentos: ${err.message}`)
          }
        } else {
          setError('Erro inesperado ao carregar estabelecimentos')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchEstabelecimentos()
  }, [user, supabase, nifSelecionado, setNifSelecionado])

  if (loading) {
    return (
      <div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-gray-900 text-2xl font-semibold">Estabelecimentos</h1>
          </div>
        </div>
        <div className="text-center py-8">Carregando estabelecimentos...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-gray-900 text-2xl font-semibold">Estabelecimentos</h1>
          </div>
        </div>
        <div className="text-center py-8 text-red-500">Erro: {error}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-gray-900 text-2xl font-semibold">Estabelecimentos</h1>
          <p className="text-gray-600 text-sm">
            {estabelecimentos.length} estabelecimento{estabelecimentos.length !== 1 ? 's' : ''} encontrado{estabelecimentos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Content */}
      <div>
        {estabelecimentos.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum estabelecimento encontrado</h3>
            <p className="text-gray-500 mb-4">
              Não foram encontrados estabelecimentos associados à sua conta.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Possíveis causas:</strong>
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• Sua conta não possui NIFs cadastrados</li>
                <li>• Os estabelecimentos ainda não foram configurados</li>
                <li>• Entre em contato com o administrador do sistema</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estabelecimentos.map((estabelecimento, index) => (
              <Card 
                key={index} 
                className={`bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[260px] ${
                  nifSelecionado === estabelecimento.nif ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg text-gray-900 break-words whitespace-normal">
                            {estabelecimento.nome || `Estabelecimento ${index + 1}`}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500 font-mono break-words m-0">
                              NIF: {estabelecimento.nif}
                            </p>
                            <button
                              onClick={() => copyToClipboard(estabelecimento.nif)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Copiar NIF"
                            >
                              {copiedNif === estabelecimento.nif ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => selecionarEstabelecimento(estabelecimento.nif)}
                              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors whitespace-nowrap ml-1 ${
                                nifSelecionado === estabelecimento.nif
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {nifSelecionado === estabelecimento.nif ? 'Selecionado' : 'Selecionar'}
                            </button>
                         </div>
                          {nifSelecionado === estabelecimento.nif && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">Selecionado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm min-h-[24px]">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{estabelecimento.morada || ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm min-h-[24px]">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{estabelecimento.telefone || ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm min-h-[24px]">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{estabelecimento.email || ''}</span>
                  </div>
                 
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 