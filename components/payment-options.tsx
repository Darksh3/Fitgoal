"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Crown, ChevronDown, ChevronUp } from "lucide-react"

interface PaymentOptionsProps {
  initialName?: string
  initialEmail?: string
  quizAnswers?: any
}

export default function PaymentOptions({ initialName = "", initialEmail = "", quizAnswers }: PaymentOptionsProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState("trimestral")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
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
      extraDetails: ["Acesso completo ao app", "Atualizações semanais", "Chat com suporte técnico"],
    },
    trimestral: {
      name: "Plano Trimestral",
      priceId: "price_1SPs2cPRgKqdJdqNbiXZYLhI",
      originalPrice: 97.9,
      price: 67.9,
      period: "mês",
      total: 203.7,
      savings: 90.0,
      color: "orange",
      popular: true,
      features: ["Tudo do plano mensal", "Ajustes mensais do plano", "Relatórios de progresso"],
      extraDetails: [
        "Revisão mensal com especialista",
        "Gráficos de evolução detalhados",
        "Ajustes de treino ilimitados",
      ],
    },
    semestral: {
      name: "Plano Semestral",
      priceId: "price_1SPrzGPRgKqdJdqNNLfhAYNo",
      originalPrice: 77.9,
      price: 47.9,
      period: "mês",
      total: 287.4,
      savings: 180.0,
      color: "purple",
      bestValue: true,
      features: ["Tudo dos planos anteriores", "Consultoria nutricional", "Suporte prioritário"],
      extraDetails: ["Consultoria 2x por mês", "Plano alimentar personalizado", "Resposta prioritária em até 2h"],
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
      extraDetails: [
        "Personal trainer dedicado",
        "Videoconferências mensais",
        "Acesso a conteúdo exclusivo",
        "Garantia de satisfação",
      ],
    },
    "anual-teste": {
      name: "Anual Teste",
      priceId: "price_1Pj234567890abcdef",
      originalPrice: 1.0,
      price: 1.0,
      period: "ano",
      total: 1.0,
      savings: 0.0,
      color: "blue",
      features: ["Acesso completo por 1 ano", "Ideal para testes e demonstrações"],
      extraDetails: ["Todas as funcionalidades premium", "Suporte completo"],
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
        quizAnswers: encodeURIComponent(JSON.stringify(quizAnswers)),
      }).toString()
      router.push(`/checkout?${queryParams}`)
    }
  }

  const toggleExpand = (planKey: string) => {
    setExpandedCard(expandedCard === planKey ? null : planKey)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-10">Escolha seu Plano FitGoal</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {Object.entries(plans).map(([key, plan]) => (
          <Card
            key={key}
            className={`bg-white dark:bg-gray-800 border-2 ${
              selectedPlan === key
                ? `border-${plan.color}-500`
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            } transition-all duration-300 flex flex-col ${expandedCard === key ? "row-span-2" : ""}`}
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
              <CardTitle className="text-gray-900 dark:text-white text-center text-xl font-bold mb-2">
                {plan.name}
              </CardTitle>
              {plan.savings > 0 && (
                <p
                  className={`text-center text-xs font-semibold ${plan.color === "yellow" ? "text-yellow-600 dark:text-yellow-400" : `text-${plan.color}-600 dark:text-${plan.color}-400`}`}
                >
                  ECONOMIZE {Math.round((plan.savings / plan.originalPrice) * 100)}%
                </p>
              )}
              <div className="text-center mt-2">
                {plan.originalPrice > plan.price && (
                  <span className="text-gray-500 dark:text-gray-400 line-through text-sm mr-2">
                    {formatCurrency(plan.originalPrice)}/{plan.period}
                  </span>
                )}
                <div>
                  <span
                    className={`text-3xl font-bold ${plan.color === "yellow" ? "text-yellow-600 dark:text-yellow-400" : `text-${plan.color}-600 dark:text-${plan.color}-400`}`}
                  >
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 text-sm">/{plan.period}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-2">
              <div className="space-y-4 mb-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle
                        className={`h-4 w-4 mr-2 flex-shrink-0 mt-0.5 ${plan.color === "yellow" ? "text-yellow-600 dark:text-yellow-500" : `text-${plan.color}-600 dark:text-${plan.color}-500`}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {expandedCard === key && plan.extraDetails && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-2">Detalhes adicionais:</p>
                    <ul className="space-y-2">
                      {plan.extraDetails.map((detail, index) => (
                        <li key={index} className="flex items-start text-gray-600 dark:text-gray-400 text-xs">
                          <CheckCircle
                            className={`h-3 w-3 mr-2 flex-shrink-0 mt-0.5 ${plan.color === "yellow" ? "text-yellow-600/50 dark:text-yellow-500/50" : `text-${plan.color}-600/50 dark:text-${plan.color}-500/50`}`}
                          />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-xs py-2 transition-colors"
                >
                  {expandedCard === key ? (
                    <>
                      Ver menos <ChevronUp className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Ver mais detalhes <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => handleSelectPlan(key)}
                className={`w-full py-2.5 text-base font-bold rounded-full transition-all border-2 ${
                  selectedPlan === key
                    ? `${plan.color === "yellow" ? "bg-yellow-500 border-yellow-400 text-black" : `bg-${plan.color}-500 border-${plan.color}-400 text-white`}`
                    : "bg-gray-100 dark:bg-gray-900/80 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {selectedPlan === key ? "Plano Selecionado" : "Selecionar Plano"}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
