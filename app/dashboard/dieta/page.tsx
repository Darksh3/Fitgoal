"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, Replace } from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { Meal, DietPlan } from "@/types"

export default function DietPage() {
  const [isHydrated, setIsHydrated] = useState(false)

  console.log("[v0] DietPage component rendering")

  const [user] = useAuthState(auth)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replacingMeal, setReplacingMeal] = useState<number | null>(null)
  const [replacingFood, setReplacingFood] = useState<{ mealIndex: number; foodIndex: number } | null>(null)
  const [userPreferences, setUserPreferences] = useState<any>(null)
  const [quizData, setQuizData] = useState<any>(null)
  const router = useRouter()

  console.log("[v0] Component state:", { user: !!user, loading, error, dietPlan: !!dietPlan, quizData: !!quizData })

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    console.log("[v0] useEffect triggered, user:", !!user, "isHydrated:", isHydrated)
    if (user && isHydrated) {
      const fetchDietPlan = async () => {
        console.log("[v0] Starting fetchDietPlan")
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)

          console.log("[v0] User doc exists:", userDocSnap.exists())

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            console.log("[v0] User data loaded:", {
              hasQuizData: !!userData.quizData,
              hasDietPlan: !!userData.dietPlan,
            })

            if (userData.quizData) {
              setQuizData(userData.quizData)
            }

            setUserPreferences({
              allergies: userData.quizData?.allergyDetails || userData.allergyDetails,
              dietType: userData.quizData?.dietPreferences || userData.dietPreferences,
              goal: userData.quizData?.goal || userData.goal,
            })

            if (userData.dietPlan) {
              setDietPlan(userData.dietPlan as DietPlan)
            } else {
              console.log("[v0] No diet plan in users collection, checking leads")
              const leadsDocRef = doc(db, "leads", user.uid)
              const leadsDocSnap = await getDoc(leadsDocRef)

              if (leadsDocSnap.exists()) {
                const leadsData = leadsDocSnap.data()
                console.log("[v0] Leads data loaded:", {
                  hasQuizData: !!leadsData.quizData,
                  hasDietPlan: !!leadsData.dietPlan,
                })

                if (leadsData.quizData && !quizData) {
                  setQuizData(leadsData.quizData)
                }

                if (!userPreferences) {
                  setUserPreferences({
                    allergies: leadsData.quizData?.allergyDetails || leadsData.allergyDetails,
                    dietType: leadsData.quizData?.dietPreferences || leadsData.dietPreferences,
                    goal: leadsData.quizData?.goal || leadsData.goal,
                  })
                }

                if (leadsData.dietPlan) {
                  setDietPlan(leadsData.dietPlan as DietPlan)
                } else {
                  setError("Nenhum plano de dieta encontrado. Tente regenerar os planos.")
                }
              } else {
                console.log("[v0] No leads doc found")
                setError("Nenhum plano de dieta encontrado. Tente regenerar os planos.")
              }
            }
          } else {
            console.log("[v0] User doc does not exist")
            setError("Dados do usuário não encontrados")
          }
        } catch (err) {
          console.error("[v0] Error fetching diet plan:", err)
          setError("Erro ao carregar o plano de dieta")
        } finally {
          console.log("[v0] fetchDietPlan completed, setting loading to false")
          setLoading(false)
        }
      }

      fetchDietPlan()
    } else if (isHydrated && !user) {
      setLoading(false)
    }
  }, [user, isHydrated])

  if (!isHydrated) {
    return null
  }

  console.log("[v0] About to render, loading:", loading, "error:", error)

  const saveDietPlan = async (updatedDietPlan: DietPlan) => {
    if (!user) return

    try {
      console.log("[v0] Saving updated diet plan to Firestore:", updatedDietPlan)

      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        dietPlan: updatedDietPlan,
        updatedAt: new Date().toISOString(),
      })

      console.log("[v0] Diet plan saved successfully")
    } catch (error) {
      console.error("[v0] Error saving diet plan:", error)
      setError("Erro ao salvar alterações. Tente novamente.")
    }
  }

  const updateSavedValuesWithScientificCalculation = async () => {
    if (!user || !quizData) return

    try {
      console.log("[v0] Regenerating diet with scientific calculation...")
      setLoading(true)

      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          forceRegenerate: true,
        }),
      })

      if (response.ok) {
        console.log("[v0] Diet regenerated successfully with scientific values")
        window.location.reload()
      } else {
        setError("Erro ao regenerar dieta com valores científicos. Tente novamente.")
      }
    } catch (error) {
      console.error("[v0] Error regenerating diet:", error)
      setError("Erro ao regenerar dieta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleReplaceMeal = async (mealIndex: number) => {
    if (!user || !dietPlan) return

    console.log("[v0] Starting meal replacement for meal index:", mealIndex)
    setReplacingMeal(mealIndex)

    try {
      const currentMeal = dietPlan.meals[mealIndex]
      console.log("[v0] Current meal to replace:", currentMeal)

      // Calculate target macros from current meal
      const targetMacros = {
        calories: Number.parseInt(currentMeal.calories?.match(/(\d+)/)?.[1] || "0"),
        protein: Number.parseFloat(currentMeal.macros?.protein?.match(/(\d+\.?\d*)/)?.[1] || "0"),
        carbs: Number.parseFloat(currentMeal.macros?.carbs?.match(/(\d+\.?\d*)/)?.[1] || "0"),
        fats: Number.parseFloat(currentMeal.macros?.fats?.match(/(\d+\.?\d*)/)?.[1] || "0"),
      }

      console.log("[v0] Target macros calculated:", targetMacros)

      const token = await user.getIdToken()
      console.log("[v0] Got user token, making API call...")

      const response = await fetch("/api/substitute-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "meal",
          currentItem: currentMeal,
          targetMacros,
          userPreferences: userPreferences || {},
          mealContext: currentMeal.name || `Refeição ${mealIndex + 1}`,
        }),
      })

      console.log("[v0] API response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] API response result:", result)

        if (result.success && result.substitution?.newMeal) {
          // Update the diet plan with the new meal
          const updatedMeals = [...dietPlan.meals]
          updatedMeals[mealIndex] = {
            ...result.substitution.newMeal,
            time: currentMeal.time, // Preserve original time
          }

          const updatedDietPlan = {
            ...dietPlan,
            meals: updatedMeals,
          }

          setDietPlan(updatedDietPlan)

          await saveDietPlan(updatedDietPlan)

          console.log("[v0] Meal replacement completed successfully")
        } else {
          console.log("[v0] API returned unsuccessful result or missing newMeal")
          setError("Erro ao substituir refeição. Resposta inválida da API.")
        }
      } else {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)
        setError("Erro ao substituir refeição. Tente novamente.")
      }
    } catch (err) {
      console.error("[v0] Error replacing meal:", err)
      setError("Erro ao substituir refeição. Tente novamente.")
    } finally {
      setReplacingMeal(null)
    }
  }

  const handleReplaceFood = async (mealIndex: number, foodIndex: number) => {
    if (!user || !dietPlan) return

    console.log("[v0] Starting food replacement for meal:", mealIndex, "food:", foodIndex)
    setReplacingFood({ mealIndex, foodIndex })

    try {
      const currentFood = dietPlan.meals[mealIndex].foods[foodIndex]
      const currentMeal = dietPlan.meals[mealIndex]

      // Extract calories from food if available
      let foodCalories = 0
      if (typeof currentFood === "object" && currentFood.calories) {
        foodCalories = Number.parseInt(currentFood.calories.toString().match(/(\d+)/)?.[1] || "0")
      }

      // Estimate macros for individual food (simplified)
      const targetMacros = {
        calories: foodCalories || 100, // Default estimate
        protein: (foodCalories * 0.2) / 4, // Rough estimate
        carbs: (foodCalories * 0.5) / 4,
        fats: (foodCalories * 0.3) / 9,
      }

      const token = await user.getIdToken()

      const response = await fetch("/api/substitute-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "food",
          currentItem: currentFood,
          targetMacros,
          userPreferences: userPreferences || {},
          mealContext: currentMeal.name || `Refeição ${mealIndex + 1}`,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.substitution?.substitutes?.length > 0) {
          // Use the first substitute (could add UI to let user choose)
          const newFood = result.substitution.substitutes[0]

          // Update the diet plan with the new food
          const updatedMeals = [...dietPlan.meals]
          updatedMeals[mealIndex] = {
            ...updatedMeals[mealIndex],
            foods: [
              ...updatedMeals[mealIndex].foods.slice(0, foodIndex),
              newFood,
              ...updatedMeals[mealIndex].foods.slice(foodIndex + 1),
            ],
          }

          const updatedDietPlan = {
            ...dietPlan,
            meals: updatedMeals,
          }

          setDietPlan(updatedDietPlan)

          await saveDietPlan(updatedDietPlan)

          console.log("[v0] Food replacement completed and saved")
        }
      } else {
        setError("Erro ao substituir alimento. Tente novamente.")
      }
    } catch (err) {
      console.error("[v0] Error replacing food:", err)
      setError("Erro ao substituir alimento. Tente novamente.")
    } finally {
      setReplacingFood(null)
    }
  }

  const generatePlans = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          forceRegenerate: true,
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        setError("Erro ao regenerar planos. Tente novamente.")
      }
    } catch (err) {
      console.error("[v0] Error regenerating plans:", err)
      setError("Erro ao regenerar planos. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoToQuiz = () => {
    router.push("/dashboard/quiz")
  }

  const calculateTotalMacros = (meals: Meal[]) => {
    if (!Array.isArray(meals) || meals.length === 0) {
      return { calories: "0", protein: "0g", carbs: "0g", fats: "0g" }
    }

    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0

    meals.forEach((meal, mealIndex) => {
      if (meal && typeof meal === "object") {
        let mealCalories = 0

        // Always try to sum from individual foods first for accuracy
        if (Array.isArray(meal.foods)) {
          meal.foods.forEach((food, foodIndex) => {
            let foodCalories = 0

            if (typeof food === "object" && food.calories) {
              // Extract number from various formats: "190 kcal", "190", 190
              const caloriesStr = food.calories.toString()
              const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
              if (match) {
                foodCalories = Number.parseFloat(match[1])
              }
            } else if (typeof food === "string") {
              // Extract from string format like "Aveia 150g - 190 kcal"
              const match = food.match(/(\d+(?:\.\d+)?)\s*kcal/i)
              if (match) {
                foodCalories = Number.parseFloat(match[1])
              }
            }

            if (!isNaN(foodCalories) && foodCalories > 0) {
              mealCalories += foodCalories
              console.log(`[v0] Food ${foodIndex} in meal ${mealIndex}: ${foodCalories} kcal`)
            }
          })
        }

        // Only use meal.calories as fallback if no food calories found
        if (mealCalories === 0 && meal.calories) {
          const caloriesStr = meal.calories.toString()
          const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
          if (match) {
            mealCalories = Number.parseFloat(match[1])
            console.log(`[v0] Using meal.calories fallback for meal ${mealIndex}: ${mealCalories} kcal`)
          }
        }

        totalCalories += mealCalories
        console.log(`[v0] Meal ${mealIndex} total: ${mealCalories} kcal`)

        if (meal.macros && typeof meal.macros === "object") {
          const extractMacro = (macroValue: any) => {
            if (!macroValue) return 0
            const match = macroValue.toString().match(/(\d+(?:\.\d+)?)/)
            return match ? Number.parseFloat(match[1]) : 0
          }

          totalProtein += extractMacro(meal.macros.protein)
          totalCarbs += extractMacro(meal.macros.carbs)
          totalFats += extractMacro(meal.macros.fats)
        }
      }
    })

    console.log("[v0] Final calculated totals:", { totalCalories, totalProtein, totalCarbs, totalFats })

    return {
      calories: totalCalories > 0 ? `${Math.round(totalCalories)}` : "0",
      protein: totalProtein > 0 ? `${Math.round(totalProtein)}g` : "0g",
      carbs: totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : "0g",
      fats: totalFats > 0 ? `${Math.round(totalFats)}g` : "0g",
    }
  }

  const calculateScientificCalories = (quizData: any) => {
    if (!quizData) return 2200

    const weight = Number.parseFloat(quizData.currentWeight) || 70
    const height = Number.parseFloat(quizData.height) || (quizData.gender === "mulher" ? 165 : 175)
    const age = Number.parseFloat(quizData.age) || 25
    const gender = quizData.gender
    const goals = quizData.goal || []
    const bodyType = quizData.bodyType
    const trainingDays = Number.parseFloat(quizData.trainingDaysPerWeek) || 3
    const targetWeight = Number.parseFloat(quizData.targetWeight) || weight
    const timeToGoal = quizData.timeToGoal

    if (isNaN(weight) || isNaN(height) || isNaN(age) || isNaN(trainingDays) || isNaN(targetWeight)) {
      console.log("[v0] Invalid numeric values detected, using fallback calculation")
      return 2200
    }

    // Mifflin-St Jeor formula
    const bmr =
      gender === "mulher" ? 10 * weight + 6.25 * height - 5 * age - 161 : 10 * weight + 6.25 * height - 5 * age + 5

    if (isNaN(bmr)) {
      console.log("[v0] BMR calculation resulted in NaN, using fallback")
      return 2200
    }

    // Activity factor based on training days
    let activityFactor = 1.2 // Sedentário
    if (trainingDays >= 6)
      activityFactor = 2.0 // Atleta
    else if (trainingDays >= 4)
      activityFactor = 1.6 // Regularmente ativo
    else if (trainingDays >= 2) activityFactor = 1.6 // Regularmente ativo

    let dailyCalories = bmr * activityFactor

    // Body type adjustments
    if (bodyType === "ectomorfo") {
      dailyCalories *= 1.1
    } else if (bodyType === "endomorfo") {
      dailyCalories *= 0.95
    }

    const weightDifference = targetWeight - weight

    if (Math.abs(weightDifference) > 0.5 && timeToGoal && typeof timeToGoal === "string" && timeToGoal.trim() !== "") {
      try {
        // Parse Brazilian date format (e.g., "10 de nov. de 2025")
        let goalDate: Date

        if (timeToGoal.includes(" de ")) {
          // Handle Brazilian format
          const monthMap: { [key: string]: number } = {
            jan: 0,
            fev: 1,
            mar: 2,
            abr: 3,
            mai: 4,
            jun: 5,
            jul: 6,
            ago: 7,
            set: 8,
            out: 9,
            nov: 10,
            dez: 11,
          }

          const parts = timeToGoal.split(" de ")
          if (parts.length === 3) {
            const day = Number.parseInt(parts[0])
            const monthStr = parts[1].toLowerCase().substring(0, 3)
            const year = Number.parseInt(parts[2])
            const month = monthMap[monthStr]

            if (!isNaN(day) && !isNaN(year) && month !== undefined) {
              goalDate = new Date(year, month, day)
            } else {
              throw new Error("Invalid Brazilian date format")
            }
          } else {
            throw new Error("Invalid Brazilian date format")
          }
        } else {
          // Try standard date parsing
          goalDate = new Date(timeToGoal)
        }

        const currentDate = new Date()
        const timeDifferenceMs = goalDate.getTime() - currentDate.getTime()

        if (isNaN(timeDifferenceMs) || timeDifferenceMs <= 0) {
          throw new Error("Invalid date calculation")
        }

        const weeksToGoal = Math.max(1, timeDifferenceMs / (1000 * 60 * 60 * 24 * 7))

        // Calculate required weekly weight change
        const weeklyWeightChange = weightDifference / weeksToGoal

        // Calculate daily calorie adjustment (7700 kcal = 1kg of body mass)
        const dailyCalorieAdjustment = (weeklyWeightChange * 7700) / 7

        if (isNaN(dailyCalorieAdjustment) || !isFinite(dailyCalorieAdjustment)) {
          throw new Error("Invalid calorie adjustment calculation")
        }

        console.log("[v0] Personalized calorie calculation:", {
          weightDifference,
          weeksToGoal: Math.round(weeksToGoal),
          weeklyWeightChange: weeklyWeightChange.toFixed(2),
          dailyCalorieAdjustment: Math.round(dailyCalorieAdjustment),
        })

        dailyCalories += dailyCalorieAdjustment
      } catch (error) {
        console.log("[v0] Error in personalized calculation, falling back to original logic:", error)
        // Fallback to original logic for edge cases
        if (goals.includes("perder-peso")) {
          dailyCalories *= 0.85 // 15% déficit
        } else if (goals.includes("ganhar-massa")) {
          dailyCalories += 600 // +600 kcal superávit moderado
        }
      }
    } else {
      // Fallback to original logic for edge cases
      if (goals.includes("perder-peso")) {
        dailyCalories *= 0.85 // 15% déficit
      } else if (goals.includes("ganhar-massa")) {
        dailyCalories += 600 // +600 kcal superávit moderado
      }
    }

    const finalCalories = Math.round(dailyCalories)
    if (isNaN(finalCalories) || !isFinite(finalCalories) || finalCalories <= 0) {
      console.log("[v0] Final calculation resulted in invalid value, using fallback")
      return 2200
    }

    return finalCalories
  }

  const displayTotals = {
    calories: (() => {
      if (dietPlan?.totalDailyCalories && dietPlan.totalDailyCalories !== "0") {
        const savedValue = dietPlan.totalDailyCalories.includes("kcal")
          ? dietPlan.totalDailyCalories
          : `${dietPlan.totalDailyCalories} kcal`
        console.log("[v0] Using saved plan calories:", savedValue)
        return savedValue
      }

      if (quizData) {
        const scientificCalories = calculateScientificCalories(quizData)
        console.log("[v0] Using scientific calculation calories:", scientificCalories)
        return `${scientificCalories} kcal`
      }

      console.log("[v0] No valid calorie data found, showing unavailable")
      return "Dados não disponíveis"
    })(),
    protein: (() => {
      if (dietPlan?.totalProtein && dietPlan.totalProtein !== "0g" && dietPlan.totalProtein !== "0") {
        return dietPlan.totalProtein.includes("g") ? dietPlan.totalProtein : `${dietPlan.totalProtein}g`
      }
      console.log("[v0] No valid protein data found")
      return "Dados não disponíveis"
    })(),
    carbs: (() => {
      if (dietPlan?.totalCarbs && dietPlan.totalCarbs !== "0g" && dietPlan.totalCarbs !== "0") {
        return dietPlan.totalCarbs.includes("g") ? dietPlan.totalCarbs : `${dietPlan.totalCarbs}g`
      }
      console.log("[v0] No valid carbs data found")
      return "Dados não disponíveis"
    })(),
    fats: (() => {
      if (dietPlan?.totalFats && dietPlan.totalFats !== "0g" && dietPlan.totalFats !== "0") {
        return dietPlan.totalFats.includes("g") ? dietPlan.totalFats : `${dietPlan.totalFats}g`
      }
      console.log("[v0] No valid fats data found")
      return "Dados não disponíveis"
    })(),
  }

  const calculatedTotals = calculateTotalMacros(dietPlan?.meals || [])

  console.log("[v0] Using diet plan values:", {
    calories: dietPlan?.totalDailyCalories || "not found",
    carbs: dietPlan?.totalCarbs || "not found",
    fats: dietPlan?.totalFats || "not found",
    proteins: dietPlan?.totalProtein || "not found",
  })

  console.log("[v0] rawDietPlan:", dietPlan)

  console.log("[v0] About to render, loading:", loading, "error:", error)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Plano de Dieta</h1>
            {error && <p className="text-red-500">{error}</p>}
          </div>

          {loading && <p className="text-gray-500">Carregando plano de dieta...</p>}

          {(displayTotals.calories === "Dados não disponíveis" ||
            displayTotals.protein === "Dados não disponíveis" ||
            displayTotals.carbs === "Dados não disponíveis" ||
            displayTotals.fats === "Dados não disponíveis") && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium">⚠️ Alguns dados nutricionais não estão disponíveis</p>
              <p className="text-yellow-700 text-sm mt-1">
                Os cálculos podem estar incorretos. Tente regenerar os planos para obter cálculos precisos baseados nas
                fórmulas científicas.
              </p>
              <Button
                onClick={generatePlans}
                variant="outline"
                size="sm"
                className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100 bg-transparent"
              >
                Regenerar Planos com Cálculos Científicos
              </Button>
            </div>
          )}

          {quizData && dietPlan && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">🔄 Sincronizar Valores</p>
              <p className="text-blue-700 text-sm mt-1">
                Atualizar os valores salvos no plano de dieta com o cálculo científico atual (
                {calculateScientificCalories(quizData)} kcal). Valor atual salvo:{" "}
                {dietPlan?.totalDailyCalories || "não encontrado"}.
              </p>
              <Button
                onClick={updateSavedValuesWithScientificCalculation}
                variant="outline"
                size="sm"
                className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100 bg-transparent"
              >
                Atualizar Valores Salvos
              </Button>
            </div>
          )}

          {dietPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Calorias Totais</CardTitle>
                  <CardDescription className="text-sm">
                    <div className="space-y-1">
                      <div>
                        Teórico (científico): {quizData ? `${calculateScientificCalories(quizData)} kcal` : "N/A"}
                      </div>
                      <div>Salvo no plano: {dietPlan?.totalDailyCalories || "N/A"}</div>
                      <div>Real (soma dos alimentos): {calculatedTotals.calories} kcal</div>
                      {Math.abs(
                        Number.parseInt((dietPlan?.totalDailyCalories || "0").replace(/\D/g, "")) -
                          Number.parseInt(calculatedTotals.calories),
                      ) > 200 && <div className="text-orange-600 font-medium">⚠️ Diferença significativa detectada</div>}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dietPlan?.totalDailyCalories || "N/A"}</p>
                  <p className="text-sm text-gray-600 mt-1">Soma real: {calculatedTotals.calories} kcal</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Proteína</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{displayTotals.protein}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Carboidratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">{displayTotals.carbs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Gorduras</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{displayTotals.fats}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {dietPlan && (
            <div className="space-y-4">
              {dietPlan.meals.map((meal, index) => {
                if (!meal || typeof meal !== "object") {
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
                              const patterns = [
                                /(\d+g?)\s*de?\s*(.+)/i,
                                /(.+?)\s*-\s*(\d+g?)/i,
                                /(.+?)\s*$$(\d+g?)$$/i,
                                /(\d+)\s*unidades?\s*de?\s*(.+)/i,
                                /(\d+)\s*(.+)/i,
                              ]

                              let matched = false
                              for (const pattern of patterns) {
                                const match = food.match(pattern)
                                if (match) {
                                  if (/\d/.test(match[1])) {
                                    foodQuantity = match[1]
                                    foodName = match[2]?.trim()
                                  } else {
                                    foodName = match[1]?.trim()
                                    foodQuantity = match[2]
                                  }
                                  matched = true
                                  break
                                }
                              }

                              if (!matched) {
                                foodName = food.trim()
                              }

                              foodName = foodName
                                .replace(/^(de\s+|da\s+|do\s+)/i, "")
                                .replace(/\s+/g, " ")
                                .trim()
                            } else if (food && typeof food === "object") {
                              foodName = food.name || `Alimento ${foodIndex + 1}`
                              foodQuantity = food.quantity || ""
                              foodCalories = food.calories ? `${food.calories} kcal` : ""
                            } else {
                              foodName = `Alimento ${foodIndex + 1}`
                            }

                            if (!foodName || foodName.trim() === "") {
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
                                <div className="flex items-center gap-3">
                                  {foodCalories && (
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">{foodCalories}</p>
                                    </div>
                                  )}
                                  <Button
                                    onClick={() => handleReplaceFood(index, foodIndex)}
                                    disabled={
                                      replacingFood?.mealIndex === index && replacingFood?.foodIndex === foodIndex
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                  >
                                    {replacingFood?.mealIndex === index && replacingFood?.foodIndex === foodIndex ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Replace className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhum alimento especificado</p>
                        )}
                        {Array.isArray(meal.foods) && meal.foods.length > 0 && (
                          <div className="pt-3 border-t border-gray-200">
                            <Button
                              onClick={() => handleReplaceMeal(index)}
                              disabled={replacingMeal === index}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              {replacingMeal === index ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Substituindo Refeição...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Substituir Refeição
                                </>
                              )}
                            </Button>
                          </div>
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
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Dicas Nutricionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">Dica 1</p>
                <p className="text-blue-700 text-sm mt-1">
                  Coma alimentos ricos em proteínas para manter seu corpo saudável.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">Dica 2</p>
                <p className="text-green-700 text-sm mt-1">
                  Inclua frutas e vegetais em suas refeições para obter vitaminas e minerais.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">Dica 3</p>
                <p className="text-yellow-700 text-sm mt-1">Controle suas porções para evitar excesso de calorias.</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Dica 4</p>
                <p className="text-red-700 text-sm mt-1">Evite alimentos processados e ricos em açúcares.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
