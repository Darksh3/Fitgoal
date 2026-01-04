"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { PricingSection } from "@/components/pricing-section"
import { Clock, MapPin, TrendingUp, Calendar, CheckCircle, Heart, Flame, Moon, TargetIcon, Zap } from "lucide-react"
import React from "react"

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [showWheel, setShowWheel] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [discount, setDiscount] = useState<number | null>(null)
  const [currentIMC, setCurrentIMC] = useState<number | null>(null)
  const [isBmiAnimationDone, setIsBmiAnimationDone] = React.useState(false)

  useEffect(() => {
    const fetchData = async () => {
      let stored: any = null

      if (typeof window !== "undefined") {
        const local = localStorage.getItem("quizData")
        console.log("localStorage quizData:", local)
        if (local) {
          try {
            stored = JSON.parse(local)
            console.log("Dados do localStorage parseados:", stored)
          } catch (error) {
            console.error("Erro ao parsear localStorage:", error)
          }
        }
      }

      if (!stored && auth.currentUser) {
        console.log("Buscando no Firebase para usuário:", auth.currentUser.uid)
        try {
          const ref = doc(db, "users", auth.currentUser.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            stored = snap.data()
            console.log("Dados do Firebase encontrados:", stored)
          } else {
            console.log("Documento não existe no Firebase")
          }
        } catch (error) {
          console.error("Erro ao buscar no Firebase:", error)
        }
      }

      if (!stored) {
        console.log("Nenhum dado encontrado, redirecionando para /quiz")
        setTimeout(() => {
          router.push("/quiz")
        }, 2000)
        return
      }

      console.log("Dados finais encontrados:", stored)
      setData(stored)
      setLoading(false)
      setCurrentIMC(Number(stored.imc))
    }

    fetchData()
  }, [router])

  useEffect(() => {
    console.log("[v0] Data state updated:", data)
  }, [data])

  useEffect(() => {
    if (discount && showWheel) {
      const timer = setTimeout(() => {
        setShowWheel(false)
        setShowPricing(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [discount, showWheel])

  const getDataValue = (key: string) => {
    if (data?.[key] !== undefined) return data[key]
    if (data?.quizData?.[key] !== undefined) return data.quizData[key]
    return undefined
  }

  const getGoalText = (goals: string[]) => {
    const goalMap: { [key: string]: string } = {
      "perder-peso": "Perder Peso",
      "ganhar-massa": "Ganhar Massa Muscular",
      "melhorar-saude": "Melhorar Saúde",
      "aumentar-resistencia": "Aumentar Resistência",
    }
    return goals.map((goal) => goalMap[goal] || goal).join(", ")
  }

  const getBodyTypeText = (bodyType: string) => {
    switch (bodyType) {
      case "ectomorfo":
        return "Ectomorfo"
      case "mesomorfo":
        return "Mesomorfo"
      case "endomorfo":
        return "Endomorfo"
      default:
        return "Não especificado"
    }
  }

  const getBMICategory = (imc: number) => {
    if (imc < 18.5) return { text: "Abaixo do peso", color: "text-blue-400" }
    if (imc >= 18.5 && imc < 25) return { text: "Peso normal", color: "text-lime-400" }
    if (imc >= 25 && imc < 30) return { text: "Sobrepeso", color: "text-yellow-400" }
    return { text: "Obesidade", color: "text-red-400" }
  }

  const getCurrentBodyFatImage = () => {
    const bodyFat = Number(data.bodyFat) || 25
    const gender = getDataValue("gender") || data.gender || "male"

    if (gender === "male") {
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
    const bodyFat = Number(data.bodyFat) || 25
    const gender = getDataValue("gender") || data.gender || "male"

    if (gender === "male") {
      if (bodyFat <= 10) return "/images/mone.webp" // Already at best
      if (bodyFat <= 15) return "/images/mone.webp"
      if (bodyFat <= 20) return "/images/mtwo.webp"
      if (bodyFat <= 25) return "/images/mthree.webp"
      if (bodyFat <= 30) return "/images/mfour.webp"
      if (bodyFat <= 35) return "/images/mfive.webp"
      if (bodyFat <= 39) return "/images/msix.webp"
      return "/images/mseven.webp"
    } else {
      if (bodyFat <= 10) return "/images/bodyfat-one.webp" // Already at best
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
    const bodyFat = Number(data.bodyFat) || 25
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
    const bodyFat = Number(data.bodyFat) || 25
    if (bodyFat <= 10) return "5-10%"
    if (bodyFat <= 15) return "5-10%"
    if (bodyFat <= 20) return "11-15%"
    if (bodyFat <= 25) return "16-20%"
    if (bodyFat <= 30) return "21-25%"
    if (bodyFat <= 35) return "26-30%"
    if (bodyFat <= 39) return "31-35%"
    return "36-39%"
  }

  const handleGoToCheckout = () => {
    if (!data) return
    router.push("/checkout")
  }

  const calculateDailyCalories = () => {
    if (!data) return 2425

    const weight = Number(data.weight) || 70
    const height = Number(data.height) || 170
    const age = Number(data.age) || 30
    const gender = data.gender || "male"

    // Harris-Benedict equation
    let bmr
    if (gender === "homem") {
      bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    } else {
      bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
    }

    // Activity factor based on training days
    const trainingDays = Number(data.trainingDays) || 3
    const activityFactor = trainingDays >= 5 ? 1.725 : trainingDays >= 3 ? 1.55 : 1.375

    // Goal adjustment
    let calories = bmr * activityFactor
    if (data.goal?.includes("perder-peso")) {
      calories -= 500 // Deficit for weight loss
    } else if (data.goal?.includes("ganhar-massa")) {
      calories += 300 // Surplus for muscle gain
    }

    return Math.round(calories)
  }

  const getWorkoutLocation = () => {
    console.log("[v0] getWorkoutLocation - data:", data)
    console.log("[v0] getWorkoutLocation - equipment:", getDataValue("equipment"))

    const equipment = getDataValue("equipment")
    if (!equipment || (Array.isArray(equipment) && equipment.length === 0)) {
      console.log("[v0] Returning 'Não definido' - data or equipment is missing")
      return "Não definido"
    }

    const equipmentArray = Array.isArray(equipment) ? equipment : [equipment]

    if (equipmentArray.includes("gym")) return "Academia"
    if (equipmentArray.includes("bodyweight")) return "Apenas peso corporal"
    if (equipmentArray.includes("dumbbells")) return "Halteres"

    return "Não definido"
  }

  const getFitnessLevel = () => {
    if (!data || !data.strengthTraining) return "Intermediário"
    if (data.strengthTraining === "sim-regularmente") return "Avançado"
    if (data.strengthTraining === "sim-ocasionalmente") return "Intermediário"
    if (data.strengthTraining === "nao") return "Iniciante"
    return "Intermediário"
  }

  const getTrainingFrequency = () => {
    const days = Number.parseInt(String(data?.trainingDays || "3"), 10) || 3
    return `${days}x por semana`
  }

  const getWorkoutDuration = () => {
    console.log("[v0] getWorkoutDuration - data:", data)
    console.log("[v0] getWorkoutDuration - workoutTime:", getDataValue("workoutTime"))

    const workoutTime = getDataValue("workoutTime")
    if (!workoutTime) {
      return "Não definido"
    }

    const durationMap: Record<string, string> = {
      "15-30": "15-30 minutos",
      "30-45": "30-45 minutos",
      "45-60": "45-60 minutos",
      "60+": "60+ minutos",
    }

    return durationMap[workoutTime] || workoutTime
  }

  const getAdditionalGoalsIcons = () => {
    const goals = data?.additionalGoals || []
    const iconMap = [
      { key: "reduzir-estresse", icon: Zap, label: "Reduzir estresse" },
      { key: "sentir-saudavel", icon: Heart, label: "Sentir-se mais saudável" },
      { key: "autodisciplina", icon: TargetIcon, label: "Autodisciplina" },
      { key: "formar-habito", icon: TrendingUp, label: "Formar hábito físico" },
      { key: "melhorar-sono", icon: Moon, label: "Melhorar o sono" },
    ]

    return iconMap.filter((item) => goals.includes(item.key))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p>Carregando seus resultados...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">Dados do quiz não encontrados</p>
          <button
            onClick={() => router.push("/quiz")}
            className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-lg transition-colors"
          >
            Refazer Quiz
          </button>
        </div>
      </div>
    )
  }

  const bmiInfo = getBMICategory(Number(data.imc))

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 md:p-8">
      {showPricing ? (
        <PricingSection gender={getDataValue("gender") || "male"} discount={discount || 0} />
      ) : (
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold">
              Parabéns, <span className="text-lime-400">{data.name || "Íay"}</span>!
            </h1>
            <p className="text-gray-300 text-lg">Seu plano personalizado está pronto</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
            <div className="grid grid-cols-2 gap-4 md:gap-8 items-center">
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-xs md:text-sm uppercase tracking-wide">Agora</p>
                <div className="flex justify-center">
                  <img
                    src={getCurrentBodyFatImage() || "/placeholder.svg"}
                    alt="Corpo atual"
                    className="w-32 h-48 md:w-40 md:h-64 object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs md:text-sm text-gray-400">Gordura corporal</p>
                  <p className="text-xl md:text-2xl font-bold text-yellow-400">{getCurrentBodyFatRange()}</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-xs md:text-sm uppercase tracking-wide">6 meses</p>
                <div className="flex justify-center">
                  <img
                    src={getImprovedBodyFatImage() || "/placeholder.svg"}
                    alt="Corpo melhorado"
                    className="w-32 h-48 md:w-40 md:h-64 object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs md:text-sm text-gray-400">Gordura corporal</p>
                  <p className="text-xl md:text-2xl font-bold text-lime-400">{getImprovedBodyFatRange()}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              *A imagem não se destina a representar o usuário. Os resultados variam por pessoa e não são garantidos.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Resumo pessoal baseado em suas respostas</h2>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-lime-500" />
                <h3 className="text-xl font-semibold">IMC Atual</h3>
              </div>
              <div className="text-center space-y-4">
                <div className={`text-6xl font-bold ${bmiInfo.color}`}>
                  <AnimatedCounter targetValue={currentIMC} onComplete={() => setIsBmiAnimationDone(true)} />
                </div>
                <div className="flex justify-center items-center gap-2 text-sm">
                  <span className="text-blue-400">Abaixo do peso</span>
                  <span className="text-lime-400 font-bold">Normal</span>
                  <span className="text-red-400">Obeso</span>
                </div>
                <AnimatedProgressBar
                  percentage={Math.min((Number(data.imc) / 40) * 100, 100)}
                  color={
                    Number(data.imc) < 18.5
                      ? "bg-blue-400"
                      : Number(data.imc) < 25
                        ? "bg-lime-500"
                        : Number(data.imc) < 30
                          ? "bg-yellow-400"
                          : "bg-red-400"
                  }
                />
                <p className="text-gray-300">
                  Você está com <span className={`font-bold ${bmiInfo.color}`}>{bmiInfo.text}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="text-xl font-semibold">Ingestão calórica diária recomendada</h3>
              </div>
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold text-lime-400">
                  <AnimatedCounter
                    targetValue={calculateDailyCalories()}
                    suffix=" "
                    delay={isBmiAnimationDone ? 0 : 99999}
                  />
                  <span className="text-2xl text-gray-400">kcal</span>
                </div>
                <AnimatedProgressBar
                  percentage={(calculateDailyCalories() / 5000) * 100}
                  color="bg-gradient-to-r from-lime-500 to-lime-400"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>0 kcal</span>
                  <span>5000 kcal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-center mb-6">
              Plano personalizado para {data.name || "você"} está pronto!
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl">
                <Clock className="h-8 w-8 text-lime-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Duração do Treino</p>
                  <p className="text-lg font-semibold">{getWorkoutDuration()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl">
                <MapPin className="h-8 w-8 text-lime-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Local do Treino</p>
                  <p className="text-lg font-semibold">{getWorkoutLocation()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl">
                <TrendingUp className="h-8 w-8 text-lime-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Nível de Fitness</p>
                  <p className="text-lg font-semibold">{getFitnessLevel()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl">
                <Calendar className="h-8 w-8 text-lime-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Frequência do Treino</p>
                  <p className="text-lg font-semibold">{getTrainingFrequency()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-4 text-center">Objetivos para o seu programa também incluem:</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {getAdditionalGoalsIcons().length > 0 ? (
                getAdditionalGoalsIcons().map((goal, index) => (
                  <div key={index} className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                      <goal.icon className="h-6 w-6 text-lime-400" />
                    </div>
                    <p className="text-sm">{goal.label}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                      <Zap className="h-6 w-6 text-lime-400" />
                    </div>
                    <p className="text-sm">Reduzir estresse</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                      <Heart className="h-6 w-6 text-lime-400" />
                    </div>
                    <p className="text-sm">Sentir-se mais saudável</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                      <TargetIcon className="h-6 w-6 text-lime-400" />
                    </div>
                    <p className="text-sm">Autodisciplina</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-lime-400" />
                    </div>
                    <p className="text-sm">Formar hábito físico</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                      <Moon className="h-6 w-6 text-lime-400" />
                    </div>
                    <p className="text-sm">Melhorar o sono</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-lime-500 to-lime-600 rounded-2xl p-6 md:p-8">
            <h3 className="text-2xl font-bold mb-6 text-white">O que você recebe:</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Dieta 100% personalizada em você</h4>
                  <p className="text-white/90 text-sm">
                    Plano de dieta claro, personalizado apenas para você, barato e fácil de seguir
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Programa de treino personalizado</h4>
                  <p className="text-white/90 text-sm">Plano de treino claro e fácil de seguir</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Resultados visíveis após o primeiro mês</h4>
                  <p className="text-white/90 text-sm">Veja mudanças reais em seu corpo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Acompanhamento de progresso</h4>
                  <p className="text-white/90 text-sm">Monitore sua evolução e ajuste conforme necessário</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
            <button
              onClick={handleGoToCheckout}
              className="w-full md:w-auto bg-white hover:bg-gray-100 text-black px-8 py-6 text-lg font-semibold rounded-full shadow-lg transition-colors"
            >
              Escolher Plano e Finalizar
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 pb-8">Baseado nos dados dos usuários do Fitgoal</p>

          {/* Roleta Section */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ganhe um Presente Especial!</h2>
            <p className="text-gray-400 text-lg">
              Parabéns por chegar até aqui! Gire a roleta para ganhar um desconto exclusivo no seu plano personalizado.
            </p>
            <div className="flex justify-center px-4">
              <button
                onClick={() => setShowWheel(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-8 rounded-2xl text-2xl font-black shadow-lg shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                GIRAR ROLETA
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Roleta Modal */}
      {showWheel && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm text-center space-y-8 relative overflow-hidden">
            <h3 className="text-2xl font-bold mb-4">Gire e ganhe desconto</h3>

            <div className={`w-64 h-64 rounded-full mx-auto mb-6 relative overflow-visible`}>
              <img
                src="/images/roleta.jpg"
                alt="Roleta de desconto"
                className="w-full h-full object-cover rounded-full"
              />

              {[10, 15, 20, 30, 40, 50].map((value, i) => (
                <div
                  key={i}
                  className="absolute flex items-center justify-center font-black text-sm w-8 h-8 rounded-full left-1/2 -ml-4 origin-[0_124px]"
                  style={{
                    transform: `rotate(${i * 60}deg) translateY(-112px)`,
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "#ef4444",
                    color: i % 2 === 0 ? "#ef4444" : "#ffffff",
                  }}
                >
                  {value}%
                </div>
              ))}

              {/* Decorative center point */}
              <div className="absolute left-1/2 top-1/2 -ml-2 -mt-2 w-4 h-4 bg-yellow-400 rounded-full shadow-lg" />

              <div
                className={`absolute w-1 h-24 bg-gradient-to-b from-red-600 to-red-700 shadow-lg transition-transform duration-[4000ms] ease-out`}
                style={{
                  left: "50%",
                  top: "-20px",
                  marginLeft: "-2px",
                  transformOrigin: "center 128px",
                  transform: discount ? `rotate(${1440 + discount * 60}deg)` : "rotate(0deg)",
                }}
              />

              {/* Pin triangle pointer at top */}
              <div
                className="absolute left-1/2 -top-4 -ml-2 w-0 h-0"
                style={{
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: "12px solid #fbbf24",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
            </div>

            {!discount ? (
              <div className="flex justify-center px-4">
                <button
                  onClick={() => {
                    const prizes = [10, 15, 20, 30, 40, 50]
                    setDiscount(prizes[Math.floor(Math.random() * prizes.length)])
                  }}
                  className="w-full max-w-md bg-red-600 hover:bg-red-700 h-16 rounded-2xl text-xl font-black shadow-lg shadow-red-600/20 text-white transition-colors"
                >
                  GIRAR E GANHAR!
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="text-4xl font-black text-lime-400">🎉 {discount}% OFF!</div>
                <p className="text-zinc-400 font-medium">Seu desconto especial foi aplicado.</p>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 animate-[progress_3s_linear]" />
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Preparando seu plano com desconto...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= SUB COMPONENTS ================= */

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
      <Icon className="text-lime-400" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle className="text-lime-400" />
      <p>{text}</p>
    </div>
  )
}

const AnimatedCounter = ({
  targetValue,
  suffix = "",
  prefix = "",
  delay = 0,
  onComplete,
}: { targetValue: number; suffix?: string; prefix?: string; delay?: number; onComplete?: () => void }) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [hasStarted, setHasStarted] = React.useState(false)
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  React.useEffect(() => {
    const delayTimer = setTimeout(() => {
      setHasStarted(true)
    }, delay)

    return () => clearTimeout(delayTimer)
  }, [delay])

  React.useEffect(() => {
    if (!hasStarted) return

    const duration = 3000
    const startTime = Date.now()
    let animationId: number

    const updateCounter = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = targetValue * easeProgress

      setDisplayValue(Number.parseFloat(currentValue.toFixed(1)))

      if (progress < 1) {
        animationId = requestAnimationFrame(updateCounter)
      } else {
        setDisplayValue(Number(targetValue.toFixed(1)))
        onCompleteRef.current?.()
      }
    }

    animationId = requestAnimationFrame(updateCounter)

    return () => cancelAnimationFrame(animationId)
  }, [hasStarted, targetValue])

  return (
    <span>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

const AnimatedProgressBar = ({ percentage, color }: { percentage: number; color: string }) => {
  const [displayPercentage, setDisplayPercentage] = React.useState(0)

  React.useEffect(() => {
    const duration = 1500 // 1.5 seconds
    const startTime = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentPercentage = percentage * easeProgress

      setDisplayPercentage(currentPercentage)

      if (progress < 1) {
        requestAnimationFrame(updateProgress)
      } else {
        setDisplayPercentage(percentage)
      }
    }

    requestAnimationFrame(updateProgress)
  }, [percentage])

  return (
    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full transition-all ${color}`} style={{ width: `${displayPercentage}%` }} />
    </div>
  )
}
