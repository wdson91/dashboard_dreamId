import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/modules/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthData {
  user: User
  session: Session
}

export async function verifyAuth(): Promise<AuthData | null> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return null
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }
    
    return { user, session }
  } catch (error) {
    console.error('Erro na verificação de autenticação:', error)
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, auth: AuthData) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await verifyAuth()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para continuar.' }, 
        { status: 401 }
      )
    }
    
    return handler(request, auth)
  }
} 