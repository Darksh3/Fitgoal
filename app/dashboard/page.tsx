"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { X } from "lucide-react"
import {
  User,
  TrendingUp,
  Database,
  Phone,
  CreditCard,
  LogOut,
  MessageCircle,
  Utensils,
  Dumbbell,
  BarChart3,
  Menu,
} from "lucide-react"

interface QuizData {
  gender: string
  name: string // Ensure this is correctly typed
  bodyType: string
  goal: string[]
  currentWeight: string
  targetWeight: string
  timeToGoal: string
  workoutTime: string
  experience: string
  height: string
  age: string
  trainingDaysPerWeek: string
}

interface DietPlan {
  calories?: string
  protein?: string
  carbs?: string
  fats?: string
  totalDailyCalories?: number
  totalProtein?: number
  totalCarbs?: number
  totalFats?: number
  meals?: any[]
}

interface Meal {
  name?: string
  time?: string
  calories?: string
  foods?: any[]
  macros?: {
    protein?: string
    carbs?: string
    fats?: string
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [initialWeight, setInitialWeight] = useState<number | null>(null)
  const [currentWeightSlider, setCurrentWeightSlider] = useState<number | null>(null)
  const [weightDirty, setWeightDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null)
  const [progressData, setProgressData] = useState({
    consecutiveDays: 0,
    completedWorkouts: 0,
    goalsAchieved: 0,
    totalGoals: 18,
    overallProgress: 0,
    caloriesConsumed: 0,
    caloriesTarget: 2200, // Will be calculated dynamically
    proteins: 0,
    carbs: 0,
    fats: 0,
  })
  const [photoProgressBonus, setPhotoProgressBonus] = useState(0)
  const [initialHeight, setInitialHeight] = useState<number>(0) // Declared variable for initialHeight

  useEffect(() => {
    const demoMode = localStorage.getItem("demoMode")
    if (demoMode === "true") {
      setIsDemoMode(true)
      setLoading(false)
      const savedQuizData = localStorage.getItem("quizData")
      if (savedQuizData) {
        setQuizData(JSON.parse(savedQuizData))
      }
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[v0] Usuário autenticado:", user ? user.uid : "anonymous")
      if (user) {
        setUser(user)
        loadProgressData()
        await loadPhotoProgressBonus(user.uid)
        await loadQuizDataAndGeneratePlans(user)
      } else {
        console.log("[v0] Usuário não autenticado, redirecionando para /auth")
        router.push("/auth")
      }
      setLoading(false)
    })

    const updateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      let greeting = "Bom dia"
      if (hour >= 12 && hour < 18) greeting = "Boa tarde"
      if (hour >= 18) greeting = "Boa noite"
      setCurrentTime(greeting)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [router])

  useEffect(() => {
  if (!quizData) return

  const currentW = Number.parseFloat(quizData.currentWeight || "0") || 70
  const initialW = Number.parseFloat((quizData as any).initialWeight || quizData.currentWeight || "0") || currentW

  if (initialW > 0) setInitialWeight(initialW)

  // ✅ Só inicializa o slider UMA vez, e nunca sobrescreve se o usuário já mexeu
  if (!weightDirty && currentWeightSlider == null && currentW > 0) {
    setCurrentWeightSlider(currentW)
  }

  if (quizData.height) {
    const initialH = Number.parseFloat(quizData.height)
    if (initialH > 0) setInitialHeight(initialH)
  }
}, [quizData, weightDirty, currentWeightSlider])

  const loadQuizDataAndGeneratePlans = async (user: any) => {
    let foundQuizData = null

    if (db) {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(userDocRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          console.log("[v0] Dados do usuário encontrados no Firestore:", data)
          
          // VERIFICAR EXPIRAÇÃO DA ASSINATURA
          if (data.subscriptionExpiresAt) {
            const expiresAt = new Date(data.subscriptionExpiresAt)
            const now = new Date()
            
            console.log("[v0] SUBSCRIPTION_CHECK - Expires:", expiresAt, "Now:", now, "Expired:", expiresAt < now)
            
            if (expiresAt < now) {
              console.log("[v0] SUBSCRIPTION_EXPIRED - Bloqueando acesso ao usuário")
              setSubscriptionExpired(true)
              setSubscriptionExpiresAt(expiresAt)
              setLoading(false)
              return // Não carregar mais dados, bloquear aqui
            } else {
              setSubscriptionExpiresAt(expiresAt)
              console.log("[v0] SUBSCRIPTION_ACTIVE - Dias restantes:", Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            }
          }
          
          if (data.quizData) {
            foundQuizData = data.quizData as QuizData
            setQuizData(foundQuizData)
          }

          if (data.dietPlan) {
            setDietPlan(data.dietPlan)
            console.log("[v0] Diet plan loaded:", data.dietPlan)
          }

          if (foundQuizData && (!data.dietPlan || !data.workoutPlan)) {
            console.log("[v0] Planos não encontrados, gerando automaticamente...")
            await generatePlans(user.uid)
          }
        } else {
          console.warn("No user document found in Firestore for this UID.")
        }
      } catch (error) {
        console.error("Error fetching quiz data from Firestore:", error)
      }
    }

    if (!foundQuizData) {
      const savedQuizData = localStorage.getItem("quizData")
      if (savedQuizData) {
        try {
          foundQuizData = JSON.parse(savedQuizData)
          setQuizData(foundQuizData)
          console.log("[v0] Dados do quiz carregados do localStorage:", foundQuizData)
        } catch (error) {
          console.error("Error parsing quiz data from localStorage:", error)
        }
      }
    }
  }

  const generatePlans = async (userId: string) => {
    try {
      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })

      if (response.ok) {
        console.log("[v0] Planos gerados com sucesso")
      } else {
        console.error("[v0] Erro ao gerar planos:", response.statusText)
      }
    } catch (error) {
      console.error("[v0] Erro ao gerar planos:", error)
    }
  }

  const loadProgressData = () => {
    const savedProgress = localStorage.getItem("userProgress")
    if (savedProgress) {
      const progress = JSON.parse(savedProgress)
      if (dietPlan?.totalDailyCalories) {
        progress.caloriesTarget = Math.round(dietPlan.totalDailyCalories)
      }
      setProgressData(progress)
    } else {
      const initialProgress = {
        consecutiveDays: 0,
        completedWorkouts: 0,
        goalsAchieved: 0,
        totalGoals: 18,
        overallProgress: 0,
        caloriesConsumed: 0,
        caloriesTarget: dietPlan?.totalDailyCalories ? Math.round(dietPlan.totalDailyCalories) : 2200,
        proteins: dietPlan?.totalProtein ? Math.round(dietPlan.totalProtein) : 0,
        carbs: dietPlan?.totalCarbs ? Math.round(dietPlan.totalCarbs) : 0,
        fats: dietPlan?.totalFats ? Math.round(dietPlan.totalFats) : 0,
      }
      setProgressData(initialProgress)
      localStorage.setItem("userProgress", JSON.stringify(initialProgress))
    }
  }

  const handleSignOut = async () => {
    try {
      if (isDemoMode) {
        localStorage.removeItem("demoMode")
        localStorage.removeItem("quizData")
        router.push("/")
      } else {
        await signOut(auth)
        router.push("/")
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  const handleOpenChat = () => {
    setSidebarOpen(false)
    window.dispatchEvent(new Event("openFloatingChat"))
  }

  const getDisplayTotals = () => {
    const calculatedTotals = calculateTotalMacros(dietPlan?.meals || [])

    return {
      calories: (() => {
        if (calculatedTotals.calories && calculatedTotals.calories !== "0") {
          return `${calculatedTotals.calories} kcal`
        }
        if (dietPlan?.totalDailyCalories && dietPlan.totalDailyCalories !== 0) {
          return `${dietPlan.totalDailyCalories} kcal`
        }
        if (dietPlan?.calories && dietPlan.calories !== "0" && dietPlan.calories !== "0 kcal") {
          return dietPlan.calories.includes("kcal") ? dietPlan.calories : `${dietPlan.calories} kcal`
        }
        return "2200 kcal"
      })(),
      protein: (() => {
        if (calculatedTotals.protein && calculatedTotals.protein !== "0") {
          return `${calculatedTotals.protein}g`
        }
        if (dietPlan?.totalProtein && dietPlan.totalProtein !== 0) {
          return `${dietPlan.totalProtein}g`
        }
        if (dietPlan?.protein && dietPlan.protein !== "0" && dietPlan.protein !== "0g") {
          return dietPlan.protein.includes("g") ? dietPlan.protein : `${dietPlan.protein}g`
        }
        return "0g"
      })(),
      carbs: (() => {
        if (calculatedTotals.carbs && calculatedTotals.carbs !== "0") {
          return `${calculatedTotals.carbs}g`
        }
        if (dietPlan?.totalCarbs && dietPlan.totalCarbs !== 0) {
          return `${dietPlan.totalCarbs}g`
        }
        if (dietPlan?.carbs && dietPlan.carbs !== "0" && dietPlan.carbs !== "0g") {
          return dietPlan.carbs.includes("g") ? dietPlan.carbs : `${dietPlan.carbs}g`
        }
        return "0g"
      })(),
      fats: (() => {
        if (calculatedTotals.fats && calculatedTotals.fats !== "0") {
          return `${calculatedTotals.fats}g`
        }
        if (dietPlan?.totalFats && dietPlan.totalFats !== 0) {
          return `${dietPlan.totalFats}g`
        }
        if (dietPlan?.fats && dietPlan.fats !== "0" && dietPlan.fats !== "0g") {
          return dietPlan.fats.includes("g") ? dietPlan.fats : `${dietPlan.fats}g`
        }
        return "0g"
      })(),
    }
  }

  const calculateTotalMacros = (meals: Meal[]) => {
    if (!Array.isArray(meals) || meals.length === 0) {
      return { calories: "0", protein: "0", carbs: "0", fats: "0" }
    }

    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0

    meals.forEach((meal) => {
      if (meal && typeof meal === "object") {
        const caloriesMatch = meal.calories?.match(/(\d+)/)
        if (caloriesMatch) {
          totalCalories += Number.parseInt(caloriesMatch[1])
        }

        if (meal.macros && typeof meal.macros === "object") {
          const proteinMatch = meal.macros.protein?.match(/(\d+\.?\d*)/)
          const carbsMatch = meal.macros.carbs?.match(/(\d+\.?\d*)/)
          const fatsMatch = meal.macros.fats?.match(/(\d+\.?\d*)/)

          if (proteinMatch) totalProtein += Number.parseFloat(proteinMatch[1])
          if (carbsMatch) totalCarbs += Number.parseFloat(carbsMatch[1])
          if (fatsMatch) totalFats += Number.parseFloat(fatsMatch[1])
        }
      }
    })

    return {
      calories: totalCalories > 0 ? `${totalCalories}` : "0",
      protein: totalProtein > 0 ? `${Math.round(totalProtein)}` : "0",
      carbs: totalCarbs > 0 ? `${Math.round(totalCarbs)}` : "0",
      fats: totalFats > 0 ? `${Math.round(totalFats)}` : "0",
    }
  }

  const getModelImage = () => {
    if (quizData?.gender === "mulher") {
      return "/placeholder.svg?height=400&width=300"
    }
    return "/placeholder.svg?height=400&width=300"
  }

  const getUserName = () => {
    if (quizData?.name && quizData.name.trim() !== "") {
      return quizData.name.charAt(0).toUpperCase() + quizData.name.slice(1).toLowerCase()
    }

    const savedQuizData = localStorage.getItem("quizData")
    if (savedQuizData) {
      try {
        const parsedData = JSON.parse(savedQuizData)
        if (parsedData.name && parsedData.name.trim() !== "") {
          return parsedData.name.charAt(0).toUpperCase() + parsedData.name.slice(1).toLowerCase()
        }
      } catch (error) {
        console.error("Error parsing localStorage quiz data:", error)
      }
    }

    return user?.email?.split("@")[0] || "Usuário"
  }

  const getMainGoal = () => {
    if (!quizData?.goal || quizData.goal.length === 0) return "Melhorar forma física"

    const goalMap: { [key: string]: string } = {
      "perder-peso": "Perder peso e queimar gordura",
      "ganhar-massa": "Ganhar massa muscular",
      "melhorar-saude": "Melhorar saúde e bem-estar",
      "aumentar-resistencia": "Aumentar resistência física",
    }

    return goalMap[quizData.goal[0]] || quizData.goal[0]
  }

  const handleWeightChange = async (newWeight: number) => {
  setWeightDirty(true)
  setCurrentWeightSlider(newWeight)

  if (isDemoMode) return
  if (!user || !db) return

  setIsSaving(true)

  try {
    const userRef = doc(db, "users", user.uid)

    await updateDoc(userRef, {
      currentWeight: newWeight.toString(),
      "quizData.currentWeight": newWeight.toString(),
    })

    if (quizData) {
      setQuizData({ ...quizData, currentWeight: newWeight.toString() })
    }

    const savedQuizData = localStorage.getItem("quizData")
    if (savedQuizData) {
      const parsed = JSON.parse(savedQuizData)
      parsed.currentWeight = newWeight.toString()
      localStorage.setItem("quizData", JSON.stringify(parsed))
    }
  } catch (error) {
    console.error("[v0] Erro ao salvar peso:", error)
  } finally {
    setIsSaving(false)
  }
}

  const loadPhotoProgressBonus = async (userId: string) => {
    if (!db) return

    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const data = userDoc.data()
        const photoCount = data.photoProgressCount || 0
        setPhotoProgressBonus(photoCount * 5) // 5% por foto
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar bônus de fotos:", error)
    }
  }

  const calculateOverallProgress = () => {
  if (!quizData?.currentWeight || !quizData?.targetWeight) {
    return photoProgressBonus
  }

  const startW =
    (initialWeight ?? Number.parseFloat(quizData.currentWeight || "70")) || 70

  const currentW =
    (currentWeightSlider ?? Number.parseFloat(quizData.currentWeight || "70")) || 70

  const targetW = Number.parseFloat(quizData.targetWeight || "70") || 70

  if (
    (startW > targetW && currentW <= targetW) ||
    (startW < targetW && currentW >= targetW)
  ) {
    return 100
  }

  const totalWeightToChange = Math.abs(targetW - startW)
  const weightChanged = Math.abs(currentW - startW)
  const weightProgress = (weightChanged / totalWeightToChange) * 100
  return Math.round(Math.min(100, weightProgress + photoProgressBonus))
}

  useEffect(() => {
    const newProgress = calculateOverallProgress()
    setProgressData((prev) => ({
      ...prev,
      overallProgress: newProgress,
    }))
  }, [currentWeightSlider, photoProgressBonus, quizData])

  useEffect(() => {
    if (dietPlan) {
      const calories = (() => {
        if (dietPlan.totalDailyCalories && !isNaN(dietPlan.totalDailyCalories)) {
          return Math.round(dietPlan.totalDailyCalories)
        }
        if (dietPlan.calories) {
          const parsed = Number.parseInt(dietPlan.calories.toString().replace(/\D/g, ""))
          return !isNaN(parsed) ? parsed : 2200
        }
        return 2200
      })()

      const proteins = (() => {
        if (dietPlan.totalProtein && !isNaN(dietPlan.totalProtein)) {
          return Math.round(dietPlan.totalProtein)
        }
        if (dietPlan.protein) {
          const parsed = Number.parseInt(dietPlan.protein.toString().replace(/\D/g, ""))
          return !isNaN(parsed) ? parsed : 0
        }
        return 0
      })()

      const carbs = (() => {
        if (dietPlan.totalCarbs && !isNaN(dietPlan.totalCarbs)) {
          return Math.round(dietPlan.totalCarbs)
        }
        if (dietPlan.carbs) {
          const parsed = Number.parseInt(dietPlan.carbs.toString().replace(/\D/g, ""))
          return !isNaN(parsed) ? parsed : 0
        }
        return 0
      })()

      const fats = (() => {
        if (dietPlan.totalFats && !isNaN(dietPlan.totalFats)) {
          return Math.round(dietPlan.totalFats)
        }
        if (dietPlan.fats) {
          const parsed = Number.parseInt(dietPlan.fats.toString().replace(/\D/g, ""))
          return !isNaN(parsed) ? parsed : 0
        }
        return 0
      })()

      console.log("[v0] Using diet plan values:", {
        calories,
        proteins,
        carbs,
        fats,
        rawDietPlan: dietPlan,
      })

      setProgressData((prev) => ({
        ...prev,
        caloriesTarget: calories,
        proteins,
        carbs,
        fats,
      }))
    }
  }, [dietPlan])

  // Tela de bloqueio para assinatura expirada
  if (subscriptionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assinatura Expirada</h2>
              <p className="text-gray-600 text-sm">
                {subscriptionExpiresAt && `Expirou em ${subscriptionExpiresAt.toLocaleDateString("pt-BR")}`}
              </p>
            </div>

            <p className="text-gray-700">Sua assinatura expirou. Para continuar acessando seu plano personalizado, você precisará renovar sua assinatura.</p>

            <div className="pt-4 space-y-3 border-t">
              <Button
                onClick={() => router.push("/pricing")}
                className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold py-2"
              >
                Renovar Assinatura
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut(auth)
                  router.push("/")
                }}
                className="w-full"
              >
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Carregando seu dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex">
      {sidebarOpen && (
        <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg flex-col z-50 flex">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <img
                  src="/images/fitgoal-logo-black.webp"
                  alt="FitGoal Logo"
                  className="h-12 w-auto dark:hidden"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
                <img
                  src="/images/fitgoal-logo.webp"
                  alt="FitGoal Logo"
                  className="h-12 w-auto hidden dark:block"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
                {isDemoMode && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">DEMO</span>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/analise-corporal")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                <User className="h-5 w-5" />
                <span>Análise Corporal</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/progresso")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                <TrendingUp className="h-5 w-5" />
                <span>Progresso</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/dados")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                <Database className="h-5 w-5" />
                <span>Dados</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  handleOpenChat()
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Chat com IA</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  window.open("https://wa.me/5511999999999?text=Olá! Preciso de ajuda com meu plano fitness.", "_blank")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                <Phone className="h-5 w-5" />
                <span>Entre em contato</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/assinatura")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                <CreditCard className="h-5 w-5" />
                <span>Assinaturas</span>
              </button>
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tema</span>
                <ThemeToggle />
              </div>
              <Button
                onClick={() => {
                  setSidebarOpen(false)
                  handleSignOut()
                }}
                variant="ghost"
                className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="h-5 w-5 mr-3" />
                {isDemoMode ? "Sair do Demo" : "Sair"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-800 dark:hover:bg-gray-800"
          >
            <Menu className="h-6 w-6 text-gray-400 dark:text-gray-400" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <img src="/images/fitgoal-logo-black.webp" alt="FitGoal Logo" className="h-16 w-auto dark:hidden" />
            <img src="/images/fitgoal-logo.webp" alt="FitGoal Logo" className="h-16 w-auto hidden dark:block" />
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {currentTime}, {getUserName()}!
            </h1>
            <p className="text-gray-400 text-lg">
              {isDemoMode ? "Bem-vindo ao modo demonstração" : "Vamos continuar sua jornada fitness hoje"}
            </p>
          </div>

          {quizData && (
            <div className="mb-12 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 shadow-sm">
              {/* Labels dos 3 pontos */}
              {(() => {
                const start = ((initialWeight ?? Number.parseFloat(quizData.currentWeight || "70")) || 70)
                const current = ((currentWeightSlider ?? Number.parseFloat(quizData.currentWeight || "70")) || 70)
                const goal = Number.parseFloat(quizData.targetWeight) || 70
                const isBulking = goal > start
                const isCutting = goal < start
                const isRegression = (isBulking && current < start) || (isCutting && current > start)
                const metaAtingida = (isBulking && current >= goal) || (isCutting && current <= goal)
                const diffFromStart = current - start
                const remainingToGoal = Math.abs(goal - current)

                return (
                  <>
                    <div className="flex items-center justify-between mb-10">
                      {/* Para CUTTING: Meta fica à esquerda, Inicial à direita */}
                      {/* Para BULKING: Inicial fica à esquerda, Meta à direita */}
                      {isCutting ? (
                        <>
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Meta</p>
                            <p className="text-xl font-bold text-green-500 dark:text-green-400">{goal.toFixed(1)} kg</p>
                          </div>
                          <div className="text-center flex-1">
                            <p className={`text-xs mb-2 font-semibold ${isRegression ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                              Peso Atual
                            </p>
                            <p className={`text-3xl font-bold ${isRegression ? "text-red-500 dark:text-red-400" : "text-white"}`}>
                              {current.toFixed(1)} kg
                            </p>
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Peso Inicial</p>
                            <p className="text-xl font-bold text-gray-400 dark:text-gray-500">{start.toFixed(1)} kg</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Peso Inicial</p>
                            <p className="text-xl font-bold text-gray-400 dark:text-gray-500">{start.toFixed(1)} kg</p>
                          </div>
                          <div className="text-center flex-1">
                            <p className={`text-xs mb-2 font-semibold ${isRegression ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                              Peso Atual
                            </p>
                            <p className={`text-3xl font-bold ${isRegression ? "text-red-500 dark:text-red-400" : "text-white"}`}>
                              {current.toFixed(1)} kg
                            </p>
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Meta</p>
                            <p className="text-xl font-bold text-green-500 dark:text-green-400">{goal.toFixed(1)} kg</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Barra de progresso com 3 segmentos */}
                    <div className="relative mb-8">
                      {/* Slider input com estilo customizado */}
                      <input
                        type="range"
                        min={Math.min(start, goal) * 0.7}
                        max={Math.max(start, goal) * 1.3}
                        step="0.1"
                        value={current}
                        onChange={(e) => {
                          handleWeightChange(Number.parseFloat(e.target.value))
                        }}
                        className="w-full h-3 rounded-full appearance-none bg-transparent cursor-pointer absolute top-4 left-0"
                        style={{
                          zIndex: 10,
                          WebkitAppearance: "none",
                        }}
                      />

                      <style>{`
                        input[type="range"]::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          appearance: none;
                          width: 0;
                          height: 0;
                          background: transparent;
                          cursor: pointer;
                          border: none;
                        }
                        input[type="range"]::-moz-range-thumb {
                          width: 0;
                          height: 0;
                          background: transparent;
                          cursor: pointer;
                          border: none;
                        }
                        input[type="range"]::-moz-range-track {
                          background: transparent;
                          border: none;
                        }
                      `}</style>

                      {/* Container da barra com marcadores */}
                      <div className="relative pt-4">
                        {/* Barra gradiente completa (vermelho -> azul -> verde) */}
                        <div className="h-3 bg-gradient-to-r from-red-600 via-blue-500 to-green-500 rounded-full overflow-hidden relative shadow-lg">
                          {/* Overlay de fundo para manter visível */}
                        </div>

                        {/* Bolinha no peso atual - posicionada corretamente */}
                        {(() => {
                          const minRange = Math.min(start, goal) * 0.7
                          const maxRange = Math.max(start, goal) * 1.3
                          const toPercent = (w: number) => ((w - minRange) / (maxRange - minRange)) * 100
                          const currentPercent = toPercent(current)

                          return (
                            <div
                              className="absolute w-6 h-6 bg-white rounded-full shadow-2xl border-4 border-white transition-all pointer-events-none"
                              style={{
                                left: `calc(${currentPercent}% - 12px)`,
                                top: "3px",
                                zIndex: 5,
                              }}
                            />
                          )
                        })()}
                      </div>

                      {/* Marcadores com números (peso inicial e meta) */}
                      {(() => {
                        const minRange = Math.min(start, goal) * 0.7
                        const maxRange = Math.max(start, goal) * 1.3
                        const toPercent = (w: number) => ((w - minRange) / (maxRange - minRange)) * 100

                        const startPercent = toPercent(start)
                        const goalPercent = toPercent(goal)

                        return (
                          <>
                            {/* Marcador do peso inicial */}
                            <div
                              className="absolute text-xs font-semibold text-gray-400 dark:text-gray-500 -translate-x-1/2"
                              style={{
                                left: `${startPercent}%`,
                                top: "52px",
                              }}
                            >
                              {start.toFixed(0)}
                            </div>

                            {/* Marca tracejada abaixo dos números */}
                            <svg className="absolute w-full h-20 top-12 left-0 pointer-events-none" style={{ zIndex: 0 }}>
                              <line x1={`${startPercent}%`} y1="0" x2={`${startPercent}%`} y2="20" stroke="rgb(107 114 128)" strokeDasharray="3,3" strokeWidth="1" />
                              <line x1={`${goalPercent}%`} y1="0" x2={`${goalPercent}%`} y2="20" stroke="rgb(107 114 128)" strokeDasharray="3,3" strokeWidth="1" />
                            </svg>

                            {/* Marcador da meta */}
                            <div
                              className="absolute text-xs font-semibold text-gray-400 dark:text-gray-500 -translate-x-1/2"
                              style={{
                                left: `${goalPercent}%`,
                                top: "52px",
                              }}
                            >
                              {goal.toFixed(0)}
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* Informações abaixo */}
                    <div className="flex items-center justify-between text-sm mt-8 gap-4">
                      {isCutting ? (
                        <>
                          <div className="text-left">
                            <p className="text-gray-400">Faltam {remainingToGoal.toFixed(1)} kg pra meta</p>
                            {metaAtingida && (
                              <p className="text-green-500 font-semibold">Meta atingida!</p>
                            )}
                          </div>
                          <div className="flex-1" />
                          <div className="text-right">
                            <p className={`font-semibold ${diffFromStart < 0 ? "text-orange-500" : "text-blue-500"}`}>
                              {diffFromStart < 0 ? "-" : "+"}{Math.abs(diffFromStart).toFixed(1)} kg desde o início
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-left">
                            <p className={`font-semibold ${diffFromStart < 0 ? "text-orange-500" : "text-blue-500"}`}>
                              {diffFromStart < 0 ? "-" : "+"}{Math.abs(diffFromStart).toFixed(1)} kg desde o início
                            </p>
                          </div>
                          <div className="flex-1" />
                          <div className="text-right">
                            <p className="text-gray-400">Faltam {remainingToGoal.toFixed(1)} kg pra meta</p>
                            {metaAtingida && (
                              <p className="text-green-500 font-semibold">Meta atingida!</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {isSaving && <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-4">Salvando...</p>}
                  </>
                )
              })()}
            </div>
          )}

          <div className="space-y-6">
            <Card
              className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all shadow-sm"
              onClick={() => router.push("/dashboard/dieta")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white text-xl">
                  <Utensils className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                  <span>Dieta</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700 dark:text-gray-300">
                    Calorias consumidas hoje: {progressData.caloriesConsumed} / {getDisplayTotals().calories} kcal
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Proteínas: {getDisplayTotals().protein} | Carboidratos: {getDisplayTotals().carbs} | Gorduras:{" "}
                    {getDisplayTotals().fats}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 font-medium flex items-center">
                    Clique para ver sua dieta completa →
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all shadow-sm"
              onClick={() => router.push("/dashboard/treino")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white text-xl">
                  <Dumbbell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <span>Treino</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
                    <div className="h-2 bg-blue-600 dark:bg-blue-500 rounded-full w-1/2"></div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Próximo: Treino de {quizData?.experience === "iniciante" ? "Iniciante" : "Intermediário"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Duração: {quizData?.workoutTime || "1hora"} | Foco: {getMainGoal()}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 font-medium flex items-center">
                    Clique para ver seu treino completo →
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all shadow-sm"
              onClick={() => router.push("/dashboard/progresso")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white text-xl">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <span>Resumo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700 dark:text-gray-300">Progresso geral: {progressData.overallProgress}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {quizData?.timeToGoal ? `Meta até: ${quizData.timeToGoal}` : "Continue seguindo seu plano!"}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 font-medium flex items-center">
                    Clique para ver informações completas →
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
