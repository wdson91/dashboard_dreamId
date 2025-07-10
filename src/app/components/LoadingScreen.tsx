'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from './LanguageContext'

interface LoadingScreenProps {
  children: React.ReactNode
}

export default function LoadingScreen({ children }: LoadingScreenProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const { loading: authLoading } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    setIsClient(true)
    // Aguardar o carregamento da autenticação e um tempo mínimo
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500) // 1.5 segundos de loading mínimo

    return () => clearTimeout(timer)
  }, [])

  // No servidor, renderizar children diretamente para evitar diferenças de hidratação
  if (!isClient) {
    return <>{children}</>
  }

  // Mostrar loading se ainda está carregando a autenticação ou se ainda não passou o tempo mínimo
  if (isLoading || authLoading) {
    return (
      <div className="fixed inset-0 bg-emerald-600 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Logo"
              width={300}
              height={300}
              className="mx-auto animate-pulse"
              priority
            />
          </div>
          <div className="text-white text-lg font-medium mb-4">
            {authLoading ? t('loading.checking_auth') : t('loading.loading')}
          </div>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 