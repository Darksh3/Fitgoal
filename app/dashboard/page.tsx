"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebaseClient" // Import db
import { doc, getDoc } from "firebase/firestore" // Import doc and getDoc
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  User,
  TrendingUp,
  Database,
  Phone,
  CreditCard,
  LogOut,
  MessageCircle,
  Calendar,
  Target,
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

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  useEffect(() => {
    // Verificar se está em modo demo
    const demoMode = localStorage.getItem("demoMode")
    if (demoMode === "true") {
      setIsDemoMode(true)
      setLoading(false)
      // Carregar dados do quiz do localStorage (for demo mode only)
      const savedQuizData = localStorage.getItem("quizData")
      if (savedQuizData) {
        setQuizData(JSON.parse(savedQuizData))
      }
      return
    }

    // Verificação normal de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[v0] Usuário autenticado:", user ? user.uid : "anonymous")
      if (user) {
        setUser(user)
        loadProgressData()

        await loadQuizDataAndGeneratePlans(user)
      } else {
        console.log("[v0] Usuário não autenticado, redirecionando para /auth")
        router.push("/auth")
      }
      setLoading(false)
    })

    // Atualizar horário
    const updateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      let greeting = "Bom dia"
      if (hour >= 12 && hour < 18) greeting = "Boa tarde"
      if (hour >= 18) greeting = "Boa noite"
      setCurrentTime(greeting)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Atualiza a cada minuto

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [router])

  const loadQuizDataAndGeneratePlans = async (user: any) => {
    let foundQuizData = null

    // Try to load from Firestore first
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

          // Check if plans exist, if not generate them
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

    // Fallback to localStorage if no data found in Firestore
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
      if (quizData) {
        progress.caloriesTarget = calculateDynamicCalories(quizData)
      }
      setProgressData(progress)
    } else {
      // Para novos usuários, inicializar com valores zerados
      const initialProgress = {
        consecutiveDays: 0,
        completedWorkouts: 0,
        goalsAchieved: 0,
        totalGoals: 18,
        overallProgress: 0,
        caloriesConsumed: 0,
        caloriesTarget: quizData ? calculateDynamicCalories(quizData) : 2200, // Dynamic calories
        proteins: 0,
        carbs: 0,
        fats: 0,
      }
      setProgressData(initialProgress)
      localStorage.setItem("userProgress", JSON.stringify(initialProgress))
    }
  }

  const handleSignOut = async () => {
    try {
      if (isDemoMode) {
        // Limpar modo demo
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
    // Disparar evento para abrir o chat flutuante
    window.dispatchEvent(new Event("openFloatingChat"))
  }

  const calculateDynamicCalories = (quizData: QuizData) => {
    if (!quizData) return 2200

    const weight = Number.parseFloat(quizData.currentWeight) || 70
    const height = Number.parseFloat(quizData.height) || (quizData.gender === "mulher" ? 165 : 175) // Fallback apenas se não houver altura
    const age = Number.parseFloat(quizData.age) || 25 // Fallback apenas se não houver idade
    const gender = quizData.gender
    const goals = quizData.goal || []
    const bodyType = quizData.bodyType
    const trainingDays = Number.parseFloat(quizData.trainingDaysPerWeek) || 3

    const bmr =
      gender === "mulher" ? 10 * weight + 6.25 * height - 5 * age - 161 : 10 * weight + 6.25 * height - 5 * age + 5

    let activityFactor = 1.2 // Sedentário
    if (trainingDays >= 6)
      activityFactor = 1.725 // Muito ativo
    else if (trainingDays >= 4)
      activityFactor = 1.55 // Ativo
    else if (trainingDays >= 2) activityFactor = 1.375 // Levemente ativo

    let dailyCalories = bmr * activityFactor

    if (bodyType === "ectomorfo") {
      dailyCalories *= 1.1 // 10% aumento para ectomorfos
    } else if (bodyType === "endomorfo") {
      dailyCalories *= 0.95 // 5% redução para endomorfos
    }

    if (goals.includes("perder-peso")) {
      dailyCalories *= 0.85 // 15% déficit para perda de peso
    } else if (goals.includes("ganhar-massa")) {
      dailyCalories *= 1.15 // 15% superávit para ganho de massa
    }

    return Math.round(dailyCalories)
  }

  const calculateMacroTotals = () => {
    if (!dietPlan) return { proteins: 0, carbs: 0, fats: 0 }

    if (dietPlan.totalProtein !== undefined && dietPlan.totalCarbs !== undefined && dietPlan.totalFats !== undefined) {
      return {
        proteins: Math.round(dietPlan.totalProtein),
        carbs: Math.round(dietPlan.totalCarbs),
        fats: Math.round(dietPlan.totalFats),
      }
    }

    if (quizData) {
      const weight = Number.parseFloat(quizData.currentWeight) || 70
      const calories = calculateDynamicCalories(quizData)

      // Distribuição de macros baseada em g/kg (consistente com as APIs)
      const proteins = Math.round(weight * 2.0) // 2.0g/kg proteína
      const fats = Math.round(weight * 1.0) // 1.0g/kg gordura
      const remainingCalories = calories - proteins * 4 - fats * 9
      const carbs = Math.round(remainingCalories / 4) // Resto em carboidratos

      return { proteins, carbs, fats }
    }

    // Fallback apenas se não houver dados do quiz
    const proteins = dietPlan.protein ? Number.parseInt(dietPlan.protein.replace(/\D/g, "")) || 0 : 0
    const carbs = dietPlan.carbs ? Number.parseInt(dietPlan.carbs.replace(/\D/g, "")) || 0 : 0
    const fats = dietPlan.fats ? Number.parseInt(dietPlan.fats.replace(/\D/g, "")) || 0 : 0

    return { proteins, carbs, fats }
  }

  const getModelImage = () => {
    if (quizData?.gender === "mulher") {
      return "/images/female-avatar.png" // Female fitness avatar
    }
    return "/images/male-avatar.png" // Male fitness avatar
  }

  const getUserName = () => {
    // Priorize o nome do quizData, se existir e não for vazio
    if (quizData?.name && quizData.name.trim() !== "") {
      return quizData.name.charAt(0).toUpperCase() + quizData.name.slice(1).toLowerCase()
    }

    // Try to get name from localStorage as fallback
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

    // Caso contrário, use o nome do email ou um fallback genérico
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

  useEffect(() => {
    if (quizData) {
      const macros = calculateMacroTotals()
      setProgressData((prev) => ({
        ...prev,
        caloriesTarget: calculateDynamicCalories(quizData),
        proteins: macros.proteins,
        carbs: macros.carbs,
        fats: macros.fats,
      }))
    }
  }, [quizData, dietPlan])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Carregando seu dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex w-64 bg-white shadow-lg flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-lime-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-800">ATHLIX</span>
            {isDemoMode && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">DEMO</span>}
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => router.push("/dashboard/analise-corporal")}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <User className="h-5 w-5" />
              <span>Análise Corporal</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/progresso")}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <TrendingUp className="h-5 w-5" />
              <span>Progresso</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/dados")}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <Database className="h-5 w-5" />
              <span>Dados</span>
            </button>
            <button
              onClick={handleOpenChat}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Chat com IA</span>
            </button>
            <button
              onClick={() =>
                window.open("https://wa.me/5511999999999?text=Olá! Preciso de ajuda com meu plano fitness.", "_blank")
              }
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <Phone className="h-5 w-5" />
              <span>Entre em contato</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/assinatura")}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
            >
              <CreditCard className="h-5 w-5" />
              <span>Assinaturas</span>
            </button>
          </nav>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5 mr-3" />
              {isDemoMode ? "Sair do Demo" : "Sair"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-lime-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-800">ATHLIX</span>
              {isDemoMode && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">DEMO</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/analise-corporal")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
              >
                <User className="h-5 w-5" />
                <span>Análise Corporal</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/progresso")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
              >
                <TrendingUp className="h-5 w-5" />
                <span>Progresso</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/dados")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Database className="h-5 w-5" />
                <span>Dados</span>
              </button>
              <button
                onClick={handleOpenChat}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Chat com IA</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  window.open("https://wa.me/5511999999999?text=Olá! Preciso de ajuda com meu plano fitness.", "_blank")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Phone className="h-5 w-5" />
                <span>Entre em contato</span>
              </button>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  router.push("/dashboard/assinatura")
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
              >
                <CreditCard className="h-5 w-5" />
                <span>Assinaturas</span>
              </button>
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <Button
                onClick={() => {
                  setSidebarOpen(false)
                  handleSignOut()
                }}
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5 mr-3" />
                {isDemoMode ? "Sair do Demo" : "Sair"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 mt-12 lg:mt-0">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {currentTime}, {getUserName()}!
          </h1>
          <p className="text-gray-600">
            {isDemoMode ? "Bem-vindo ao modo demonstração" : "Vamos continuar sua jornada fitness hoje"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Model Image */}
          <div className="lg:col-span-1 flex justify-center">
            <div className="relative">
              <img
                src={getModelImage() || "/placeholder.svg"}
                alt={`Modelo ${quizData?.gender === "mulher" ? "feminino" : "masculino"} fitness`}
                className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:w-80 h-auto object-contain"
                onError={(e) => {
                  // Fallback to generic fitness placeholder if specific one fails
                  const target = e.currentTarget
                  if (target.src.includes("query=")) {
                    target.src = "/placeholder.svg?height=400&width=300"
                  } else {
                    target.src = "/placeholder.svg?height=400&width=300"
                  }
                }}
                onLoad={() => {
                  console.log("[v0] Avatar image loaded successfully")
                }}
              />

              {/* Stats overlay */}
              {quizData && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                  <div className="text-sm text-gray-600">Peso Atual</div>
                  <div className="text-xl font-bold text-gray-800">{quizData.currentWeight} kg</div>
                </div>
              )}

              {quizData && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                  <div className="text-sm text-gray-600">Meta</div>
                  <div className="text-xl font-bold text-gray-800">{quizData.targetWeight} kg</div>
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dieta Card */}
            <Card
              className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/dashboard/dieta")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-800">
                  <Utensils className="h-5 w-5 text-orange-500" />
                  <span>Dieta</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-orange-500 rounded-full"
                      style={{ width: `${(progressData.caloriesConsumed / progressData.caloriesTarget) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Calorias consumidas hoje: {progressData.caloriesConsumed} / {progressData.caloriesTarget}
                  </p>
                  <p className="text-xs text-gray-500">
                    Proteínas: {progressData.proteins}g | Carboidratos: {progressData.carbs}g | Gorduras:{" "}
                    {progressData.fats}g
                  </p>
                  <p className="text-xs text-blue-600 font-medium">Clique para ver sua dieta completa →</p>
                </div>
              </CardContent>
            </Card>

            {/* Treino Card */}
            <Card
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/dashboard/treino")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-800">
                  <Dumbbell className="h-5 w-5 text-blue-500" />
                  <span>Treino</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full w-1/2"></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Próximo: Treino de {quizData?.experience === "iniciante" ? "Iniciante" : "Intermediário"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Duração: {quizData?.workoutTime || "30-45 minutos"} | Foco: {getMainGoal()}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">Clique para ver seu treino completo →</p>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Card */}
            <Card
              className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/dashboard/resumo")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-gray-800">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  <span>Resumo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-green-500 rounded-full"
                      style={{ width: `${progressData.overallProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">Progresso geral: {progressData.overallProgress}%</p>
                  <p className="text-xs text-gray-500">
                    {quizData?.timeToGoal ? `Meta até: ${quizData.timeToGoal}` : "Continue seguindo seu plano!"}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">Clique para ver informações completas →</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-lime-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dias consecutivos</p>
                      <p className="text-xl font-bold text-gray-800">{progressData.consecutiveDays}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Metas atingidas</p>
                      <p className="text-xl font-bold text-gray-800">
                        {progressData.goalsAchieved}/{progressData.totalGoals}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
