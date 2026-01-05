"use client"
import PaymentOptions from "@/components/payment-options"
import { useSearchParams } from "next/navigation" // Importar useSearchParams

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
      <PaymentOptions initialName={name} initialEmail={email} quizAnswers={quizAnswers} />
    </div>
  )
}
