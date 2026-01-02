"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Clock, Flame, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PricingSectionProps {
  gender: string
  discount: number
}

const plans = [
  {
    id: "trial",
    name: "PLANO SEMANAL (TESTE)",
    originalPrice: 29.9, // updated base price for trial
    period: "por dia",
    tag: null,
    key: "mensal",
  },
  {
    id: "monthly",
    name: "PLANO MENSAL",
    originalPrice: 129.9, // updated base price for monthly
    period: "por dia",
    tag: "MAIS POPULAR",
    off: "62% OFF",
    key: "mensal",
  },
  {
    id: "quarterly",
    name: "PLANO TRIMESTRAL",
    originalPrice: 249.9, // updated base price for quarterly
    period: "por dia (méd.)",
    tag: "MELHOR VALOR",
    off: "67% OFF",
    key: "trimestral",
  },
]

const recentBuyers = [
  { name: "lucas***", plan: "1 month plan" },
  { name: "jeremy***", plan: "1 month plan" },
  { name: "pedro***", plan: "3 month plan" },
]

export function PricingSection({ gender, discount }: PricingSectionProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const [selectedPlan, setSelectedPlan] = useState("monthly")

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getCharacterImage = () => {
    // Usando as mesmas imagens de bodyfat que definimos anteriormente para manter consistência
    return gender === "male" ? "/images/mseven.webp" : "/images/bodyfat-seven.webp"
  }

  const getDiscountedPrice = (original: number) => {
    const discountAmount = original * (discount / 100)
    return Math.max(original - discountAmount, 9.9) // Minimum price safeguard
  }

  return (
    <div className="w-full max-w-md mx-auto bg-black text-white p-4 space-y-6">
      {/* Header com Timer */}
      <div className="bg-zinc-900 flex justify-between items-center p-3 rounded-md border border-zinc-800">
        <span className="font-bold text-sm">O desconto expira em:</span>
        <div className="flex items-center gap-2 text-orange-500 font-bold text-xl">
          {formatTime(timeLeft)}
          <Clock className="w-5 h-5 fill-orange-500/20" />
        </div>
      </div>

      {/* Imagem do Personagem */}
      <div className="relative w-full aspect-[4/5] max-h-80 mx-auto flex justify-center">
        <Image
          src={getCharacterImage() || "/placeholder.svg"}
          alt="Character"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Prova Social */}
      <div className="text-center space-y-3">
        <p className="font-bold text-sm px-4">1103 pessoas compraram planos de treino na última hora</p>
        <div className="flex justify-center gap-2 overflow-hidden">
          {recentBuyers.map((buyer, i) => (
            <div key={i} className="bg-zinc-800 text-[10px] px-3 py-1 rounded-full whitespace-nowrap text-zinc-400">
              {buyer.name} • plano de {buyer.plan === "1 month plan" ? "1 mês" : "3 meses"}
            </div>
          ))}
        </div>
      </div>

      {/* Banner de Parabéns */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/20 to-orange-400/20 border-2 border-orange-500 rounded-xl p-4 text-center">
        <div className="absolute top-0 right-0 p-2 opacity-20">
          <Flame className="w-8 h-8 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold mb-1">Parabéns! 🎉</h3>
        <p className="text-sm text-zinc-300">Você ganhou o maior desconto extra!</p>
      </div>

      <h2 className="text-2xl font-bold text-center pt-2">Escolha o melhor plano para você</h2>

      {/* Seleção de Planos */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const discountedTotal = getDiscountedPrice(plan.originalPrice)
          const days = plan.id === "trial" ? 7 : plan.id === "monthly" ? 30 : 90
          const dailyPrice = discountedTotal / days

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                selectedPlan === plan.id ? "border-orange-500 bg-orange-500/5" : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === plan.id ? "border-orange-500" : "border-zinc-700"
                  }`}
                >
                  {selectedPlan === plan.id && <div className="w-3 h-3 rounded-full bg-orange-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{plan.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 line-through text-xs">R$ {plan.originalPrice.toFixed(2)}</span>
                        <span className="text-orange-500 font-bold text-xs">R$ {discountedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xl font-bold">{dailyPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">BRL</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block">{plan.period}</span>
                    </div>
                  </div>
                  <div className="mt-2 inline-block bg-orange-600/20 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/30">
                    {discount}% EXTRA OFF APLICADO
                  </div>
                </div>
              </div>
              {plan.tag && (
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-[10px] font-black px-4 py-0.5 rounded-sm whitespace-nowrap">
                  {plan.tag}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Texto Comparativo */}
      <div className="flex items-start gap-3 p-2 text-[11px] text-zinc-400">
        <Flame className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="space-y-1">
          <p className="text-zinc-200">
            Pessoas que usam o plano por 3 meses alcançam o dobro de resultados comparado a 1 mês
          </p>
          <p className="italic">*De acordo com um estudo da Mad Muscles, 2022</p>
        </div>
      </div>

      {/* Botão Continuar */}
      <Button
        onClick={() => {
          const planKey = plans.find((p) => p.id === selectedPlan)?.key || "mensal"
          router.push(`/checkout?plan=${planKey}&discount=${discount}`)
        }}
        className="w-full bg-orange-500 hover:bg-orange-600 h-14 text-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  )
}
