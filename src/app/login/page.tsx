// app/login/page.tsx
"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

type AuthMode = "login" | "signup" | "forgot"

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const supabase = createClient()
 
  const { signIn } = useAuth()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    // Validação básica
    if (!email || !password) {
      setError("Por favor, preencha todos os campos obrigatórios")
      setLoading(false)
      return
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("As senhas não coincidem")
      setLoading(false)
      return
    }

    if (mode === "signup" && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setLoading(false)
      return
    }

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password)
        if (error) throw error
        
        // Aguardar um pouco para garantir que a sessão foi estabelecida
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Fazer refresh da página para garantir que todos os contextos sejam atualizados
        window.location.href = "/dashboard"
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage("Verifique seu email para confirmar a conta!")
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) throw error
        setMessage("Email de redefinição enviado!")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-64 w-auto"
            />
          </div>
          
          
        </div>

        <Card className="bg-emerald-600 border border-emerald-400">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {mode === "login" && "Login"}
            {mode === "signup" && "Criar nova conta"}
            {mode === "forgot" && "Recuperar senha"}
          </h2>
          <CardContent className="p-6">
            
            <form className="space-y-6" onSubmit={handleAuth}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white">
                  Email
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-emerald-500 border-emerald-400 text-white placeholder-emerald-300"
                  />
                  <Mail className="h-5 w-5 text-white absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white">
                  Senha
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-emerald-500 border-emerald-400 text-white placeholder-emerald-300"
                  />
                  <Lock className="h-5 w-5 text-white absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white hover:text-green-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                    Confirmar Senha
                  </label>
                  <div className="mt-1 relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-emerald-500 border-emerald-400 text-white placeholder-emerald-300"
                    />
                    <Lock className="h-5 w-5 text-white absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white hover:text-green-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-300 text-sm bg-red-600 p-3 rounded-md">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-white text-sm bg-emerald-500 p-3 rounded-md">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-white hover:bg-emerald-400 border border-emerald-400"
              >
                {loading ? "Carregando..." : (
                  mode === "login" ? "Entrar" :
                  mode === "signup" ? "Criar Conta" :
                  "Enviar Email"
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-green-400" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-green-700 text-white">
                    Ou continue com
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="w-full inline-flex justify-center py-2 px-4 border border-green-400 rounded-md shadow-sm bg-green-600 text-sm font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {mode === "login" ? "Criar conta" : "Já tenho conta"}
                </button>
              </div>

              {mode === "login" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-white hover:text-green-200 text-sm"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              {(mode === "signup" || mode === "forgot") && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-white hover:text-green-200 text-sm"
                  >
                    Voltar para login
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
