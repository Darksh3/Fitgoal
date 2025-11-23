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
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 text-white border-gray-700">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
          <CardDescription className="text-gray-400">Entre ou crie sua conta para acessar seu plano.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="login" className="data-[state=active]:bg-lime-500 data-[state=active]:text-white">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-lime-500 data-[state=active]:text-white">
                Cadastrar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-lime-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login" className="text-gray-300">
                    Senha
                  </Label>
                  <Input
                    id="password-login"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-lime-500"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-lime-500 hover:bg-lime-600 text-white" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={handlePasswordResetRequest}
                  className="w-full text-lime-400 hover:text-lime-300"
                  disabled={loading}
                >
                  Esqueceu a senha?
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-lime-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-gray-300">
                    Senha
                  </Label>
                  <Input
                    id="password-signup"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-lime-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password-signup" className="text-gray-300">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirm-password-signup"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-lime-500"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-lime-500 hover:bg-lime-600 text-white" disabled={loading}>
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
