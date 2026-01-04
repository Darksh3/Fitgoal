"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Crown } from "lucide-react"

interface PaymentOptionsProps {
  initialName?: string
  initialEmail?: string
  quizAnswers?: any // Adicionando prop para quizAnswers
}

export default function PaymentOptions({ initialName = "", initialEmail = "", quizAnswers }: PaymentOptionsProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState("trimestral") // Default to trimestral
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)

  useEffect(() => {
    if (initialName) setName(initialName)
    if (initialEmail) setEmail(initialEmail)
  }, [initialName, initialEmail])

  const plans = {
    mensal: {
      name: "Plano Mensal",
      priceId: "price_1RajatPRgKqdJdqNnb9HQe17",
      originalPrice: 147.9,
      price: 97.9,
      period: "mês",
      total: 97.9,
      savings: 50.0,
      color: "lime",
      features: ["Treino personalizado", "Dieta personalizada", "Suporte via chat"],
    },
    trimestral: {
      name: "Plano Trimestral",
      priceId: "price_1RajgKPRgKqdJdqNPqgehqnX",
      originalPrice: 97.9,
      price: 67.9,
      period: "mês",
      total: 203.7,
      savings: 90.0,
      color: "orange",
      popular: true,
      features: ["Tudo do plano mensal", "Ajustes mensais do plano", "Relatórios de progresso"],
    },
    semestral: {
      name: "Plano Semestral",
      priceId: "price_1RajgKPRgKqdJdqNTnkZb2zD",
      originalPrice: 77.9,
      price: 47.9,
      period: "mês",
      total: 287.4,
      savings: 180.0,
      color: "purple",
      bestValue: true,
      features: ["Tudo dos planos anteriores", "Consultoria nutricional", "Suporte prioritário"],
    },
    anual: {
      name: "Plano Anual",
      priceId: "price_1RajgKPRgKqdJdqNnhxim8dd",
      originalPrice: 67.9,
      price: 29.9,
      period: "mês",
      total: 358.8,
      savings: 456.0,
      color: "yellow",
      premium: true,
      features: ["Tudo dos planos anteriores", "Acompanhamento pessoal", "Acesso vitalício"],
    },
    "anual-teste": {
      name: "Anual Teste",
      priceId: "price_1Pj234567890abcdef", // Substitua pelo Price ID real do Stripe para o plano de teste
      originalPrice: 1.0,
      price: 1.0,
      period: "ano",
      total: 1.0,
      savings: 0.0,
      color: "blue", // Cor para o plano de teste
      features: ["Acesso completo por 1 ano", "Ideal para testes e demonstrações"],
    },
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleSelectPlan = (planKey: string) => {
    setSelectedPlan(planKey)
    const currentPlan = plans[planKey as keyof typeof plans]

    if (currentPlan) {
      const queryParams = new URLSearchParams({
        plan: planKey,
        email: email,
        quizAnswers: encodeURIComponent(JSON.stringify(quizAnswers)), // Passa quizAnswers
      }).toString()
      router.push(`/checkout?${queryParams}`)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center text-white mb-10">Escolha seu Plano FitGoal</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {Object.entries(plans).map(([key, plan]) => (
          <Card
            key={key}
            className={`bg-gray-800 border-2 ${
              selectedPlan === key ? `border-${plan.color}-500` : "border-gray-700 hover:border-gray-600"
            } transition-all duration-200 flex flex-col`}
          >
            <CardHeader className="relative pb-4">
              {plan.popular && (
                <span className="absolute -top-3 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  POPULAR
                </span>
              )}
              {plan.bestValue && (
                <span className="absolute -top-3 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  MELHOR CUSTO
                </span>
              )}
              {plan.premium && (
                <span className="absolute -top-3 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center">
                  <Crown className="h-3 w-3 mr-1" />
                  PREMIUM
                </span>
              )}
              <CardTitle className="text-white text-center text-2xl font-bold mb-2">{plan.name}</CardTitle>
              {plan.savings > 0 && (
                <p
                  className={`text-center text-sm font-semibold ${plan.color === "yellow" ? "text-yellow-400" : `text-${plan.color}-400`}`}
                >
                  ECONOMIZE {Math.round((plan.savings / plan.originalPrice) * 100)}%
                </p>
              )}
              <div className="text-center mt-2">
                {plan.originalPrice > plan.price && (
                  <span className="text-gray-400 line-through text-lg mr-2">
                    {formatCurrency(plan.originalPrice)}/{plan.period}
                  </span>
                )}
                <span
                  className={`text-4xl font-bold ${plan.color === "yellow" ? "text-yellow-400" : `text-${plan.color}-400`}`}
                >
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-gray-300">/{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-300 text-sm">
                    <CheckCircle
                      className={`h-4 w-4 mr-2 flex-shrink-0 ${plan.color === "yellow" ? "text-yellow-500" : `text-${plan.color}-500`}`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSelectPlan(key)}
                className={`w-full py-3 text-lg font-bold rounded-full ${
                  selectedPlan === key
                    ? `bg-${plan.color}-500 hover:bg-${plan.color}-600 text-white`
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                } ${plan.color === "yellow" ? "text-black" : ""}`}
              >
                {selectedPlan === key ? "Plano Selecionado" : "Selecionar Plano"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
