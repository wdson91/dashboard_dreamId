"use client"

import { useState, useEffect } from "react"
import { Building2, Copy, Check, MapPin, Phone, Mail, CheckCircle, Store } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useEstabelecimento } from "../components/EstabelecimentoContext"
import { useRouter } from "next/navigation"

interface Filial {
  id?: string
  nif: string
  nome?: string
  morada?: string
  telefone?: string
  email?: string
  responsavel?: string
  filial_id?: string
  filial_nome?: string
  filial_numero?: string
  created_at?: string
  updated_at?: string
}

export default function FiliaisPage() {
  const [filiais, setFiliais] = useState<Filial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedNif, setCopiedNif] = useState<string | null>(null)
  const { user } = useAuth()
  const { nifSelecionado, filialSelecionada, setFilialSelecionada } = useEstabelecimento()
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

  const selecionarFilial = (nif: string, filialId?: string) => {
    // Se há filial específica, selecionar a filial
    if (filialId) {
      setFilialSelecionada(filialId)
    } else {
      // Se não há filial, limpar seleção de filial (mostrar todas)
      setFilialSelecionada(null)
    }
    router.push('/dashboard')
  }

  useEffect(() => {
    const fetchFiliais = async () => {
      if (!user || !nifSelecionado) return

      try {
        setLoading(true)
        setError(null)

        // Buscar dados da empresa selecionada
        const { data: empresaData, error: empresaError } = await supabase
          .from('faturas_empresa')
          .select('*')
          .eq('nif', nifSelecionado)
          .maybeSingle()

        if (empresaError) {
          throw new Error(empresaError.message)
        }

        if (!empresaData) {
          setFiliais([])
          return
        }

        // Buscar dados das filiais do NIF selecionado
        const filiaisCompletas: Filial[] = []

        try {
          // Verificar se há dados de filiais
          if (empresaData.filiais) {
            try {
              const filiaisData = typeof empresaData.filiais === 'string' 
                ? JSON.parse(empresaData.filiais) 
                : empresaData.filiais

              if (Array.isArray(filiaisData) && filiaisData.length > 0) {
                // Se há filiais, criar uma entrada para cada filial
                filiaisData.forEach((filial: string) => {
                  // Se filial é uma string (número da filial), criar objeto
                  const filialObj = typeof filial === 'string' 
                    ? { id: filial, numero: filial, nome: `Filial ${filial}` }
                    : filial

                  filiaisCompletas.push({
                    nif: nifSelecionado,
                    nome: empresaData.nome,
                    morada: empresaData.morada,
                    telefone: empresaData.telefone,
                    email: empresaData.email,
                    responsavel: empresaData.responsavel,
                    filial_id: filialObj.id || filialObj.numero,
                    filial_nome: filialObj.nome,
                    filial_numero: filialObj.numero || filialObj.id,
                    created_at: empresaData.created_at,
                    updated_at: empresaData.updated_at
                  })
                })
              } else {
                // Se não há filiais, usar apenas o estabelecimento principal
                filiaisCompletas.push({
                  nif: nifSelecionado,
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
              filiaisCompletas.push({
                nif: nifSelecionado,
                nome: empresaData.nome,
                morada: empresaData.morada,
                telefone: empresaData.telefone,
                email: empresaData.email,
                responsavel: empresaData.responsavel,
                created_at: empresaData.created_at,
                updated_at: empresaData.updated_at
              })
            }
          } else {
            // Se não há campo filiais, usar apenas o estabelecimento principal
            filiaisCompletas.push({
              nif: nifSelecionado,
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
          filiaisCompletas.push({
            nif: nifSelecionado,
            nome: `Filial ${nifSelecionado}`,
            created_at: new Date().toISOString()
          })
        }

        setFiliais(filiaisCompletas)
        
        // NÃO selecionar automaticamente a primeira filial
        // Deixar o usuário escolher qual filial quer visualizar
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('JSON object requested, multiple (or no) rows returned')) {
            setError('Erro na consulta: múltiplos registros ou nenhum registro encontrado. Entre em contato com o administrador.')
          } else {
            setError(`Erro ao carregar filiais: ${err.message}`)
          }
        } else {
          setError('Erro inesperado ao carregar filiais')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchFiliais()
  }, [user, nifSelecionado, supabase])

  if (loading) {
    return (
      <div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-gray-900 text-2xl font-semibold">Filiais</h1>
          </div>
        </div>
        <div className="text-center py-8">Carregando filiais...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-gray-900 text-2xl font-semibold">Filiais</h1>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900 text-2xl font-semibold">Filiais</h1>
              <p className="text-gray-600 text-sm">
                {filiais.length} filial{filiais.length !== 1 ? 'is' : ''} encontrada{filiais.length !== 1 ? 's' : ''}
              </p>
            </div>
            {filialSelecionada && (
              <button
                onClick={() => selecionarFilial(nifSelecionado || '', undefined)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
              >
                <Building2 className="h-4 w-4" />
                Ver Dados Gerais
              </button>
            )}
          </div>
          {filialSelecionada && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Store className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                Filial selecionada: #{filialSelecionada}
              </span>
              <span className="text-blue-600 text-sm">
                (Visualizando dados específicos desta filial)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {filiais.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma filial encontrada</h3>
            <p className="text-gray-500 mb-4">
              Não foram encontradas filiais associadas à sua conta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card de Dados Gerais */}
            {!filialSelecionada && (
              <Card className="transition-all duration-200 hover:shadow-md ring-2 ring-green-500 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-base text-green-800">
                          Dados Gerais
                        </span>
                        <span className="text-sm text-green-600 font-semibold">
                          Todas as Filiais
                        </span>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">NIF:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {nifSelecionado}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(nifSelecionado || '')
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copiar NIF"
                        >
                          {copiedNif === nifSelecionado ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      Visualizando dados consolidados de todas as filiais deste estabelecimento.
                    </div>

                    <div className="text-sm text-gray-500">
                      Total de filiais: {filiais.length}
                    </div>

                    {/* Botão Selecionar */}
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        className="w-full py-2 px-4 rounded-lg font-medium bg-green-600 text-white cursor-default"
                        disabled
                      >
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Dados Gerais Ativos
                        </div>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {filiais.map((filial, index) => (
              <Card 
                key={`${filial.nif}-${filial.filial_id || 'main'}-${index}`}
                className={`transition-all duration-200 hover:shadow-md ${
                  filialSelecionada === filial.filial_id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Store className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-base">
                          {filial.filial_nome || filial.nome || `Filial ${filial.nif}`}
                        </span>
                        {filial.filial_numero && (
                          <span className="text-sm text-blue-600 font-semibold">
                            Filial #{filial.filial_numero}
                          </span>
                        )}
                      </div>
                    </div>
                    {filialSelecionada === filial.filial_id && (
                      <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* NIF e Número da Filial */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">NIF:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {filial.nif}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(filial.nif)
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copiar NIF"
                        >
                          {copiedNif === filial.nif ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Número da Filial */}
                    {filial.filial_numero && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Número da Filial:</span>
                        <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          #{filial.filial_numero}
                        </span>
                      </div>
                    )}

                    {/* Nome da Empresa */}
                    {filial.nome && filial.nome !== filial.filial_nome && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 truncate">
                          {filial.nome}
                        </span>
                      </div>
                    )}

                    {/* Morada */}
                    {filial.morada && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {filial.morada}
                        </span>
                      </div>
                    )}

                    {/* Telefone */}
                    {filial.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {filial.telefone}
                        </span>
                      </div>
                    )}

                    {/* Email */}
                    {filial.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 truncate">
                          {filial.email}
                        </span>
                      </div>
                    )}

                    {/* Responsável */}
                    {filial.responsavel && (
                      <div className="text-sm text-gray-500">
                        Responsável: {filial.responsavel}
                      </div>
                    )}

                    {/* Botão Selecionar */}
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => selecionarFilial(filial.nif, filial.filial_id)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          filialSelecionada === filial.filial_id
                            ? 'bg-blue-600 text-white cursor-default'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                        }`}
                        disabled={filialSelecionada === filial.filial_id}
                      >
                        {filialSelecionada === filial.filial_id ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Selecionada
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Selecionar Filial
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