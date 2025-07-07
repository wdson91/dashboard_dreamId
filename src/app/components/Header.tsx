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
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground z-50">
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={180}
                height={180}
                className="object-contain"
              />
            </div>
          </div>
          
          {/* User Info */}
          {user && (
            <div className="mb-6 p-3 bg-sidebar-card rounded-lg border border-sidebar-card-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-sidebar-secondary-foreground" />
                <span className="text-sm font-medium text-sidebar-foreground">Usuário</span>
              </div>
              <div className="text-xs text-sidebar-secondary-foreground truncate">
                {user.email}
              </div>
            </div>
          )}

          {/* Estabelecimento Selecionado */}
          {isLoaded && nifSelecionado && (
            <div className="mb-6 p-3 bg-sidebar-card rounded-lg border border-sidebar-card-border">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-sidebar-secondary-foreground" />
                <span className="text-sm font-medium text-sidebar-foreground">Estabelecimento</span>
              </div>
              <div className="text-xs text-sidebar-secondary-foreground font-mono">
                NIF: {nifSelecionado}
              </div>
              {filialSelecionada && (
                <div className="text-xs text-sidebar-secondary-foreground mt-1 font-medium">
                  Filial: #{filialSelecionada}
                </div>
              )}
              {morada && (
                <div className="text-xs text-sidebar-secondary-foreground mt-1 line-clamp-2 break-words whitespace-normal">
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
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-inner border border-sidebar-primary' 
                  : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/produtos" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/produtos') 
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-inner border border-sidebar-primary' 
                  : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Produtos</span>
            </Link>
            <Link 
              href="/faturas" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/faturas') 
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-inner border border-sidebar-primary' 
                  : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Faturas</span>
            </Link>
            <Link 
              href="/estabelecimentos" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/estabelecimentos') 
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-inner border border-sidebar-primary' 
                  : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Estabelecimentos</span>
            </Link>
            <Link 
              href="/filiais" 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                isActiveLink('/filiais') 
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-inner border border-sidebar-primary' 
                  : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Filiais</span>
            </Link>
          </nav>
          
          {/* Logout Button */}
          {user && (
            <div className="mt-auto pt-6 border-t border-sidebar-border">
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
      <header className="lg:hidden sticky top-0 z-40 bg-sidebar border-b border-sidebar-border   shadow-md">
        <nav className="flex justify-between max-w-4xl mx-auto items-center">
          <div className="flex flex-col">
            <div className="flex justify-center gap-2 ">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            
          </div>
          {isLoaded && nifSelecionado && (
              <>
                <div className="flex items-center flex-col gap-1 mt-1">
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 text-sidebar-secondary-foreground" />
                  <span className="text-xs font-mono text-sidebar-secondary-foreground">NIF: {nifSelecionado}</span>
                </div>
                {filialSelecionada && (
                  <div className="flex items-center gap-1 mt-1">
                    <Store className="h-3 w-3 text-sidebar-secondary-foreground" />
                    <span className="text-xs text-sidebar-secondary-foreground font-medium">Filial: #{filialSelecionada}</span>
                  </div>
                )}
                </div>
                
              </>
            )}
          <button 
            onClick={() => setDrawerOpen(true)} 
            aria-label="Abrir menu" 
            className="p-2 -mr-2 mr-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
          >
            <Menu className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 flex justify-end"
          onClick={() => setDrawerOpen(false)}
        >
          
          <div 
            className="bg-sidebar w-72 h-full p-6 flex flex-col gap-4 shadow-2xl animate-slide-in-right border-l border-sidebar-border text-sidebar-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
                <div className="flex justify-center gap-2 ml-15">
                  <Image
                    src="/logo.png" 
                    alt="Logo" 
                    width={120}
                    height={120}
                    className="object-contain"
                  />
                </div>
                <button className="-mr-2 p-2" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
                  <X className="h-6 w-6 text-sidebar-foreground" />
                </button>
            </div>
            
            
            {/* User Info Mobile */}
            {user && (
              <div className="mb-4 p-3 bg-sidebar-card rounded-lg border border-sidebar-card-border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-sidebar-secondary-foreground" />
                  <span className="text-sm font-medium text-sidebar-foreground">Usuário</span>
                </div>
                <div className="text-xs text-sidebar-secondary-foreground truncate">{user.email}</div>
              </div>
            )}
            
            {/* Estabelecimento Selecionado Mobile */}
            {isLoaded && nifSelecionado && (
              <div className="mb-4 p-3 bg-sidebar-card rounded-lg border border-sidebar-card-border">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-sidebar-secondary-foreground" />
                  <span className="text-sm font-medium text-sidebar-foreground">Estabelecimento</span>
                </div>
                <div className="text-xs text-sidebar-secondary-foreground font-mono">
                  NIF: {nifSelecionado}
                </div>
                {filialSelecionada && (
                  <div className="text-xs text-sidebar-secondary-foreground mt-1 font-medium">
                    Filial: #{filialSelecionada}
                  </div>
                )}
                 {morada && (
                  <div className="text-xs text-sidebar-secondary-foreground mt-1 line-clamp-2 break-words whitespace-normal">
                    {morada}
                  </div>
                )}
              </div>
            )}
            
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/') 
                    ? 'bg-sidebar-accent text-sidebar-foreground' 
                    : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/produtos"
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/produtos') 
                    ? 'bg-sidebar-accent text-sidebar-foreground' 
                    : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                <Package className="h-4 w-4" />
                <span>Produtos</span>
              </Link>
              <Link
                href="/faturas"
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/faturas') 
                    ? 'bg-sidebar-accent text-sidebar-foreground' 
                    : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                <Receipt className="h-4 w-4" />
                <span>Faturas</span>
              </Link>
              <Link
                href="/estabelecimentos"
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/estabelecimentos') 
                    ? 'bg-sidebar-accent text-sidebar-foreground' 
                    : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                <Building className="h-4 w-4" />
                <span>Estabelecimentos</span>
              </Link>
              <Link
                href="/filiais"
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                  isActiveLink('/filiais') 
                    ? 'bg-sidebar-accent text-sidebar-foreground' 
                    : 'text-sidebar-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                <Store className="h-4 w-4" />
                <span>Filiais</span>
              </Link>
            </nav>
            
            {/* Logout Button Mobile */}
            <div className="mt-auto pt-6 border-t border-sidebar-border">
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="w-full flex items-center gap-3 py-2 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
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
