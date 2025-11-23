"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { ArrowRight } from "lucide-react"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Sucesso!",
        description: "Login realizado com sucesso.",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      toast({
        title: "Sucesso!",
        description: "Conta criada com sucesso.",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordResetRequest = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, digite seu e-mail para redefinir a senha.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      let errorMessage = "Erro ao enviar e-mail de redefinição."

      if (error.code === "auth/user-not-found") {
        errorMessage = "Usuário não encontrado. Verifique se o e-mail está correto ou crie uma conta."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "E-mail inválido. Verifique o formato do e-mail."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde."
      }

      toast({
        title: "Erro ao enviar e-mail de redefinição",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-4">
      <Card className="w-full max-w-lg bg-gray-800/60 backdrop-blur-sm text-white border border-gray-700/50 shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-8">
          <CardTitle className="text-3xl font-bold">Bem-vindo de volta!</CardTitle>
          <CardDescription className="text-gray-300 text-base">
            Entre ou crie sua conta para acessar seu plano.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700/50 p-1 rounded-full mb-6">
              <TabsTrigger
                value="login"
                className="rounded-full data-[state=active]:bg-lime-500 data-[state=active]:text-white transition-all duration-300 text-gray-300 data-[state=active]:shadow-lg"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full data-[state=active]:bg-lime-500 data-[state=active]:text-white transition-all duration-300 text-gray-300 data-[state=active]:shadow-lg"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="text-gray-200 text-sm">
                    Email
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="mig@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-12 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login" className="text-gray-200 text-sm">
                    Senha
                  </Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-12 rounded-lg"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handlePasswordResetRequest}
                    className="text-gray-400 hover:text-gray-200 text-sm p-0 h-auto"
                    disabled={loading}
                  >
                    Esqueceu a senha?
                  </Button>

                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 text-base font-semibold shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.7)] transition-all duration-300 flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <ArrowRight className="h-5 w-5" />
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-gray-200 text-sm">
                    Email
                  </Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="mig@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-12 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-gray-200 text-sm">
                    Senha
                  </Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-12 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password-signup" className="text-gray-200 text-sm">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirm-password-signup"
                    type="password"
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 h-12 rounded-lg"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full h-12 text-base font-semibold shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.7)] transition-all duration-300 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <ArrowRight className="h-5 w-5" />
                  {loading ? "Cadastrando..." : "Cadastrar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
