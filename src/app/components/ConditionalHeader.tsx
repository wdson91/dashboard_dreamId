"use client"

import { usePathname } from 'next/navigation'
import Header from './Header'

export default function ConditionalHeader() {
  const pathname = usePathname()
  
  // Não mostrar header na página de login
  if (pathname === '/login') {
    return null
  }
  
  return <Header />
} 