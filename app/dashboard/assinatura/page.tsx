"use client"
import PaymentOptions from "@/components/payment-options"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface Subscription {
  plan: string
  status: string
  startDate: string
  nextBilling: string
  price: string
  paymentMethod: string
  features: string[]
}

export default function AssinaturaPage() {
  const searchParams = useSearchParams()
  const name = searchParams.get("name") || ""
  const email = searchParams.get("email") || ""
  const quizAnswersParam = searchParams.get("quizAnswers")
  const quizAnswers = quizAnswersParam ? JSON.parse(decodeURIComponent(quizAnswersParam)) : null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl mb-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-400/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
      <PaymentOptions initialName={name} initialEmail={email} quizAnswers={quizAnswers} />
    </div>
  )
}
