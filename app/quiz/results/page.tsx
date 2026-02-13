"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import Image from "next/image"
import SpinWheelSection from '@/components/SpinWheelSection'

export default function QuizResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState({ minutes: 4, seconds: 0 })
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "semiannual">("quarterly")
  const [barsVisible, setBarsVisible] = useState(false)
  const [expandedTestimonial, setExpandedTestimonial] = useState<string | null>(null)
  
  // ========== ESTADOS DA ROLETA ==========
  const [showSpinWheel, setShowSpinWheel] = useState(true)
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountPercentage, setDiscountPercentage] = useState(0)
  // ========================================

  // ========== FUNÇÃO QUANDO GANHA DESCONTO ==========
  const handleDiscountWon = (discount: number) => {
    setDiscountPercentage(discount)
    setDiscountApplied(true)
    setShowSpinWheel(false)
    // Salva no localStorage para usar no checkout
    localStorage.setItem('spinDiscount', JSON.stringify({
      discount: discount,
      timestamp: Date.now()
    }))
  }
  // ==================================================

  useEffect(() => {
    const fetchData = async () => {
      let stored: any = null

      if (typeof window !== "undefined") {
        const local = localStorage.getItem("quizData")
        if (local) {
          try {
            stored = JSON.parse(local)
            console.log("[v0] RESULTS_DATA_FOUND_IN_LOCALSTORAGE - Keys:", Object.keys(stored || {}))
          } catch (error) {
            console.error("[v0] RESULTS_LOCALSTORAGE_PARSE_ERROR:", error)
          }
        } else {
          console.log("[v0] RESULTS_NO_DATA_IN_LOCALSTORAGE")
        }
      }

      if (!stored && auth.currentUser) {
        console.log("[v0] RESULTS_FETCHING_FROM_FIREBASE - User ID:", auth.currentUser.uid)
        try {
          const ref = doc(db, "users", auth.currentUser.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            stored = snap.data()
            console.log("[v0] RESULTS_DATA_FOUND_IN_FIREBASE - Keys:", Object.keys(stored || {}))
            console.log("[v0] RESULTS_FIREBASE_DATA_EMAIL:", stored?.email)
            console.log("[v0] RESULTS_FIREBASE_DATA_NAME:", stored?.name)
          } else {
            console.log("[v0] RESULTS_NO_USER_DOC_FOUND_IN_FIREBASE - User ID:", auth.currentUser.uid)
          }
        } catch (error) {
          console.error("[v0] RESULTS_FIREBASE_FETCH_ERROR:", error)
        }
      } else if (!stored && !auth.currentUser) {
        console.log("[v0] RESULTS_NO_AUTH_USER_AND_NO_LOCALSTORAGE")
      }

      if (!stored) {
        console.log("[v0] RESULTS_NO_DATA_FOUND - REDIRECTING_TO_QUIZ after 2 seconds")
        setTimeout(() => {
          router.push("/quiz")
        }, 2000)
        return
      }

      console.log("[v0] RESULTS_DATA_LOADED_SUCCESSFULLY")
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
      // Use new target image for males showing ideal physique
      return "/images/target-male-fit.webp"
    } else {
      // Use new target image for females showing ideal physique
      return "/images/target-female-fit.webp"
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
    const weight = Number(data?.currentWeight) || 70
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

  const getPlanName = () => {
    switch (selectedPlan) {
      case "monthly":
        return "Plano Mensal"
      case "quarterly":
        return "Plano Trimestral"
      case "semiannual":
        return "Plano Semestral"
      default:
        return "Plano Trimestral"
    }
  }

  const handleCheckout = () => {
    const planKey = getPlanKey()
    const planName = getPlanName()
    const planPrice = "239.90"
    router.push(`/checkout?planKey=${planKey}&planName=${encodeURIComponent(planName)}&planPrice=${planPrice}`)
  }

  // === NORMALIZADORES E BUILDERS ===
  type GoalCategory = "cut" | "bulk" | "maintain"

  const normalizeStr = (v: any) =>
    String(v ?? "")
      .trim()
      .toLowerCase()

  const getGoalCategory = (): GoalCategory => {
    const raw = normalizeStr(getDataValue("goal") ?? data?.goal)
    if (raw.includes("perder-peso")) return "cut"
    if (raw.includes("ganhar-massa")) return "bulk"
    return "maintain"
  }

  const getBodyFatNumber = (): number => {
    const bf = Number(data?.bodyFat ?? getDataValue("bodyFat"))
    return Number.isFinite(bf) ? bf : 25
  }

  const getExperienceLevel = (): "beginner" | "intermediate" | "advanced" => {
    const exp = normalizeStr(getDataValue("strengthTraining") ?? data?.strengthTraining)
    if (exp.includes("avanç") || exp.includes("advanced")) return "advanced"
    if (exp.includes("inter") || exp.includes("intermediate")) return "intermediate"
    return "beginner"
  }

  const getTrainingDays = (): number => {
    const td = Number(getDataValue("trainingDays") ?? data?.trainingDays)
    return Number.isFinite(td) ? td : 3
  }

  const getCaloriesGoal = (): number | null => {
    const c = Number(getDataValue("calorieGoal") ?? data?.calorieGoal)
    if (!Number.isFinite(c)) return null
    return Math.round(c)
  }

  const getTimeToGoal = (): string | null => {
    const v = getDataValue("timeToGoal") ?? data?.timeToGoal
    if (!v) return null
    const s = String(v).trim()
    return s.length ? s : null
  }

  const buildDynamicSummary = () => {
    const goalCat = getGoalCategory()
    const bf = getBodyFatNumber()
    const level = getExperienceLevel()
    const days = getTrainingDays()
    const calories = getCaloriesGoal()
    const timeToGoal = getTimeToGoal()

    // 1) Headline (1 linha)
    const headline =
      goalCat === "bulk"
        ? "Estratégia: ganho de massa com superávit controlado"
        : goalCat === "cut"
          ? "Estratégia: perda de gordura com déficit sustentável"
          : "Estratégia: recomposição/manutenção com consistência"

    // 2) Bullet 1 (BF -> direção)
    let bulletBF: string
    if (bf > 18) {
      bulletBF =
        goalCat === "bulk"
          ? "Prioridade: controlar gordura — superávit mínimo para evitar ganho desnecessário."
          : "Prioridade: controlar gordura — déficit moderado para preservar massa magra."
    } else if (bf >= 12) {
      bulletBF =
        goalCat === "bulk"
          ? "Equilíbrio entre performance e estética — subimos calorias sem perder definição."
          : "Equilíbrio e constância — ajuste calórico para resultados sem radicalismo."
    } else {
      bulletBF =
        goalCat === "bulk"
          ? "Ambiente favorável para ganhar massa — podemos subir calorias com mais segurança mantendo a definição."
          : "Boa base de definição — foco em desempenho e ajustes finos de composição corporal."
    }

    // 3) Bullet 2 (nível -> método)
    let bulletLevel: string
    if (level === "beginner") {
      bulletLevel = "Treino focado em técnica + consistência — progressão simples para evoluir semana a semana."
    } else if (level === "intermediate") {
      bulletLevel = "Treino com progressão estruturada — volume e intensidade calibrados para continuar evoluindo sem estagnar."
    } else {
      bulletLevel = "Treino com estímulos precisos — distribuição de volume e recuperação otimizadas para máximo desempenho."
    }

    // 4) Bullet 3 (dias + calorias -> racional curto)
    const daysText =
      days >= 5 ? `com alta frequência semanal x${days}` : days >= 3 ? `com frequência semanal consistente x${days}` : `com frequência semanal reduzida x${days}`

    let bulletCalories: string
    if (calories) {
      bulletCalories =
        goalCat === "bulk"
          ? `Meta calórica inicial: ~${calories} kcal/dia — para sustentar ganho de massa e recuperação (${daysText}).`
          : goalCat === "cut"
            ? `Meta calórica inicial: ~${calories} kcal/dia — para perder gordura mantendo desempenho (${daysText}).`
            : `Meta calórica inicial: ~${calories} kcal/dia — para manter o peso com performance (${daysText}).`
    } else {
      bulletCalories =
        goalCat === "bulk"
          ? `Meta calórica inicial definida para sustentar ganho de massa e recuperação (${daysText}).`
          : goalCat === "cut"
            ? `Meta calórica inicial definida para perder gordura mantendo desempenho (${daysText}).`
            : `Meta calórica inicial definida para manter o peso com performance (${daysText}).`
    }

    // 5) Nota "anti-golpe" (sempre)
    const trustNote =
      "Seu treino detalhado (exercícios, séries e progressão) e sua dieta completa (refeições, quantidades e substituições) são gerados sob demanda após a confirmação do pagamento — não usamos planos prontos."

    // 6) Nota para prazo (opcional)
    const etaNote = timeToGoal
      ? `Projeção de prazo: ${timeToGoal}. Estimativa baseada em consistência e adesão ao plano.`
      : null

    return {
      headline,
      bullets: [bulletBF, bulletLevel, bulletCalories],
      trustNote,
      etaNote,
    }
  }

  if (loading || !data) {
    return <div />
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
          {/* Open checkout page instead of modal */}
          <button
            onClick={handleCheckout}
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
            <h3 className="text-3xl font-bold text-white mb-6">Análise do seu perfil e estratégia do plano:</h3>
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
                  {getDataValue("currentWeight") ? Number(getDataValue("currentWeight")).toFixed(1) : "—"} kg
                </p>
              </div>

              {/* IMC */}
              <div>
                <p className="text-gray-400 text-sm mb-2">IMC</p>
                <p
                  className={`text-xl font-semibold ${(() => {
                    if (!getDataValue("currentWeight") || !getDataValue("height")) return "text-white"
                    const imc = Number(getDataValue("currentWeight")) / (Number(getDataValue("height")) / 100) ** 2
                    if (imc < 18.5) return "text-blue-400"
                    if (imc < 25) return "text-green-400"
                    return "text-red-400"
                  })()}`}
                >
                  {getDataValue("currentWeight") && getDataValue("height")
                    ? (Number(getDataValue("currentWeight")) / (Number(getDataValue("height")) / 100) ** 2).toFixed(1)
                    : "—"}
                </p>
              </div>

              {/* Meta de Calorias */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Meta de Calorias</p>
                <p className="text-white text-xl font-semibold">{getDataValue("calorieGoal") ? Math.round(Number(getDataValue("calorieGoal"))) : "—"} kcal</p>
              </div>


              {/* Meta de Peso */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Meta de Peso</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("targetWeight") ? Number(getDataValue("targetWeight")).toFixed(1) : "—"} kg
                </p>
              </div>

              {/* Data para atingir objetivo - Full width */}
              <div className="col-span-2">
                <p className="text-gray-400 text-sm mb-2">Data para atingir objetivo</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("timeToGoal") || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-gray-400 text-sm mt-4 text-center">Usamos esses dados para definir volume de treino e ingestão calórica.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 4 - Decisões Principais */}
        {(() => {
          const s = buildDynamicSummary()
          return (
            <div className="max-w-5xl mx-auto mt-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">{s.headline}</h3>
              <ul className="space-y-4 text-gray-300">
                {s.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-orange-400 font-bold flex-shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}

        {/* Bloco 6 - Prazo Estimado */}
        <div className="max-w-5xl mx-auto mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">Projeção de prazo realista:</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Estimativa para atingir seu objetivo</p>
              <p className="text-white text-3xl font-bold text-lime-400">{getTimeToGoal() || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm border-t border-slate-700/50 pt-4">
            ⚠️ Estimativa baseada em consistência e adesão ao plano{getTrainingDays() >= 3 ? ` com frequência de ${getTrainingDays()}x por semana` : ""}.
          </p>
        </div>

        {/* Bloco 7 - Ponte para Pagamento */}
        <div className="max-w-5xl mx-auto mt-8 bg-gradient-to-br from-lime-900/30 to-lime-900/10 border border-lime-700/50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-lime-400 mb-4">O que acontece agora:</h3>
          <p className="text-gray-200 leading-relaxed">
            Seu treino detalhado <span className="text-lime-400 font-semibold">(exercícios, séries, progressão e técnicas)</span> e sua dieta completa <span className="text-lime-400 font-semibold">(refeições, quantidades exatas e substituições)</span> serão gerados sob demanda imediatamente após a confirmação do pagamento.
          </p>
          <p className="text-gray-400 text-sm mt-4 pt-4 border-t border-lime-700/30">
            Tudo personalizado para seu perfil e objetivo específico.
          </p>
        </div>

        <div className="max-w-5xl mx-auto mt-16">
          <h2 className="text-4xl font-bold text-center mb-8">Programa FitGoal Personal Engine™:</h2>

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
                  <p className="text-orange-400 font-bold mt-2 line-through text-gray-500">R$ 129</p>
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
                  <p className="text-orange-400 font-bold mt-2 line-through text-gray-500">R$ 149</p>
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
                  <p className="text-orange-400 font-bold mt-2 line-through text-gray-500">R$ 97</p>
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
                  <p className="text-orange-400 font-bold mt-2 line-through text-gray-500">R$ 79</p>
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
                  Com a gente: de <span className="text-orange-400">R$ 59,95</span> a{" "}
                  <span className="text-orange-400">R$ 79,90</span> por mês
                </p>
              </div>
            </div>
          </div>

          {/* ========== SEÇÃO DA ROLETA ========== */}
          {showSpinWheel && !discountApplied && (
            <div>
              <SpinWheelSection onDiscountWon={handleDiscountWon} />
            </div>
          )}
          {/* ===================================== */}

          {/* Promo code banner */}
          <div className="bg-orange-400 rounded-xl p-1 mt-8">
            <div className="bg-black rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span className="text-white font-semibold">
                  {discountApplied ? 'Seu código promo foi aplicado!' : 'Possui código de desconto?'}
                </span>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3">
                  <p className="text-white font-mono text-lg">
                    {discountApplied ? 'SHAPE70' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-12">
            {/* Monthly Plan */}
            <div
              onClick={() => setSelectedPlan("monthly")}
              className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${selectedPlan === "monthly"
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
              <div className="text-3xl font-bold text-white mb-1">
                {discountApplied ? (
                  <>
                    <span className="line-through text-gray-500 text-lg mr-2">R$ 266,33</span>
                    <span className="text-orange-400">R$ 79,90</span>
                  </>
                ) : 'R$ 266,33'}
              </div>
              <div className="text-gray-500 text-xs">por mês</div>
            </div>

            {/* Quarterly Plan - Featured */}
            <div
              onClick={() => setSelectedPlan("quarterly")}
              className={`bg-black border-2 rounded-lg p-6 relative cursor-pointer transition duration-300 ${selectedPlan === "quarterly"
                ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/20"
                : "border-gray-700"
                }`}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                MAIS POPULAR
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Plano Trimestral</h3>
                <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <div className="text-gray-400 text-sm mb-3">Acesso completo por 90 dias</div>
              <div className="text-3xl font-bold text-white mb-1">
                {discountApplied ? (
                  <>
                    <span className="line-through text-gray-500 text-lg mr-2">R$ 533,00</span>
                    <span className="text-orange-400">R$ 159,90</span>
                  </>
                ) : 'R$ 533,00'}
              </div>
              <div className="text-gray-500 text-xs">por trimestre</div>
            </div>

            {/* Semi-annual Plan */}
            <div
              onClick={() => setSelectedPlan("semiannual")}
              className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${selectedPlan === "semiannual"
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
              <div className="text-3xl font-bold text-white mb-1">
                {discountApplied ? (
                  <>
                    <span className="line-through text-gray-500 text-lg mr-2">R$ 799,67</span>
                    <span className="text-orange-400">R$ 239,90</span>
                  </>
                ) : 'R$ 799,67'}
              </div>
              <div className="text-gray-500 text-xs">por semestre</div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-500 mb-8">
            Sem cancelamento automático antes do final do período para planos, concordo que o Fitgoal cobrará
            automaticamente no final do plano escolhido ou até eu cancelar. Cancele online via perfil, no{" "}
            <span className="underline">site</span> ou app.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button
              onClick={handleCheckout}
              className="px-12 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition"
            >
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
                  <div>
                    <p className="text-white font-bold">Programa de treino progressivo</p>
                    <p className="text-gray-400 text-sm">Adequado ao seu nível de forma física e objetivo</p>
                  </div>
                </div>

                {/* Highlight 2 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0zm2-8a1 1 0 01.967.25l2.5 6.526a1 1 0 01-.5 1.3H17v6a2 2 0 01-2 2h.5a1 1 0 000-2 2 2 0 01-2-2 9 9 0 11-9 9 5 5 0 018-9H9a1 1 0 000 2h2a1 1 0 100-2H4.5a1 1 0 000 2H4a2 2 0 01-2 2v-6h2a2 2 0 012-2h.5z"></path>
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
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414 1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">Top exercícios para os seus objetivos</p>
                    <p className="text-gray-400 text-sm">Que atingem cada grupo muscular do corpo</p>
                  </div>
                </div>

                {/* Highlight 4 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 12a6 6 0 11-12 0 6 6 0 0112 0zM12.5 1a.5.5 0 01.5.5v2a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5zM15.854 3.146a.5.5 0 010 .708l-1.414 1.414a.5.5 0 01-.708-.708l1.414-1.414a.5.5 0 01.708 0zM18 6.5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM15.854 10.854a.5.5 0 01-.708 0l-1.414-1.414a.5.5 0 01.708-.708l1.414 1.414a.5.5 0 010 .708zM12.5 14a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5z"></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">Treinos 100% personalizados para VOCÊ</p>
                    <p className="text-gray-400 text-sm">
                      Desenvolvido para te ajudar a chegar no seu objetivo o mais rápido e saudável possível
                    </p>
                  </div>
                </div>

                {/* Highlight 5 */}
                <div className="flex gap-4">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 01-1zM5.05 6.051a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707zM3 9a1 1 0 100 2v4a2 2 0 100 4h12a2 2 0 100-4V9a1 1 0 100-2H3z"></path>
                  </svg>
                  <div>
                    <p className="text-white font-bold">Plano de refeições personalizado</p>
                    <p className="text-gray-400 text-sm">
                      Dieta 100% personalizada pensando em VOCÊ, para atingir seu objetivo mais rápido
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
                      Faça exercicios em casa ou fora com equipamento mínimo ou nenhum
                    </p>
                  </div>
                </div>
              </div>

              {/* Right column - Video */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-sm">
                  {/* Video player with rounded edges and border */}
                  <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-4 border border-gray-700">
                    <video
                      className="bg-black rounded-2xl w-full h-auto"
                      autoPlay
                      loop
                      muted
                      playsInline
                    >
                      <source src="/videos/iphone-mockup-demo.mp4" type="video/mp4" />
                      Seu navegador não suporta reprodução de vídeo.
                    </video>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results that make us proud section with testimonials */}
          <section className="py-20 bg-black">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-4xl font-bold text-center text-white mb-12">Resultados que nos deixam orgulhosos</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Testimonial 1 - Brandon */}
                <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                  <img
                    src="/images/5123122014301391780.jpg"
                    alt="Brandon - Transformação antes e depois"
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-6 space-y-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Brandon</h3>
                      <span className="text-orange-400 font-bold text-lg">-15 kg</span>
                    </div>
                    <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "brandon" ? "" : "line-clamp-3"}`}>
                      Olá, estou usando seus treinos e comecei há cerca de 4-5 meses atrás e só queria dizer obrigado,
                      você fez um ótimo trabalho, realmente vi um transformação incrível!
                    </p>
                    <button
                      onClick={() => setExpandedTestimonial(expandedTestimonial === "brandon" ? null : "brandon")}
                      className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                    >
                      {expandedTestimonial === "brandon" ? "Ver menos" : "Ler mais"}
                    </button>
                  </div>
                </div>

                {/* Testimonial 2 - Peter */}
                <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                  <img
                    src="/images/5123122014301391779.jpg"
                    alt="Peter - Transformação antes e depois"
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-6 space-y-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Peter</h3>
                      <span className="text-orange-400 font-bold text-lg">-5 kg</span>
                    </div>
                    <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "peter" ? "" : "line-clamp-3"}`}>
                      Os vídeos são muito úteis e fáceis de entender. Os conselhos do seu consultor funcionam bem
                      comigo. Consigo dormir cedo agora e tenho mais energia durante o dia!
                    </p>
                    <button
                      onClick={() => setExpandedTestimonial(expandedTestimonial === "peter" ? null : "peter")}
                      className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                    >
                      {expandedTestimonial === "peter" ? "Ver menos" : "Ler mais"}
                    </button>
                  </div>
                </div>

                {/* Testimonial 3 - Kevin */}
                <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                  <img
                    src="/images/5123122014301391781.jpg"
                    alt="Kevin - Transformação antes e depois"
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-6 space-y-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Kevin</h3>
                      <span className="text-orange-400 font-bold text-lg">-13 kg</span>
                    </div>
                    <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "kevin" ? "" : "line-clamp-3"}`}>
                      Comecei com cerca de 200 lbs e agora estou com um peso saudável e magro 172. Adorei a experiência com os planos personalizados!
                    </p>
                    <button
                      onClick={() => setExpandedTestimonial(expandedTestimonial === "kevin" ? null : "kevin")}
                      className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                    >
                      {expandedTestimonial === "kevin" ? "Ver menos" : "Ler mais"}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                *Disclaimer: Usuários do FITGOAL compartilharam seu feedback. Este usuário teve acesso a treinamento
                personalizado, recursos adicionais de pagamento. Os seguintes exercícios e os planos são a chave em sua
                jornada de fitness e resultados geralmente aparecem em 4 semanas. Os resultados podem variar por pessoa
                e não são garantidos.
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
                    aesthetic, combinando treinos passo a passo e um plano de refeições 100% personalizado. Nossos
                    treinos e dietas garantem a forma correta e ajudam você a manter a consistência e a motivação,
                    tornando a perda de peso mais alcançável e sustentável uma vez que tudo é 100% personalizado para
                    você de acordo com as informações que coletamos no quiz.
                  </p>
                </details>

                {/* FAQ Item 2 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Quais são os benefícios dos planos FITGOAL em comparação com concorrentes?
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
                    Os nossos planos são 100% personalizados para VOCÊ, tanto a dieta quanto o treino, enquanto os
                    nossos concorrentes te enviam planos genéricos nós vamos mais a fundo garantindo eficiência e
                    resultados desde que você se comprometa com os nossos planos de treino e dieta, além disso temos
                    orgulho do nosso suporte que te ajudará a ajustar qualquer coisa ou tirar dúvidas, se você
                    simplesmente quer tentar algo que dê RESULTADOS, inovador e divertido. Obtenha seu plano e
                    experimente agora!
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
                    Forneceremos lembretes suaves, conselhos de especialistas, ferramentas de rastreamento úteis e apoio
                    constante para ajudá-lo a ver o progresso e manter-se consistente. Dessa forma, você pode alcançar
                    seus objetivos e desfrutar de um corpo mais saudável e em forma sem o medo de desistir.
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
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
                Obtenha resultados visíveis em 4 semanas!
              </h2>

              {/* Promo code banner */}
              <div className="bg-orange-400 rounded-xl p-1 mb-8">
                <div className="bg-black rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                    <span className="text-white font-semibold">
                      {discountApplied ? 'Seu código promo foi aplicado!' : 'Possui código de desconto?'}
                    </span>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3">
                      <p className="text-white font-mono text-lg">
                        {discountApplied ? 'SHAPE70' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Monthly Plan */}
                <div
                  onClick={() => setSelectedPlan("monthly")}
                  className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${selectedPlan === "monthly"
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
                  <div className="text-3xl font-bold text-white mb-1">
                    {discountApplied ? (
                      <>
                        <span className="line-through text-gray-500 text-lg mr-2">R$ 266,33</span>
                        <span className="text-orange-400">R$ 79,90</span>
                      </>
                    ) : 'R$ 266,33'}
                  </div>
                  <div className="text-gray-500 text-xs">por mês</div>
                </div>

                {/* Quarterly Plan - Featured */}
                <div
                  onClick={() => setSelectedPlan("quarterly")}
                  className={`bg-black border-2 rounded-lg p-6 relative cursor-pointer transition duration-300 ${selectedPlan === "quarterly"
                    ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/20"
                    : "border-gray-700"
                    }`}
                >
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Plano Trimestral</h3>
                    <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div className="text-gray-400 text-sm mb-3">Acesso completo por 90 dias</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {discountApplied ? (
                      <>
                        <span className="line-through text-gray-500 text-lg mr-2">R$ 533,00</span>
                        <span className="text-orange-400">R$ 159,90</span>
                      </>
                    ) : 'R$ 533,00'}
                  </div>
                  <div className="text-gray-500 text-xs">por trimestre</div>
                </div>

                {/* Semi-annual Plan */}
                <div
                  onClick={() => setSelectedPlan("semiannual")}
                  className={`bg-black border rounded-lg p-6 cursor-pointer transition duration-300 ${selectedPlan === "semiannual"
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
                  <div className="text-3xl font-bold text-white mb-1">
                    {discountApplied ? (
                      <>
                        <span className="line-through text-gray-500 text-lg mr-2">R$ 799,67</span>
                        <span className="text-orange-400">R$ 239,90</span>
                      </>
                    ) : 'R$ 799,67'}
                  </div>
                  <div className="text-gray-500 text-xs">por semestre</div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-gray-400 text-sm text-center mb-8 max-w-2xl mx-auto">
                Sem cancelamento automático antes do final do período para planos, concordo que o Fitgoal cobrará
                automaticamente no final do plano escolhido ou até eu cancelar. Cancele online via perfil, no site ou
                app.
              </p>

              {/* CTA Button */}
              <div className="text-center mb-16">
                <button
                  onClick={handleCheckout}
                  className="bg-white text-black font-bold px-12 py-3 rounded-full hover:bg-gray-100 transition"
                >
                  DESTRAVAR MEUS RESULTADOS
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
                  semanas! Estamos até dispostos a devolver seu dinheiro se você puder demonstrar que seguiu o plano mas
                  não viu nenhum resultado.
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
            <p className="mb-4">Fitgoal | Escritório No. 101, 1º Andar, Avenida Paulista, São Paulo</p>
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
      </main>
    </div>
  )
}
