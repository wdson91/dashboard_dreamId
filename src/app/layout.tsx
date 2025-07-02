import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import ConditionalHeader from './components/ConditionalHeader'
import ConditionalMain from './components/ConditionalMain'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard App',
  description: 'Aplicação de dashboard com autenticação e análise de dados',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR"> 
      <body className={inter.className}>
        <ConditionalHeader />
        <ConditionalMain>
          {children}
        </ConditionalMain>
      </body>
    </html>
  )
}
