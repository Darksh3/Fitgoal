h"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    CreditCard,
    Check,
    ShoppingCart,
    User,
    Lock,
    QrCode,
    FileText,
    Smartphone,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Shield,
    Zap,
    Clock,
} from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { motion } from "framer-motion"
import { doc, onSnapshot, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebaseClient"
import Link from "next/link"
import Image from "next/image"
import { usePixel } from "@/components/pixel-tracker"
import { StripeCardForm } from "./stripe-card-form"

interface PaymentFormData {
    email: string
    name: string
}

interface CardData {
    number: string
    expiryMonth: string
    expiryYear: string
    cvc: string
}

type PaymentMethod = "card"

export default function CheckoutPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const planId = searchParams.get("planId")
    const [isLoading, setIsLoading] = useState(false)
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [formData, setFormData] = useState<PaymentFormData>({
          email: "",
          name: "",
    })
    const [cardData, setCardData] = useState<CardData>({
          number: "",
          expiryMonth: "",
          expiryYear: "",
          cvc: "",
    })
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
    const [error, setError] = useState<string | null>(null)
    const [planName, setPlanName] = useState<string>("")
    const [planPrice, setPlanPrice] = useState<number>(0)
    const [user, setUser] = useState<any>(null)
    const [clientSecret, setClientSecret] = useState<string>("")
    const [paymentIntentId, setPaymentIntentId] = useState<string>("")
    const trackPixel = usePixel()

  useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                          setUser(currentUser)
                          setFormData((prev) => ({
                                      ...prev,
                                      email: currentUser.email || "",
                                      name: currentUser.displayName || "",
                          }))
                } else {
                          router.push("/")
                }
        })
        return () => unsubscribe()
  }, [router])

  useEffect(() => {
        if (!planId) return

                const unsubscribe = onSnapshot(
                        doc(db, "plans", planId),
                        (doc) => {
                                  if (doc.exists()) {
                                              const data = doc.data()
                                              setPlanName(data.name || "Plano")
                                              setPlanPrice(data.price || 0)
                                  }
                        },
                        (error) => {
                                  console.error("Erro ao carregar plano:", error)
                                  setError("Erro ao carregar informações do plano")
                        }
                      )

                return () => unsubscribe()
  }, [planId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
                ...prev,
                [name]: value,
        }))
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
        if (!user || !planId) {
                setError("Informações de usuário ou plano inválidas")
                return
        }

        try {
                setPaymentLoading(true)

          const response = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                                planId,
                                userId: user.uid,
                                email: formData.email,
                                paymentIntentId,
                    }),
          })

          const result = await response.json()

          if (!response.ok) {
                    throw new Error(result.message || "Erro ao processar pagamento")
          }

          trackPixel("Purchase", {
                    value: planPrice,
                    currency: "BRL",
          })

          setPaymentLoading(false)
                router.push(`/checkout-success?planId=${planId}`)
        } catch (err: any) {
                setPaymentLoading(false)
                setError(err.message || "Erro ao processar pagamento")
        }
  }

  const handlePaymentError = (message: string) => {
        setError(message)
  }

  const createPaymentIntent = async () => {
        if (!formData.email || !formData.name) {
                setError("Por favor, preencha todos os campos obrigatórios")
                return
        }

        try {
                setIsLoading(true)
                setError(null)

          const response = await fetch("/api/create-payment-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                                planId,
                                email: formData.email,
                                name: formData.name,
                                amount: planPrice,
                    }),
          })

          const data = await response.json()

          if (!response.ok) {
                    throw new Error(data.message || "Erro ao criar pagamento")
          }

          setClientSecret(data.clientSecret)
                setPaymentIntentId(data.paymentIntentId)
        } catch (err: any) {
                setError(err.message || "Erro ao criar pagamento")
        } finally {
                setIsLoading(false)
        }
  }

  if (!user) {
        return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
                </div>div>
              )
  }
  
    return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-8 px-4">
                <div className="max-w-6xl mx-auto">
                  {/* Cabeçalho */}
                        <div className="mb-8">
                                  <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                                              <ArrowLeft className="w-4 h-4" />
                                              Voltar
                                  </Link>Link>
                                  <h1 className="text-4xl font-bold mb-2">Finalizar Compra</h1>h1>
                                  <p className="text-gray-400">Complete o pagamento para ativar seu plano</p>p>
                        </div>div>
                
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Coluna Principal - Formulário */}
                                  <div className="lg:col-span-2">
                                              <motion.div
                                                              initial={{ opacity: 0, y: 20 }}
                                                              animate={{ opacity: 1, y: 0 }}
                                                              transition={{ duration: 0.5 }}
                                                            >
                                                            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur">
                                                                            <CardContent className="p-8">
                                                                              {/* Dados Pessoais */}
                                                                                              <div className="mb-8">
                                                                                                                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                                                                                                                        <User className="w-5 h-5 text-lime-400" />
                                                                                                                                        Dados Pessoais
                                                                                                                    </h2>h2>
                                                                                              
                                                                                                                  <div className="space-y-4">
                                                                                                                                        <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                                                                                                                                                          Nome Completo
                                                                                                                                                                  </label>label>
                                                                                                                                                                <Input
                                                                                                                                                                                            type="text"
                                                                                                                                                                                            name="name"
                                                                                                                                                                                            value={formData.name}
                                                                                                                                                                                            onChange={handleInputChange}
                                                                                                                                                                                            placeholder="João Silva"
                                                                                                                                                                                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                                                                                                                                                                                          />
                                                                                                                                          </div>div>
                                                                                                                  
                                                                                                                                        <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                                                                                                                                                          Email
                                                                                                                                                                  </label>label>
                                                                                                                                                                <Input
                                                                                                                                                                                            type="email"
                                                                                                                                                                                            name="email"
                                                                                                                                                                                            value={formData.email}
                                                                                                                                                                                            onChange={handleInputChange}
                                                                                                                                                                                            placeholder="seu@email.com"
                                                                                                                                                                                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                                                                                                                                                                                          />
                                                                                                                                          </div>div>
                                                                                                                    </div>div>
                                                                                                </div>div>
                                                                            
                                                                              {/* Divider */}
                                                                                              <div className="border-t border-gray-700 my-8"></div>div>
                                                                            
                                                                              {/* Método de Pagamento */}
                                                                                              <div className="mb-8">
                                                                                                                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                                                                                                                        <CreditCard className="w-5 h-5 text-lime-400" />
                                                                                                                                        Método de Pagamento
                                                                                                                    </h2>h2>
                                                                                              
                                                                                                {/* Opção Cartão de Crédito */}
                                                                                                                  <div
                                                                                                                                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                                                                                                                                    paymentMethod === "card"
                                                                                                                                                                      ? "border-lime-400 bg-lime-400/10"
                                                                                                                                                                      : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                                                                                                                                            }`}
                                                                                                                                          onClick={() => setPaymentMethod("card")}
                                                                                                                                        >
                                                                                                                                        <div className="flex items-center gap-3">
                                                                                                                                                                <div
                                                                                                                                                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                                                                                                                                                                          paymentMethod === "card"
                                                                                                                                                                                                                            ? "border-lime-400 bg-lime-400"
                                                                                                                                                                                                                            : "border-gray-500"
                                                                                                                                                                                                                        }`}
                                                                                                                                                                                          >
                                                                                                                                                                  {paymentMethod === "card" && (
                                                                                                                                                                                                                        <Check className="w-3 h-3 text-gray-900" />
                                                                                                                                                                                                                      )}
                                                                                                                                                                  </div>div>
                                                                                                                                                                <div>
                                                                                                                                                                                          <p className="font-semibold">Cartão de Crédito</p>p>
                                                                                                                                                                                          <p className="text-sm text-gray-400">
                                                                                                                                                                                                                      Mastercard, Visa, Elo, etc.
                                                                                                                                                                                                                    </p>p>
                                                                                                                                                                  </div>div>
                                                                                                                                          </div>div>
                                                                                                                    </div>div>
                                                                                                </div>div>
                                                                            
                                                                              {/* Formulário de Cartão */}
                                                                              {paymentMethod === "card" && clientSecret && (
                                                                                  <>
                                                                                                        <div className="border-t border-gray-700 my-8"></div>div>
                                                                                                        <div>
                                                                                                                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                                                                                                                                          <Lock className="w-5 h-5 text-lime-400" />
                                                                                                                                                          Dados do Cartão
                                                                                                                                  </h2>h2>
                                                                                                                                <StripeCardForm
                                                                                                                                                            clientSecret={clientSecret}
                                                                                                                                                            paymentIntentId={paymentIntentId}
                                                                                                                                                            onSuccess={handlePaymentSuccess}
                                                                                                                                                            onError={handlePaymentError}
                                                                                                                                                            amount={planPrice}
                                                                                                                                                          />
                                                                                                          </div>div>
                                                                                    </>>
                                                                                )}
                                                                            
                                                                              {/* Mensagens de Erro */}
                                                                              {error && (
                                                                                  <div className="mt-6 flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-lg p-4">
                                                                                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                                                                                        <p className="text-red-400 text-sm">{error}</p>p>
                                                                                    </div>div>
                                                                                              )}
                                                                            
                                                                              {/* Botão Continuar para Pagamento */}
                                                                              {!clientSecret && (
                                                                                  <Button
                                                                                                          onClick={createPaymentIntent}
                                                                                                          disabled={isLoading || !formData.name || !formData.email}
                                                                                                          className="w-full mt-8 bg-lime-400 hover:bg-lime-500 text-black font-bold py-4 text-lg rounded-xl disabled:opacity-50"
                                                                                                        >
                                                                                    {isLoading ? (
                                                                                                                                  <>
                                                                                                                                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                                                                                                                            Processando...
                                                                                                                                    </>>
                                                                                                                                ) : (
                                                                                                                                  <>
                                                                                                                                                            <Lock className="w-5 h-5 mr-2" />
                                                                                                                                                            Continuar para Pagamento
                                                                                                                                    </>>
                                                                                                                                )}
                                                                                    </Button>Button>
                                                                                              )}
                                                                            </CardContent>CardContent>
                                                            </Card>Card>
                                              
                                                {/* Segurança */}
                                                            <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
                                                                            <Shield className="w-4 h-4" />
                                                                            <span>Transação segura com SSL 256-bit</span>span>
                                                            </div>div>
                                              </motion.div>motion.div>
                                  </div>div>
                        
                          {/* Coluna Lateral - Resumo do Pedido */}
                                  <div>
                                              <motion.div
                                                              initial={{ opacity: 0, y: 20 }}
                                                              animate={{ opacity: 1, y: 0 }}
                                                              transition={{ duration: 0.5, delay: 0.1 }}
                                                            >
                                                            <Card className="border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 sticky top-8">
                                                                            <CardContent className="p-6">
                                                                                              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                                                                                                  <ShoppingCart className="w-5 h-5 text-lime-400" />
                                                                                                                  Resumo do Pedido
                                                                                                </h3>h3>
                                                                            
                                                                              {/* Plano Selecionado */}
                                                                                              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                                                                                                                  <p className="text-gray-400 text-sm mb-1">Plano</p>p>
                                                                                                                  <p className="text-xl font-bold">{planName}</p>p>
                                                                                                </div>div>
                                                                            
                                                                              {/* Preço */}
                                                                                              <div className="space-y-3 mb-6 pb-6 border-b border-gray-700">
                                                                                                                  <div className="flex justify-between text-sm">
                                                                                                                                        <span className="text-gray-400">Subtotal</span>span>
                                                                                                                                        <span>{formatCurrency(planPrice)}</span>span>
                                                                                                                    </div>div>
                                                                                                                  <div className="flex justify-between text-sm">
                                                                                                                                        <span className="text-gray-400">Desconto</span>span>
                                                                                                                                        <span className="text-lime-400">R$ 0,00</span>span>
                                                                                                                    </div>div>
                                                                                                </div>div>
                                                                            
                                                                              {/* Total */}
                                                                                              <div className="mb-6">
                                                                                                                  <div className="flex justify-between items-center mb-2">
                                                                                                                                        <span className="text-gray-400">Total</span>span>
                                                                                                                                        <span className="text-3xl font-bold text-lime-400">
                                                                                                                                          {formatCurrency(planPrice)}
                                                                                                                                          </span>span>
                                                                                                                    </div>div>
                                                                                                                  <p className="text-xs text-gray-500">
                                                                                                                                        Cobrado uma vez em seu cartão
                                                                                                                    </p>p>
                                                                                                </div>div>
                                                                            
                                                                              {/* Benefícios */}
                                                                                              <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                                                                                                                  <p className="text-sm font-semibold text-gray-300 mb-3">
                                                                                                                                        Você terá acesso a:
                                                                                                                    </p>p>
                                                                                                                  <div className="space-y-2 text-sm">
                                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                                                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                                                                                                                                                                <span>1 mês de treino e dieta personalizada</span>span>
                                                                                                                                          </div>div>
                                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                                                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                                                                                                                                                                <span>
                                                                                                                                                                                          Exercícios com séries, repetições e descanso definidos
                                                                                                                                                                  </span>span>
                                                                                                                                          </div>div>
                                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                                                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                                                                                                                                                                <span>Ajustes automáticos conforme sua evolução</span>span>
                                                                                                                                          </div>div>
                                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                                                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                                                                                                                                                                <span>
                                                                                                                                                                                          Acesso Completo ao App + Acompanhamento Contínuo
                                                                                                                                                                  </span>span>
                                                                                                                                          </div>div>
                                                                                                                    </div>div>
                                                                                                </div>div>
                                                                            </CardContent>CardContent>
                                                            </Card>Card>
                                              </motion.div>motion.div>
                                  </div>div>
                        </div>div>
                </div>div>
          </div>div>
        )
}</></></></div>
