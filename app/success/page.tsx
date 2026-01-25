"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const subscriptionId = searchParams.get("subscription_id")
  const embedded = searchParams.get("embedded") // New parameter to indicate embedded checkout

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5)

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

  // Timer para redirecionamento automático
  useEffect(() => {
    if (status !== "success") return

    if (secondsRemaining === 0) {
      window.location.href = "/dashboard"
      return
    }

    const timer = setTimeout(() => {
      setSecondsRemaining(secondsRemaining - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [status, secondsRemaining])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gray-900 dark:border-gray-100 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Processando Pagamento...</h2>
            <p className="text-gray-600 dark:text-gray-400">Por favor, aguarde enquanto finalizamos sua assinatura.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Pagamento Confirmado!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Obrigado por sua compra</p>
            <p className="text-gray-700 dark:text-gray-300 font-semibold mb-4">
              Seu plano foi ativado com sucesso!
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Você receberá um email com todos os detalhes e seus dados de acesso em instantes.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-6">
              Redirecionando para seu dashboard em {secondsRemaining}s...
            </p>
            <Link href="/dashboard" passHref>
              <Button className="w-full">Bem-vindo à FitGoal! 🚀</Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="text-red-500 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Erro no Processamento!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
