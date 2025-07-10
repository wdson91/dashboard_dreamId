"use client"

import { usePathname } from 'next/navigation'

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Na página de login, não aplicar padding da sidebar
  if (pathname === '/login') {
    return <main className="min-h-screen bg-emerald-500">{children}</main>
  }
  
  // Para outras páginas, aplicar o layout normal com sidebar
  return (
    <main className="min-h-screen pt-2 lg:pt-0 lg:ml-64 2xl:ml-80 bg-white">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {children}
      </div>
    </main>
  )
} 