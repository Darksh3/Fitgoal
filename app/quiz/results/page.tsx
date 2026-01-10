"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import Image from "next/image"

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState({ minutes: 4, seconds: 0 })

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

  if (loading || !data) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <div />
        <div className="flex items-center gap-4">
          <span className="text-sm">Desconto reservado por:</span>
          <div className="flex gap-2 text-orange-400 font-bold text-lg">
            <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span>:</span>
            <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
          </div>
          <button className="px-6 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition">
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
          Seu Plano de Calistenia <br /> está Pronto!
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
          <div className="grid grid-cols-2 gap-8 mb-8 items-end justify-center">
            {/* Current body */}
            <div className="flex flex-col items-center">
              <Image
                src={getCurrentBodyFatImage() || "/placeholder.svg"}
                alt="Corpo Atual"
                width={250}
                height={450}
                className="h-96 w-auto object-contain"
              />
            </div>

            {/* Chevron */}
            <div className="col-span-2 flex justify-center -my-8">
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H6" />
              </svg>
            </div>

            {/* Target body */}
            <div className="flex flex-col items-center">
              <Image
                src={getImprovedBodyFatImage() || "/placeholder.svg"}
                alt="Corpo Alvo"
                width={250}
                height={450}
                className="h-96 w-auto object-contain"
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-gray-800">
            {/* Current stats */}
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Força Muscular</p>
                <p className="text-white font-bold mb-2">{getCurrentBodyFatRange()}</p>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full"
                    style={{ width: `${(Number(data?.bodyFat) || 25) * 2}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Nível de Treino</p>
                <p className="text-white font-bold mb-2">Iniciante</p>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full w-1/3" />
                </div>
              </div>
            </div>

            {/* Target stats */}
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Força Muscular</p>
                <p className="text-white font-bold mb-2">{getImprovedBodyFatRange()}</p>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-gradient-to-r from-lime-400 to-green-500 h-2 rounded-full w-4/5" />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Nível de Treino</p>
                <p className="text-white font-bold mb-2">Avançado</p>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-gradient-to-r from-lime-400 to-green-500 h-2 rounded-full w-3/4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8">Escolha Seu Plano</h2>

          {/* Promo code banner */}
          <div className="bg-orange-400 rounded-xl p-1 mb-8">
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
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* 1-Week Trial */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-gray-700 transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Teste 1 Semana</h3>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">4-WEEK PLAN - Primeira semana por</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 line-through text-sm">R$ 17.77</span>
                  <span className="text-white text-2xl font-bold">R$ 6.93</span>
                </div>
                <p className="text-red-500 text-xs font-semibold">0% OFF</p>
              </div>
            </div>

            {/* 4-Week Plan - Featured */}
            <div className="bg-gray-900 border-2 border-orange-400 rounded-xl p-6 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black px-4 py-1">
                <p className="text-xs font-bold text-orange-400 tracking-widest">MAIS POPULAR</p>
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Plano 4 Semanas</h3>
                <div className="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Primeiras 4 semanas por</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 line-through text-sm">R$ 38.95</span>
                  <span className="text-white text-2xl font-bold">R$ 15.19</span>
                </div>
                <p className="text-red-500 text-xs font-semibold">61% OFF</p>
              </div>
            </div>

            {/* 12-Week Plan */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-gray-700 transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Plano 12 Semanas</h3>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Primeiras 12 semanas por</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 line-through text-sm">R$ 94.85</span>
                  <span className="text-white text-2xl font-bold">R$ 38.99</span>
                </div>
                <p className="text-red-500 text-xs font-semibold">61% OFF</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-500 mb-8">
            Sem cancelamento antes do final do período de desconto para planos, concordo que a BetterMe será
            automaticamente cobrada R$ 38.95 (IVA incluído) a cada 4 semanas até que eu cancele. Cancelar online via
            perfil no <span className="underline">site</span> ou app.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button className="px-12 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition">
              OBTER MEU PLANO
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
