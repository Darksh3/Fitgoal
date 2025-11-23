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
  const [initialWeight, setInitialWeight] = useState<number>(0)
  const [currentWeightSlider, setCurrentWeightSlider] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
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
    if (quizData?.currentWeight) {
      const initialW = Number.parseFloat(quizData.currentWeight)
      setInitialWeight(initialW)

      // Peso atual do slider deve começar no peso inicial
      // Só atualiza se ainda não foi modificado pelo usuário
      if (currentWeightSlider === 0) {
        setCurrentWeightSlider(initialW)
      }
    }
  }, [quizData])

  const loadQuizDataAndGeneratePlans = async (user: any) => {
    let foundQuizData = null

    if (db) {
      try {
        const userDocRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(userDocRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          console.log("[v0] Dados do usuário encontrados no Firestore:", data)
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
    setCurrentWeightSlider(newWeight)

    if (isDemoMode) {
      return
    }

    if (!user || !db) return

    setIsSaving(true)

    try {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        currentWeight: newWeight.toString(),
      })

      if (quizData) {
        setQuizData({
          ...quizData,
          currentWeight: newWeight.toString(),
        })
      }

      console.log("[v0] Peso atualizado no Firestore:", newWeight)
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
      return photoProgressBonus // Se não tem dados de peso, retorna apenas o bônus de fotos
    }

    const currentWeight = currentWeightSlider || Number.parseFloat(quizData.currentWeight)
    const initialWeight = Number.parseFloat(quizData.currentWeight)
    const targetWeight = Number.parseFloat(quizData.targetWeight)

    if (
      (initialWeight > targetWeight && currentWeight <= targetWeight) ||
      (initialWeight < targetWeight && currentWeight >= targetWeight)
    ) {
      return 100
    }

    const totalWeightToChange = Math.abs(targetWeight - initialWeight)
    const weightChanged = Math.abs(currentWeight - initialWeight)
    const weightProgress = (weightChanged / totalWeightToChange) * 100

    const totalProgress = Math.min(100, weightProgress + photoProgressBonus)

    return Math.round(totalProgress)
  }

  useEffect(() => {
    const newProgress = calculateOverallProgress()
    setProgressData((prev) => ({
      ...prev,
      overallProgress: newProgress,
    }))
  }, [currentWeightSlider, photoProgressBonus, quizData])

  useEffect(() => {
    const handlePhotoAnalysisComplete = async (event: CustomEvent) => {
      if (!user || !db) return

      try {
        const userRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userRef)

        const currentCount = userDoc.exists() ? userDoc.data().photoProgressCount || 0 : 0
        const newCount = currentCount + 1

        await updateDoc(userRef, {
          photoProgressCount: newCount,
        })

        setPhotoProgressBonus(newCount * 5)

        console.log("[v0] Progresso incrementado! Fotos enviadas:", newCount)
      } catch (error) {
        console.error("[v0] Erro ao incrementar progresso:", error)
      }
    }

    window.addEventListener("photoAnalysisComplete", handlePhotoAnalysisComplete as EventListener)

    return () => {
      window.removeEventListener("photoAnalysisComplete", handlePhotoAnalysisComplete as EventListener)
    }
  }, [user, db])

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
                  src="/images/fitgoal-logo.png"
                  alt="FitGoal Logo"
                  className="h-12 w-auto"
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
                <span className="text-sm text-gray-700 dark:text-gray-300">Tema</span>
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
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Peso Inicial</p>
                  <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">{initialWeight.toFixed(1)} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Peso Atual</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {currentWeightSlider.toFixed(1)} kg
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Meta</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{quizData.targetWeight} kg</p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min={Math.min(initialWeight, Number.parseFloat(quizData.targetWeight)) - 10}
                  max={Math.max(initialWeight, Number.parseFloat(quizData.targetWeight)) + 10}
                  step="0.1"
                  value={currentWeightSlider}
                  onChange={(e) => handleWeightChange(Number.parseFloat(e.target.value))}
                  className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, 
                      rgb(59 130 246) 0%, 
                      rgb(59 130 246) ${
                        ((currentWeightSlider -
                          (Math.min(initialWeight, Number.parseFloat(quizData.targetWeight)) - 10)) /
                          (Math.max(initialWeight, Number.parseFloat(quizData.targetWeight)) +
                            10 -
                            (Math.min(initialWeight, Number.parseFloat(quizData.targetWeight)) - 10))) *
                        100
                      }%, 
                      rgb(229 231 235) ${
                        ((currentWeightSlider -
                          (Math.min(initialWeight, Number.parseFloat(quizData.targetWeight)) - 10)) /
                          (Math.max(initialWeight, Number.parseFloat(quizData.targetWeight)) +
                            10 -
                            (Math.min(initialWeight, Number.parseFloat(quizData.targetWeight)) - 10))) *
                        100
                      }%, 
                      rgb(229 231 235) 100%)`,
                  }}
                />
                {isSaving && <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-2">Salvando...</p>}
              </div>
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
              onClick={() => router.push("/dashboard/resumo")}
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
