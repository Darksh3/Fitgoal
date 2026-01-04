"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Clock, Flame, ArrowRight } from "lucide-react"

interface PricingSectionProps {
  gender: string
  discount: number
}

const plans = [
  {
    id: "monthly",
    name: "PLANO MENSAL",
    targetPrice: 79.9,
    period: "por dia",
    tag: null,
    key: "mensal",
  },
  {
    id: "quarterly",
    name: "PLANO TRIMESTRAL",
    targetPrice: 159.9,
    period: "por dia (méd.)",
    tag: "MAIS POPULAR",
    off: "62% OFF",
    key: "trimestral",
  },
  {
    id: "semiannual",
    name: "PLANO SEMESTRAL",
    targetPrice: 239.9,
    period: "por dia (méd.)",
    tag: "MELHOR VALOR",
    off: "67% OFF",
    key: "semestral",
  },
]

const recentBuyers = [
  { name: "lucas***", plan: "1 month plan" },
  { name: "jeremy***", plan: "3 month plan" },
  { name: "pedro***", plan: "6 month plan" },
]

export function PricingSection({ gender, discount }: PricingSectionProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const [selectedPlan, setSelectedPlan] = useState("quarterly")
  const [particles, setParticles] = useState<Array<{ id: number; tx: string; ty: string }>>([])
  const [particleId, setParticleId] = useState(0)

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  useEffect(() => {
    const particleInterval = setInterval(() => {
      const newParticle = {
        id: particleId,
        tx: `${(Math.random() - 0.5) * 60}px`, // reduced spread from 100px to 60px for more compact glow, increased frequency
        ty: `${-Math.random() * 100 - 30}px`,
      }
      setParticles((prev) => [...prev, newParticle])
      setParticleId((prev) => prev + 1)

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newParticle.id))
      }, 2000)
    }, 150) // increased frequency from 300ms to 150ms for more particles

    return () => clearInterval(particleInterval)
  }, [particleId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getCharacterImage = () => {
    return gender === "male" ? "/images/homemfinal.webp" : "/images/mulherfinal.webp"
  }

  const calculateOriginalPrice = (target: number) => {
    const factor = discount > 0 ? 1 - discount / 100 : 0.6
    return target / factor
  }

  return (
    <div className="w-full max-w-md mx-auto bg-black text-white p-4 space-y-6">
      <div className="bg-zinc-900 flex justify-between items-center p-3 rounded-md border border-zinc-800">
        <span className="font-bold text-sm">O desconto expira em:</span>
        <div className="flex items-center gap-2 text-orange-500 font-bold text-xl">
          {formatTime(timeLeft)}
          <Clock className="w-5 h-5 fill-orange-500/20" />
        </div>
      </div>

      <div className="relative w-full aspect-[4/5] max-h-80 mx-auto flex justify-center items-center">
        <div className="absolute inset-0 rounded-full glow-orange pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-orange-600/30 via-transparent to-orange-500/20 rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-radial pointer-events-none opacity-20" />
        <Image
          src={getCharacterImage() || "/placeholder.svg"}
          alt="Character"
          fill
          className="object-contain relative z-10"
          priority
        />
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-3 h-3 bg-orange-500 rounded-full animate-float-particle"
            style={
              {
                "--tx": particle.tx,
                "--ty": particle.ty,
                left: "50%",
                top: "50%",
                opacity: 0.95,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="text-center space-y-3">
        <p className="font-bold text-sm px-4">1103 pessoas compraram planos de treino na última hora</p>
        <div className="flex justify-center gap-2 overflow-hidden">
          {recentBuyers.map((buyer, i) => (
            <div key={i} className="bg-zinc-800 text-[10px] px-3 py-1 rounded-full whitespace-nowrap text-zinc-400">
              {buyer.name} • plano de{" "}
              {buyer.plan === "1 month plan" ? "1 mês" : buyer.plan === "3 month plan" ? "3 meses" : "6 meses"}
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/20 to-orange-400/20 border-2 border-orange-500 rounded-xl p-4 text-center">
        <div className="absolute top-0 right-0 p-2 opacity-20">
          <Flame className="w-8 h-8 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold mb-1">Parabéns! 🎉</h3>
        <p className="text-sm text-zinc-300">Você ganhou o maior desconto extra!</p>
      </div>

      <h2 className="text-2xl font-bold text-center pt-2">Escolha o melhor plano para você</h2>

      <div className="space-y-3">
        {plans.map((plan) => {
          const shownOriginalPrice = calculateOriginalPrice(plan.targetPrice)
          const finalPrice = plan.targetPrice

          const days = plan.id === "monthly" ? 30 : plan.id === "quarterly" ? 90 : 180
          const dailyPrice = finalPrice / days

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
                        <span className="text-zinc-500 line-through text-xs">R$ {shownOriginalPrice.toFixed(2)}</span>
                        <span className="text-orange-500 font-bold text-xs">R$ {finalPrice.toFixed(2)}</span>
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

      <div className="flex items-start gap-3 p-2 text-[11px] text-zinc-400">
        <Flame className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="space-y-1">
          <p className="text-zinc-200">
            Pessoas que usam o plano por 3 meses alcançam o dobro de resultados comparado a 1 mês
          </p>
          <p className="italic">*De acordo com um estudo da Mad Muscles, 2022</p>
        </div>
      </div>

      <button
        onClick={() => {
          const planKey = plans.find((p) => p.id === selectedPlan)?.key || "mensal"
          router.push(`/checkout?plan=${planKey}&discount=${discount}`)
        }}
        className="w-full bg-white rounded-full h-16 text-xl font-bold text-black flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-lg"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )
}
