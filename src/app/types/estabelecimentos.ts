export interface Usuario {
  id: string
  user_id: string
  nif: string | string[] // Pode ser uma string única ou uma lista de NIFs
  created_at: string
  updated_at: string
}

export interface Estabelecimento {
  id?: string
  nif: string
  nome?: string
  morada?: string
  telefone?: string
  email?: string
  responsavel?: string
  created_at?: string
  updated_at?: string
}

export interface EstabelecimentosResponse {
  data: Estabelecimento[] // Lista de estabelecimentos completos
  error?: string
} 