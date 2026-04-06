"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
    Elements,
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react"

// Carrega o Stripe uma única vez fora do componente
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const ELEMENT_OPTIONS = {
    style: {
          base: {
                  fontSize: "16px",
                  color: "#ffffff",
                  fontFamily: "Arial, sans-serif",
                  "::placeholder": {
                            color: "#6b7280",
                  },
          },
          invalid: {
                  color: "#ef4444",
          },
    },
}

interface StripeCardFormInnerProps {
    clientSecret: string
    paymentIntentId: string
    onSuccess: (paymentIntentId: string) => void
    onError: (message: string) => void
    isLoading: boolean
    setIsLoading: (v: boolean) => void
    amount: number
}

function StripeCardFormInner({
    clientSecret,
    paymentIntentId,
    onSuccess,
    onError,
    isLoading,
    setIsLoading,
    amount,
}: StripeCardFormInnerProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!stripe || !elements) return

      setIsLoading(true)
        setErrorMsg(null)

      const cardNumber = elements.getElement(CardNumberElement)
        if (!cardNumber) {
                setIsLoading(false)
                return
        }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
              payment_method: {
                        card: cardNumber,
              },
      })

      setIsLoading(false)

      if (error) {
              const msg =
                        error.code === "card_declined"
                  ? "Cartão recusado. Verifique os dados ou tente outro cartão."
                          : error.code === "insufficient_funds"
                  ? "Saldo insuficiente no cartão."
                          : error.code === "incorrect_cvc"
                  ? "Código de segurança (CVV) incorreto."
                          : error.message || "Erro ao processar o cartão."
              setErrorMsg(msg)
              onError(msg)
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
              onSuccess(paymentIntent.id)
      }
  }

  return (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número do cartão */}
              <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                                Número do Cartão
                      </label>
                      <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus-within:border-lime-400 transition-colors">
                                <CardNumberElement options={ELEMENT_OPTIONS} />
                      </div>
              </div>
        
          {/* Validade + CVV */}
              <div className="grid grid-cols-2 gap-3">
                      <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Validade
                                </label>
                                <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus-within:border-lime-400 transition-colors">
                                            <CardExpiryElement options={ELEMENT_OPTIONS} />
                                </div>
                      </div>
                      <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                            CVV
                                </label>
                                <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus-within:border-lime-400 transition-colors">
                                            <CardCvcElement options={ELEMENT_OPTIONS} />
                                </div>
                      </div>
              </div>
        
          {/* Mensagem de erro */}
          {errorMsg && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                  </div>
              )}
        
          {/* Selo de segurança */}
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Lock className="w-3 h-3" />
                      <span>Pagamento processado com segurança pelo Stripe. Seus dados não são armazenados.</span>
              </div>
        
              <Button
                        type="submit"
                        disabled={isLoading || !stripe}
                        className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold py-4 text-lg rounded-xl"
                      >
                {isLoading ? (
                                  <>
                                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                              Processando...
                                  </>
                                ) : (
                                  <>
                                              <Lock className="w-5 h-5 mr-2" />
                                              Pagar R$ {Number(amount).toFixed(2).replace(".", ",")}
                                  </>
                                )}
              </Button>
        </form>
      )
}

interface StripeCardFormProps {
    clientSecret: string
    paymentIntentId: string
    onSuccess: (paymentIntentId: string) => void
    onError: (message: string) => void
    amount: number
}

export function StripeCardForm({
    clientSecret,
    paymentIntentId,
    onSuccess,
    onError,
    amount,
}: StripeCardFormProps) {
    const [isLoading, setIsLoading] = useState(false)
      
        return (
              <Elements
                      stripe={stripePromise}
                      options={{
                                clientSecret,
                                appearance: {
                                            theme: "night",
                                            variables: {
                                                          colorPrimary: "#a3e635",
                                                          colorBackground: "#1f2937",
                                                          colorText: "#ffffff",
                                                          borderRadius: "8px",
                                            },
                                },
                      }}
                    >
                    <StripeCardFormInner
                              clientSecret={clientSecret}
                              paymentIntentId={paymentIntentId}
                              onSuccess={onSuccess}
                              onError={onError}
                              isLoading={isLoading}
                              setIsLoading={setIsLoading}
                              amount={amount}
                    />
              </Elements>
        )
}
