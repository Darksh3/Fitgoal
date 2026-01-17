"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams.get("paymentId")
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Redirecionar para dashboard após 5 segundos
    const timer = setTimeout(() => {
      setIsRedirecting(true)
      router.push("/dashboard")
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Pagamento Confirmado!</h1>
            <p className="text-gray-400">Sua compra foi processada com sucesso</p>
          </div>

          {paymentId && (
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">ID do Pagamento:</p>
              <p className="text-sm text-gray-200 font-mono break-all">{paymentId}</p>
            </div>
          )}

          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-300">
              Um email com suas credenciais de acesso foi enviado para seu endereço de email.
            </p>
            <p className="text-xs text-gray-400">Verifique sua caixa de entrada e pasta de spam.</p>
          </div>

          <div className="space-y-3 pt-4">
            <div className="text-sm text-gray-300 space-y-1">
              <p className="font-semibold">Próximos passos:</p>
              <ul className="text-left space-y-1 text-gray-400">
                <li>• Verifique o email com suas credenciais</li>
                <li>• Faça login na plataforma</li>
                <li>• Acesse sua dieta e plano de treino personalizados</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/login"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Ir para Login
            </Link>
            <Link
              href="/"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>

          {isRedirecting ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm pt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecionando...
            </div>
          ) : (
            <p className="text-xs text-gray-500">Redirecionando em 5 segundos...</p>
          )}
        </div>
      </div>
    </div>
  )
}
