"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, ArrowRight, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuccessAsaasPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams.get("paymentId")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (!paymentId) {
      setStatus("error")
      setErrorMessage("ID de pagamento não encontrado")
      return
    }

    // Sucesso imediato para Asaas (já foi processado pelo webhook)
    console.log("[v0] ASAAS_SUCCESS - Pagamento confirmado:", paymentId)
    setStatus("success")
  }, [paymentId])

  // Countdown para redirect automático
  useEffect(() => {
    if (status !== "success") return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push("/dashboard")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-red-400">Erro ao Processar</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-6">{errorMessage}</p>
            <Button
              onClick={() => router.push("/checkout")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-400">Pagamento Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-300 mb-2">Seu plano foi ativado com sucesso.</p>
            <p className="text-sm text-gray-400">Você será redirecionado em {countdown} segundos...</p>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-2">ID do Pagamento</p>
            <p className="text-sm font-mono text-gray-200 break-all">{paymentId}</p>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
          >
            Ir para Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
