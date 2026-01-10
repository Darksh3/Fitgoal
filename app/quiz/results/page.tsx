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

            {/* Chevron - CHANGE: positioned between characters */}
            <svg
              className="w-12 h-12 text-gray-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7m0 0l-7 7m7-7H6a6 6 0 116 0h.5a1 1 0 000-2 2 2 0 01-2-2 9 9 0 11-9 9 5 5 0 018-9H9a1 1 0 000 2h2a1 1 0 100-2H4z"
              />
            </svg>

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
            </div>

            {/* Target stats */}
            <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 border border-gray-800">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Percentual de Gordura</p>
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

          <div className="mt-8 bg-gray-900 bg-opacity-50 rounded-2xl p-8 border border-gray-700">
            <h3 className="text-3xl font-bold text-white mb-6">Sumário</h3>
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
                {(() => {
                  const weight = getDataValue("weight") ? Number(getDataValue("weight")) / 2.205 : null
                  const height = getDataValue("height") ? Number(getDataValue("height")) : null

                  if (!weight || !height) {
                    return <p className="text-white text-xl font-semibold">—</p>
                  }

                  const imc = (weight / (height / 100) ** 2).toFixed(1)
                  const imcNum = Number(imc)

                  let imcColor = "text-white"
                  if (imcNum < 18.5) {
                    imcColor = "text-blue-400"
                  } else if (imcNum >= 18.5 && imcNum <= 24.9) {
                    imcColor = "text-green-400"
                  } else {
                    imcColor = "text-red-400"
                  }

                  return <p className={`${imcColor} text-xl font-semibold`}>{imc}</p>
                })()}
              </div>

              {/* Meta de Calorias */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Meta de Calorias</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("dailyCalorieGoal") || getDataValue("calorieGoal") || "—"} kcal
                </p>
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

          <div className="max-w-5xl mx-auto mt-16">
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
              {/* Monthly Plan */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-gray-700 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Plano Mensal</h3>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Acesso completo por 30 dias</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-2xl font-bold">R$ 79,90</span>
                  </div>
                  <p className="text-gray-400 text-xs">por mês</p>
                </div>
              </div>

              {/* Quarterly Plan - Featured */}
              <div className="bg-gray-900 border-2 border-orange-400 rounded-xl p-6 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black px-4 py-1">
                  <p className="text-xs font-bold text-orange-400 tracking-widest">MAIS POPULAR</p>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Plano Trimestral</h3>
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
                  <p className="text-gray-400 text-sm">Acesso completo por 90 dias</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-2xl font-bold">R$ 159,90</span>
                  </div>
                  <p className="text-gray-400 text-xs">por trimestre</p>
                </div>
              </div>

              {/* Semi-annual Plan */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-gray-700 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Plano Semestral</h3>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Acesso completo por 180 dias</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-2xl font-bold">R$ 239,90</span>
                  </div>
                  <p className="text-gray-400 text-xs">por semestre</p>
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

            {/* Highlights of your plan section */}
            <div className="mt-20 py-16 border-t border-gray-800">
              <h2 className="text-4xl font-bold text-center text-white mb-12">Destaques do seu plano</h2>

              <div className="grid grid-cols-2 gap-12">
                {/* Left column - Highlights list */}
                <div className="space-y-8">
                  {/* Highlight 1 */}
                  <div className="flex gap-4">
                    <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 1 1 0 000 2H6a6 6 0 116 0h.5a1 1 0 000-2 2 2 0 01-2-2 9 9 0 11-9 9 5 5 0 018-9H9a1 1 0 000 2h2a1 1 0 100-2H4z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold">Programa de treino progressivo</p>
                    <p className="text-gray-400 text-sm">Adequado ao seu nível de forma física e objetivo</p>
                  </div>
                </div>

                {/* Highlight 2 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0zm2-8a1 1 0 01.967.25l2.5 6.526a1 1 0 01-.5 1.3H17v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-3H9v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-6H.033a1 1 0 01-.5-1.3l2.5-6.526A1 1 0 015 1h10z"></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">Rotinas fáceis para iniciantes</p>
                    <p className="text-gray-400 text-sm">Para construir músculo e queimar gordura</p>
                  </div>
                </div>

                {/* Highlight 3 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">Top 100 exercícios de Calistenia</p>
                    <p className="text-gray-400 text-sm">Que atingem cada grupo muscular do corpo</p>
                  </div>
                </div>

                {/* Highlight 4 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 12a6 6 0 11-12 0 6 6 0 0112 0zM12.5 1a.5.5 0 01.5.5v2a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5zM15.854 3.146a.5.5 0 010 .708l-1.414 1.414a.5.5 0 01-.708-.708l1.414-1.414a.5.5 0 01.708 0zM18 6.5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM15.854 10.854a.5.5 0 01-.708 0l-1.414-1.414a.5.5 0 01.708-.708l1.414 1.414a.5.5 0 010 .708zM12.5 14a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5z"></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">1.500+ treinos guiados em casa</p>
                    <p className="text-gray-400 text-sm">Desenvolvido por treinadores de fitness certificados</p>
                  </div>
                </div>

                {/* Highlight 5 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zM5.05 6.051a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707zM3 9a1 1 0 100 2v4a2 2 0 100 4h12a2 2 0 100-4V9a1 1 0 100-2H3z"></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">Plano de refeições personalizado</p>
                    <p className="text-gray-400 text-sm">
                      Com mais de 1000 receitas fáceis de seguir para atingir seu objetivo mais rápido
                    </p>
                  </div>
                </div>

                {/* Highlight 6 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.5 2a1 1 0 00-.5.887v14.226a1 1 0 00.5.887l7-3.5a1 1 0 000 1.414l7 7a1 1 0 001.414-1.414L11.414 10l6.293-6.293a1 1 0 000-1.414l-7-7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-white font-bold">Sem academia, sem problema</p>
                    <p className="text-gray-400 text-sm">
                      Faça Calistenia em casa ou fora com equipamento mínimo ou nenhum
                    </p>
                  </div>
                </div>
              </div>

              {/* Right column - Image mockup */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-sm">
                  {/* Placeholder for the app mockup image */}
                  <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-4 border border-gray-700">
                    <div className="bg-black rounded-2xl aspect-video flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5zm6 9a1 1 0 100-2 1 1 0 000 2z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results that make us proud section with testimonials */}
            <section className="py-20 bg-black">
              <div className="max-w-5xl mx-auto px-4">
                <h2 className="text-4xl font-bold text-center text-white mb-12">
                  Resultados que nos deixam orgulhosos
                </h2>

                <div className="grid grid-cols-3 gap-8 mb-12">
                  {/* Testimonial 1 - Brandon */}
                  <div className="bg-gray-900 rounded-2xl overflow-hidden">
                    <div className="aspect-square bg-gray-800 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4"></div>
                          <p className="text-gray-400 text-sm">Antes / Depois</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Brandon</h3>
                        <span className="text-orange-400 font-bold text-lg">-15 kg</span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-3">
                        Olá, estou usando seus treinos e comecei há cerca de 4-5 meses atrás e só queria dizer obrigado,
                        você fez um ótimo trabalho, realmente vi um t...
                      </p>
                      <button className="text-orange-400 text-sm font-semibold hover:text-orange-300">Ler mais</button>
                    </div>
                  </div>

                  {/* Testimonial 2 - Peter */}
                  <div className="bg-gray-900 rounded-2xl overflow-hidden">
                    <div className="aspect-square bg-gray-800 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4"></div>
                          <p className="text-gray-400 text-sm">Antes / Depois</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Peter</h3>
                        <span className="text-orange-400 font-bold text-lg">-5 kg</span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-3">
                        Os vídeos são muito úteis e fáceis de entender. Os conselhos do seu consultor funcionam bem
                        comigo. Consigo dormir cedo agora. Este aplicativo funciona f...
                      </p>
                      <button className="text-orange-400 text-sm font-semibold hover:text-orange-300">Ler mais</button>
                    </div>
                  </div>

                  {/* Testimonial 3 - Kevin */}
                  <div className="bg-gray-900 rounded-2xl overflow-hidden">
                    <div className="aspect-square bg-gray-800 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4"></div>
                          <p className="text-gray-400 text-sm">Antes / Depois</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Kevin</h3>
                        <span className="text-orange-400 font-bold text-lg">-13 kg</span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-3">
                        Comecei com cerca de 200 lbs e agora estou com um peso saudável e magro 172.
                      </p>
                      <button className="text-orange-400 text-sm font-semibold hover:text-orange-300">Ler mais</button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  *Disclaimer: Usuários do BetterMe compartilharam seu feedback. Este usuário teve acesso a treinamento
                  personalizado, recursos adicionais de pagamento. Os seguintes exercícios e os planos são a chave em
                  sua jornada de fitness e resultados geralmente aparecem em 4 semanas. Os resultados podem variar por
                  pessoa e não são garantidos.
                </p>
              </div>
            </section>

            {/* People often ask FAQ section with expandable items */}
            <section className="py-20 bg-black">
              <div className="max-w-3xl mx-auto px-4">
                <h2 className="text-4xl font-bold text-center text-white mb-12">As pessoas frequentemente perguntam</h2>

                <div className="space-y-6">
                  {/* FAQ Item 1 */}
                  <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                    <summary className="flex items-center justify-between font-bold text-white">
                      Como este plano pode me ajudar a queimar gordura e construir músculos?
                      <svg
                        className="w-5 h-5 transform group-open:rotate-180 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </summary>
                    <p className="text-gray-400 mt-4">
                      Nosso plano foi desenvolvido para ajudá-lo a queimar gordura e construir um corpo tonificado e
                      magro, combinando treinos passo a passo com um plano de refeições personalizado. Nossas rotinas
                      com vídeos guiados garantem a forma correta e ajudam você a manter a consistência e a motivação,
                      tornando a perda de peso mais alcançável e sustentável.
                    </p>
                  </details>

                  {/* FAQ Item 2 */}
                  <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                    <summary className="flex items-center justify-between font-bold text-white">
                      Quais são os benefícios da calistenia em comparação com outros treinos?
                      <svg
                        className="w-5 h-5 transform group-open:rotate-180 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </summary>
                    <p className="text-gray-400 mt-4">
                      Calistenia é um salva-vidas se você quer ter um corpo melhor, mas não tem acesso a equipamento de
                      academia, não consegue se dedicar ao levantamento tradicional de pesos, ou simplesmente quer
                      tentar algo inovador e divertido. Obtenha seu plano e experimente agora!
                    </p>
                  </details>

                  {/* FAQ Item 3 */}
                  <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                    <summary className="flex items-center justify-between font-bold text-white">
                      E se eu perder a motivação rapidamente?
                      <svg
                        className="w-5 h-5 transform group-open:rotate-180 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </summary>
                    <p className="text-gray-400 mt-4">
                      Forneceremos lembretes suaves, conselhos de especialistas, ferramentas de rastreamento úteis e
                      apoio constante para ajudá-lo a ver o progresso e manter-se consistente. Dessa forma, você pode
                      alcançar seus objetivos e desfrutar de um corpo mais saudável e em forma sem o medo de desistir.
                    </p>
                  </details>
                </div>
              </div>
            </section>

            {/* Trustpilot Section */}
            <section className="border-t border-gray-800 py-12">
              <div className="max-w-6xl mx-auto px-4 text-center">
                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-white font-bold">Trustpilot</span>
                  </div>
                  <div className="text-gray-400">
                    <div className="text-sm font-bold text-white">Excelente</div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Get Visible Results Section */}
            <section className="py-16">
              <div className="max-w-6xl mx-auto px-4">
                <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
                  Obtenha resultados visíveis em 4 semanas!
                </h2>

                {/* Plans */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Monthly Plan */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="text-gray-400 text-sm mb-4">PLANO MENSAL</div>
                    <div className="text-3xl font-bold text-white mb-2">R$ 79,90</div>
                  </div>

                  {/* Quarterly Plan - Featured */}
                  <div className="bg-black border-2 border-orange-500 rounded-lg p-6 relative">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs font-bold px-4 py-1 rounded-full">
                      MAIS POPULAR
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">Plano Trimestral</h3>
                      <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-white">R$ 159,90</div>
                  </div>

                  {/* Semi-annual Plan */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="text-gray-400 text-sm mb-4">PLANO SEMESTRAL</div>
                    <div className="text-3xl font-bold text-white mb-2">R$ 239,90</div>
                  </div>
                </div>

                {/* Disclaimer */}
                <p className="text-gray-400 text-sm text-center mb-8 max-w-2xl mx-auto">
                  Sem cancelamento antes do plano selecionado terminar, aceito que a BetterMe cobrará automaticamente R$
                  38,95 (incl. IVA) a cada 4 semanas até eu cancelar. Cancelar online via perfil ou app.
                </p>

                {/* CTA Button */}
                <div className="text-center mb-16">
                  <button className="bg-white text-black font-bold px-12 py-3 rounded-full hover:bg-gray-100 transition">
                    OBTER MEU PLANO
                  </button>
                </div>

                {/* Money-Back Guarantee */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                  <svg
                    className="w-12 h-12 text-green-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-3xl font-bold text-white mb-4">Garantia de devolução do dinheiro em 30 dias</h3>
                  <p className="text-gray-400 mb-4">
                    Acreditamos que nosso plano funcionará para você, e você deveria ver resultados visíveis em apenas 4
                    semanas! Estamos até dispostos a devolver seu dinheiro se você puder demonstrar que seguiu o plano
                    mas não viu nenhum resultado.
                  </p>
                  <p className="text-gray-400">
                    Saiba mais sobre limitações aplicáveis em nossa{" "}
                    <a href="#" className="text-green-400 hover:underline">
                      política de devolução
                    </a>
                    .
                  </p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-400 text-sm">
              <p className="mb-4">
                BetterMe International Limited | Escritório No. 101, 1º Andar, "Alteribo Avas" Building, Corner of
                Tspelleriou & Koryktos Street, 8010, Paphos, Cyprus
              </p>
              <div className="flex justify-center gap-4">
                <a href="#" className="hover:text-white transition">
                  Privacidade
                </a>
                <span>|</span>
                <a href="#" className="hover:text-white transition">
                  Termos
                </a>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}
