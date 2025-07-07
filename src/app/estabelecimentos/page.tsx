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
    } catch {
      // Ignorar erro de cópia
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
            } catch {
              // Em caso de erro, adicionar apenas o NIF
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
  }, [user, nifSelecionado, setNifSelecionado, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-emerald-500 border border-emerald-400 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl font-semibold">Estabelecimentos</h1>
          </div>
        </div>
        <div className="text-center py-8 text-gray-600">Carregando estabelecimentos...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-emerald-500 border border-emerald-400 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl font-semibold">Estabelecimentos</h1>
          </div>
        </div>
        <div className="text-center py-8 text-red-500">Erro: {error}</div>
      </div>
    )
  }

  return (
          <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-emerald-500 border border-emerald-400 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl font-semibold">Estabelecimentos</h1>
            <p className="text-white text-sm">
              {estabelecimentos.length} estabelecimento{estabelecimentos.length !== 1 ? 's' : ''} encontrado{estabelecimentos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

      {/* Content */}
      <div>
        {estabelecimentos.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-white mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum estabelecimento encontrado</h3>
            <p className="text-white mb-4">
              Não foram encontrados estabelecimentos associados à sua conta.
            </p>
            <div className="bg-green-600 border border-green-400 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-white text-sm">
                Entre em contato com o administrador para adicionar estabelecimentos à sua conta.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estabelecimentos.map((estabelecimento, index) => (
              <Card 
                key={`${estabelecimento.nif}-${index}`}
                className={`transition-all duration-200 hover:shadow-md border ${
                  nifSelecionado === estabelecimento.nif 
                    ? 'bg-emerald-600 border-emerald-500 ring-2 ring-emerald-500' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Building2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                      }`} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`truncate text-base ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-900'
                        }`}>
                          {estabelecimento.nome || `Estabelecimento ${estabelecimento.nif}`}
                        </span>
                        <span className={`text-sm font-semibold ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`}>
                          NIF: {estabelecimento.nif}
                        </span>
                      </div>
                    </div>
                    {nifSelecionado === estabelecimento.nif && (
                      <CheckCircle className="h-5 w-5 text-white flex-shrink-0 ml-2" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* NIF */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${
                        nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                      }`}>NIF:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm px-2 py-1 rounded ${
                          nifSelecionado === estabelecimento.nif 
                            ? 'bg-emerald-400 text-white' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {estabelecimento.nif}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(estabelecimento.nif)
                          }}
                          className={`p-1 rounded transition-colors ${
                            nifSelecionado === estabelecimento.nif 
                              ? 'hover:bg-emerald-400' 
                              : 'hover:bg-gray-200'
                          }`}
                          title="Copiar NIF"
                        >
                          {copiedNif === estabelecimento.nif ? (
                            <Check className={`h-4 w-4 ${
                              nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                            }`} />
                          ) : (
                            <Copy className={`h-4 w-4 ${
                              nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                            }`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Nome da Empresa */}
                    {estabelecimento.nome && (
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-4 w-4 ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm truncate ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`}>
                          {estabelecimento.nome}
                        </span>
                      </div>
                    )}

                    {/* Morada */}
                    {estabelecimento.morada && (
                      <div className="flex items-start gap-2">
                        <MapPin className={`h-4 w-4 mt-0.5 ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm line-clamp-2 ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`}>
                          {estabelecimento.morada}
                        </span>
                      </div>
                    )}

                    {/* Telefone */}
                    {estabelecimento.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className={`h-4 w-4 ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`}>
                          {estabelecimento.telefone}
                        </span>
                      </div>
                    )}

                    {/* Email */}
                    {estabelecimento.email && (
                      <div className="flex items-center gap-2">
                        <Mail className={`h-4 w-4 ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`} />
                        <span className={`text-sm truncate ${
                          nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                        }`}>
                          {estabelecimento.email}
                        </span>
                      </div>
                    )}

                    {/* Responsável */}
                    {estabelecimento.responsavel && (
                      <div className={`text-sm ${
                        nifSelecionado === estabelecimento.nif ? 'text-white' : 'text-gray-600'
                      }`}>
                        Responsável: {estabelecimento.responsavel}
                      </div>
                    )}

                    {/* Botão Selecionar */}
                    <div className={`pt-2 border-t ${
                      nifSelecionado === estabelecimento.nif ? 'border-emerald-400' : 'border-gray-200'
                    }`}>
                      <button
                        onClick={() => selecionarEstabelecimento(estabelecimento.nif)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          nifSelecionado === estabelecimento.nif
                            ? 'bg-emerald-400 text-white cursor-default'
                            : 'bg-emerald-500 text-white hover:bg-emerald-400 border border-emerald-400'
                        }`}
                        disabled={nifSelecionado === estabelecimento.nif}
                      >
                        {nifSelecionado === estabelecimento.nif ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Selecionado
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Selecionar Estabelecimento
                          </div>
                        )}
                      </button>
                    </div>
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