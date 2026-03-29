"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackPurchase } from "@/lib/pixels"

export default function SuccessPage() {
      const searchParams = useSearchParams()
      const sessionId = searchParams.get("session_id")
      const subscriptionId = searchParams.get("subscription_id")
      const embedded = searchParams.get("embedded")
      const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
      const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Helper: dispara Purchase no Meta + TikTok usando função centralizada de pixels.ts
  // FIX: usa trackPurchase que garante content_id obrigatório em todos os eventos TikTok
  const firePurchasePixels = (value: number, planName: string, eventId?: string, userId?: string) => {
          trackPurchase({
                    value,
                    currency: "BRL",
                    content_name: planName,
                    content_ids: ["fitgoal_plano"],
                    content_type: "product",
                    num_items: 1,
                    eventId,
                    userId,
          })
  }

  useEffect(() => {
          const handlePostCheckout = async () => {
                    // For embedded checkout (ASAAS payments)
                    if (embedded === "true") {
                                console.log("[v0] Embedded checkout success - calling handle-post-checkout to send email")
                                const paymentId = searchParams.get("paymentId")
                                const userId = searchParams.get("userId")
                                console.log("[v0] URL params - paymentId:", paymentId, "userId:", userId)

                      if (!paymentId || !userId) {
                                    console.warn("[v0] Missing paymentId or userId for embedded checkout", { paymentId, userId })
                                    setStatus("success")
                                    firePurchasePixels(59.90, "Plano FitGoal")
                                    return
                      }

                      try {
                                    console.log("[v0] Calling API /api/handle-post-checkout with paymentId:", paymentId, "userId:", userId)
                                    const response = await fetch("/api/handle-post-checkout", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ paymentId, userId }),
                                    })

                                  if (response.ok) {
                                                  const data = await response.json()
                                                  console.log("[v0] Embedded checkout - handle-post-checkout success:", data)
                                                  setStatus("success")
                                                  firePurchasePixels(
                                                                    data.planPrice || 59.90,
                                                                    data.planName || "Plano FitGoal",
                                                                    `purchase_${data.userUid}`,
                                                                    data.userUid,
                                                                  )
                                  } else {
                                                  const errorData = await response.json()
                                                  console.error("[v0] Embedded checkout - handle-post-checkout error:", response.status, errorData)
                                                  // Mostra sucesso pois o pagamento foi processado
                                      setStatus("success")
                                                  firePurchasePixels(59.90, "Plano FitGoal", `purchase_${userId}`, userId)
                                  }
                      } catch (error: any) {
                                    console.error("[v0] Embedded checkout - Error calling handle-post-checkout:", error)
                                    setStatus("success")
                                    firePurchasePixels(59.90, "Plano FitGoal")
                      }
                                return
                    }

                    if (!sessionId) {
                                setStatus("error")
                                setErrorMessage("ID da sessão não encontrado na URL.")
                                return
                    }

                    try {
                                console.log("[v0] Calling API /api/handle-post-checkout with sessionId:", sessionId)
                                const response = await fetch("/api/handle-post-checkout", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ sessionId }),
                                })

                      if (response.ok) {
                                    const data = await response.json()
                                    console.log("[v0] API handle-post-checkout success:", data)
                                    setStatus("success")
                                    firePurchasePixels(
                                                    data.planPrice || 59.90,
                                                    data.planName || "Plano FitGoal",
                                                    `purchase_${data.userUid}`,
                                                    data.userUid,
                                                  )
                      } else {
                                    const errorData = await response.json()
                                    console.error("[v0] API handle-post-checkout error:", response.status, errorData)
                                    setStatus("error")
                                    setErrorMessage(errorData.error || "Erro desconhecido ao processar o checkout.")
                      }
                    } catch (error: any) {
                                console.error("[v0] Error calling API handle-post-checkout:", error)
                                setStatus("error")
                                setErrorMessage("Erro de rede ou servidor ao finalizar sua assinatura.")
                    }
          }

                handlePostCheckout()
  }, [sessionId, embedded, searchParams])

  return (
          <div
                    className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4"
                    style={{ background: "radial-gradient(at center, #0f1419 0%, #0a0f1a 70%)" }}
                  >
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center max-w-md w-full">
                    {status === "loading" && (
                                <>
                                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-6" />
                                            <h2 className="text-2xl font-bold text-white mb-2">Processando Pagamento...</h2>h2>
                                            <p className="text-white/70">Por favor, aguarde enquanto finalizamos sua assinatura.</p>p>
                                </>>
                              )}
                
                    {status === "success" && (
                                <>
                                            <CheckCircle className="text-lime-400 w-16 h-16 mx-auto mb-6" />
                                            <h2 className="text-2xl font-bold text-white mb-4">Pagamento Confirmado!</h2>h2>
                                            <div className="space-y-4 text-left mb-6">
                                                          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                                                          <p className="text-white/90">
                                                                                            <span className="font-semibold">Em instantes</span>span>, você receberá um e-mail com acesso à sua conta.
                                                                          </p>p>
                                                          </div>div>
                                                          <div className="space-y-3">
                                                                          <div className="flex items-start gap-3">
                                                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                                                                                                                1
                                                                                                </div>div>
                                                                                            <div>
                                                                                                                <p className="font-semibold text-white">Verifique seu e-mail</p>p>
                                                                                                                <p className="text-sm text-white/60">Procure pela mensagem de boas-vindas do FitGoal</p>p>
                                                                                                </div>div>
                                                                          </div>div>
                                                                          <div className="flex items-start gap-3">
                                                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                                                                                                                2
                                                                                                </div>div>
                                                                                            <div>
                                                                                                                <p className="font-semibold text-white">Defina sua senha</p>p>
                                                                                                                <p className="text-sm text-white/60">Crie uma senha segura para acessar sua conta</p>p>
                                                                                                </div>div>
                                                                          </div>div>
                                                                          <div className="flex items-start gap-3">
                                                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                                                                                                                3
                                                                                                </div>div>
                                                                                            <div>
                                                                                                                <p className="font-semibold text-white">Bem-vindo(a) ao FitGoal!</p>p>
                                                                                                                <p className="text-sm text-white/60">Comece sua jornada de transformação corporal</p>p>
                                                                                                </div>div>
                                                                          </div>div>
                                                          </div>div>
                                            </div>div>
                                            <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-6">
                                                          <p className="text-sm text-white/70">
                                                                          Não recebeu o e-mail? Verifique sua pasta de spam ou entre em contato com nosso suporte.
                                                          </p>p>
                                            </div>div>
                                </>>
                              )}
                
                    {status === "error" && (
                                <>
                                            <XCircle className="text-red-500 w-16 h-16 mx-auto mb-6" />
                                            <h2 className="text-2xl font-bold text-white mb-2">Erro no Processamento!</h2>h2>
                                            <p className="text-white/70 mb-6">
                                                          Ocorreu um erro ao finalizar sua assinatura: {errorMessage}
                                            </p>p>
                                            <Button
                                                              onClick={() => window.location.reload()}
                                                              className="w-full bg-white text-black hover:bg-white/90"
                                                            >
                                                          Tentar Novamente
                                            </Button>Button>
                                </>>
                              )}
                </div>div>
          </div>div>
        )
}</></></></div>
