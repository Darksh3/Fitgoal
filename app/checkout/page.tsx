"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard, Check, ShoppingCart, User, Lock } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { auth, onAuthStateChanged, db } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { formatCurrency } from "@/utils/currency"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function StripePaymentForm({ formData, currentPlan, userEmail, quizAnswers, clientUid, onError, onSuccess }: any) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !userEmail || !quizAnswers || !clientUid || !currentPlan) {
      onError("Dados essenciais ausentes. Por favor, refaça o quiz.")
      return
    }

    setProcessing(true)

    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          planType: currentPlan.priceId,
          clientUid: clientUid,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao criar intenção de pagamento.")
      }

      const { clientSecret, customerId } = await response.json()
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error("Elemento do cartão não encontrado.")

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: formData.name, email: userEmail, phone: formData.phone },
        },
      })

      if (error) throw new Error(error.message || "Erro ao processar pagamento.")

      if (setupIntent?.status === "succeeded") {
        const subscriptionResponse = await fetch("/api/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            paymentMethodId: setupIntent.payment_method,
            priceId: currentPlan.priceId,
            clientUid,
          }),
        })

        if (!subscriptionResponse.ok) {
          const errorData = await subscriptionResponse.json()
          throw new Error(errorData.error || "Erro ao criar assinatura.")
        }

        onSuccess()
      }
    } catch (err: any) {
      console.error("Erro no pagamento:", err)
      onError(err.message || "Ocorreu um erro inesperado durante o pagamento.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="h-5 w-5 mr-2" /> Dados do Cartão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-700 border border-gray-600 rounded-md">
            <CardElement
              options={{
                style: {
                  base: { fontSize: "16px", color: "#ffffff", "::placeholder": { color: "#9ca3af" } },
                  invalid: { color: "#ef4444" },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={processing || !stripe || !elements || !currentPlan}
        className={`relative w-full py-6 text-xl font-bold rounded-full transition-all duration-300 shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-gray-900 border-4 border-lime-300 hover:border-lime-200 overflow-hidden ${
          processing ? "opacity-75 cursor-not-allowed" : ""
        }`}
        style={{
          background: processing
            ? "linear-gradient(45deg, #84cc16, #65a30d)"
            : "linear-gradient(45deg, #a3e635, #84cc16)",
          boxShadow: "0 8px 32px rgba(163, 230, 53, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
        }}
      >
        {processing ? (
          <div className="flex items-center justify-center relative z-10">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
            Processando...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center relative z-10">
              <Lock className="h-6 w-6 mr-3" />
              <span className="font-black text-xl">Finalizar Compra</span>
              <div className="ml-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">SEGURO</div>
            </div>
          </>
        )}
      </Button>
    </form>
  )
}

// Componente para indicador de progresso
function ProgressIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, title: "Escolher Plano", icon: ShoppingCart },
    { number: 2, title: "Dados Pessoais", icon: User },
    { number: 3, title: "Pagamento", icon: CreditCard },
  ]

  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep >= step.number
          const isCompleted = currentStep > step.number

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive ? "bg-lime-500 text-white" : "bg-gray-600 text-gray-400"
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="mt-1 text-xs text-gray-300 text-center">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 ${isActive ? "bg-lime-500" : "bg-gray-600"}`}></div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", cpf: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<any>(null)
  const [clientUid, setClientUid] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = localStorage.getItem("quizData")
        console.log("[v0] Dados do localStorage:", stored)

        if (stored) {
          const parsed = JSON.parse(stored)
          console.log("[v0] Dados parseados:", parsed)
          setQuizAnswers(parsed)
          setFormData((prev) => ({ ...prev, name: parsed.name || "", email: parsed.email || "" }))
          setUserEmail(parsed.email || null)
        }

        onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log("[v0] Usuário autenticado:", user.uid)
            setClientUid(user.uid)
            if (!stored) {
              try {
                const docRef = doc(db, "users", user.uid)
                const snap = await getDoc(docRef)
                if (snap.exists()) {
                  const data = snap.data()
                  console.log("[v0] Dados do Firebase:", data)
                  setQuizAnswers(data)
                  setFormData((prev) => ({ ...prev, name: data.name || "", email: data.email || "" }))
                  setUserEmail(data.email || null)
                } else {
                  console.log("[v0] Documento não encontrado no Firebase")
                }
              } catch (firebaseError) {
                console.error("[v0] Erro ao buscar dados do Firebase:", firebaseError)
                if (!stored) {
                  setError("Erro ao carregar dados do Firebase. Dados do quiz podem estar incompletos.")
                }
              }
            }

            if (user.uid && (stored || quizAnswers)) {
              console.log("[v0] Iniciando geração de planos em background...")
              try {
                fetch("/api/generate-plans-on-demand", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: user.uid }),
                })
                  .then((response) => {
                    if (response.ok) {
                      console.log("[v0] Planos gerados com sucesso em background")
                    } else {
                      console.error("[v0] Erro ao gerar planos em background")
                    }
                  })
                  .catch((err) => {
                    console.error("[v0] Erro na chamada de geração de planos:", err)
                  })
              } catch (err) {
                console.error("[v0] Erro ao iniciar geração de planos:", err)
              }
            }
          } else {
            console.log("[v0] Usuário não autenticado")
            if (!stored) {
              setError("Usuário não autenticado e dados não encontrados. Refaça o quiz.")
            }
          }
          setLoading(false)
        })
      } catch (err) {
        console.error("[v0] Erro geral:", err)
        setError("Erro ao carregar dados. Por favor, refaça o quiz.")
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const plans = {
    mensal: {
      name: "Plano Mensal",
      priceId: "price_1RajatPRgKqdJdqNnb9HQe17",
      price: 79.9,
      total: 79.9,
      color: "lime",
      duration: "1 mês",
      description: "Para experimentar, sem compromisso.",
    },
    trimestral: {
      name: "Plano Trimestral",
      priceId: "price_1SPs2cPRgKqdJdqNbiXZYLhI",
      price: 65.67,
      total: 197,
      color: "orange",
      duration: "3 meses",
      description: "Melhor custo-benefício. Perfeito para ver resultados reais.",
      recommended: true,
    },
    semestral: {
      name: "Plano Semestral",
      priceId: "price_1SPrzGPRgKqdJdqNNLfhAYNo",
      price: 49.5,
      total: 297,
      color: "purple",
      duration: "6 meses",
      description: "Para quem quer mudar o corpo de verdade e economizar.",
    },
  }

  const currentPlan = selectedPlan ? plans[selectedPlan as keyof typeof plans] : null

  // Determinar o passo atual
  const getCurrentStep = () => {
    if (!selectedPlan) return 1
    if (!formData.phone || !formData.cpf) return 2
    return 3
  }

  const handlePaymentSuccess = () => router.push("/success?embedded=true")
  const handlePaymentError = (msg: string) => setError(msg)

  if (loading) return <div className="flex justify-center items-center min-h-screen text-white">Carregando...</div>
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Escolha seu Plano</h1>

        {/* Indicador de Progresso */}
        <ProgressIndicator currentStep={getCurrentStep()} />

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(plans).map(([key, plan]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all duration-200 relative ${
                selectedPlan === key
                  ? "bg-gray-700 border-2 border-lime-500 ring-2 ring-lime-500/20 transform scale-105"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  RECOMENDADO
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                  {selectedPlan === key && <Check className="h-5 w-5 text-lime-500" />}
                </div>
                <p className="text-gray-400 text-sm">{plan.duration}</p>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-2">
                  <span className="text-2xl font-bold text-white">{formatCurrency(plan.price)}</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <div className="mb-4">
                  <span className="text-lg font-semibold text-white">Total: {formatCurrency(plan.total)}</span>
                </div>
                <p className="text-sm text-gray-400 italic">{plan.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview do Total */}
        {selectedPlan ? (
          <div className="text-center mb-8 p-6 bg-gray-800 rounded-lg border border-lime-500">
            <div className="flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-lime-500 mr-2" />
              <p className="text-lime-400 font-semibold">Plano Selecionado: {currentPlan?.name}</p>
            </div>
            <div className="text-3xl font-bold text-white mb-2">Total: {formatCurrency(currentPlan?.total || 0)}</div>
            <p className="text-gray-300">Continue preenchendo os dados abaixo</p>
          </div>
        ) : (
          <div className="text-center mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">Selecione um plano acima para continuar</p>
            <Button disabled className="w-full max-w-md py-4 text-lg bg-gray-600 text-gray-400 cursor-not-allowed">
              Escolha um plano para prosseguir
            </Button>
          </div>
        )}

        {/* Formulário - aparece apenas quando plano está selecionado */}
        {selectedPlan && (
          <>
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                    <Input value={formData.name} readOnly className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <Input value={formData.email} readOnly className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Telefone *</label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CPF *</label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "")
                        if (value.length <= 11) {
                          value = value.replace(/(\d{3})(\d)/, "$1.$2")
                          value = value.replace(/(\d{3})(\d)/, "$1.$2")
                          value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                        }
                        setFormData((prev) => ({ ...prev, cpf: value }))
                      }}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Componente de Pagamento */}
            {formData.phone && formData.cpf && (
              <Elements stripe={stripePromise}>
                <StripePaymentForm
                  formData={formData}
                  currentPlan={currentPlan}
                  userEmail={userEmail}
                  quizAnswers={quizAnswers}
                  clientUid={clientUid}
                  onError={handlePaymentError}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}

            {/* Mensagem para completar dados */}
            {(!formData.phone || !formData.cpf) && (
              <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 mb-4">Complete seus dados pessoais para prosseguir com o pagamento</p>
                <div className="text-sm text-gray-400">Campos obrigatórios: Telefone e CPF</div>
              </div>
            )}
          </>
        )}

        {/* Garantias de Segurança */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-gray-400 text-sm">
            <div className="flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Pagamento Seguro
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              SSL Certificado
            </div>
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />
              Stripe Protegido
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
