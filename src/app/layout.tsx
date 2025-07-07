import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import ConditionalHeader from './components/ConditionalHeader'
import ConditionalMain from './components/ConditionalMain'
import { EstabelecimentoProvider } from './components/EstabelecimentoContext'
import { CooldownProvider } from './components/CooldownContext'
import LoadingScreen from './components/LoadingScreen'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard App',
  description: 'Aplicação de dashboard com autenticação e análise de dados',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR"> 
      <body className={`${inter.className}  min-h-screen`}>
        <LoadingScreen>
          <EstabelecimentoProvider>
            <CooldownProvider>
              <ConditionalHeader />
              <ConditionalMain>
                {children}
              </ConditionalMain>
            </CooldownProvider>
          </EstabelecimentoProvider>
        </LoadingScreen>
      </body>
    </html>
  )
}
