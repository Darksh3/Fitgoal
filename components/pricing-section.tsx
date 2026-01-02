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
    name: "1-WEEK TRIAL",
    dailyPrice: 0.99,
    originalPrice: 6.93,
    period: "per day",
    tag: null,
  },
  {
    id: "monthly",
    name: "4-WEEK PLAN",
    dailyPrice: 0.51,
    originalPrice: 39.99,
    discountPrice: 15.19,
    period: "per day",
    tag: "MOST POPULAR",
    off: "62% OFF",
  },
  {
    id: "quarterly",
    name: "12-WEEK PLAN",
    dailyPrice: 0.28,
    originalPrice: 69.99,
    discountPrice: 25.99,
    period: "per day",
    tag: null,
    off: "63% OFF",
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

  return (
    <div className="w-full max-w-md mx-auto bg-black text-white p-4 space-y-6">
      {/* Header com Timer */}
      <div className="bg-zinc-900 flex justify-between items-center p-3 rounded-md border border-zinc-800">
        <span className="font-bold text-sm">Discount expires in:</span>
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
        <p className="font-bold text-sm px-4">1103 people bought workout plans in the last hour</p>
        <div className="flex justify-center gap-2 overflow-hidden">
          {recentBuyers.map((buyer, i) => (
            <div key={i} className="bg-zinc-800 text-[10px] px-3 py-1 rounded-full whitespace-nowrap text-zinc-400">
              {buyer.name} • {buyer.plan}
            </div>
          ))}
        </div>
      </div>

      {/* Banner de Parabéns */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/20 to-orange-400/20 border-2 border-orange-500 rounded-xl p-4 text-center">
        <div className="absolute top-0 right-0 p-2 opacity-20">
          <Flame className="w-8 h-8 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold mb-1">Congratulations! 🎉</h3>
        <p className="text-sm text-zinc-300">You won the biggest extra discount!</p>
      </div>

      <h2 className="text-2xl font-bold text-center pt-2">Choose the best plan for you</h2>

      {/* Seleção de Planos */}
      <div className="space-y-3">
        {plans.map((plan) => (
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
                      <span className="text-zinc-500 line-through text-xs">
                        {plan.id === "trial" ? plan.originalPrice : plan.originalPrice} GBP
                      </span>
                      {plan.discountPrice && <span className="text-zinc-300 text-xs">{plan.discountPrice} GBP</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-xl font-bold">{plan.dailyPrice}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">GBP</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">{plan.period}</span>
                  </div>
                </div>
                {plan.off && (
                  <div className="mt-2 inline-block bg-orange-600/20 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/30">
                    {plan.off}
                  </div>
                )}
              </div>
            </div>
            {plan.tag && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-[10px] font-black px-4 py-0.5 rounded-sm">
                {plan.tag}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Texto Comparativo */}
      <div className="flex items-start gap-3 p-2 text-[11px] text-zinc-400">
        <Flame className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="space-y-1">
          <p className="text-zinc-200">People using plan for 3 months achieve twice as many results as for 1 month</p>
          <p className="italic">*According to a study by Mad Muscles, 2022</p>
        </div>
      </div>

      {/* Botão Continuar */}
      <Button
        onClick={() => router.push(`/checkout?plan=${selectedPlan}&discount=${discount}`)}
        className="w-full bg-orange-500 hover:bg-orange-600 h-14 text-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  )
}
