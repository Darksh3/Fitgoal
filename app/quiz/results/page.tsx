"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, TrendingUp, Calendar, CheckCircle, Heart, Flame, Moon, TargetIcon, Zap } from "lucide-react"
import { Gauge } from "@/components/gauge"

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

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
    }

    fetchData()
  }, [router])

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
    const gender = data.gender || "male"

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
    const gender = data.gender || "male"

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
    if (!data || !data.equipment || data.equipment.length === 0) return "Não definido"
    if (data.equipment.includes("gym")) return "Academia"
    if (data.equipment.includes("bodyweight") && data.equipment.length === 1) return "Casa"
    return "Academia ou Casa"
  }

  const getFitnessLevel = () => {
    if (!data || !data.strengthTraining) return "Intermediário"
    if (data.strengthTraining === "sim-regularmente") return "Avançado"
    if (data.strengthTraining === "sim-ocasionalmente") return "Intermediário"
    return "Iniciante"
  }

  const getTrainingFrequency = () => {
    const days = Number(data?.trainingDays) || 3
    return `${days}x por semana`
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
          <Button onClick={() => router.push("/quiz")} className="bg-lime-500 hover:bg-lime-600">
            Refazer Quiz
          </Button>
        </div>
      </div>
    )
  }

  const bmiInfo = getBMICategory(Number(data.imc))

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Heart className="h-5 w-5 text-lime-500" />
              <h3 className="text-xl font-semibold">Análise do seu IMC</h3>
            </div>
            <Gauge
              value={Number(data.imc)}
              maxValue={40}
              label={`Calculamos o seu IMC e ele é de ${data.imc}`}
              showPercentage={false}
            />
            <p className="text-center text-gray-300 mt-4">
              Você está com <span className={`font-bold ${bmiInfo.color}`}>{bmiInfo.text}</span>
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Flame className="h-5 w-5 text-orange-500" />
              <h3 className="text-xl font-semibold">Ingestão calórica diária</h3>
            </div>
            <Gauge
              value={calculateDailyCalories()}
              maxValue={5000}
              unit="kcal"
              label={`Ingestão de calorias do seu perfil`}
              showPercentage={false}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Resumo pessoal baseado em suas respostas</h2>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-lime-500" />
              <h3 className="text-xl font-semibold">IMC Atual</h3>
            </div>
            <div className="text-center space-y-4">
              <div className={`text-6xl font-bold ${bmiInfo.color}`}>{data.imc}</div>
              <div className="flex justify-center items-center gap-2 text-sm">
                <span className="text-blue-400">Abaixo do peso</span>
                <span className="text-lime-400 font-bold">Normal</span>
                <span className="text-red-400">Obeso</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${Number(data.imc) < 18.5 ? "bg-blue-400" : Number(data.imc) < 25 ? "bg-lime-500" : Number(data.imc) < 30 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min((Number(data.imc) / 40) * 100, 100)}%` }}
                />
              </div>
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
                {calculateDailyCalories()} <span className="text-2xl text-gray-400">kcal</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-lime-500 to-lime-400"
                  style={{ width: `${(calculateDailyCalories() / 5000) * 100}%` }}
                />
              </div>
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
                <p className="text-lg font-semibold">{data.workoutTime || "1 hora"}</p>
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
          <Button
            onClick={handleGoToCheckout}
            className="w-full md:w-auto bg-lime-500 hover:bg-lime-600 text-white px-8 py-6 text-lg font-semibold rounded-full"
          >
            Escolher Plano e Finalizar
          </Button>
          <Button
            onClick={() => router.push("/dashboard/assinatura")}
            variant="outline"
            className="w-full md:w-auto border-lime-500 text-lime-500 hover:bg-lime-500/10 px-8 py-6 text-lg font-semibold rounded-full"
          >
            Acessar Dashboard
          </Button>
        </div>

        <p className="text-center text-xs text-gray-500 pb-8">Baseado nos dados dos usuários do Fitgoal</p>
      </div>
    </div>
  )
}
