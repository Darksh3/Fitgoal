"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"

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
      name: "Mensal",
      description: "Para experimentar, sem compromisso.",
      priceId: "price_1RajatPRgKqdJdqNnb9HQe17",
      originalPrice: 147.0,
      price: 79.9,
      period: "mês",
      total: 79.9,
      savings: 46,
      color: "lime",
      features: ["Treino 100% personalizado", "Dieta adaptada ao seu biotipo", "Suporte via chat"],
      extraDetails: [
        "Acesso completo ao app",
        "Atualizações semanais de treino",
        "Chat de suporte em horário comercial",
      ],
    },
    trimestral: {
      name: "Trimestral",
      description: "Melhor custo-benefício. Perfeito para ver resultados reais.",
      priceId: "price_1SPs2cPRgKqdJdqNbiXZYLhI",
      originalPrice: 249.8,
      price: 194.7,
      pricePerMonth: 64.9,
      period: "3 meses",
      total: 194.7,
      savings: 19,
      color: "orange",
      popular: true,
      features: [
        "Tudo do plano mensal",
        "Ajustes mensais personalizados",
        "Acompanhamento de progresso",
        "Relatórios detalhados",
      ],
      extraDetails: [
        "Revisão completa a cada 30 dias",
        "Gráficos de evolução detalhados",
        "Ajustes de treino e dieta ilimitados",
        "Prioridade no suporte",
      ],
    },
    semestral: {
      name: "Semestral",
      description: "Para quem quer mudar o corpo de verdade e economizar.",
      priceId: "price_1SPrzGPRgKqdJdqNNLfhAYNo",
      originalPrice: 479.4,
      price: 299.4,
      pricePerMonth: 49.9,
      period: "6 meses",
      total: 299.4,
      savings: 38,
      color: "purple",
      bestValue: true,
      features: [
        "Tudo dos planos anteriores",
        "Consultoria nutricional completa",
        "Suporte prioritário 24/7",
        "Planos de treino avançados",
      ],
      extraDetails: [
        "Consultoria nutricional 2x por mês",
        "Plano alimentar detalhado e personalizado",
        "Resposta prioritária em até 2h",
        "Acesso a treinos exclusivos e avançados",
      ],
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                  RECOMENDADO
                </span>
              )}
              {plan.bestValue && (
                <span className="absolute -top-3 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  MELHOR VALOR
                </span>
              )}
              <CardTitle className="text-gray-900 dark:text-white text-center text-2xl font-bold mb-2">
                {plan.name}
              </CardTitle>
              <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-3 min-h-[40px]">
                {plan.description}
              </p>
              {plan.savings > 0 && (
                <p
                  className={`text-center text-xs font-semibold ${plan.color === "lime" ? "text-lime-600 dark:text-lime-400" : plan.color === "orange" ? "text-orange-600 dark:text-orange-400" : "text-purple-600 dark:text-purple-400"}`}
                >
                  ECONOMIZE {plan.savings}%
                </p>
              )}
              <div className="text-center mt-2">
                {plan.originalPrice > plan.price && (
                  <span className="text-gray-500 dark:text-gray-400 line-through text-sm mr-2">
                    {formatCurrency(plan.originalPrice)}
                  </span>
                )}
                <div>
                  <span
                    className={`text-3xl font-bold ${plan.color === "lime" ? "text-lime-600 dark:text-lime-400" : plan.color === "orange" ? "text-orange-600 dark:text-orange-400" : "text-purple-600 dark:text-purple-400"}`}
                  >
                    {formatCurrency(plan.price)}
                  </span>
                </div>
                {plan.pricePerMonth && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    R$ {plan.pricePerMonth.toFixed(2).replace(".", ",")}/mês
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-2">
              <div className="space-y-4 mb-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle
                        className={`h-4 w-4 mr-2 flex-shrink-0 mt-0.5 ${plan.color === "lime" ? "text-lime-600 dark:text-lime-500" : plan.color === "orange" ? "text-orange-600 dark:text-orange-500" : "text-purple-600 dark:text-purple-500"}`}
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
                            className={`h-3 w-3 mr-2 flex-shrink-0 mt-0.5 ${plan.color === "lime" ? "text-lime-600/50 dark:text-lime-500/50" : plan.color === "orange" ? "text-orange-600/50 dark:text-orange-500/50" : "text-purple-600/50 dark:text-purple-500/50"}`}
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
                    ? `${plan.color === "lime" ? "bg-lime-500 border-lime-400" : plan.color === "orange" ? "bg-orange-500 border-orange-400" : "bg-purple-500 border-purple-400"} text-white`
                    : "bg-gray-100 dark:bg-gray-900/80 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {selectedPlan === key ? "Plano Selecionado" : "Escolher Plano"}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
