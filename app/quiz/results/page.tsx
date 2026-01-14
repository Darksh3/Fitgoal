"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion" // Added Framer Motion import
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import Image from "next/image"
import CheckoutModal from "@/components/checkout-modal"

export default function QuizResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState({ minutes: 4, seconds: 0 })
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "semiannual">("quarterly")
  const [barsVisible, setBarsVisible] = useState(false) // State to trigger bar animations
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      let stored: any = null

      if (typeof window !== "undefined") {
        const local = localStorage.getItem("quizData")
        if (local) {
          try {
            stored = JSON.parse(local)
          } catch (error) {
            console.error("Erro ao parsear localStorage:", error)
          }
        }
      }

      if (!stored && auth.currentUser) {
        try {
          const ref = doc(db, "users", auth.currentUser.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            stored = snap.data()
          }
        } catch (error) {
          console.error("Erro ao buscar no Firebase:", error)
        }
      }

      if (!stored) {
        setTimeout(() => {
          router.push("/quiz")
        }, 2000)
        return
      }

      setData(stored)
      setLoading(false)
    }

    fetchData()
  }, [router])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getDataValue = (key: string) => {
    if (data?.[key] !== undefined) return data[key]
    if (data?.quizData?.[key] !== undefined) return data.quizData[key]
    return undefined
  }

  const getCurrentBodyFatImage = () => {
    const bodyFat = Number(data?.bodyFat) || 25
    const gender = getDataValue("gender") || data?.gender || "male"
    const isMale = gender === "male" || gender === "homem"

    if (isMale) {
      if (bodyFat <= 10) return "/images/mone.webp"
      if (bodyFat <= 15) return "/images/mtwo.webp"
      if (bodyFat <= 20) return "/images/mthree.webp"
      if (bodyFat <= 25) return "/images/mfour.webp"
      if (bodyFat <= 30) return "/images/mfive.webp"
      if (bodyFat <= 35) return "/images/msix.webp"
      if (bodyFat <= 39) return "/images/mseven.webp"
      return "/images/meight.webp"
    } else {
      if (bodyFat <= 10) return "/images/bodyfat-one.webp"
      if (bodyFat <= 15) return "/images/bodyfat-two.webp"
      if (bodyFat <= 20) return "/images/bodyfat-three.webp"
      if (bodyFat <= 25) return "/images/bodyfat-four.webp"
      if (bodyFat <= 30) return "/images/bodyfat-five.webp"
      if (bodyFat <= 35) return "/images/bodyfat-six.webp"
      if (bodyFat <= 39) return "/images/bodyfat-seven.webp"
      return "/images/bodyfat-eight.webp"
    }
  }

  const getImprovedBodyFatImage = () => {
    const bodyFat = Number(data?.bodyFat) || 25
    const gender = getDataValue("gender") || data?.gender || "male"
    const isMale = gender === "male" || gender === "homem"

    if (isMale) {
      if (bodyFat <= 10) return "/images/mone.webp"
      if (bodyFat <= 15) return "/images/mone.webp"
      if (bodyFat <= 20) return "/images/mtwo.webp"
      if (bodyFat <= 25) return "/images/mthree.webp"
      if (bodyFat <= 30) return "/images/mfour.webp"
      if (bodyFat <= 35) return "/images/mfive.webp"
      if (bodyFat <= 39) return "/images/msix.webp"
      return "/images/mseven.webp"
    } else {
      if (bodyFat <= 10) return "/images/bodyfat-one.webp"
      if (bodyFat <= 15) return "/images/bodyfat-one.webp"
      if (bodyFat <= 20) return "/images/bodyfat-two.webp"
      if (bodyFat <= 25) return "/images/bodyfat-three.webp"
      if (bodyFat <= 30) return "/images/bodyfat-four.webp"
      if (bodyFat <= 35) return "/images/bodyfat-five.webp"
      if (bodyFat <= 39) return "/images/bodyfat-six.webp"
      return "/images/bodyfat-seven.webp"
    }
  }

  const getCurrentBodyFatRange = () => {
    const bodyFat = Number(data?.bodyFat) || 25
    if (bodyFat <= 10) return "5-10%"
    if (bodyFat <= 15) return "11-15%"
    if (bodyFat <= 20) return "16-20%"
    if (bodyFat <= 25) return "21-25%"
    if (bodyFat <= 30) return "26-30%"
    if (bodyFat <= 35) return "31-35%"
    if (bodyFat <= 39) return "36-39%"
    return "40%+"
  }

  const getImprovedBodyFatRange = () => {
    const bodyFat = Number(data?.bodyFat) || 25
    if (bodyFat <= 10) return "5-10%"
    if (bodyFat <= 15) return "5-10%"
    if (bodyFat <= 20) return "11-15%"
    if (bodyFat <= 25) return "16-20%"
    if (bodyFat <= 30) return "21-25%"
    if (bodyFat <= 35) return "26-30%"
    if (bodyFat <= 39) return "31-35%"
    return "36-39%"
  }

  const getImprovedBodyFatPercentage = () => {
    const bodyFat = Number(data?.bodyFat) || 25
    if (bodyFat <= 10) return 7.5
    if (bodyFat <= 15) return 7.5
    if (bodyFat <= 20) return 13
    if (bodyFat <= 25) return 18
    if (bodyFat <= 30) return 23
    if (bodyFat <= 35) return 28
    if (bodyFat <= 39) return 33
    return 37.5
  }

  const calculateDailyCalories = () => {
    if (!data) return 2425
    const weight = Number(data?.weight) || 70
    const height = Number(data?.height) || 170
    const age = Number(data?.age) || 30
    const gender = data?.gender || "male"

    let bmr
    if (gender === "homem") {
      bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    } else {
      bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
    }

    const trainingDays = Number(data?.trainingDays) || 3
    const activityFactor = trainingDays >= 5 ? 1.725 : trainingDays >= 3 ? 1.55 : 1.375

    let calories = bmr * activityFactor
    if (data?.goal?.includes("perder-peso")) {
      calories -= 500
    } else if (data?.goal?.includes("ganhar-massa")) {
      calories += 300
    }

    return Math.round(calories)
  }

  const getTrainingLevelPercentage = (level: string) => {
    switch (level?.toLowerCase()) {
      case "iniciante":
        return 25
      case "intermediario":
      case "intermediário":
        return 50
      case "avançado":
      case "advanced":
        return 100
      default:
        return 25
    }
  }

  // Helper to get plan key string
  const getPlanKey = () => {
    switch (selectedPlan) {
      case "monthly":
        return "mensal"
      case "quarterly":
        return "trimestral"
      case "semiannual":
        return "semestral"
      default:
        return "trimestral"
    }
  }

  if (loading || !data) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-gray-800 bg-black">
        <div />
        <div className="flex items-center gap-4">
          <span className="text-sm">Desconto reservado por:</span>
          <div className="flex gap-2 text-orange-400 font-bold text-lg">
            <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span>:</span>
            <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
          </div>
          {/* Open modal instead of redirect */}
          <button
            onClick={() => setCheckoutOpen(true)}
            className="px-6 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition"
          >
            OBTER MEU PLANO
          </button>
          <button className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="w-full px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
          Seu Plano de Dieta e Treino <br /> estão Prontos!
        </h1>

        {/* Comparison container */}
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-xl p-8 mb-16">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 bg-black rounded-lg p-1">
            <button className="flex-1 py-3 px-4 bg-gray-800 text-white rounded-lg font-semibold">Agora</button>
            <button className="flex-1 py-3 px-4 bg-transparent text-gray-400 rounded-lg font-semibold hover:bg-gray-800 transition">
              Sua Meta
            </button>
          </div>

          {/* Body comparison */}
          <div className="flex gap-12 mb-8 items-center justify-center">
            {/* Current body */}
            <div className="flex flex-col items-center">
              <Image
                src={getCurrentBodyFatImage() || "/placeholder.svg"}
                alt="Corpo Atual"
                width={200}
                height={400}
                className="h-80 w-auto object-contain"
              />
            </div>

            {/* Chevron - CHANGE: replaced with animated triple chevron */}
            <style>{`
              @keyframes chevronFlow {
                0% {
                  opacity: 0.3;
                  transform: translateX(-8px);
                }
                50% {
                  opacity: 1;
                }
                100% {
                  opacity: 0.3;
                  transform: translateX(8px);
                }
              }
              .animate-chevron {
                animation: chevronFlow 1.5s ease-in-out infinite;
              }
              .animate-chevron-delay-1 {
                animation: chevronFlow 1.5s ease-in-out infinite;
                animation-delay: 0.2s;
              }
              .animate-chevron-delay-2 {
                animation: chevronFlow 1.5s ease-in-out infinite;
                animation-delay: 0.4s;
              }
            `}</style>
            <div className="flex gap-1 items-center">
              <svg className="w-8 h-8 text-gray-400 animate-chevron" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L12.17 12z" />
              </svg>
              <svg className="w-8 h-8 text-gray-400 animate-chevron-delay-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L12.17 12z" />
              </svg>
              <svg className="w-8 h-8 text-gray-400 animate-chevron-delay-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L12.17 12z" />
              </svg>
            </div>

            {/* Target body */}
            <div className="flex flex-col items-center">
              <Image
                src={getImprovedBodyFatImage() || "/placeholder.svg"}
                alt="Corpo Alvo"
                width={200}
                height={400}
                className="h-80 w-auto object-contain"
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-gray-800">
            {/* Current stats */}
            <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 border border-gray-800">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Percentual de Gordura</p>
                  <p className="text-white font-bold mb-2">{Number(data?.bodyFat) || 25}%</p>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Number(data?.bodyFat) || 25}%` }}
                      transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                      className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full"
                      onViewportEnter={() => setBarsVisible(true)}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Nível de Treino</p>
                  <p className="text-white font-bold mb-2">{getDataValue("experience") || "Iniciante"}</p>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${getTrainingLevelPercentage(getDataValue("experience"))}%` }}
                      transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                      className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Target stats */}
            <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 border border-gray-800">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Percentual de Gordura</p>
                  <p className="text-white font-bold mb-2">{getImprovedBodyFatRange()}</p>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${getImprovedBodyFatPercentage()}%` }}
                      transition={{ duration: 1.2, delay: 1.4, ease: "easeOut" }}
                      className="bg-gradient-to-r from-lime-400 to-green-500 h-2 rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Nível de Treino</p>
                  <p className="text-white font-bold mb-2">Avançado</p>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      transition={{ duration: 1.2, delay: 2, ease: "easeOut" }}
                      className="bg-gradient-to-r from-lime-400 to-green-500 h-2 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gray-900 bg-opacity-50 rounded-2xl p-8 border border-gray-700">
            <h3 className="text-3xl font-bold text-white mb-6">Sumário:</h3>
            <div className="border-t border-gray-700 mb-8"></div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-8">
              {/* Gênero */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Gênero</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("gender") === "homem"
                    ? "Masculino"
                    : getDataValue("gender") === "mulher"
                      ? "Feminino"
                      : "—"}
                </p>
              </div>

              {/* Idade */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Idade</p>
                <p className="text-white text-xl font-semibold">{getDataValue("age") || "—"} anos</p>
              </div>

              {/* Altura */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Altura</p>
                <p className="text-white text-xl font-semibold">{getDataValue("height") || "—"} cm</p>
              </div>

              {/* Peso Atual */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Peso Atual</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("weight") ? (Number(getDataValue("weight")) / 2.205).toFixed(1) : "—"} kg
                </p>
              </div>

              {/* IMC */}
              <div>
                <p className="text-gray-400 text-sm mb-2">IMC</p>
                <p
                  className={`text-xl font-semibold ${(() => {
                    if (!getDataValue("weight") || !getDataValue("height")) return "text-white"
                    const imc = Number(getDataValue("weight")) / 2.205 / (Number(getDataValue("height")) / 100) ** 2
                    if (imc < 18.5) return "text-blue-400"
                    if (imc < 25) return "text-green-400"
                    return "text-red-400"
                  })()}`}
                >
                  {getDataValue("weight") && getDataValue("height")
                    ? (Number(getDataValue("weight")) / 2.205 / (Number(getDataValue("height")) / 100) ** 2).toFixed(1)
                    : "—"}
                </p>
              </div>

              {/* Meta de Calorias */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Meta de Calorias</p>
                <p className="text-white text-xl font-semibold">{getDataValue("targetCalories") || "—"} kcal</p>
              </div>

              {/* Data para atingir objetivo - Full width */}
              <div className="col-span-2">
                <p className="text-gray-400 text-sm mb-2">Data para atingir objetivo</p>
                <p className="text-white text-xl font-semibold">
                  {new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-16">
          <h2 className="text-4xl font-bold text-center mb-8">Escolha Seu Plano</h2>

          <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-8">O que você recebe:</h3>

            <div className="space-y-6">
              {/* Benefit 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">Dieta 100% personalizada em você</p>
                  <p className="text-gray-400 text-sm">
                    Plano de dieta claro, personalizado apenas para você, barato e fácil de seguir
                  </p>
                  <p className="text-orange-400 font-bold mt-2 line-through">R$ 129</p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">Programa de treino personalizado</p>
                  <p className="text-gray-400 text-sm">Plano de treino claro e fácil de seguir</p>
                  <p className="text-orange-400 font-bold mt-2 line-through">R$ 149</p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">Resultados visíveis após o primeiro mês</p>
                  <p className="text-gray-400 text-sm">Veja mudanças reais em seu corpo</p>
                  <p className="text-orange-400 font-bold mt-2 line-through">R$ 97</p>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">Acompanhamento de progresso</p>
                  <p className="text-gray-400 text-sm">Monitore sua evolução e ajuste conforme necessário</p>
                  <p className="text-orange-400 font-bold mt-2 line-through">R$ 79</p>
                </div>
              </div>
            </div>

            {/* Special condition message */}
            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <p className="text-white">
                <span className="text-orange-400">✨</span> Você vai ter uma Condição Mega Especial!{" "}
                <span className="text-orange-400">✨</span>
              </p>

              <div className="mt-4 space-y-2">
                <p className="text-gray-400 text-sm">
                  Se comprasse separadamente: <span className="line-through text-gray-500">R$ 454</span>
                </p>
                <p className="text-white font-bold">
                  Com a gente: de <span className="text-orange-400">R$ 39,98</span> a{" "}
                  <span className="text-orange-400">R$ 79,90</span> por mês
                </p>
              </div>
            </div>
          </div>

          {/* Promo code banner */}
          <div className="bg-orange-400 rounded-xl p-1 mt-8">
            <div className="bg-black rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span className="text-white font-semibold">Seu código promo foi aplicado!</span>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3">
                  <p className="text-white font-mono text-lg">cleber_jan26</p>
                </div>
                <div className="text-orange-400 font-bold text-right">
                  <p className="text-2xl">02:08</p>
                  <p className="text-xs text-orange-300">minutos segundos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
            {/* Monthly Plan */}
            <div
              onClick={() => setSelectedPlan("monthly")}
              className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${
                selectedPlan === "monthly"
                  ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/20"
                  : "border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Plano Mensal</h3>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  {selectedPlan === "monthly" && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-3">Acesso completo por 30 dias</div>
              <div className="text-3xl font-bold text-white mb-1">R$ 79,90</div>
              <div className="text-gray-400 text-sm">Ideal para quem quer resultados rápidos</div>
            </div>

            {/* Quarterly Plan */}
            <div
              onClick={() => setSelectedPlan("quarterly")}
              className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${
                selectedPlan === "quarterly"
                  ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/20"
                  : "border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Plano Trimestral</h3>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  {selectedPlan === "quarterly" && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-3">Acesso completo por 90 dias</div>
              <div className="text-3xl font-bold text-white mb-1">R$ 199,80</div>
              <div className="text-gray-400 text-sm">Ideal para quem quer manter o ritmo</div>
            </div>

            {/* Semiannual Plan */}
            <div
              onClick={() => setSelectedPlan("semiannual")}
              className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${
                selectedPlan === "semiannual"
                  ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/20"
                  : "border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Plano Semestral</h3>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  {selectedPlan === "semiannual" && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-3">Acesso completo por 180 dias</div>
              <div className="text-3xl font-bold text-white mb-1">R$ 359,70</div>
              <div className="text-gray-400 text-sm">Ideal para quem quer economizar</div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <CheckoutModal selectedPlan={selectedPlan} onClose={() => setCheckoutOpen(false)} planKey={getPlanKey()} />
      )}
    </div>
  )
}
