"use client"

import { usePathname } from 'next/navigation'

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Na página de login, não aplicar padding da sidebar
  if (pathname === '/login') {
    return <main className="min-h-screen">{children}</main>
  }
  
  // Para outras páginas, aplicar o layout normal com sidebar
  return (
    <main className="min-h-screen pt-16 lg:pt-0 lg:ml-64 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto py-6">
        {children}
      </div>
    </main>
  )
} 