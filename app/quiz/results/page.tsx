"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import Image from "next/image"
import SpinWheelSection from '@/components/SpinWheelSection'
import { usePixel } from "@/components/pixel-tracker"

export default function QuizResultsPage() {
  const router = useRouter()
  const { trackViewContent, trackPlanView, trackInitiateCheckout } = usePixel()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState({ minutes: 10, seconds: 0 })
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "semiannual">("monthly")
  const [barsVisible, setBarsVisible] = useState(false)
  const [expandedTestimonial, setExpandedTestimonial] = useState<string | null>(null)

  // ========== ESTADOS DA ROLETA ==========
  const [showSpinWheel, setShowSpinWheel] = useState(true)
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountPercentage, setDiscountPercentage] = useState(0)
  // ========================================

  // ========== FUNÃÃO QUANDO GANHA DESCONTO ==========
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

  // Rastrear ViewContent e PlanView quando a pÃ¡gina de resultados carrega
  useEffect(() => {
    trackViewContent({
      content_name: 'Resultado Quiz',
      content_category: 'quiz_result',
    })
    trackPlanView()
  }, [trackViewContent, trackPlanView])

  useEffect(() => {
    const fetchData = async () => {
      let stored: any = null

      if (typeof window !== "undefined") {
        const local = localStorage.getItem("quizData")
        if (local) {
          try {
            stored = JSON.parse(local)
          } catch (error) {
            console.error("RESULTS_LOCALSTORAGE_PARSE_ERROR:", error)
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

      // Track that user visited results page
      const userId = localStorage.getItem('clientUid')
      if (userId) {
        try {
          const leadRef = doc(db, 'leads', userId)
          await updateDoc(leadRef, {
            visitedResults: true,
            visitedResultsAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          })
        } catch (error) {
          console.error("[v0] Error tracking results visit:", error)
        }
      }
    }

    fetchData()
  }, [router])

  useEffect(() => {
    // SÃ³ inicia o timer apÃ³s o desconto ser aplicado
    if (!discountApplied) return

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
  }, [discountApplied])

  const getDataValue = (key: string) => {
    console.log(`[v0] getDataValue('${key}'):`, {
      "data[key]": data?.[key],
      "data.quizData[key]": data?.quizData?.[key],
      "fullData": data
    })
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
      case "intermediÃ¡rio":
        return 50
      case "avanÃ§ado":
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

  const getPlanPrice = () => {
    switch (selectedPlan) {
      case "monthly":
        return "59.90"
      case "quarterly":
        return "159.90"
      case "semiannual":
        return "239.90"
      default:
        return "159.90"
    }
  }

  const handleCheckout = async () => {
    const planKey = getPlanKey()
    const planName = getPlanName()
    const planPrice = getPlanPrice()

    // Rastrear InitiateCheckout apenas uma vez por sessÃ£o
    if (typeof window !== 'undefined') {
      const initiateCheckoutTracked = sessionStorage.getItem('initiateCheckout_tracked')
      if (!initiateCheckoutTracked) {
        trackInitiateCheckout({
          value: parseFloat(planPrice),
          currency: 'BRL',
          content_name: planName,
          content_ids: [`plano-${planKey}`],
          num_items: 1,
        })
        sessionStorage.setItem('initiateCheckout_tracked', 'true')
        console.log("[v0] InitiateCheckout tracked (results page)")
      } else {
        console.log("[v0] InitiateCheckout already tracked this session, skipping")
      }
    }

    // Track that user visited checkout
    const userId = localStorage.getItem('clientUid')
    if (userId) {
      try {
        const leadRef = doc(db, 'leads', userId)
        await updateDoc(leadRef, {
          visitedCheckout: true,
          visitedCheckoutAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        })
      } catch (error) {
        console.error("[v0] Error tracking checkout visit:", error)
      }
    }

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
    // melhorar-saude e aumentar-resistencia â estratÃ©gia de saÃºde/emagrecer
    if (raw.includes("melhorar-saude") || raw.includes("aumentar-resistencia")) return "cut"
    return "maintain"
  }

  const getBodyFatNumber = (): number => {
    const bf = Number(data?.bodyFat ?? getDataValue("bodyFat"))
    return Number.isFinite(bf) ? bf : 25
  }

  const getExperienceLevel = (): "beginner" | "intermediate" | "advanced" => {
    const exp = normalizeStr(getDataValue("strengthTraining") ?? data?.strengthTraining)
    if (exp.includes("avanÃ§") || exp.includes("advanced")) return "advanced"
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
    const rawGoal = normalizeStr(getDataValue("goal") ?? data?.goal)
    const headline =
      goalCat === "bulk"
        ? "EstratÃ©gia: ganho de massa com superÃ¡vit controlado"
        : rawGoal.includes("melhorar-saude")
          ? "EstratÃ©gia: melhora de saÃºde, disposiÃ§Ã£o e composiÃ§Ã£o corporal"
          : rawGoal.includes("aumentar-resistencia")
            ? "EstratÃ©gia: ganho de resistÃªncia fÃ­sica com definiÃ§Ã£o corporal"
            : goalCat === "cut"
              ? "EstratÃ©gia: perda de gordura com dÃ©ficit sustentÃ¡vel"
              : "EstratÃ©gia: recomposiÃ§Ã£o corporal com consistÃªncia"

    // 2) Bullet 1 (BF -> direÃ§Ã£o)
    let bulletBF: string
    if (bf > 18) {
      bulletBF =
        goalCat === "bulk"
          ? "Prioridade: controlar gordura â superÃ¡vit mÃ­nimo para evitar ganho desnecessÃ¡rio."
          : `Prioridade: controlar gordura â dÃ©ficit moderado para preservar massa magra e chegar de ${Number(getDataValue("currentWeight")).toFixed(1)} kg a ${getDataValue("targetWeight")} kg com consistÃªncia.`
    } else if (bf >= 12) {
      bulletBF =
        goalCat === "bulk"
          ? "EquilÃ­brio entre performance e estÃ©tica â subimos calorias sem perder definiÃ§Ã£o."
          : `EquilÃ­brio e constÃ¢ncia â ajuste calÃ³rico gradual para vocÃª perder ${Math.round((Number(getDataValue("currentWeight")) - Number(getDataValue("targetWeight"))) * 10) / 10} kg sem pesar comida obsessivamente ou cortar grupos alimentares.`
    } else {
      bulletBF =
        goalCat === "bulk"
          ? "Ambiente favorÃ¡vel para ganhar massa ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ podemos subir calorias com mais seguranÃ§a mantendo a definiÃ§Ã£o."
          : `Boa base de definiÃ§Ã£o â foco em desempenho e ajustes finos para chegar dos ${Number(getDataValue("currentWeight")).toFixed(1)} kg atuais atÃ© os ${getDataValue("targetWeight")} kg desejados.`
    }

    // 3) Bullet 2 (nÃ­vel -> mÃ©todo)
    let bulletLevel: string
    if (level === "beginner") {
      bulletLevel = "Treino focado em tÃ©cnica + consistÃªncia â progressÃ£o simples para evoluir semana a semana."
    } else if (level === "intermediate") {
      bulletLevel = `Treino com progressÃ£o estruturada â volume e intensidade calibrados para o seu nÃ­vel intermediÃ¡rio, evoluindo semana a semana atÃ© vocÃª atingir os ${getDataValue("targetWeight")} kg.`
    } else {
      bulletLevel = "Treino com estÃ­mulos precisos â distribuiÃ§Ã£o de volume e recuperaÃ§Ã£o otimizadas para mÃ¡ximo desempenho."
    }

    // 4) Bullet 3 (dias + calorias -> racional curto)
    const daysText =
      days >= 5 ? `com alta frequÃªncia semanal x${days}` : days >= 3 ? `com frequÃªncia semanal consistente x${days}` : `com frequÃªncia semanal reduzida x${days}`

    let bulletCalories: string
    if (calories) {
      bulletCalories =
        goalCat === "bulk"
          ? `Meta calÃ³rica inicial: ~${calories} kcal/dia â para sustentar ganho de massa e recuperaÃ§Ã£o (${daysText}).`
          : goalCat === "cut"
            ? `Sua meta calÃ³rica: ${calories} kcal/dia â calculada para criar um dÃ©ficit de ~500 kcal com base no seu peso (${Number(getDataValue("currentWeight")).toFixed(1)} kg), altura (${getDataValue("height")} cm) e frequÃªncia de ${getDataValue("trainingDays")}x por semana. Suficiente para emagrecer sem comprometer a energia.`
            : `Meta calÃ³rica inicial: ~${calories} kcal/dia â para manter o peso com performance (${daysText}).`
    } else {
      bulletCalories =
        goalCat === "bulk"
          ? `Meta calÃ³rica inicial definida para sustentar ganho de massa e recuperaÃ§Ã£o (${daysText}).`
          : goalCat === "cut"
            ? `Meta calÃ³rica inicial definida para perder gordura mantendo desempenho (${daysText}).`
            : `Meta calÃ³rica inicial definida para manter o peso com performance (${daysText}).`
    }

    // 5) Nota "anti-golpe" (sempre)
    const trustNote =
      "Seu treino detalhado (exercÃ­cios, sÃ©ries e progressÃ£o) e sua dieta completa (refeiÃ§Ãµes, quantidades e substituiÃ§Ãµes) sÃ£o gerados sob demanda apÃ³s a confirmaÃ§Ã£o do pagamento â nÃ£o usamos planos prontos."

    // 6) Nota para prazo (opcional)
    const etaNote = timeToGoal
      ? `ProjeÃ§Ã£o de prazo: ${timeToGoal}. Estimativa baseada em consistÃªncia e adesÃ£o ao plano.`
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

      <main className="w-full px-6 py-12">
        {getDataValue("gender") === "mulher" ? (
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <p className="text-orange-400 text-base font-semibold mb-3 uppercase tracking-wide">VOCÃ NÃO FALHOU NAS DIETAS.</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              As dietas Ã© que falharam em te conhecer.<br />
              <span className="text-orange-400">Seu plano estÃ¡ pronto. Feito para vocÃª.</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed">
              {(() => {
                const cw = Number(getDataValue("currentWeight"))
                const tw = Number(getDataValue("targetWeight"))
                const h = Number(getDataValue("height"))
                const imc = (cw && h) ? (cw / (h / 100) ** 2).toFixed(1) : "â"
                const days = getDataValue("trainingDays")
                const kcal = getDataValue("calorieGoal") ? Math.round(Number(getDataValue("calorieGoal"))).toLocaleString("pt-BR") : "â"
                const goal = String(getDataValue("goal") ?? "").toLowerCase()
                const isBulk = goal.includes("ganhar-massa")
                const diff = Math.abs(Math.round((cw - tw) * 10) / 10)
                const action = isBulk
                  ? <><strong className="text-white">ganhar {diff} kg</strong> de massa magra</>
                  : <><strong className="text-white">perder {diff} kg</strong> sem radicalismo</>
                return <>
                  VocÃª estÃ¡ em <strong className="text-white">{cw} kg</strong> e quer chegar em{" "}
                  <strong className="text-white">{tw} kg</strong>. Com base no seu perfil â IMC {imc}, treinos {days}x por semana e meta calÃ³rica de {kcal} kcal/dia â montamos o plano exato para vocÃª {action}. <em>Esse plano nÃ£o serve para nenhuma outra pessoa. SÃ³ para vocÃª.</em>
                </>
              })()}
            </p>
                        
                                                                                                                                                                                    </div>
        ) : (
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Seu Plano de Dieta e Treino <br /> estÃ£o Prontos!
          </h1>
        )}

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
                  <p className="text-gray-400 text-sm mb-1">NÃ­vel de Treino</p>

                  <p className="text-white font-bold mb-2">
                    {(getDataValue("experience") || getDataValue("strengthTraining") || "beginner") === "beginner"
                      ? "Iniciante"
                      : (getDataValue("experience") || getDataValue("strengthTraining")) === "intermediate"
                        ? "IntermediÃ¡rio"
                        : (getDataValue("experience") || getDataValue("strengthTraining")) === "advanced"
                          ? "AvanÃ§ado"
                          : (getDataValue("experience") || "Iniciante")}
                  </p>

                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{
                        width: `${getTrainingLevelPercentage(
                          getDataValue("experience") || getDataValue("strengthTraining") || "beginner"
                        )}%`,
                      }}
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
                  <p className="text-gray-400 text-sm mb-1">NÃ­vel de Treino</p>
                  <p className="text-white font-bold mb-2">
                    {getDataValue("experience") === "iniciante"
                      ? "IntermediÃ¡rio"
                      : "AvanÃ§ado"}
                  </p>
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
            <p className="text-orange-400 text-sm font-semibold mb-2 uppercase tracking-wide">Com base no que vocÃª nos contou...</p>
          <h3 className="text-3xl font-bold text-white mb-6">AnÃ¡lise do seu perfil e estratÃ©gia do plano:</h3>
            <div className="border-t border-gray-700 mb-8"></div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-8">
              {/* GÃªnero */}
              <div>
                <p className="text-gray-400 text-sm mb-2">GÃªnero</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("gender") === "homem"
                    ? "Masculino"
                    : getDataValue("gender") === "mulher"
                      ? "Feminino"
                      : "â"}
                </p>
              </div>

              {/* Idade */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Idade</p>
                <p className="text-white text-xl font-semibold">{getDataValue("age") || "â"} anos</p>
              </div>

              {/* Altura */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Altura</p>
                <p className="text-white text-xl font-semibold">{getDataValue("height") || "â"} cm</p>
              </div>

              {/* Peso Atual */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Peso Atual</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("currentWeight") ? Number(getDataValue("currentWeight")).toFixed(1) : "â"} kg
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
                    : "â"}
                </p>
              </div>

              {/* Meta de Calorias */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Meta de Calorias</p>
                <p className="text-white text-xl font-semibold">{getDataValue("calorieGoal") ? Math.round(Number(getDataValue("calorieGoal"))) : "â"} kcal</p>
              </div>


              {/* Meta de Peso */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Meta de Peso</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("targetWeight") ? Number(getDataValue("targetWeight")).toFixed(1) : "â"} kg
                </p>
              </div>

              {/* Data para atingir objetivo - Full width */}
              <div className="col-span-2">
                <p className="text-gray-400 text-sm mb-2">Data para atingir objetivo</p>
                <p className="text-white text-xl font-semibold">
                  {getDataValue("timeToGoal") || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 6 - Prazo Estimado */}
        <div className="max-w-5xl mx-auto mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">ProjeÃ§Ã£o de prazo realista:</h3>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Estimativa para atingir seu objetivo</p>
              <p className="text-white text-3xl font-bold text-lime-400">{getTimeToGoal() || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm border-t border-slate-700/50 pt-4">
            â ï¸ Estimativa baseada em consistÃªncia e adesÃ£o ao plano{getTrainingDays() >= 3 ? ` com frequÃªncia de ${getTrainingDays()}x por semana` : ""}.
          </p>
        </div>

                {/* CTA Light */}
        <div className="max-w-5xl mx-auto mt-8 text-center">
          <p className="text-gray-400 text-sm mb-3">Seu plano está pronto — garanta agora antes que o resultado expire</p>
          <button
            onClick={handleCheckout}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-full text-lg transition-all duration-200 shadow-lg shadow-orange-500/30"
          >
            Quero meu plano por R$ 59,90/mês →
          </button>
        </div>

        {/* Bloco 4 - DecisÃµes Principais */}
        {(() => {
          const s = buildDynamicSummary()
          return (
            <div className="max-w-5xl mx-auto mt-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">{s.headline}</h3>
              <ul className="space-y-4 text-gray-300">
                {s.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-orange-400 font-bold flex-shrink-0">â¢</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}


        {/* SEÃÃO DE DIFERENCIAIS REAIS DO FITGOAL */}
        {getDataValue("gender") === "mulher" && (
          <div className="max-w-5xl mx-auto mt-10 rounded-2xl border border-orange-500/30 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500/20 to-orange-400/10 px-6 py-5 border-b border-orange-500/20">
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide mb-1">Por que o FitGoal realmente funciona</p>
              <h3 className="text-lg md:text-2xl font-bold text-white leading-snug">Diferente de tudo que vocÃª jÃ¡ tentou.</h3>
            </div>

            {/* Benefits list */}
            <div className="bg-gray-900/60 divide-y divide-gray-800">

              {/* Item 1 */}
              <div className="px-5 py-5 flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-orange-400 text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">Dieta e treino 100% personalizados para vocÃª</p>
                  <p className="text-gray-400 text-sm leading-relaxed">Cada refeiÃ§Ã£o e cada sÃ©rie foi definida com base no seu peso, altura, objetivo, rotina e restriÃ§Ãµes. Nada aqui Ã© genÃ©rico.</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="px-5 py-5 flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-orange-400 text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">AnÃ¡lise do seu progresso por fotos com feedback detalhado</p>
                  <p className="text-gray-400 text-sm leading-relaxed">VocÃª envia suas fotos e recebe orientaÃ§Ãµes especÃ­ficas sobre sua evoluÃ§Ã£o â feedback real para continuar avanÃ§ando no ritmo certo.</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="px-5 py-5 flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-orange-400 text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">Suporte com resposta rÃ¡pida</p>
                  <p className="text-gray-400 text-sm leading-relaxed">Nossa equipe responde em horas, nÃ£o dias â para ajustar o plano, trocar alimentos ou tirar qualquer dÃºvida que surgir. VocÃª nÃ£o vai ficar sozinha no processo.</p>
                </div>
              </div>

            </div>

            {/* Testimonial footer */}
            <div className="bg-gradient-to-r from-orange-500/10 to-transparent px-6 py-4 border-t border-orange-500/20">
              <p className="text-orange-400 text-sm font-medium">ð¬ "JÃ¡ comprei de vÃ¡rios programas e nunca tive uma experiÃªncia assim. Aqui realmente se importam com o meu resultado." â Lucilene, -7 kg</p>
            </div>
          </div>
        )}
                {/* Bloco 7 - Ponte para Pagamento */}
        <div className="max-w-5xl mx-auto mt-8 bg-gradient-to-br from-lime-900/30 to-lime-900/10 border border-lime-700/50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-lime-400 mb-4">O que vocÃª recebe imediatamente apÃ³s o pagamento:</h3>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-lime-400 mt-1">â</span>
              <p className="text-gray-200">
                <span className="text-white font-semibold">Plano de treino completo</span> â exercÃ­cios, sÃ©ries, repetiÃ§Ãµes e progressÃ£o, adaptado para o seu nÃ­vel e para o equipamento que vocÃª tem disponÃ­vel.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lime-400 mt-1">â</span>
              <p className="text-gray-200">
                <span className="text-white font-semibold">Plano alimentar personalizado</span> â refeiÃ§Ãµes com quantidades exatas, lista de substituiÃ§Ãµes e opÃ§Ãµes prÃ¡ticas para o seu dia a dia.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lime-400 mt-1">â</span>
              <p className="text-gray-200">
                <span className="text-white font-semibold">Acesso direto pelo app ou Ã¡rea de membros</span> â tudo organizado num sÃ³ lugar, disponÃ­vel no celular, sempre que vocÃª precisar.
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-sm pt-4 border-t border-lime-700/30">
            Tudo gerado sob demanda para o seu perfil especÃ­fico â nÃ£o usamos planos genÃ©ricos prontos.
          </p>
        </div>

        <div className="max-w-5xl mx-auto mt-16">
          <h2 className="text-4xl font-bold text-center mb-4">Seu Programa Completo FitGoal:</h2>

          <div className="mt-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
          <p className="text-gray-400 text-sm">Tudo personalizado para o seu perfil e objetivo direto no app</p>
          </div>
          {/* Benefit Cards Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Card 1 - Dieta */}
            <div className="relative bg-gradient-to-br from-orange-500/10 to-orange-900/20 border border-orange-500/30 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Dieta 100% personalizada</p>
                <p className="text-gray-400 text-xs mt-1">Com refeiÃ§Ãµes, quantidades e substituiÃ§Ãµes exatas para vocÃª</p>
              </div>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-gray-500 text-xs line-through">R$ 129</span>
                <span className="text-orange-400 text-xs font-bold">incluso</span>
              </div>
            </div>
            {/* Card 2 - Treino */}
            <div className="relative bg-gradient-to-br from-lime-500/10 to-green-900/20 border border-lime-500/30 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 bg-lime-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Treino personalizado</p>
                <p className="text-gray-400 text-xs mt-1">SÃ©ries, repetiÃ§Ãµes e progressÃ£o definidas para o seu nÃ­vel</p>
              </div>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-gray-500 text-xs line-through">R$ 149</span>
                <span className="text-lime-400 text-xs font-bold">incluso</span>
              </div>
            </div>
            {/* Card 3 - Resultados */}
            <div className="relative bg-gradient-to-br from-blue-500/10 to-blue-900/20 border border-blue-500/30 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Resultados em 4 semanas</p>
                <p className="text-gray-400 text-xs mt-1">MudanÃ§as visÃ­veis no corpo jÃ¡ no primeiro mÃªs</p>
              </div>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-gray-500 text-xs line-through">R$ 97</span>
                <span className="text-blue-400 text-xs font-bold">incluso</span>
              </div>
            </div>
            {/* Card 4 - Acompanhamento */}
            <div className="relative bg-gradient-to-br from-purple-500/10 to-purple-900/20 border border-purple-500/30 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Acompanhamento de progresso</p>
                <p className="text-gray-400 text-xs mt-1">Monitore sua evoluÃ§Ã£o e ajuste conforme avanÃ§a</p>
              </div>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-gray-500 text-xs line-through">R$ 199,90</span>
                <span className="text-purple-400 text-xs font-bold">incluso</span>
              </div>
            </div>
          </div>
          {/* Price summary */}
          <div className="bg-gradient-to-r from-orange-500/10 via-black to-lime-500/10 border border-orange-500/40 rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">
              Valor total se comprado separado: <span className="line-through text-gray-500">R$ 574,90</span>
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div>
                <p className="text-gray-300 text-sm">Seu plano completo por apenas</p>
                <p className="text-5xl font-black text-orange-400 leading-tight">R$ 59,90</p>
                <p className="text-white font-semibold text-base">por mÃªs</p>
                <p className="text-gray-500 text-xs mt-2">Menos de R$ 2 por dia â o preÃ§o de um cafÃ©</p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 bg-lime-500/10 border border-lime-500/30 rounded-full px-4 py-2">
              <svg className="w-4 h-4 text-lime-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-lime-400 text-sm font-semibold">VocÃª economiza mais de R$ 500</span>
            </div>
          </div>
        </div>

          {/* ========== SEÃÃO DA ROLETA - DESATIVADA PARA MULHERES ========== */}
          {/* Para reativar, remova os comentÃ¡rios abaixo */}
          {getDataValue("gender") !== "mulher" && (
            <>
              {showSpinWheel && !discountApplied && (
                <div>
                  <SpinWheelSection onDiscountWon={handleDiscountWon} />
                </div>
              )}
            </>
          )}
          {/* ================================================================ */}

          {/* Promo code banner */}
          {/* ========== SEÃÃO DE CÃDIGO DE DESCONTO - DESATIVADA PARA MULHERES ========== */}
          {getDataValue("gender") !== "mulher" && (
            <div className="bg-orange-400 rounded-xl p-1 mt-8">
              <div className="bg-black rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  <span className="text-white font-semibold">
                    {discountApplied ? 'Seu cÃ³digo promo foi aplicado!' : 'Possui cÃ³digo de desconto?'}
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
          )}
          {/* ================================================================ */}

          {/* Urgency banner for female users */}
          {getDataValue("gender") === "mulher" && (
            <div className="mt-10 mb-4 bg-gradient-to-r from-orange-500/20 to-orange-400/10 border border-orange-500/50 rounded-xl p-4 flex items-center gap-3 max-w-2xl mx-auto">
              <span className="text-2xl">â³</span>
              <div>
                <p className="text-orange-400 font-bold text-sm">Seu resultado ficarÃ¡ salvo por 24 horas</p>
                <p className="text-gray-400 text-xs mt-0.5">ApÃ³s esse prazo, serÃ¡ necessÃ¡rio refazer o quiz para gerar um novo plano personalizado.</p>
              </div>
            </div>
          )}

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
                {getDataValue("gender") === "mulher" ? (
                  <>
                    <span className="line-through text-gray-500 text-lg mr-2">R$ 199,90</span>
                    <span className="text-orange-400">R$ 59,90</span>
                  </>
                ) : (
                  discountApplied ? (
                    <>
                      <span className="line-through text-gray-500 text-lg mr-2">R$ 199,90</span>
                      <span className="text-orange-400">R$ 59,90</span>
                    </>
                  ) : 'R$ 199,90'
                )}
              </div>
              <div className="text-gray-500 text-xs">por mÃªs</div>
            </div>

                        {/* TRIMESTRAL E SEMESTRAL - DESATIVADOS TEMPORARIAMENTE */}
                                    {false && (<>
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
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                  {selectedPlan === "quarterly" && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-3">Acesso completo por 90 dias</div>
              <div className="text-3xl font-bold text-white mb-1">
                {getDataValue("gender") === "mulher" ? (
                  <>
                    <span className="line-through text-gray-500 text-lg mr-2">R$ 533,00</span>
                    <span className="text-orange-400">R$ 179,90</span>
                  </>
                ) : (
                  discountApplied ? (
                    <>
                      <span className="line-through text-gray-500 text-lg mr-2">R$ 533,00</span>
                      <span className="text-orange-400">R$ 179,90</span>
                    </>
                  ) : 'R$ 533,00'
                )}
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
                {getDataValue("gender") === "mulher" ? (
                  <>
                    <span className="line-through text-gray-500 text-lg mr-2">R$ 799,67</span>
                    <span className="text-orange-400">R$ 239,90</span>
                  </>
                ) : (
                  discountApplied ? (
                    <>
                      <span className="line-through text-gray-500 text-lg mr-2">R$ 799,67</span>
                      <span className="text-orange-400">R$ 239,90</span>
                    </>
                  ) : 'R$ 799,67'
                )}
              </div>
              <div className="text-gray-500 text-xs">por semestre</div>
            </div>
                      </>)}
                    </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-500 mb-8">
            Sem cancelamento automÃ¡tico antes do final do perÃ­odo para planos, concordo que o Fitgoal cobrarÃ¡
            automaticamente enquanto sua assinatura estiver ativa. Cancele quando quiser pelo app ou site â sem burocracia.
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button
              onClick={handleCheckout}
              className="px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-full font-black text-lg hover:from-orange-400 hover:to-orange-300 transition shadow-lg shadow-orange-500/30 active:scale-95"
            >
              COMEÃAR MEU PLANO AGORA
            </button>
          </div>

          {/* Highlights of your plan section */}
          {/* SeÃ§Ã£o de Autoridade */}
                          <section className="py-10 bg-gray-950 border-t border-b border-gray-800">
                                    <div className="max-w-2xl mx-auto px-4 text-center">
                                                <p className="text-orange-400 text-sm font-semibold uppercase tracking-wide mb-3">Por que funciona</p>
                                                            <h3 className="text-xl font-bold text-white mb-4">Baseado em ciÃªncia. Validado por resultados.</h3>
                                                                        <p className="text-gray-400 leading-relaxed text-sm">Os planos do FitGoal sÃ£o desenvolvidos com base em protocolos de nutriÃ§Ã£o esportiva e periodizaÃ§Ã£o de treino utilizados por profissionais certificados. Cada plano considera seu metabolismo, histÃ³rico e rotina â nÃ£o Ã© uma fÃ³rmula genÃ©rica.</p>
                                                                                    <div className="flex flex-wrap justify-center gap-6 mt-8">
                                                                                                  <div className="flex flex-col items-center">
                                                                                                                  <span className="text-2xl font-black text-orange-400">+3.000</span>
                                                                                                                                  <span className="text-gray-400 text-xs mt-1">mulheres transformadas</span>
                                                                                                                                                </div>
                                                                                                                                                              <div className="flex flex-col items-center">
                                                                                                                                                                              <span className="text-2xl font-black text-orange-400">4 sem.</span>
                                                                                                                                                                                              <span className="text-gray-400 text-xs mt-1">para ver os primeiros resultados</span>
                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                          <div className="flex flex-col items-center">
                                                                                                                                                                                                                                          <span className="text-2xl font-black text-orange-400">100%</span>
                                                                                                                                                                                                                                                          <span className="text-gray-400 text-xs mt-1">personalizado para vocÃª</span>
                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                      </section>
          {/* Results that make us proud section with testimonials */}
          <section className="py-20 bg-black">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-4xl font-bold text-center text-white mb-12">Mulheres reais. Resultados reais.</h2>

              {/* Testimonials Grid - conditional based on gender */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {getDataValue("gender") === "mulher" ? (
                  <>
                    {/* Female Testimonials */}
                    {/* Testimonial 1 - Lucilene Alves */}
                    <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                      <img
                        src="/testimonial-lucilene.jpg"
                        alt="Lucilene Alves - TransformaÃ§Ã£o antes e depois"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-6 space-y-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">Lucilene Alves</h3>
                          <span className="text-orange-400 font-bold text-lg">-7 kg</span>
                        </div>
                        <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "lucilene" ? "" : "line-clamp-3"}`}>
                          JÃ¡ comprei vÃ¡rios programas antes e nunca senti que era feito pra mim. Com o FitGoal foi diferente desde o inÃ­cio. Em 5 semanas perdi 7 kg e, mais do que isso, me olho no espelho e gosto do que vejo.
                        </p>
                        <button
                          onClick={() => setExpandedTestimonial(expandedTestimonial === "lucilene" ? null : "lucilene")}
                          className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                        >
                          {expandedTestimonial === "lucilene" ? "Ver menos" : "Ler mais"}
                        </button>
                      </div>
                    </div>

                    {/* Testimonial 2 - Maria Clara */}
                    <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                      <img
                        src="/testimonial-maria-clara.jpg"
                        alt="Maria Clara - TransformaÃ§Ã£o antes e depois"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-6 space-y-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">Maria Clara</h3>
                          <span className="text-orange-400 font-bold text-lg">-10 kg</span>
                        </div>
                        <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "maria-clara" ? "" : "line-clamp-3"}`}>
                          Fiz dieta do ovo, jejum, tudo que existia. Achava que meu corpo simplesmente nÃ£o respondia. O FitGoal me mostrou que o problema era o mÃ©todo, nÃ£o eu. Em 2 meses perdi 10 kg e finalmente entendo o que funciona pro meu corpo.
                        </p>
                        <button
                          onClick={() => setExpandedTestimonial(expandedTestimonial === "maria-clara" ? null : "maria-clara")}
                          className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                        >
                          {expandedTestimonial === "maria-clara" ? "Ver menos" : "Ler mais"}
                        </button>
                      </div>
                    </div>

                    {/* Testimonial 3 - Tamires Silva */}
                    <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                      <img
                        src="/testimonial-tamires.jpg"
                        alt="Tamires Silva - TransformaÃ§Ã£o antes e depois"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-6 space-y-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">Tamires Silva</h3>
                          <span className="text-orange-400 font-bold text-lg">-26 kg</span>
                        </div>
                        <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "tamires" ? "" : "line-clamp-3"}`}>
                          Perdi 26 kg em 8 meses. Mas o que mais me surpreendeu nÃ£o foi a balanÃ§a â foi a disposiÃ§Ã£o que ganhei no dia a dia. Me sinto uma pessoa diferente. O acompanhamento personalizado fez toda a diferenÃ§a.
                        </p>
                        <button
                          onClick={() => setExpandedTestimonial(expandedTestimonial === "tamires" ? null : "tamires")}
                          className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                        >
                          {expandedTestimonial === "tamires" ? "Ver menos" : "Ler mais"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Male Testimonials - Original */}
                    {/* Testimonial 1 - Brandon */}
                    <div className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
                      <img
                        src="/images/5123122014301391780.jpg"
                        alt="Brandon - TransformaÃ§ï¿½ï¿½o antes e depois"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-6 space-y-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">Brandon</h3>
                          <span className="text-orange-400 font-bold text-lg">-15 kg</span>
                        </div>
                        <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "brandon" ? "" : "line-clamp-3"}`}>
                          OlÃ¡, estou usando seus treinos e comecei hÃ¡ cerca de 4-5 meses atrÃ¡s e sÃ³ queria dizer obrigado,
                          vocÃª fez um Ã³timo trabalho, realmente vi um transformaÃ§Ã£o incrÃ­vel!
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
                        alt="Peter - TransformaÃ§Ã£o antes e depois"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-6 space-y-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">Peter</h3>
                          <span className="text-orange-400 font-bold text-lg">-5 kg</span>
                        </div>
                        <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "peter" ? "" : "line-clamp-3"}`}>
                          Os vÃ­deos sÃ£o muito Ãºteis e fÃ¡ceis de entender. Os conselhos do seu consultor funcionam bem
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
                        alt="Kevin - TransformaÃ§Ã£o antes e depois"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-6 space-y-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">Kevin</h3>
                          <span className="text-orange-400 font-bold text-lg">-13 kg</span>
                        </div>
                        <p className={`text-gray-400 text-sm flex-1 ${expandedTestimonial === "kevin" ? "" : "line-clamp-3"}`}>
                          Comecei com cerca de 200 lbs e agora estou com um peso saudÃ¡vel e magro 172. Adorei a experiÃªncia com os planos personalizados!
                        </p>
                        <button
                          onClick={() => setExpandedTestimonial(expandedTestimonial === "kevin" ? null : "kevin")}
                          className="text-orange-400 text-sm font-semibold hover:text-orange-300 transition self-start"
                        >
                          {expandedTestimonial === "kevin" ? "Ver menos" : "Ler mais"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                *Disclaimer: UsuÃ¡rios do FITGOAL compartilharam seu feedback. Este usuÃ¡rio teve acesso a treinamento
                personalizado, recursos adicionais de pagamento. Os seguintes exercÃ­cios e os planos sÃ£o a chave em sua
                jornada de fitness e resultados geralmente aparecem em 4 semanas. Os resultados podem variar por pessoa
                e nÃ£o sÃ£o garantidos.
              </p>
            </div>
          </section>

        {/* SeÃ§Ã£o de objeÃ§Ã£o principal */}
                <section className="py-12 bg-black">
                          <div className="max-w-2xl mx-auto px-4">
                                      <div className="bg-gray-900 border border-orange-400/30 rounded-2xl p-8">
                                                    <h3 className="text-xl font-bold text-white mb-4">&ldquo;JÃ¡ ouvi isso antes. Por que seria diferente agora?&rdquo;</h3>
                                                                  <p className="text-gray-300 leading-relaxed">Essa Ã© a pergunta mais honesta que vocÃª pode fazer â e ela merece uma resposta direta.</p>
                                                                                <p className="text-gray-300 leading-relaxed mt-4">A maioria dos programas te dÃ¡ um plano feito para uma mulher imaginÃ¡ria. O FitGoal foi feito para <strong className="text-white">vocÃª</strong>: seu peso de hoje, sua rotina, seu histÃ³rico. Quando o plano Ã© certo para o seu corpo, os resultados aparecem. NÃ£o porque vocÃª vai se esforÃ§ar mais â mas porque finalmente estarÃ¡ fazendo a coisa certa.</p>
                                                                                            </div>
                                                                                                      </div>
                                                                                                              </section>
          {/* People often ask FAQ section with expandable items */}
          <section className="py-20 bg-black">
            <div className="max-w-3xl mx-auto px-4">
              <h2 className="text-4xl font-bold text-center text-white mb-12">Perguntas frequentes</h2>

              <div className="space-y-6">
                {/* FAQ Item 1 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Como este plano pode me ajudar a emagrecer e definir o corpo?
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
                    Nosso plano foi desenvolvido para ajudÃ¡-la a queimar gordura e construir um corpo tonificado e
                    aesthetic, combinando treinos passo a passo e um plano de refeiÃ§Ãµes 100% personalizado. Nossos
                    treinos e dietas garantem a forma correta e ajudam vocÃª a manter a consistÃªncia e a motivaÃ§Ã£o,
                    tornando a perda de peso mais alcanÃ§Ã¡vel e sustentÃ¡vel uma vez que tudo Ã© 100% personalizado para
                    vocÃª de acordo com as informaÃ§Ãµes que coletamos no quiz.
                  </p>
                </details>

                {/* FAQ Item 2 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Quais sÃ£o os benefÃ­cios dos planos FITGOAL em comparaÃ§Ã£o com concorrentes?
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
                    Os nossos planos sÃ£o 100% personalizados para VOCÃ, tanto a dieta quanto o treino, enquanto os
                    nossos concorrentes te enviam planos genÃ©ricos nÃ³s vamos mais a fundo garantindo eficiÃªncia e
                    resultados desde que vocÃª se comprometa com os nossos planos de treino e dieta, alÃ©m disso temos
                    orgulho do nosso suporte que te ajudarÃ¡ a ajustar qualquer coisa ou tirar dÃºvidas, se vocÃª
                    simplesmente quer tentar algo que dÃª RESULTADOS, inovador e divertido. Obtenha seu plano e
                    experimente agora!
                  </p>
                </details>

                {/* FAQ Item 3 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    E se eu perder a motivaÃ§Ã£o rapidamente?
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
                    Forneceremos lembretes suaves, conselhos de especialistas, ferramentas de rastreamento Ãºteis e apoio
                    constante para ajudÃ¡-la a ver o progresso e manter-se consistente. Dessa forma, vocÃª pode alcanÃ§ar
                    seus objetivos e desfrutar de um corpo mais saudÃ¡vel e em forma sem o medo de desistir.
                  </p>
                </details>

                {/* FAQ Item 4 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Funciona para quem tem pouco tempo no dia?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    Sim! Nossos planos sÃ£o criados considerando a sua rotina. Se vocÃª tem 30 a 45 minutos disponÃ­veis, jÃ¡ Ã© suficiente para seguir o programa completo e ver resultados. Tudo Ã© adaptado ao tempo que vocÃª informou no quiz.
                  </p>
                </details>

                {/* FAQ Item 5 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Preciso ter academia ou equipamentos especiais?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    NÃ£o! O plano Ã© criado com base no que vocÃª tem disponÃ­vel. Se preferir treinar em casa, os exercÃ­cios serÃ£o adaptados para isso â sem precisar de nenhum equipamento. Mas se vocÃª tiver acesso Ã  academia, aproveitamos isso ao mÃ¡ximo no seu programa.
                  </p>
                </details>

                {/* FAQ Item 6 */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    E se eu tiver alguma restriÃ§Ã£o alimentar?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    O seu plano de dieta Ã© montado com base nas informaÃ§Ãµes que vocÃª forneceu, incluindo preferÃªncias e restriÃ§Ãµes. Se precisar de ajustes apÃ³s receber o plano, nossa equipe de suporte estÃ¡ disponÃ­vel para adaptar as refeiÃ§Ãµes Ã s suas necessidades.
                  </p>
                </details>

                {/* FAQ Item 7 - Price objection */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Vale mais a pena do que pegar conteÃºdo gratuito no YouTube?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    O YouTube tem conteÃºdo incrÃ­vel â mas nenhum vÃ­deo sabe o seu peso, a sua altura, quantos dias vocÃª tem disponÃ­vel, se vocÃª prefere treinar em casa ou na academia, ou qual Ã© o seu objetivo especÃ­fico. O FitGoal gera um plano montado especificamente para vocÃª, nÃ£o um conteÃºdo genÃ©rico para todos. A diferenÃ§a estÃ¡ na personalizaÃ§Ã£o e na praticidade de ter tudo organizado em um sÃ³ lugar.
                  </p>
                </details>

                {/* FAQ Item 8 - AI / personalization */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    O plano Ã© gerado por IA ou Ã© feito por um profissional?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    Seu plano Ã© gerado por um sistema de personalizaÃ§Ã£o avanÃ§ado que usa as suas respostas do quiz como base â levando em conta seu peso, altura, objetivo, nÃ­vel de treino, rotina e restriÃ§Ãµes. O resultado Ã© um plano estruturado e prÃ¡tico, Ãºnico para o seu perfil. Se precisar de ajustes depois de receber, nossa equipe estÃ¡ disponÃ­vel para te ajudar.
                  </p>
                </details>

                {/* FAQ Item 9 - Support */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Vou ter suporte se travar ou tiver dÃºvidas?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    Sim. Nossa equipe de suporte estÃ¡ disponÃ­vel para responder dÃºvidas sobre o plano, ajudar com substituiÃ§Ãµes de alimentos, adaptar exercÃ­cios e tirar qualquer dÃºvida que aparecer no caminho. VocÃª nÃ£o vai ficar sozinha.
                  </p>
                </details>

                {/* FAQ Item 10 - health conditions */}
                <details className="group border border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-600 transition">
                  <summary className="flex items-center justify-between font-bold text-white">
                    Funciona para quem tem hipotireoidismo, SOP ou outra condiÃ§Ã£o de saÃºde?
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </summary>
                  <p className="text-gray-400 mt-4">
                    O FitGoal Ã© um programa de alimentaÃ§Ã£o e treino baseado nas suas respostas do quiz. Se vocÃª tem alguma condiÃ§Ã£o de saÃºde especÃ­fica como hipotireoidismo ou SOP, recomendamos sempre consultar um mÃ©dico ou nutricionista antes de comeÃ§ar qualquer programa. O nosso plano pode ser um excelente complemento ao acompanhamento profissional, mas nÃ£o substitui orientaÃ§Ã£o mÃ©dica.
                  </p>
                </details>

              </div>
            </div>
          </section>

          {/* Social proof - community */}
          <section className="border-t border-gray-800 py-12">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span className="text-white font-bold text-lg">Comunidade FitGoal</span>
                </div>
                <p className="text-gray-400 text-sm max-w-md">
                  Mais de <span className="text-white font-semibold">3.000 pessoas</span> jÃ¡ iniciaram sua transformaÃ§Ã£o com o FitGoal em 2025.
                </p>
                {getDataValue("gender") === "mulher" && (
                  <p className="text-orange-400 text-sm font-medium">
                    ð¥ Ãltimas vagas com preÃ§o promocional disponÃ­veis hoje
                  </p>
                )}
              </div>
            </div>
          </section>

                    {/* Get Visible Results Section */}
          <section className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
                Obtenha resultados visÃ­veis em 4 semanas!
              </h2>

              {/* ========== SEÃÃO DE CÃDIGO DE DESCONTO - DESATIVADA PARA MULHERES ========== */}
              {getDataValue("gender") !== "mulher" && (
                <div className="bg-orange-400 rounded-xl p-1 mb-8">
                  <div className="bg-black rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      <span className="text-white font-semibold">
                        {discountApplied ? 'Seu cÃ³digo promo foi aplicado!' : 'Possui cÃ³digo de desconto?'}
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
              )}
              {/* ================================================================ */}

              {/* Urgency banner */}
              {getDataValue("gender") === "mulher" && (
                <div className="mb-6 bg-gradient-to-r from-orange-500/20 to-orange-400/10 border border-orange-500/50 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">â³</span>
                  <div>
                    <p className="text-orange-400 font-bold text-sm">Seu resultado ficarÃ¡ salvo por 24 horas</p>
                    <p className="text-gray-400 text-xs mt-0.5">ApÃ³s esse prazo, serÃ¡ necessÃ¡rio refazer o quiz para gerar um novo plano personalizado.</p>
                  </div>
                </div>
              )}

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
                    {getDataValue("gender") === "mulher" ? (
                      <>
                        <span className="line-through text-gray-500 text-lg mr-2">R$ 199,90</span>
                        <span className="text-orange-400">R$ 59,90</span>
                      </>
                    ) : (
                      discountApplied ? (
                        <>
                          <span className="line-through text-gray-500 text-lg mr-2">R$ 199,90</span>
                          <span className="text-orange-400">R$ 59,90</span>
                        </>
                      ) : 'R$ 199,90'
                    )}
                  </div>
                  <div className="text-gray-500 text-xs">por mÃªs</div>
                </div>

                            {/* TRIMESTRAL E SEMESTRAL - DESATIVADOS TEMPORARIAMENTE */}
                                        {false && (<>
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
                    <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                      {selectedPlan === "quarterly" && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mb-3">Acesso completo por 90 dias</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {getDataValue("gender") === "mulher" ? (
                      <>
                        <span className="line-through text-gray-500 text-lg mr-2">R$ 533,00</span>
                        <span className="text-orange-400">R$ 179,90</span>
                      </>
                    ) : (
                      discountApplied ? (
                        <>
                          <span className="line-through text-gray-500 text-lg mr-2">R$ 533,00</span>
                          <span className="text-orange-400">R$ 179,90</span>
                        </>
                      ) : 'R$ 533,00'
                    )}
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
                    {getDataValue("gender") === "mulher" ? (
                      <>
                        <span className="line-through text-gray-500 text-lg mr-2">R$ 799,67</span>
                        <span className="text-orange-400">R$ 239,90</span>
                      </>
                    ) : (
                      discountApplied ? (
                        <>
                          <span className="line-through text-gray-500 text-lg mr-2">R$ 799,67</span>
                          <span className="text-orange-400">R$ 239,90</span>
                        </>
                      ) : 'R$ 799,67'
                    )}
                  </div>
                  <div className="text-gray-500 text-xs">por semestre</div>
                </div>
                          </>)}
                          </div>

              {/* Disclaimer */}
              <p className="text-gray-400 text-sm text-center mb-8 max-w-2xl mx-auto">
                Sem cancelamento automÃ¡tico antes do final do perÃ­odo para planos, concordo que o Fitgoal cobrarÃ¡
                automaticamente enquanto sua assinatura estiver ativa. Cancele quando quiser pelo app ou site.
              </p>

              {/* CTA Button with urgency */}
              <div className="text-center mb-16">
                <p className="text-gray-400 text-sm mb-2">
                  ð Acesso liberado imediatamente apÃ³s a confirmaÃ§Ã£o
                </p>
                {getDataValue("gender") === "mulher" && (
                  <p className="text-orange-400 text-xs mb-4 font-medium">
                    â³ Resultado salvo por 24h â garanta agora antes de expirar
                  </p>
                )}
                {/* Mini garantia - reduz ansiedade antes do clique */}
                <div className="mb-6 flex items-center justify-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-md mx-auto">
                  <svg className="w-8 h-8 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-green-400 font-bold text-sm">Garantia de 7 dias sem perguntas</p>
                    <p className="text-gray-400 text-xs mt-0.5">NÃ£o ficou satisfeita? Devolvemos 100% do valor â sem formulÃ¡rios, sem explicaÃ§Ã£o.</p>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="bg-gradient-to-r from-orange-500 to-orange-400 text-white font-black text-lg px-12 py-4 rounded-full hover:from-orange-400 hover:to-orange-300 transition shadow-lg shadow-orange-500/30 active:scale-95"
                >
                  COMEÃAR MEU PLANO AGORA
                </button>
                <p className="text-gray-500 text-xs mt-3">
                  Cancele quando quiser Â· Sem compromisso
                </p>
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
                <h3 className="text-3xl font-bold text-white mb-2">Garantia incondicional de 7 dias</h3>
                <p className="text-orange-400 font-semibold text-sm mb-4">Sem perguntas. Sem burocracia.</p>
                <p className="text-gray-400 mb-4">
                  Experimentou por 7 dias e nÃ£o ficou satisfeita? Manda uma mensagem e devolvemos 100% do valor â sem precisar dar explicaÃ§Ã£o, sem formulÃ¡rio, sem burocracia nenhuma.
                </p>
                <p className="text-gray-400 mb-4">
                  Acreditamos tanto no resultado que colocamos o risco todo por nossa conta. VocÃª nÃ£o perde nada tentando â sÃ³ ganha se funcionar.
                </p>
                <p className="text-gray-500 text-sm">
                  Saiba mais em nossa{" "}
                  <a href="/politica-reembolso" className="text-green-400 hover:underline">
                    polÃ­tica de reembolso
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-400 text-sm">
            <p className="mb-4">Fitgoal | EscritÃ³rio No. 101, 1Âº Andar, Avenida Paulista, SÃ£o Paulo</p>
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
