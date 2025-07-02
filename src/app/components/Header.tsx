// components/Header.tsx
"use client"
import Link from 'next/link' // Link do Next.js (evita reload da página)
import { useState } from 'react'
import { Menu, X, LogOut, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import LogoutModal from './LogoutModal'

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const { user, signOut } = useAuth()
  
  const handleSignOut = async () => {
    setLogoutModalOpen(false)
    await signOut()
  }
  
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-blue-600 text-white z-50">
        <div className="p-6">
          <Link href="/" className="font-bold text-xl block mb-8">MeuApp</Link>
          
          {/* User Info */}
          {user && (
            <div className="mb-6 p-3 bg-blue-700 rounded">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Usuário</span>
              </div>
              <div className="text-xs text-blue-200 truncate">
                {user.email}
              </div>
            </div>
          )}
          
          <nav className="space-y-4">
            <Link href="/" className="block py-2 hover:bg-blue-700 rounded px-2 transition-colors">Home</Link>
            <Link href="/produtos" className="block py-2 hover:bg-blue-700 rounded px-2 transition-colors">Produtos</Link>
            <Link href="/faturas" className="block py-2 hover:bg-blue-700 rounded px-2 transition-colors">Faturas</Link>
          </nav>
          
          {/* Logout Button */}
          {user && (
            <div className="mt-auto pt-6 border-t border-blue-700">
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="w-full flex items-center gap-2 py-2 px-2 text-red-200 hover:bg-red-600 rounded transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-blue-600 text-white p-4 shadow-md">
        <nav className="flex justify-between max-w-4xl mx-auto items-center">
          <Link href="/" className="font-bold text-xl hover:text-blue-100 transition-colors">MeuApp</Link>
          <button 
            onClick={() => setDrawerOpen(true)} 
            aria-label="Abrir menu" 
            className="p-2 hover:bg-blue-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-40 flex">
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
          <div className="bg-blue-600 w-64 h-full p-6 flex flex-col gap-4 shadow-lg animate-slide-in-right">
            <button className="self-end mb-4" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
              <X className="h-6 w-6 text-white" />
            </button>
            
            {/* User Info Mobile */}
            {user && (
              <div className="mb-4 p-3 bg-blue-700 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Usuário</span>
                </div>
                <div className="text-xs text-blue-200 truncate">
                  {user.email}
                </div>
              </div>
            )}
            
            <Link href="/" className="font-bold text-xl mb-2 text-white" onClick={() => setDrawerOpen(false)}>MeuApp</Link>
            <Link href="/" onClick={() => setDrawerOpen(false)} className="block py-2 hover:bg-blue-700 rounded px-2 transition-colors text-white">Home</Link>
            <Link href="/produtos" onClick={() => setDrawerOpen(false)} className="block py-2 hover:bg-blue-700 rounded px-2 transition-colors text-white">Produtos</Link>
            <Link href="/faturas" onClick={() => setDrawerOpen(false)} className="block py-2 hover:bg-blue-700 rounded px-2 transition-colors text-white">Faturas</Link>
            
            {/* Logout Button Mobile */}
            {user && (
              <button
                onClick={() => {
                  setDrawerOpen(false)
                  setLogoutModalOpen(true)
                }}
                className="mt-auto flex items-center gap-2 py-2 px-2 text-red-200 hover:bg-red-600 rounded transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logout Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  )
}
