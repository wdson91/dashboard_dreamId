// app/login/page.tsx
"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react"

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
  const router = useRouter()

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/dashboard")
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
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === "login" && "Entrar na sua conta"}
            {mode === "signup" && "Criar nova conta"}
            {mode === "forgot" && "Recuperar senha"}
          </h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <form className="space-y-6" onSubmit={handleAuth}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                    className="pl-10"
                  />
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              {mode !== "forgot" && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                      className="pl-10 pr-10"
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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
                      className="pl-10 pr-10"
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Carregando..." : (
                  mode === "login" ? "Entrar" :
                  mode === "signup" ? "Criar Conta" :
                  "Enviar Email"
                )}
              </Button>
            </form>

            <div className="mt-6">
              {mode === "login" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setMode("signup")}
                    className="w-full text-sm text-blue-600 hover:text-blue-500"
                  >
                    Não tem uma conta? Criar conta
                  </button>
                  <button
                    onClick={() => setMode("forgot")}
                    className="w-full text-sm text-blue-600 hover:text-blue-500"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              {mode === "signup" && (
                <button
                  onClick={() => setMode("login")}
                  className="w-full text-sm text-blue-600 hover:text-blue-500"
                >
                  Já tem uma conta? Entrar
                </button>
              )}

              {mode === "forgot" && (
                <button
                  onClick={() => setMode("login")}
                  className="w-full text-sm text-blue-600 hover:text-blue-500"
                >
                  Voltar para o login
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
