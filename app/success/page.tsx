"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const subscriptionId = searchParams.get("subscription_id")
  const embedded = searchParams.get("embedded") // New parameter to indicate embedded checkout

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handlePostCheckout = async () => {
      if (embedded === "true") {
        // For embedded checkout, subscription is already created and processed
        console.log("Embedded checkout success - subscription already processed")
        setStatus("success")
        return
      }

      if (!sessionId) {
        setStatus("error")
        setErrorMessage("ID da sessão não encontrado na URL.")
        return
      }

      try {
        console.log("Chamando API /api/handle-post-checkout com sessionId:", sessionId)
        const response = await fetch("/api/handle-post-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("API handle-post-checkout respondeu com sucesso:", data)
          setStatus("success")
        } else {
          const errorData = await response.json()
          console.error("API handle-post-checkout respondeu com erro:", response.status, errorData)
          setStatus("error")
          setErrorMessage(errorData.error || "Erro desconhecido ao processar o checkout.")
        }
      } catch (error: any) {
        console.error("Erro ao chamar API /api/handle-post-checkout:", error)
        setStatus("error")
        setErrorMessage("Erro de rede ou servidor ao finalizar sua assinatura.")
      }
    }

    handlePostCheckout()
  }, [sessionId, embedded])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-white p-4 relative overflow-hidden bg-[#0a0f1a]"
      style={{
        background: "radial-gradient(at center, #0f1419 0%, #0a0f1a 70%)",
      }}
    >
      {/* Glow blobs (igual ao quiz) */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "380px",
          height: "380px",
          background: "#1c3dff55",
          filter: "blur(150px)",
          borderRadius: "50%",
          top: "20%",
          right: "-10%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: "300px",
          height: "300px",
          background: "#7f3dff33",
          filter: "blur(140px)",
          borderRadius: "50%",
          bottom: "10%",
          left: "15%",
        }}
      />

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center max-w-md w-full relative z-10">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/80 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Processando Pagamento...</h2>
            <p className="text-white/60">Por favor, aguarde enquanto finalizamos sua assinatura.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="text-green-400 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Pagamento Confirmado!</h2>

            <div className="space-y-4 text-left mb-6">
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-400/20">
                <p className="text-white/80">
                  <span className="font-semibold text-white">Em instantes</span>, você receberá um e-mail com acesso à sua conta.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-black text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Verifique seu e-mail</p>
                    <p className="text-sm text-white/60">Procure pela mensagem de boas-vindas do FitGoal</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-black text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Defina sua senha</p>
                    <p className="text-sm text-white/60">Crie uma senha segura para acessar sua conta</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center text-black text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Bem-vindo(a) ao FitGoal!</p>
                    <p className="text-sm text-white/60">Comece sua jornada de transformação corporal</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-lime-500/10 p-4 rounded-lg border border-lime-400/20 mb-6">
              <p className="text-sm text-white/75">
                Não recebeu o e-mail? Verifique sua pasta de spam ou entre em contato com nosso suporte.
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="text-red-400 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Erro no Processamento!</h2>
            <p className="text-white/70 mb-6">
              Ocorreu um erro ao finalizar sua assinatura: {errorMessage}
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
