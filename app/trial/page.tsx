"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Calendar,
  Gift,
} from "lucide-react"
import { motion } from "framer-motion"
import { doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebaseClient"
import Link from "next/link"
import Image from "next/image"

interface TrialFormData {
  email: string
  name: string
  phone: string
}

export default function TrialPage() {
  const router = useRouter()
  
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState<TrialFormData>({
    email: "",
    name: "",
    phone: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(90)

  // Load user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth!, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        try {
          const userDocRef = doc(db!, "users", currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            setFormData((prev) => ({
              ...prev,
              email: userData.email || currentUser.email || "",
              name: userData.name || "",
              phone: userData.phone || userData.personalData?.phone || "",
            }))
          } else {
            setFormData((prev) => ({
              ...prev,
              email: currentUser.email || "",
            }))
          }
        } catch (error) {
          console.error("[TRIAL] Erro ao buscar dados do usuário:", error)
        }
      } else {
        // Carregar dados do localStorage se não estiver autenticado
        if (typeof window !== "undefined") {
          const quizDataStr = localStorage.getItem("quizData")
          if (quizDataStr) {
            try {
              const quizData = JSON.parse(quizDataStr)
              setFormData((prev) => ({
                ...prev,
                email: prev.email || quizData.email || "",
                name: prev.name || quizData.name || "",
                phone: prev.phone || quizData.phone || "",
              }))
            } catch (e) {
              console.log("[TRIAL] Erro ao ler quizData:", e)
            }
          }
        }
      }
    })
    return () => unsubscribe()
  }, [])

  // Countdown para redirecionamento após sucesso
  useEffect(() => {
    if (!success) return
    
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dashboard")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [success, router])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof TrialFormData
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.email?.trim()) return "Email é obrigatório"
    if (!formData.name?.trim()) return "Nome é obrigatório"
    if (!formData.phone?.trim()) return "Telefone é obrigatório"
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) return "Email inválido"
    
    return null
  }

  const handleStartTrial = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim(),
          phone: formData.phone.replace(/\D/g, ""),
          uid: user?.uid || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao ativar trial")
      }

      const result = await response.json()
      console.log("[TRIAL] Trial ativado com sucesso:", result)
      
      setSuccess(true)
      setFormData({ email: "", name: "", phone: "" })

      // Se não está autenticado, limpar dados do localStorage
      if (typeof window !== "undefined" && !user) {
        localStorage.removeItem("quizData")
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao ativar trial"
      console.error("[TRIAL] Erro:", errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 flex items-center justify-center p-4">
      {/* Botão voltar */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur">
          <CardContent className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-lime-500/20 to-emerald-500/20 border border-lime-500/30 rounded-full p-4">
                  <Gift className="w-8 h-8 text-lime-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">
                Teste Grátis por 7 Dias
              </h1>
              <p className="text-gray-400">
                Acesso completo ao seu plano 100% personalizado sem compromisso
              </p>
            </div>

            {/* Benefícios */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm">Plano Personalizado Completo</p>
                  <p className="text-xs text-gray-400">Treino e dieta adaptados para você</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm">Sem Cartão de Crédito</p>
                  <p className="text-xs text-gray-400">Nenhuma cobrança durante o teste</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm">Cancele Quando Quiser</p>
                  <p className="text-xs text-gray-400">Sem multa ou taxas ocultas</p>
                </div>
              </div>
            </div>

            {/* Form ou Success Message */}
            {!success ? (
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome Completo
                  </label>
                  <Input
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => handleInputChange(e, "name")}
                    className="bg-slate-700/40 text-white placeholder:text-slate-400 border-slate-600 focus:border-lime-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, "email")}
                    className="bg-slate-700/40 text-white placeholder:text-slate-400 border-slate-600 focus:border-lime-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone
                  </label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "")
                      if (value.length > 0) {
                        if (value.length <= 2) {
                          // Sem formatação para 1-2 dígitos
                        } else if (value.length <= 7) {
                          value = "(" + value.slice(0, 2) + ") " + value.slice(2)
                        } else {
                          value = "(" + value.slice(0, 2) + ") " + value.slice(2, 7) + "-" + value.slice(7, 11)
                        }
                      }
                      handleInputChange({ target: { value } } as any, "phone")
                    }}
                    className="bg-slate-700/40 text-white placeholder:text-slate-400 border-slate-600 focus:border-lime-500"
                  />
                </div>

                {/* Erro */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-900/20 border border-red-600/50 rounded-lg p-3 flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Botão */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleStartTrial}
                  disabled={loading}
                  className={[
                    "w-full relative overflow-hidden rounded-2xl py-4 px-8",
                    "text-white font-bold text-lg tracking-wide",
                    "bg-gradient-to-r from-lime-500 to-emerald-500",
                    "shadow-[0_0_24px_rgba(34,197,94,0.35),0_6px_20px_rgba(0,0,0,0.15)]",
                    "border border-lime-400/40",
                    "active:translate-y-[2px] active:scale-[0.98]",
                    "transition-all duration-200",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "hover:brightness-110",
                  ].join(" ")}
                >
                  <span className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Iniciando seu teste...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Iniciar Teste Gratuito
                      </>
                    )}
                  </span>
                </motion.button>

                {/* Informações de segurança */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield className="w-3 h-3" />
                  <span>Seus dados estão protegidos com criptografia SSL</span>
                </div>

                {/* Termos */}
                <p className="text-xs text-gray-500 text-center">
                  Ao continuar, você concorda com nossos{" "}
                  <Link href="/termos-condicoes" className="text-lime-400 hover:text-lime-300">
                    Termos de Serviço
                  </Link>{" "}
                  e{" "}
                  <Link href="/politica-privacidade" className="text-lime-400 hover:text-lime-300">
                    Política de Privacidade
                  </Link>
                </p>
              </div>
            ) : (
              /* Success Message */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-4 text-center"
              >
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="bg-gradient-to-br from-lime-500/20 to-emerald-500/20 border border-lime-500/30 rounded-full p-4"
                  >
                    <CheckCircle2 className="w-12 h-12 text-lime-400" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    Teste Ativado! 🎉
                  </h2>
                  <p className="text-gray-400">
                    Você tem 7 dias de acesso completo
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-lime-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      Válido até {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Enviamos um email com seus dados de acesso
                  </p>
                </div>

                <p className="text-sm text-gray-400">
                  Redirecionando para seu painel em{" "}
                  <span className="font-bold text-lime-400">{redirectCountdown}s</span>
                </p>

                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold"
                >
                  Ir para Meu Painel Agora
                </Button>
              </motion.div>
            )}

            {/* Rodapé */}
            <div className="text-center pt-4 border-t border-slate-700">
              <p className="text-xs text-gray-500">
                Dúvidas?{" "}
                <a
                  href="mailto:suporte@fitgoal.com.br"
                  className="text-lime-400 hover:text-lime-300 font-semibold"
                >
                  Entre em contato
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
