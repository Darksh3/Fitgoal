"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthFormProps {
  initialMode?: "login" | "register"
}

export default function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(initialMode === "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestLogin = async () => {
    setLoading(true)
    setError("")

    try {
      // Conta de teste pré-configurada
      await signInWithEmailAndPassword(auth, "teste@fitgoal.com", "123456789")
      router.push("/dashboard")
    } catch (error: any) {
      // Se a conta de teste não existir, cria ela
      try {
        await createUserWithEmailAndPassword(auth, "teste@fitgoal.com", "123456789")
        router.push("/dashboard")
      } catch (createError: any) {
        setError("Erro ao criar conta de teste: " + createError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = () => {
    // Simula dados de quiz para o demo
    const demoQuizData = {
      gender: "homem",
      name: "João Demo",
      bodyType: "mesomorfo",
      goal: ["ganhar-massa"],
      currentWeight: "75",
      targetWeight: "80",
      timeToGoal: "6 meses",
      workoutTime: "45-60 minutos",
      experience: "intermediario",
    }

    // Salva dados demo no localStorage
    localStorage.setItem("quizData", JSON.stringify(demoQuizData))
    localStorage.setItem("demoMode", "true")

    // Vai direto para o dashboard
    router.push("/dashboard")
  }

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Entrar" : "Registrar"}</CardTitle>
          <CardDescription>{isLogin ? "Entre na sua conta" : "Crie sua conta"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Registrar"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:underline">
              {isLogin ? "Não tem conta? Registre-se" : "Já tem conta? Entre"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Opções de Teste */}
      <Card className="w-full max-w-md bg-gray-50 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">Opções de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleTestLogin} variant="outline" className="w-full bg-transparent" disabled={loading}>
            🧪 Login com Conta de Teste
          </Button>
          <Button onClick={handleDemoAccess} variant="outline" className="w-full bg-transparent" disabled={loading}>
            🎯 Acessar Demo (sem login)
          </Button>
          <p className="text-xs text-gray-500 text-center">Use estas opções para testar o dashboard rapidamente</p>
        </CardContent>
      </Card>
    </div>
  )
}
