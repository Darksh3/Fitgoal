"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Utensils, Target, Lightbulb } from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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

  const calculateTotalMacros = (meals: Meal[]) => {
    if (!Array.isArray(meals) || meals.length === 0) {
      return { calories: "0", protein: "0g", carbs: "0g", fats: "0g" }
    }

    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0

    meals.forEach((meal) => {
      if (meal && typeof meal === "object") {
        // Extract calories from meal.calories string (e.g., "450 kcal" -> 450)
        const caloriesMatch = meal.calories?.match(/(\d+)/)
        if (caloriesMatch) {
          totalCalories += Number.parseInt(caloriesMatch[1])
        }

        // Extract macros from meal.macros with better parsing
        if (meal.macros && typeof meal.macros === "object") {
          const proteinMatch = meal.macros.protein?.match(/(\d+\.?\d*)/)
          const carbsMatch = meal.macros.carbs?.match(/(\d+\.?\d*)/)
          const fatsMatch = meal.macros.fats?.match(/(\d+\.?\d*)/)

          if (proteinMatch) totalProtein += Number.parseFloat(proteinMatch[1])
          if (carbsMatch) totalCarbs += Number.parseFloat(carbsMatch[1])
          if (fatsMatch) totalFats += Number.parseFloat(fatsMatch[1])
        }

        // Fallback: estimate macros from individual foods if meal macros are missing
        if ((!meal.macros || !meal.macros.protein) && Array.isArray(meal.foods)) {
          meal.foods.forEach((food) => {
            if (typeof food === "string") {
              // Estimate macros based on common foods
              const foodLower = food.toLowerCase()
              if (foodLower.includes("ovo") || foodLower.includes("frango") || foodLower.includes("carne")) {
                totalProtein += 20 // Estimate 20g protein per serving
              }
              if (foodLower.includes("arroz") || foodLower.includes("pão") || foodLower.includes("aveia")) {
                totalCarbs += 30 // Estimate 30g carbs per serving
              }
              if (foodLower.includes("azeite") || foodLower.includes("amendoa") || foodLower.includes("abacate")) {
                totalFats += 10 // Estimate 10g fats per serving
              }
            }
          })
        }
      }
    })

    return {
      calories: totalCalories > 0 ? `${totalCalories}` : "0",
      protein: totalProtein > 0 ? `${Math.round(totalProtein)}g` : "0g",
      carbs: totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : "0g",
      fats: totalFats > 0 ? `${Math.round(totalFats)}g` : "0g",
    }
  }

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
            const firestoreData = userDoc.data() as UserData
            console.log("[v0] User data found in Firestore:", firestoreData)

            const localStorageData = localStorage.getItem("quizData")
            let shouldUpdateLocalStorage = false

            if (localStorageData) {
              try {
                const parsedLocalData = JSON.parse(localStorageData)
                console.log("[v0] Local storage data:", parsedLocalData)

                // Compare names to detect sync issues
                if (firestoreData.quizData?.name && parsedLocalData.name !== firestoreData.quizData.name) {
                  console.log(
                    "[v0] Name mismatch detected - Local:",
                    parsedLocalData.name,
                    "Firestore:",
                    firestoreData.quizData.name,
                  )
                  shouldUpdateLocalStorage = true
                }
              } catch (e) {
                console.log("[v0] Error parsing localStorage data, will update")
                shouldUpdateLocalStorage = true
              }
            } else {
              console.log("[v0] No localStorage data found")
              shouldUpdateLocalStorage = true
            }

            if (shouldUpdateLocalStorage && firestoreData.quizData) {
              console.log("[v0] Updating localStorage with Firestore data")
              localStorage.setItem("quizData", JSON.stringify(firestoreData.quizData))
              localStorage.setItem("userData", JSON.stringify(firestoreData))
            }

            if (firestoreData.quizData?.name) {
              console.log("[v0] User name from Firestore quizData:", firestoreData.quizData.name)
            }

            setUserData(firestoreData)

            if (!firestoreData.dietPlan || !firestoreData.dietPlan.meals || firestoreData.dietPlan.meals.length === 0) {
              console.log("[v0] Diet plan not found, generating...")
              await generatePlans()
            } else {
              console.log("[v0] Diet plan found with", firestoreData.dietPlan.meals.length, "meals")

              console.log("[v0] Diet plan details:", {
                totalDailyCalories: firestoreData.dietPlan.totalDailyCalories,
                totalProtein: firestoreData.dietPlan.totalProtein,
                totalCarbs: firestoreData.dietPlan.totalCarbs,
                totalFats: firestoreData.dietPlan.totalFats,
                calories: firestoreData.dietPlan.calories,
                protein: firestoreData.dietPlan.protein,
                carbs: firestoreData.dietPlan.carbs,
                fats: firestoreData.dietPlan.fats,
              })
            }
          } else {
            console.log("[v0] No user document found in Firestore")
            setError("Dados do usuário não encontrados. Faça o quiz primeiro.")
          }
        } catch (error) {
          console.error("[v0] Error fetching user data:", error)
          setError("Erro ao carregar dados do usuário.")
        } finally {
          setIsLoading(false)
        }
      } else {
        console.log("[v0] No authenticated user")
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

  const calculatedTotals = calculateTotalMacros(dietPlan.meals)

  const displayTotals = {
    calories: (() => {
      console.log("[v0] Calculating display calories:", {
        totalDailyCalories: dietPlan.totalDailyCalories,
        calories: dietPlan.calories,
        calculatedCalories: calculatedTotals.calories,
      })

      // Check for totalDailyCalories from API response first
      if (dietPlan.totalDailyCalories && dietPlan.totalDailyCalories !== "0") {
        const value = `${dietPlan.totalDailyCalories} kcal`
        console.log("[v0] Using totalDailyCalories:", value)
        return value
      }
      // Then check for calories field
      if (dietPlan.calories && dietPlan.calories !== "0" && dietPlan.calories !== "0 kcal") {
        const value = dietPlan.calories.includes("kcal") ? dietPlan.calories : `${dietPlan.calories} kcal`
        console.log("[v0] Using calories field:", value)
        return value
      }
      // Use calculated totals if available
      if (calculatedTotals.calories !== "0") {
        const value = `${calculatedTotals.calories} kcal`
        console.log("[v0] Using calculated calories:", value)
        return value
      }

      console.warn("[v0] No calorie data available, showing error")
      return "Dados não disponíveis"
    })(),
    protein: (() => {
      console.log("[v0] Calculating display protein:", {
        totalProtein: dietPlan.totalProtein,
        protein: dietPlan.protein,
        calculatedProtein: calculatedTotals.protein,
      })

      // Check for totalProtein from API response first
      if (dietPlan.totalProtein && dietPlan.totalProtein !== "0g" && dietPlan.totalProtein !== "0") {
        const value = dietPlan.totalProtein.includes("g") ? dietPlan.totalProtein : `${dietPlan.totalProtein}g`
        console.log("[v0] Using totalProtein:", value)
        return value
      }
      // Then check for protein field
      if (dietPlan.protein && dietPlan.protein !== "0g" && dietPlan.protein !== "0") {
        const value = dietPlan.protein.includes("g") ? dietPlan.protein : `${dietPlan.protein}g`
        console.log("[v0] Using protein field:", value)
        return value
      }
      // Use calculated totals if available
      if (calculatedTotals.protein !== "0g") {
        console.log("[v0] Using calculated protein:", calculatedTotals.protein)
        return calculatedTotals.protein
      }

      console.warn("[v0] No protein data available, showing error")
      return "Dados não disponíveis"
    })(),
    carbs: (() => {
      console.log("[v0] Calculating display carbs:", {
        totalCarbs: dietPlan.totalCarbs,
        carbs: dietPlan.carbs,
        calculatedCarbs: calculatedTotals.carbs,
      })

      // Check for totalCarbs from API response first
      if (dietPlan.totalCarbs && dietPlan.totalCarbs !== "0g" && dietPlan.totalCarbs !== "0") {
        const value = dietPlan.totalCarbs.includes("g") ? dietPlan.totalCarbs : `${dietPlan.totalCarbs}g`
        console.log("[v0] Using totalCarbs:", value)
        return value
      }
      // Then check for carbs field
      if (dietPlan.carbs && dietPlan.carbs !== "0g" && dietPlan.carbs !== "0") {
        const value = dietPlan.carbs.includes("g") ? dietPlan.carbs : `${dietPlan.carbs}g`
        console.log("[v0] Using carbs field:", value)
        return value
      }
      // Use calculated totals if available
      if (calculatedTotals.carbs !== "0g") {
        console.log("[v0] Using calculated carbs:", calculatedTotals.carbs)
        return calculatedTotals.carbs
      }

      console.warn("[v0] No carbs data available, showing error")
      return "Dados não disponíveis"
    })(),
    fats: (() => {
      console.log("[v0] Calculating display fats:", {
        totalFats: dietPlan.totalFats,
        fats: dietPlan.fats,
        calculatedFats: calculatedTotals.fats,
      })

      // Check for totalFats from API response first
      if (dietPlan.totalFats && dietPlan.totalFats !== "0g" && dietPlan.totalFats !== "0") {
        const value = dietPlan.totalFats.includes("g") ? dietPlan.totalFats : `${dietPlan.totalFats}g`
        console.log("[v0] Using totalFats:", value)
        return value
      }
      // Then check for fats field
      if (dietPlan.fats && dietPlan.fats !== "0g" && dietPlan.fats !== "0") {
        const value = dietPlan.fats.includes("g") ? dietPlan.fats : `${dietPlan.fats}g`
        console.log("[v0] Using fats field:", value)
        return value
      }
      // Use calculated totals if available
      if (calculatedTotals.fats !== "0g") {
        console.log("[v0] Using calculated fats:", calculatedTotals.fats)
        return calculatedTotals.fats
      }

      console.warn("[v0] No fats data available, showing error")
      return "Dados não disponíveis"
    })(),
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seu Plano de Dieta</h1>
          <p className="text-gray-600">Plano personalizado baseado no seu perfil e objetivos</p>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>User ID: {user?.uid || "anonymous"}</p>
              <p>User Email: {user?.email || "none"}</p>
              <p>Quiz Data Name: {userData?.quizData?.name || "none"}</p>
              <p>Diet Plan Available: {dietPlan ? "Yes" : "No"}</p>
              <p>Meals Count: {dietPlan?.meals?.length || 0}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="mt-2 bg-transparent"
              >
                Sync Data
              </Button>
            </div>
          )}
        </div>

        {(displayTotals.calories === "Dados não disponíveis" ||
          displayTotals.protein === "Dados não disponíveis" ||
          displayTotals.carbs === "Dados não disponíveis" ||
          displayTotals.fats === "Dados não disponíveis") && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">⚠️ Alguns dados nutricionais não estão disponíveis</p>
            <p className="text-yellow-700 text-sm mt-1">
              Isso pode acontecer se o plano de dieta não foi gerado corretamente. Tente gerar os planos novamente.
            </p>
            <Button
              onClick={generatePlans}
              variant="outline"
              size="sm"
              className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100 bg-transparent"
            >
              Regenerar Planos
            </Button>
          </div>
        )}

        {/* Resumo Nutricional */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Calorias Diárias</p>
                  <p className="text-2xl font-bold text-gray-900">{displayTotals.calories}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{displayTotals.protein}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{displayTotals.carbs}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{displayTotals.fats}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
