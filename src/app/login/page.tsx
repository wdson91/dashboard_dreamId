// app/login/page.tsx
"use client"

import { useState } from "react"
import Image from "next/image"
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
    if (!email || (mode !== 'forgot' && !password)) {
      setError("Por favor, preencha todos os campos obrigatórios.")
      setLoading(false)
      return
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("As senhas não coincidem.")
      setLoading(false)
      return
    }

    if (mode === "signup" && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      setLoading(false)
      return
    }

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password)
        if (error) throw error
        window.location.href = "/dashboard"
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage("Verifique seu e-mail para confirmar a conta!")
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) throw error
        setMessage("E-mail de redefinição enviado!")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={128}
              height={128}
              priority
            />
        </div>

        <Card className="bg-emerald-800 border border-emerald-700 shadow-2xl">
          <CardContent className="p-8">
            <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-white">
              {mode === "login" && "Aceda à sua conta"}
              {mode === "signup" && "Criar nova conta"}
              {mode === "forgot" && "Recuperar senha"}
            </h2>
            
            <form className="space-y-6" onSubmit={handleAuth}>
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-emerald-700 border-emerald-600 text-white placeholder-emerald-400 focus:ring-emerald-500"
                  />
                  <Mail className="h-5 w-5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="password" className="sr-only">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-emerald-700 border-emerald-600 text-white placeholder-emerald-400 focus:ring-emerald-500"
                    />
                    <Lock className="h-5 w-5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-emerald-700 border-emerald-600 text-white placeholder-emerald-400 focus:ring-emerald-500"
                    />
                    <Lock className="h-5 w-5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-300 text-sm bg-red-500/20 border border-red-500/30 p-3 rounded-md">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-emerald-200 text-sm bg-emerald-600/50 border border-emerald-500/60 p-3 rounded-md">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 focus:ring-emerald-400"
              >
                {loading ? "A carregar..." : (
                  mode === "login" ? "Entrar" :
                  mode === "signup" ? "Criar Conta" :
                  "Enviar"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : mode === 'signup' ? 'login' : 'login')}
                  className="font-medium text-emerald-300 hover:text-emerald-100 text-sm"
                >
                  {mode === 'login' ? 'Ainda não tem conta? Crie uma' : 'Já tem conta? Entre'}
                </button>
            </div>

            {mode === 'login' && (
              <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="font-medium text-emerald-400 hover:text-emerald-200 text-sm"
                  >
                    Esqueceu a sua senha?
                  </button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
