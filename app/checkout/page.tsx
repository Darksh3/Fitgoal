"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard, Check } from "lucide-react"
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
        className={`w-full py-6 text-xl font-bold rounded-full ${
          currentPlan?.color === "yellow"
            ? "bg-yellow-500"
            : currentPlan?.color === "orange"
              ? "bg-orange-500"
              : currentPlan?.color === "purple"
                ? "bg-purple-500"
                : "bg-lime-500"
        }`}
      >
        {processing ? "Processando..." : `Finalizar Compra - ${formatCurrency(currentPlan.total)}`}
      </Button>
    </form>
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
      originalPrice: 147.9,
      price: 97.9,
      total: 97.9,
      savings: 50.0,
      color: "lime",
      duration: "1 mês",
    },
    trimestral: {
      name: "Plano Trimestral",
      priceId: "price_1RajgKPRgKqdJdqNPqgehqnX",
      originalPrice: 97.9,
      price: 67.9,
      total: 203.7,
      savings: 90.0,
      color: "orange",
      duration: "3 meses",
    },
    semestral: {
      name: "Plano Semestral",
      priceId: "price_1RajgKPRgKqdJdqNTnkZb2zD",
      originalPrice: 77.9,
      price: 47.9,
      total: 287.4,
      savings: 180.0,
      color: "purple",
      duration: "6 meses",
    },
    anual: {
      name: "Plano Anual",
      priceId: "price_1RajgKPRgKqdJdqNnhxim8dd",
      originalPrice: 67.9,
      price: 29.9,
      total: 358.8,
      savings: 456.0,
      color: "yellow",
      duration: "12 meses",
    },
  }

  const currentPlan = selectedPlan ? plans[selectedPlan as keyof typeof plans] : null

  const handlePaymentSuccess = () => router.push("/success?embedded=true")
  const handlePaymentError = (msg: string) => setError(msg)

  if (loading) return <div className="flex justify-center items-center min-h-screen text-white">Carregando...</div>
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Escolha seu Plano</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(plans).map(([key, plan]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all duration-200 ${
                selectedPlan === key
                  ? "bg-gray-700 border-2 border-lime-500 ring-2 ring-lime-500/20"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750"
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              <CardHeader className="text-center pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                  {selectedPlan === key && <Check className="h-5 w-5 text-lime-500" />}
                </div>
                <p className="text-gray-400 text-sm">{plan.duration}</p>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-2">
                  <span className="text-gray-400 line-through text-sm">{formatCurrency(plan.originalPrice)}</span>
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold text-white">{formatCurrency(plan.price)}</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <div className="mb-4">
                  <span className="text-lg font-semibold text-white">Total: {formatCurrency(plan.total)}</span>
                </div>
                <div className="text-sm text-lime-500">Economize {formatCurrency(plan.savings)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPlan && (
          <>
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={formData.name} readOnly className="bg-gray-700 border-gray-600 text-white" />
                <Input value={formData.email} readOnly className="bg-gray-700 border-gray-600 text-white" />
                <Input
                  placeholder="Telefone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Input
                  placeholder="CPF"
                  value={formData.cpf}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cpf: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </CardContent>
            </Card>

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
          </>
        )}

        {!selectedPlan && (
          <div className="text-center text-gray-400 mt-8">
            <p>Selecione um plano acima para continuar com o pagamento</p>
          </div>
        )}
      </div>
    </div>
  )
}
