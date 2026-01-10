"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Heart, Zap, TargetIcon, Moon, TrendingUp, ChevronRight, Check, Star } from "lucide-react"
import { ScratchCard } from "@/components/scratch-card"

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

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
    const bodyFat = Number(data.bodyFat) || 25
    const gender = getDataValue("gender") || data.gender || "male"
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

  const calculateDailyCalories = () => {
    if (!data) return 2425
    const weight = Number(data.weight) || 70
    const height = Number(data.height) || 170
    const age = Number(data.age) || 30
    const gender = data.gender || "male"

    let bmr
    if (gender === "homem") {
      bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    } else {
      bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
    }

    const trainingDays = Number(data.trainingDays) || 3
    const activityFactor = trainingDays >= 5 ? 1.725 : trainingDays >= 3 ? 1.55 : 1.375

    let calories = bmr * activityFactor
    if (data.goal?.includes("perder-peso")) {
      calories -= 500
    } else if (data.goal?.includes("ganhar-massa")) {
      calories += 300
    }

    return Math.round(calories)
  }

  const getWorkoutLocation = () => {
    const equipment = getDataValue("equipment")
    if (!equipment || (Array.isArray(equipment) && equipment.length === 0)) {
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

  const handleGoToCheckout = () => {
    if (!data) return
    router.push("/checkout")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Carregando seus resultados...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">Dados do quiz não encontrados</p>
          <button
            onClick={() => router.push("/quiz")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 font-semibold rounded-full transition-colors"
          >
            Refazer Quiz
          </button>
        </div>
      </div>
    )
  }

  const currentBodyImage = getCurrentBodyFatImage()
  const improvedBodyImage = getImprovedBodyFatImage()
  const currentBodyFatRange = getCurrentBodyFatRange()
  const improvedBodyFatRange = getImprovedBodyFatRange()
  const dailyCalories = calculateDailyCalories()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Seu Plano</h1>
          <button
            onClick={handleGoToCheckout}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-semibold transition-colors"
          >
            Começar Agora
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16">
            Seu Plano de Treino
            <br />
            Personalizado está pronto!
          </h2>

          {/* Character Comparison */}
          <div className="bg-gray-900 rounded-2xl p-12 mb-12">
            <div className="flex justify-between items-end gap-8 mb-8">
              <div className="flex-1 text-center">
                <p className="text-gray-400 mb-4">Agora</p>
                <img
                  src={currentBodyImage || "/placeholder.svg"}
                  alt="Você agora"
                  className="w-full h-96 object-contain mb-4"
                />
                <p className="text-lg font-semibold">{currentBodyFatRange}</p>
              </div>

              <div className="flex items-end justify-center pb-24">
                <ChevronRight className="w-12 h-12 text-gray-600" />
              </div>

              <div className="flex-1 text-center">
                <p className="text-gray-400 mb-4">Em 4 Semanas</p>
                <img
                  src={improvedBodyImage || "/placeholder.svg"}
                  alt="Você em 4 semanas"
                  className="w-full h-96 object-contain mb-4"
                />
                <p className="text-lg font-semibold text-lime-400">{improvedBodyFatRange}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-700">
              <div>
                <p className="text-gray-400 text-sm mb-2">Calorias Diárias</p>
                <p className="text-2xl font-bold">{dailyCalories} kcal</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Frequência</p>
                <p className="text-2xl font-bold">{data.trainingDays || 3}x por semana</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold mb-4">Escolha Seu Plano</h3>
            <button
              onClick={handleGoToCheckout}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-colors"
            >
              Ver Planos
            </button>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold mb-12">Destaques do Seu Plano</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-lime-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2">Programa personalizado</h4>
                <p className="text-gray-400">Treino customizado baseado no seu nível e objetivos</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-lime-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2">Progressão semanal</h4>
                <p className="text-gray-400">Aumente a intensidade conforme você melhora</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-lime-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2">Plano de nutrição</h4>
                <p className="text-gray-400">{dailyCalories} calorias diárias com recomendações de macro</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-lime-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2">Acompanhamento</h4>
                <p className="text-gray-400">Monitore seu progresso e obtenha ajustes conforme necessário</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Confiem 10+ milhões de pessoas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 p-6 rounded-lg">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4">
                  "Transformação incrível! Os resultados em 4 semanas foram melhores do que esperava."
                </p>
                <p className="font-semibold">Usuário Verificado</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-8">Comece Sua Transformação</h3>
          <button
            onClick={handleGoToCheckout}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-full font-bold text-lg transition-colors mb-4"
          >
            Ver Planos Agora
          </button>
          <p className="text-gray-400 text-sm">Garantia de reembolso de 30 dias. Sem riscos.</p>
        </div>
      </section>

      {/* Scratch Card Section */}
      <section className="py-16 px-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6">
        <ScratchCard
          discount={20}
          onReveal={() => {
            // Optional callback when discount is revealed
          }}
        />
      </section>
    </div>
  )
}
