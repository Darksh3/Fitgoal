"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function SuccessOfertaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams.get("paymentId")
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handlePostCheckout = async () => {
      console.log("[v0] SUCCESS-OFERTA - Starting with paymentId:", paymentId)
      
      if (!paymentId) {
        console.warn("[v0] SUCCESS-OFERTA - Missing paymentId")
        setStatus("success")
        return
      }

      try {
        console.log("[v0] SUCCESS-OFERTA - Calling handle-post-checkout with paymentId:", paymentId)
        const response = await fetch("/api/handle-post-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            paymentId: paymentId,
            userId: null // No userId for checkout-oferta
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] SUCCESS-OFERTA - Email sent successfully:", data)
          setStatus("success")
        } else {
          const errorData = await response.json()
          console.error("[v0] SUCCESS-OFERTA - handle-post-checkout error:", response.status, errorData)
          // Still show success to user even if email fails - payment went through
          setStatus("success")
        }
      } catch (error: any) {
        console.error("[v0] SUCCESS-OFERTA - Error:", error)
        // Still show success to user even if email fails - payment went through
        setStatus("success")
      }
    }

    handlePostCheckout()
  }, [paymentId])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4"
      style={{
        background: "radial-gradient(at center, #0f1419 0%, #0a0f1a 70%)"
      }}
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center max-w-md w-full">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Processando Pagamento...</h2>
            <p className="text-white/70">Por favor, aguarde enquanto finalizamos sua assinatura.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="text-lime-400 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Pagamento Confirmado!</h2>

            <div className="space-y-4 text-left mb-6">
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                <p className="text-white/90">
                  <span className="font-semibold">Em instantes</span>, você receberá um e-mail com acesso à sua conta.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Verifique seu e-mail</p>
                    <p className="text-sm text-white/60">Procure pela mensagem de boas-vindas do FitGoal</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Defina sua senha</p>
                    <p className="text-sm text-white/60">Crie uma senha segura para acessar sua conta</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Bem-vindo(a) ao FitGoal!</p>
                    <p className="text-sm text-white/60">Comece sua jornada de transformação corporal</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-white/70">
                Não recebeu o e-mail? Verifique sua pasta de spam ou entre em contato com nosso suporte.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SuccessOfertaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      <SuccessOfertaContent />
    </Suspense>
  )
}
