"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Utensils, Target, Lightbulb, TrendingUp } from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { getNutritionTotals, calculateMealNutrition, calculateMacroPercentages } from "@/lib/nutrition-calculator"

interface Food {
  name: string
  quantity: string
  calories: number
}

interface Meal {
  name: string
  time: string
  foods: string[] | any[]
  calories: string
  macros: {
    protein: string
    carbs: string
    fats: string
  }
}

interface DietPlan {
  title: string
  calories: string
  protein: string
  carbs: string
  fats: string
  meals: Meal[]
  tips?: string[]
  totalDailyCalories?: string
  totalProtein?: string
  totalCarbs?: string
  totalFats?: string
}

interface UserData {
  dietPlan?: DietPlan
  quizData?: any
}

export default function DietPage() {
  const [user, loading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const fetchUserData = async () => {
      console.log("[v0] Diet page - Current user:", user?.uid || "anonymous")

      if (user) {
        try {
          console.log("[v0] Fetching user data from Firestore...")
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData
            console.log("[v0] User data found:", data)
            setUserData(data)

            if (!data.dietPlan || !data.dietPlan.meals || data.dietPlan.meals.length === 0) {
              console.log("[v0] Diet plan not found, generating...")
              await generatePlans()
            } else {
              console.log("[v0] Diet plan found with", data.dietPlan.meals.length, "meals")
              const totals = getNutritionTotals(data.dietPlan)
              console.log("[v0] Calculated nutrition totals:", totals)
            }
          } else {
            console.log("[v0] No user document found, checking localStorage...")
            const localData = localStorage.getItem("quizData")
            if (localData) {
              const parsedData = JSON.parse(localData)
              console.log("[v0] Found quiz data in localStorage:", parsedData)
              await generatePlans()
            } else {
              console.warn("[v0] No data found anywhere")
              setError("Dados do usuário não encontrados. Faça o quiz primeiro.")
            }
          }
        } catch (error) {
          console.error("[v0] Error fetching user data:", error)
          setError("Erro ao carregar dados do usuário.")
        } finally {
          setIsLoading(false)
        }
      } else {
        console.log("[v0] No authenticated user, checking localStorage...")
        const localData = localStorage.getItem("quizData")
        if (localData) {
          try {
            const parsedData = JSON.parse(localData)
            console.log("[v0] Found quiz data in localStorage for anonymous user:", parsedData)
            setUserData({ quizData: parsedData })
          } catch (error) {
            console.error("[v0] Error parsing localStorage data:", error)
          }
        }
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [user, loading])

  const generatePlans = async () => {
    console.log("[v0] Starting plan generation...")

    if (!user) {
      console.log("[v0] No authenticated user for plan generation")
      setError("Usuário não autenticado. Faça login primeiro.")
      return
    }

    try {
      console.log("[v0] Calling generate-plans-on-demand API...")
      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      })

      console.log("[v0] API response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] API response:", result)

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          const updatedData = userDoc.data() as UserData
          console.log("[v0] Updated user data after generation:", updatedData)
          setUserData(updatedData)
        }
      } else {
        const errorText = await response.text()
        console.error("[v0] API error:", response.status, errorText)
        setError(`Erro ao gerar planos: ${response.status}`)
      }
    } catch (error) {
      console.error("[v0] Error generating plans:", error)
      setError("Erro ao gerar planos. Tente novamente.")
    }
  }

  const handleGoToQuiz = () => {
    router.push("/quiz")
  }

  if (loading || isLoading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando seu plano de dieta...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const dietPlan = userData?.dietPlan

  if (!dietPlan || !dietPlan.meals || dietPlan.meals.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 flex flex-col items-center">
            <Utensils className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Plano de Dieta Não Encontrado</h2>
            <p className="text-gray-600 mb-6">Parece que você ainda não tem um plano de dieta personalizado.</p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}
            <Button onClick={handleGoToQuiz} className="mt-4">
              Fazer Quiz Gratuito
            </Button>
            {user && (
              <Button onClick={generatePlans} variant="outline" className="mt-2 bg-transparent">
                Tentar Gerar Planos Novamente
              </Button>
            )}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const nutritionTotals = getNutritionTotals(dietPlan)
  const calculatedNutrition = calculateMealNutrition(dietPlan.meals)
  const macroPercentages = calculateMacroPercentages(calculatedNutrition)

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seu Plano de Dieta</h1>
          <p className="text-gray-600">Plano personalizado baseado no seu perfil e objetivos</p>
        </div>

        {/* Resumo Nutricional */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Calorias Diárias</p>
                  <p className="text-2xl font-bold text-gray-900">{nutritionTotals.calories}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-red-600 font-bold text-sm">P</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Proteína</p>
                  <p className="text-2xl font-bold text-gray-900">{nutritionTotals.protein}</p>
                  <p className="text-xs text-gray-500">{macroPercentages.proteinPercent}% das calorias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-yellow-600 font-bold text-sm">C</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Carboidratos</p>
                  <p className="text-2xl font-bold text-gray-900">{nutritionTotals.carbs}</p>
                  <p className="text-xs text-gray-500">{macroPercentages.carbsPercent}% das calorias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold text-sm">G</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Gorduras</p>
                  <p className="text-2xl font-bold text-gray-900">{nutritionTotals.fats}</p>
                  <p className="text-xs text-gray-500">{macroPercentages.fatsPercent}% das calorias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nutrition Quality Indicator */}
        {calculatedNutrition.calories > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-gray-900">Qualidade Nutricional</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-600">
                    Distribuição: {macroPercentages.proteinPercent}% P | {macroPercentages.carbsPercent}% C |{" "}
                    {macroPercentages.fatsPercent}% G
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refeições */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {Array.isArray(dietPlan.meals) &&
            dietPlan.meals.map((meal, index) => {
              if (!meal || typeof meal !== "object") {
                console.warn("[v0] Invalid meal data at index", index, meal)
                return null
              }

              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-blue-600" />
                        {meal.name || `Refeição ${index + 1}`}
                      </CardTitle>
                      <Badge variant="secondary">{meal.time || "Horário não definido"}</Badge>
                    </div>
                    <CardDescription>{meal.calories || "0 kcal"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.isArray(meal.foods) && meal.foods.length > 0 ? (
                        meal.foods.map((food, foodIndex) => {
                          let foodName = ""
                          let foodQuantity = ""
                          let foodCalories = ""

                          if (typeof food === "string") {
                            const quantityMatch =
                              food.match(/(\d+g?)\s*de?\s*(.+)/i) || food.match(/(.+?)\s*-?\s*(\d+g?)/i)
                            if (quantityMatch) {
                              foodQuantity = quantityMatch[1].includes("g") ? quantityMatch[1] : quantityMatch[2]
                              foodName = quantityMatch[1].includes("g") ? quantityMatch[2] : quantityMatch[1]
                            } else {
                              foodName = food
                            }
                          } else if (food && typeof food === "object") {
                            foodName = food.name || `Alimento ${foodIndex + 1}`
                            foodQuantity = food.quantity || ""
                            foodCalories = food.calories ? `${food.calories} kcal` : ""
                          } else {
                            foodName = `Alimento ${foodIndex + 1}`
                          }

                          return (
                            <div
                              key={foodIndex}
                              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{foodName}</p>
                                {foodQuantity && <p className="text-sm text-blue-600 font-medium">{foodQuantity}</p>}
                              </div>
                              {foodCalories && (
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">{foodCalories}</p>
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-gray-500 text-sm">Nenhum alimento especificado</p>
                      )}
                      {meal.macros && typeof meal.macros === "object" && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Macros da refeição:</span>
                            <div className="flex gap-4 text-sm font-medium">
                              <span className="text-red-600">P: {meal.macros.protein || "0g"}</span>
                              <span className="text-yellow-600">C: {meal.macros.carbs || "0g"}</span>
                              <span className="text-green-600">G: {meal.macros.fats || "0g"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* Dicas */}
        {Array.isArray(dietPlan.tips) && dietPlan.tips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
                Dicas Nutricionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dietPlan.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span className="text-gray-700">{tip || "Dica não disponível"}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
