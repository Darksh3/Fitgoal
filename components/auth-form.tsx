"use client"

import type React from "react"
import { useState } from "react"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, auth } from "@/lib/firebase-local"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sanitizeEmail } from "@/lib/validation"
import { handleFirebaseError } from "@/lib/error-handler"

interface AuthFormProps {
  initialMode?: "login" | "register"
}

interface AuthFormData {
  email: string
  password: string
}

export default function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(initialMode === "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!email.trim()) {
      errors.email = "Email é obrigatório"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Email inválido"
    }

    if (!password.trim()) {
      errors.password = "Senha é obrigatória"
    } else if (password.length < 6) {
      errors.password = "Senha deve ter pelo menos 6 caracteres"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError("")
    setValidationErrors({})

    try {
      const sanitizedEmail = sanitizeEmail(email)

      if (isLogin) {
        await signInWithEmailAndPassword(auth, sanitizedEmail, password)
      } else {
        await createUserWithEmailAndPassword(auth, sanitizedEmail, password)
      }
      router.push("/dashboard")
    } catch (error: any) {
      const appError = handleFirebaseError(error, "Autenticação")
      setError(appError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestLogin = async () => {
    setLoading(true)
    setError("")

    try {
      await signInWithEmailAndPassword(auth, "teste@athlix.com", "123456789")
      router.push("/dashboard")
    } catch (error: any) {
      try {
        await createUserWithEmailAndPassword(auth, "teste@athlix.com", "123456789")
        router.push("/dashboard")
      } catch (createError: any) {
        const appError = handleFirebaseError(createError, "Criação de conta de teste")
        setError(appError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoAccess = () => {
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

    localStorage.setItem("quizData", JSON.stringify(demoQuizData))
    localStorage.setItem("demoMode", "true")

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
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>}
            </div>
            <div>
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={validationErrors.password ? "border-red-500" : ""}
              />
              {validationErrors.password && <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>}
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
