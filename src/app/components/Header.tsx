// components/Header.tsx
"use client"
import Link from 'next/link' // Link do Next.js (evita reload da página)
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, User, Building2, Home, Package, Receipt, Building, Store} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useEstabelecimento } from './EstabelecimentoContext'
import LogoutModal from './LogoutModal'

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { nifSelecionado, filialSelecionada, isLoaded } = useEstabelecimento()
  const [morada, setMorada] = useState<string | null>(null)
  const pathname = usePathname()

  // Função para verificar se um link está ativo
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href)
  }
  // Buscar morada do estabelecimento selecionado
  useEffect(() => {
    async function fetchMorada() {
      setMorada(null)
      if (!nifSelecionado || !isLoaded) return
      
      try {
        const supabase = (await import('@/utils/supabase/client')).createClient()
        const { data, error } = await supabase
          .from('faturas_empresa')
          .select('morada')
          .eq('nif', nifSelecionado)
          .single()
        
        if (error) {
          setMorada(null)
          return
        }
        
        setMorada(data?.morada || null)
      } catch {
        setMorada(null)
      }
    }
    fetchMorada()
  }, [nifSelecionado, isLoaded])

  const handleSignOut = async () => {
    setLogoutModalOpen(false)
    await signOut()
  }
  
  return (
    <>

    
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-emerald-700 border-r border-emerald-600 text-slate-200 z-50">
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={96}
                height={96}
              />
              <Link href="/" className="font-bold text-xl text-white hover:text-emerald-200 transition-colors">MyDream</Link>
            </div>
          </div>
          
          {/* User Info */}
          {user && (
            <div className="mb-6 p-3 bg-emerald-800 rounded-lg border border-emerald-600 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-medium text-white">Usuário</span>
              </div>
              <div className="text-xs text-slate-300 truncate">
                {user.email}
              </div>
            </div>
          )}

          {/* Estabelecimento Selecionado */}
          {isLoaded && nifSelecionado && (
            <div className="mb-6 p-3 bg-emerald-800 rounded-lg border border-emerald-600">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-medium text-white">Estabelecimento</span>
              </div>
              <div className="text-xs text-slate-300 font-mono">
                NIF: {nifSelecionado}
              </div>
              {filialSelecionada && (
                <div className="text-xs text-slate-300 mt-1 font-medium">
                  Filial: #{filialSelecionada}
                </div>
              )}
              {morada && (
                <div className="text-xs text-slate-300 mt-1 line-clamp-2 break-words whitespace-normal">
                  {morada}
                </div>
              )}
            </div>
          )}
          
          <nav className="space-y-2">
            <Link 
              href="/" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/produtos" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/produtos') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Produtos</span>
            </Link>
            <Link 
              href="/faturas" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/faturas') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Faturas</span>
            </Link>
            <Link 
              href="/estabelecimentos" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/estabelecimentos') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Estabelecimentos</span>
            </Link>
            <Link 
              href="/filiais" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/filiais') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Filiais</span>
            </Link>
          </nav>
          
          {/* Logout Button */}
          {user && (
            <div className="mt-auto pt-6 border-t border-emerald-600">
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="w-full flex items-center gap-3 py-2 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-emerald-700 border-b border-emerald-600 p-4 shadow-md">
        <nav className="flex justify-between max-w-4xl mx-auto items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={96}
                height={96}
              />
              <Link href="/" className="font-bold text-xl text-white hover:text-emerald-200 transition-colors">MyDream</Link>
            </div>
            {isLoaded && nifSelecionado && (
              <>
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 text-emerald-300" />
                  <span className="text-xs font-mono text-slate-300">NIF: {nifSelecionado}</span>
                </div>
                {filialSelecionada && (
                  <div className="flex items-center gap-1 mt-1">
                    <Store className="h-3 w-3 text-emerald-300" />
                    <span className="text-xs text-slate-300 font-medium">Filial: #{filialSelecionada}</span>
                  </div>
                )}
                
              </>
            )}
          </div>
          <button 
            onClick={() => setDrawerOpen(true)} 
            aria-label="Abrir menu" 
            className="p-2 -mr-2 text-white hover:bg-emerald-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 flex justify-end">
          
          <div className="bg-emerald-700 w-72 h-full p-6 flex flex-col gap-4 shadow-2xl animate-slide-in-right border-l border-emerald-600 text-slate-200">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo.png" 
                    alt="Logo" 
                    width={96}
                    height={96}
                  />
                  <span className="font-bold text-xl text-white">MyDream</span>
                </div>
                <button className="-mr-2 p-2" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
                  <X className="h-6 w-6 text-white" />
                </button>
            </div>
            
            
            {/* User Info Mobile */}
            {user && (
              <div className="mb-4 p-3 bg-emerald-800 rounded-lg border border-emerald-600 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-medium text-white">Usuário</span>
                </div>
                <div className="text-xs text-slate-300 truncate">
                  {user.email}
                </div>
              </div>
            )}

            {/* Estabelecimento Selecionado Mobile */}
            {isLoaded && nifSelecionado && (
              <div className="mb-4 p-3 bg-emerald-800 rounded-lg border border-emerald-600">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-medium text-white">Estabelecimento</span>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  NIF: {nifSelecionado}
                </div>
                {filialSelecionada && (
                  <div className="text-xs text-slate-300 mt-1 font-medium">
                    Filial: #{filialSelecionada}
                  </div>
                )}
                {morada && (
                  <div className="text-xs text-slate-300 mt-1 line-clamp-2 break-words whitespace-normal">
                    {morada}
                  </div>
                )}
              </div>
            )}
            
            <nav className="space-y-2 flex-1">
              <Link 
                href="/" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Home className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/produtos" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/produtos') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Package className="h-5 w-5" />
                <span>Produtos</span>
              </Link>
              <Link 
                href="/faturas" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/faturas') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Receipt className="h-5 w-5" />
                <span>Faturas</span>
              </Link>
              <Link 
                href="/estabelecimentos" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/estabelecimentos') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Building className="h-5 w-5" />
                <span>Estabelecimentos</span>
              </Link>
              <Link 
                href="/filiais" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/filiais') 
                  ? 'bg-emerald-600 text-white shadow-inner border border-emerald-500' 
                  : 'text-slate-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Store className="h-5 w-5" />
                <span>Filiais</span>
              </Link>
            </nav>
            
            {/* Logout Button Mobile */}
            {user && (
              <button
                onClick={() => {
                  setDrawerOpen(false)
                  setLogoutModalOpen(true)
                }}
                className="w-full flex items-center gap-3 py-2 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all"
              >
                <LogOut className="h-5 w-5" />
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
