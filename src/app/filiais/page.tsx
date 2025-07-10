"use client"

import { useState, useEffect } from "react"
import { Building2, Copy, Check, MapPin, Phone, Mail, CheckCircle, Store } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useEstabelecimento } from "../components/EstabelecimentoContext"
import { useRouter } from "next/navigation"
import { useLanguage } from "../components/LanguageContext"

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
  const { t } = useLanguage()

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
      <div className="min-h-screen bg-white">
        <div className="bg-emerald-500 border border-emerald-400 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl font-semibold">{t('branches.title')}</h1>
          </div>
        </div>
        <div className="text-center py-8 text-gray-600">{t('branches.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-emerald-500 border border-emerald-400 rounded-lg shadow-sm px-6 py-4 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl font-semibold">{t('branches.title')}</h1>
          </div>
        </div>
        <div className="text-center py-8 text-red-500">{t('branches.error')}: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[var(--color-card-white)] border border-[var(--color-card-border-green)] rounded-lg shadow-sm px-6 py-4 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--color-card-text-green)] text-2xl font-semibold">{t('branches.title')}</h1>
              <p className="text-[var(--color-card-text-green-muted)] text-sm">
                {filiais.length} {filiais.length === 1 ? t('branches.found_count') : t('branches.found_count_plural')}
              </p>
            </div>
            {filialSelecionada && (
              <button
                onClick={() => selecionarFilial(nifSelecionado || '', undefined)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-card-border-green)] text-white rounded-lg hover:bg-[var(--color-card-text-green)] transition-colors border border-[var(--color-card-border-green)]"
              >
                <Building2 className="h-4 w-4" />
                {t('branches.view_general_data')}
              </button>
            )}
          </div>
          {filialSelecionada && (
            <div className="flex items-center gap-2 p-3 bg-[var(--color-card-border-green)] rounded-lg border border-[var(--color-card-border-green)]">
              <Store className="h-4 w-4 text-white" />
              <span className="text-white font-medium">
                {t('branches.selected_branch')}: #{filialSelecionada}
              </span>
              <span className="text-white text-sm">
                ({t('branches.viewing_specific_data')})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {filiais.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-12 w-12 text-white mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">{t('branches.no_branches')}</h3>
            <p className="text-white mb-4">
              {t('branches.no_branches_message')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card de Dados Gerais */}
            {!filialSelecionada && (
              <Card className="transition-all duration-200 hover:shadow-md ring-2 ring-emerald-400 bg-emerald-500 border border-emerald-400">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-base text-white">
                          {t('branches.general_data')}
                        </span>
                        <span className="text-sm text-white font-semibold">
                          {t('branches.all_branches')}
                        </span>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-white flex-shrink-0 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">NIF:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-emerald-400 px-2 py-1 rounded text-white">
                          {nifSelecionado}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(nifSelecionado || '')
                          }}
                          className="p-1 hover:bg-emerald-400 rounded transition-colors"
                          title="Copiar NIF"
                        >
                          {copiedNif === nifSelecionado ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : (
                            <Copy className="h-4 w-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-white">
                      {t('branches.consolidated_data')}
                    </div>

                    <div className="text-sm text-white">
                      {t('branches.total_branches')}: {filiais.length}
                    </div>

                    {/* Botão Selecionar */}
                    <div className="pt-2 border-t border-emerald-400">
                      <button
                        className="w-full py-2 px-4 rounded-lg font-medium bg-emerald-400 text-white cursor-default"
                        disabled
                      >
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          {t('branches.general_data_active')}
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
                className={`transition-all duration-200 hover:shadow-md border ${
                  filialSelecionada === filial.filial_id 
                    ? 'bg-[var(--color-card-border-green)] border-[var(--color-card-border-green)] ring-2 ring-[var(--color-card-border-green)]' 
                    : 'bg-[var(--color-card-white)] border-[var(--color-card-border-green)]'
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Store className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                      }`} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`truncate text-base ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`}>
                          {filial.filial_nome || filial.nome || `Filial ${filial.nif}`}
                        </span>
                        {filial.filial_numero && (
                          <span className={`text-sm font-semibold ${
                            filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                          }`}>
                            {t('branches.branch')} #{filial.filial_numero}
                          </span>
                        )}
                      </div>
                    </div>
                    {filialSelecionada === filial.filial_id && (
                      <CheckCircle className="h-5 w-5 text-white flex-shrink-0 ml-2" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* NIF e Número da Filial */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${
                        filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                      }`}>NIF:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm px-2 py-1 rounded ${
                          filialSelecionada === filial.filial_id 
                            ? 'bg-white text-[var(--color-card-border-green)]' 
                            : 'bg-[var(--color-card-border-green)] text-white'
                        }`}>
                          {filial.nif}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(filial.nif)
                          }}
                          className={`p-1 rounded transition-colors ${
                            filialSelecionada === filial.filial_id 
                              ? 'hover:bg-white' 
                              : 'hover:bg-[var(--color-card-border-green)]'
                          }`}
                          title="Copiar NIF"
                        >
                          {copiedNif === filial.nif ? (
                            <Check className={`h-4 w-4 ${
                              filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                            }`} />
                          ) : (
                            <Copy className={`h-4 w-4 ${
                              filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                            }`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Número da Filial */}
                    {filial.filial_numero && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`}>{t('branches.branch_number')}:</span>
                        <span className={`font-semibold px-2 py-1 rounded ${
                          filialSelecionada === filial.filial_id 
                            ? 'text-[var(--color-card-border-green)] bg-white' 
                            : 'text-white bg-[var(--color-card-border-green)]'
                        }`}>
                          #{filial.filial_numero}
                        </span>
                      </div>
                    )}

                    {/* Nome da Empresa */}
                    {filial.nome && filial.nome !== filial.filial_nome && (
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-4 w-4 ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`} />
                        <span className={`text-sm truncate ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`}>
                          {filial.nome}
                        </span>
                      </div>
                    )}

                    {/* Morada */}
                    {filial.morada && (
                      <div className="flex items-start gap-2">
                        <MapPin className={`h-4 w-4 mt-0.5 ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`} />
                        <span className={`text-sm line-clamp-2 ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`}>
                          {filial.morada}
                        </span>
                      </div>
                    )}

                    {/* Telefone */}
                    {filial.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className={`h-4 w-4 ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`} />
                        <span className={`text-sm ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`}>
                          {filial.telefone}
                        </span>
                      </div>
                    )}

                    {/* Email */}
                    {filial.email && (
                      <div className="flex items-center gap-2">
                        <Mail className={`h-4 w-4 ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`} />
                        <span className={`text-sm truncate ${
                          filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                        }`}>
                          {filial.email}
                        </span>
                      </div>
                    )}

                    {/* Responsável */}
                    {filial.responsavel && (
                      <div className={`text-sm ${
                        filialSelecionada === filial.filial_id ? 'text-white' : 'text-[var(--color-card-text-green)]'
                      }`}>
                        {t('establishments.responsible')}: {filial.responsavel}
                      </div>
                    )}

                    {/* Botão Selecionar */}
                    <div className={`pt-2 border-t ${
                      filialSelecionada === filial.filial_id ? 'border-white' : 'border-[var(--color-card-border-green)]'
                    }`}>
                      <button
                        onClick={() => selecionarFilial(filial.nif, filial.filial_id)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          filialSelecionada === filial.filial_id
                            ? 'bg-white text-[var(--color-card-border-green)] cursor-default'
                            : 'bg-[var(--color-card-border-green)] text-white hover:bg-[var(--color-card-text-green)] border border-[var(--color-card-border-green)]'
                        }`}
                        disabled={filialSelecionada === filial.filial_id}
                      >
                        {filialSelecionada === filial.filial_id ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {t('branches.selected_branch_status')}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {t('branches.select_branch')}
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