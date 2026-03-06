"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { db, doc, getDoc, setDoc } from "@/lib/firebaseClient" // Import Firebase Firestore

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [signupError, setSignupError] = useState("")
  const router = useRouter()

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "Nenhuma conta encontrada com este email. Verifique o email digitado ou crie uma nova conta."
      case "auth/wrong-password":
        return "Senha incorreta. Verifique se digitou corretamente."
      case "auth/invalid-email":
        return "Email inválido. Verifique o formato do email."
      case "auth/email-already-in-use":
        return "Já existe uma conta com este email. Tente fazer login ou use outro email."
      case "auth/weak-password":
        return "Senha muito fraca. Use pelo menos 6 caracteres."
      case "auth/too-many-requests":
        return "Muitas tentativas de login. Tente novamente mais tarde."
      case "auth/operation-not-allowed":
        return "Login com email e senha não está habilitado."
      default:
        return "Erro ao autenticar. Tente novamente."
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    if (!auth) {
      setLoginError("Serviço de autenticação indisponível. Tente novamente mais tarde.")
      return
    }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Sucesso!",
        description: "Login realizado com sucesso.",
      })
      router.push("/dashboard")
    } catch (error: any) {
      const errorCode = error.code || "unknown"
      const errorMessage = getErrorMessage(errorCode)
      setLoginError(errorMessage)
      console.error("[v0] Login error:", errorCode, error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError("")
    if (password !== confirmPassword) {
      setSignupError("As senhas não coincidem.")
      return
    }
    if (!auth) {
      setSignupError("Serviço de autenticação indisponível. Tente novamente mais tarde.")
      return
    }
    setLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const userId = userCredential.user.uid

      try {
        const leadsDocRef = doc(db, "leads", userId)
        const leadsDoc = await getDoc(leadsDocRef)

        if (leadsDoc.exists()) {
          const leadData = leadsDoc.data()
          console.log("[v0] Lead data found, copying to user:", userId)

          // Copiar todos os dados do lead para o documento do usuário
          const userDocRef = doc(db, "users", userId)
          await setDoc(
            userDocRef,
            {
              email: email,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              // Copiar dados do quiz
              quizData: leadData.quizData || leadData,
              quizAnswers: leadData.quizData || leadData,
              // Copiar dados pessoais
              currentWeight: leadData.currentWeight,
              goalWeight: leadData.goalWeight,
              height: leadData.height,
              age: leadData.age,
              gender: leadData.gender,
              bodyType: leadData.bodyType,
              goal: leadData.goal,
              experience: leadData.experience,
              trainingDaysPerWeek: leadData.trainingDaysPerWeek,
              workoutTime: leadData.workoutTime,
              equipment: leadData.equipment,
              diet: leadData.diet || leadData.dietPreferences,
              allergies: leadData.allergies,
              allergyDetails: leadData.allergyDetails,
              // Copiar planos se existirem
              ...(leadData.dietPlan && { dietPlan: leadData.dietPlan }),
              ...(leadData.workoutPlan && { workoutPlan: leadData.workoutPlan }),
            },
            { merge: true },
          )

          console.log("[v0] Lead data copied to user successfully")
        } else {
          console.log("[v0] No lead data found for user:", userId)
          // Criar documento básico do usuário
          const userDocRef = doc(db, "users", userId)
          await setDoc(userDocRef, {
            email: email,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error("[v0] Error copying lead data:", error)
        // Não falhar o cadastro se houver erro na cópia dos dados
      }

      toast({
        title: "Sucesso!",
        description: "Conta criada com sucesso.",
      })
      router.push("/quiz")
    } catch (error: any) {
      const errorCode = error.code || "unknown"
      const errorMessage = getErrorMessage(errorCode)
      setSignupError(errorMessage)
      console.error("[v0] Signup error:", errorCode, error.message)
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
      const actionCodeSettings = {
        url: `${window.location.origin}/auth?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true,
      }

      await sendPasswordResetEmail(auth, email, actionCodeSettings)
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
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900 dark:text-white">Bem-vindo de volta!</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Entre ou crie sua conta para acessar seu plano.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement
                  loginTab?.click()
                }}
                className="px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-200 bg-lime-500 hover:bg-lime-600 text-white shadow-lg"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => router.push("/quiz")}
                className="px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-200 bg-white/10 hover:bg-white/20 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              >
                Cadastrar
              </button>
            </div>
            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="mig@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-lime-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login" className="text-gray-700 dark:text-gray-300">
                    Senha
                  </Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-lime-500"
                    required
                  />
                </div>
                {loginError && (
                  <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {loginError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePasswordResetRequest}
                  className="text-blue-500 hover:text-blue-400 text-sm transition-colors"
                  disabled={loading}
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-200 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    "Entrando..."
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      Entrar
                    </>
                  )}
                </button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="mig@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-lime-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-gray-700 dark:text-gray-300">
                    Senha
                  </Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-lime-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password-signup" className="text-gray-700 dark:text-gray-300">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirm-password-signup"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-lime-500"
                    required
                  />
                </div>
                {signupError && (
                  <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {signupError}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-200 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Cadastrando..." : "Cadastrar"}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
