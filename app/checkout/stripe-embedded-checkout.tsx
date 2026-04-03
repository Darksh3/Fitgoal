"use client"

/**
   * StripeEmbeddedCheckout
   *
   * Componente de checkout embutido para pagamento com cartão via Stripe.
   * Uso: importe este componente na sua checkout page e renderize quando
   *      paymentMethod === "credit_card"
   *
   * Fluxo:
   * 1. Usuário preenche apenas email e nome (sem CPF, CEP, endereço)
   * 2. Ao confirmar, chama /api/create-stripe-payment-intent
   * 3. Exibe o StripeCardForm com os campos do cartão via Stripe Elements
   * 4. Ao confirmar o pagamento, redireciona para /success
   *
   * Integração no checkout/page.tsx:
   * ─────────────────────────────────
   * import { StripeEmbeddedCheckout } from "./stripe-embedded-checkout"
   *
   * // No lugar do formulário de cartão antigo (Asaas):
   * {paymentMethod === "credit_card" && (
   *   <StripeEmbeddedCheckout
   *     amount={totalAmount}
   *     planType={selectedPlan}
   *     clientUid={clientUid}
   *     customerEmail={formData.email}
   *     customerName={formData.name}
   *     orderBumps={orderBumps}
   *     onSuccess={(paymentIntentId) => router.push(`/success?payment_intent=${paymentIntentId}`)}
   *   />
   * )}
   */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StripeCardForm } from "@/components/stripe-card-form"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"

interface StripeEmbeddedCheckoutProps {
    amount: number
    planType: string
    clientUid: string
    customerEmail: string
    customerName: string
    orderBumps?: { ebook?: boolean; protocolo?: boolean }
    onSuccess?: (paymentIntentId: string) => void
    description?: string
}

export function StripeEmbeddedCheckout({
    amount,
    planType,
    clientUid,
    customerEmail,
    customerName,
    orderBumps,
    onSuccess,
    description,
}: StripeEmbeddedCheckoutProps) {
    const router = useRouter()
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Passo 1: Criar o PaymentIntent e obter o clientSecret
  async function initializePayment() {
        setIsCreating(true)
        setError(null)

      try {
              const res = await fetch("/api/create-stripe-payment-intent", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                                    amount,
                                    planType,
                                    clientUid,
                                    customerEmail,
                                    customerName,
                                    orderBumps: orderBumps || {},
                                    description: description || `Plano ${planType} - Fitgoal`,
                        }),
              })

          const data = await res.json()

          if (!res.ok || data.error) {
                    setError(data.error || "Erro ao inicializar pagamento")
                    return
          }

          setClientSecret(data.clientSecret)
              setPaymentIntentId(data.paymentIntentId)
      } catch (err: any) {
              setError("Erro de conexão. Tente novamente.")
      } finally {
              setIsCreating(false)
      }
  }

  // Passo 2: Pagamento confirmado pelo Stripe
  function handlePaymentSuccess(intentId: string) {
        setPaymentSuccess(true)
        if (onSuccess) {
                onSuccess(intentId)
        } else {
                router.push(`/success?payment_intent=${intentId}&gateway=stripe`)
        }
  }

  function handlePaymentError(msg: string) {
        setError(msg)
  }

  // Estado: pagamento bem-sucedido
  if (paymentSuccess) {
        return (
                <div className="text-center py-8">
                        <div className="w-16 h-16 bg-lime-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>svg>
                        </div>div>
                        <h3 className="text-xl font-bold text-white mb-2">Pagamento Confirmado!</h3>h3>
                        <p className="text-gray-400">Redirecionando...</p>p>
                </div>div>
              )
  }
  
    // Estado: formulário do cartão pronto
    if (clientSecret && paymentIntentId) {
          return (
                  <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                                    <CreditCard className="w-5 h-5 text-lime-400" />
                                    <span className="text-white font-medium">Dados do Cartão</span>span>
                          </div>div>
                  
                    {error && (
                              <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
                                {error}
                              </div>div>
                          )}
                  
                          <StripeCardForm
                                      clientSecret={clientSecret}
                                      paymentIntentId={paymentIntentId}
                                      amount={amount}
                                      onSuccess={handlePaymentSuccess}
                                      onError={handlePaymentError}
                                    />
                  </div>div>
                )
    }
  
    // Estado inicial: botão para inicializar o pagamento
    return (
          <div className="space-y-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                                  <CreditCard className="w-5 h-5 text-lime-400" />
                                  <span className="text-white font-medium">Cartão de Crédito</span>span>
                        </div>div>
                        <p className="text-gray-400 text-sm">
                                  Pagamento seguro via Stripe. Apenas número do cartão, validade e CVV.
                        </p>p>
                </div>div>
          
            {error && (
                    <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
                      {error}
                    </div>div>
                )}
          
                <Button
                          onClick={initializePayment}
                          disabled={isCreating}
                          className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold py-4 text-lg rounded-xl"
                        >
                  {isCreating ? (
                                    <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Preparando pagamento...
                                    </>>
                                  ) : (
                                    <>
                                                <CreditCard className="w-5 h-5 mr-2" />
                                                Continuar para pagamento — R$ {Number(amount).toFixed(2).replace(".", ",")}
                                    </>>
                                  )}
                </Button>Button>
          </div>div>
        )
}</></></div>
