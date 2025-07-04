// components/Header.tsx
"use client"
import Link from 'next/link' // Link do Next.js (evita reload da página)
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
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 border-r border-gray-200 text-gray-800 z-50">
        <div className="p-6">
          <Link href="/" className="font-bold text-xl block mb-8 text-gray-900 hover:text-blue-600 transition-colors">DreamId</Link>
          
          {/* User Info */}
          {user && (
            <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Usuário</span>
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user.email}
              </div>
            </div>
          )}

          {/* Estabelecimento Selecionado */}
          {isLoaded && nifSelecionado && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Estabelecimento</span>
              </div>
              <div className="text-xs text-blue-700 font-mono">
                NIF: {nifSelecionado}
              </div>
              {filialSelecionada && (
                <div className="text-xs text-blue-600 mt-1 font-medium">
                  Filial: #{filialSelecionada}
                </div>
              )}
              {morada && (
                <div className="text-xs text-blue-600 mt-1 line-clamp-2 break-words whitespace-normal">
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
                  ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                  : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
              }`}
            >
              <Home className={`h-4 w-4 ${isActiveLink('/') ? 'text-blue-600' : ''}`} />
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/produtos" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/produtos') 
                  ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                  : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
              }`}
            >
              <Package className={`h-4 w-4 ${isActiveLink('/produtos') ? 'text-blue-600' : ''}`} />
              <span>Produtos</span>
            </Link>
            <Link 
              href="/faturas" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/faturas') 
                  ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                  : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
              }`}
            >
              <Receipt className={`h-4 w-4 ${isActiveLink('/faturas') ? 'text-blue-600' : ''}`} />
              <span>Faturas</span>
            </Link>
            <Link 
              href="/estabelecimentos" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/estabelecimentos') 
                  ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                  : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
              }`}
            >
              <Building className={`h-4 w-4 ${isActiveLink('/estabelecimentos') ? 'text-blue-600' : ''}`} />
              <span>Estabelecimentos</span>
            </Link>
            <Link 
              href="/filiais" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/filiais') 
                  ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                  : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
              }`}
            >
              <Store className={`h-4 w-4 ${isActiveLink('/filiais') ? 'text-blue-600' : ''}`} />
              <span>Filiais</span>
            </Link>
          </nav>
          
          {/* Logout Button */}
          {user && (
            <div className="mt-auto pt-6 border-t border-gray-200">
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="w-full flex items-center gap-3 py-2 px-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200 p-4 shadow-sm">
        <nav className="flex justify-between max-w-4xl mx-auto items-center">
          <div className="flex flex-col">
            <Link href="/" className="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors">MeuApp</Link>
            {isLoaded && nifSelecionado && (
              <>
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-mono text-gray-600">NIF: {nifSelecionado}</span>
                </div>
                {filialSelecionada && (
                  <div className="flex items-center gap-1 mt-1">
                    <Store className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-gray-600 font-medium">Filial: #{filialSelecionada}</span>
                  </div>
                )}
                {morada && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2 break-words whitespace-normal">
                    {morada}
                  </div>
                )}
              </>
            )}
          </div>
          <button 
            onClick={() => setDrawerOpen(true)} 
            aria-label="Abrir menu" 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-40 flex">
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
          <div className="bg-gray-50 w-64 h-full p-6 flex flex-col gap-4 shadow-lg animate-slide-in-right border-l border-gray-200">
            <button className="self-end mb-4" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
              <X className="h-6 w-6 text-gray-700" />
            </button>
            
            {/* User Info Mobile */}
            {user && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Usuário</span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user.email}
                </div>
              </div>
            )}

            {/* Estabelecimento Selecionado Mobile */}
            {isLoaded && nifSelecionado && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Estabelecimento</span>
                </div>
                <div className="text-xs text-blue-700 font-mono">
                  NIF: {nifSelecionado}
                </div>
                {filialSelecionada && (
                  <div className="text-xs text-blue-600 mt-1 font-medium">
                    Filial: #{filialSelecionada}
                  </div>
                )}
                {morada && (
                  <div className="text-xs text-blue-600 mt-1 line-clamp-2 break-words whitespace-normal">
                    {morada}
                  </div>
                )}
              </div>
            )}
            
            <Link href="/" className="font-bold text-xl mb-2 text-gray-900" onClick={() => setDrawerOpen(false)}>MeuApp</Link>
            
            <nav className="space-y-2">
              <Link 
                href="/" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/') 
                    ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
                }`}
              >
                <Home className={`h-4 w-4 ${isActiveLink('/') ? 'text-blue-600' : ''}`} />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/produtos" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/produtos') 
                    ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
                }`}
              >
                <Package className={`h-4 w-4 ${isActiveLink('/produtos') ? 'text-blue-600' : ''}`} />
                <span>Produtos</span>
              </Link>
              <Link 
                href="/faturas" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/faturas') 
                    ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
                }`}
              >
                <Receipt className={`h-4 w-4 ${isActiveLink('/faturas') ? 'text-blue-600' : ''}`} />
                <span>Faturas</span>
              </Link>
              <Link 
                href="/estabelecimentos" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/estabelecimentos') 
                    ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
                }`}
              >
                <Building className={`h-4 w-4 ${isActiveLink('/estabelecimentos') ? 'text-blue-600' : ''}`} />
                <span>Estabelecimentos</span>
              </Link>
              <Link 
                href="/filiais" 
                onClick={() => setDrawerOpen(false)} 
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/filiais') 
                    ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' 
                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-blue-600'
                }`}
              >
                <Store className={`h-4 w-4 ${isActiveLink('/filiais') ? 'text-blue-600' : ''}`} />
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
                className="mt-auto flex items-center gap-3 py-2 px-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
