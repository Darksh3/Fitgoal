"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, Replace, Download, Plus, RotateCcw, Trash2 } from "lucide-react"
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
  const [manualAdjustments, setManualAdjustments] = useState<{
    addedFoods: Array<{
      name: string
      calories: number
      protein: number
      carbs: number
      fats: number
      mealIndex?: number
    }>
    removedFoods: Array<{
      mealIndex: number
      foodIndex: number
      name: string
      calories: number
    }>
  }>({ addedFoods: [], removedFoods: [] })
  const [showAddFoodModal, setShowAddFoodModal] = useState(false)
  const [newFood, setNewFood] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    mealIndex: 0,
  })
  const router = useRouter()

  console.log("[v0] Component state:", { user: !!user, loading, error, dietPlan: !!dietPlan, quizData: !!quizData })

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleAddFood = async () => {
    if (!newFood.name || !newFood.calories) {
      alert("Nome e calorias são obrigatórios")
      return
    }

    const foodToAdd = {
      name: newFood.name,
      calories: Number(newFood.calories),
      protein: Number(newFood.protein) || 0,
      carbs: Number(newFood.carbs) || 0,
      fats: Number(newFood.fats) || 0,
      mealIndex: newFood.mealIndex,
    }

    const updatedAdjustments = {
      ...manualAdjustments,
      addedFoods: [...manualAdjustments.addedFoods, foodToAdd],
    }

    setManualAdjustments(updatedAdjustments)

    // Save to Firebase
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid)
        await updateDoc(userDocRef, {
          manualDietAdjustments: updatedAdjustments,
        })
      } catch (error) {
        console.error("Error saving manual adjustments:", error)
      }
    }

    setNewFood({ name: "", calories: "", protein: "", carbs: "", fats: "", mealIndex: 0 })
    setShowAddFoodModal(false)
  }

  const handleRemoveFood = async (mealIndex: number, foodIndex: number) => {
    if (!dietPlan?.meals[mealIndex]?.foods[foodIndex]) return

    const foodToRemove = dietPlan.meals[mealIndex].foods[foodIndex]
    let foodName = ""
    let foodCalories = 0

    if (typeof foodToRemove === "string") {
      foodName = foodToRemove
      const match = foodToRemove.match(/(\d+(?:\.\d+)?)\s*kcal/i)
      if (match) {
        foodCalories = Number.parseFloat(match[1])
      }
    } else if (foodToRemove && typeof foodToRemove === "object") {
      foodName = foodToRemove.name || `Alimento ${foodIndex + 1}`
      const caloriesStr = foodToRemove.calories?.toString() || "0"
      const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
      if (match) {
        foodCalories = Number.parseFloat(match[1])
      }
    }

    const removedFood = {
      mealIndex,
      foodIndex,
      name: foodName,
      calories: foodCalories,
    }

    const updatedAdjustments = {
      ...manualAdjustments,
      removedFoods: [...manualAdjustments.removedFoods, removedFood],
    }

    setManualAdjustments(updatedAdjustments)

    // Save to Firebase
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid)
        await updateDoc(userDocRef, {
          manualDietAdjustments: updatedAdjustments,
        })
      } catch (error) {
        console.error("Error saving manual adjustments:", error)
      }
    }
  }

  const calculateAdjustedTotals = (originalTotals: any) => {
    let adjustedCalories = Number.parseFloat(originalTotals.calories) || 0
    let adjustedProtein = Number.parseFloat(originalTotals.protein) || 0
    let adjustedCarbs = Number.parseFloat(originalTotals.carbs) || 0
    let adjustedFats = Number.parseFloat(originalTotals.fats) || 0

    // Add calories from added foods
    manualAdjustments.addedFoods.forEach((food) => {
      adjustedCalories += food.calories
      adjustedProtein += food.protein
      adjustedCarbs += food.carbs
      adjustedFats += food.fats
    })

    // Subtract calories from removed foods
    manualAdjustments.removedFoods.forEach((food) => {
      adjustedCalories -= food.calories
    })

    return {
      calories: `${Math.round(adjustedCalories)}`,
      protein: `${Math.round(adjustedProtein)}g`,
      carbs: `${Math.round(adjustedCarbs)}g`,
      fats: `${Math.round(adjustedFats)}g`,
    }
  }

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
            if (userData.manualDietAdjustments) {
              setManualAdjustments(userData.manualDietAdjustments)
            }

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
        return dietPlan.totalDailyCalories.includes("kcal")
          ? dietPlan.totalDailyCalories
          : `${dietPlan.totalDailyCalories} kcal`
      }

      if (quizData) {
        const scientificCalories = calculateScientificCalories(quizData)
        return `${scientificCalories} kcal`
      }

      if (dietPlan?.calories && dietPlan.calories !== "0" && dietPlan.calories !== "0 kcal") {
        return dietPlan.calories.includes("kcal") ? dietPlan.calories : `${dietPlan.calories} kcal`
      }
      return "Dados não disponíveis"
    })(),
    protein: (() => {
      if (dietPlan?.totalProtein && dietPlan.totalProtein !== "0g" && dietPlan.totalProtein !== "0") {
        return dietPlan.totalProtein.includes("g") ? dietPlan.totalProtein : `${dietPlan.totalProtein}g`
      }
      if (dietPlan?.protein && dietPlan.protein !== "0g" && dietPlan.protein !== "0") {
        return dietPlan.protein.includes("g") ? dietPlan.protein : `${dietPlan.protein}g`
      }
      return "Dados não disponíveis"
    })(),
    carbs: (() => {
      if (dietPlan?.totalCarbs && dietPlan.totalCarbs !== "0g" && dietPlan.totalCarbs !== "0") {
        return dietPlan.totalCarbs.includes("g") ? dietPlan.totalCarbs : `${dietPlan.totalCarbs}g`
      }
      if (dietPlan?.carbs && dietPlan.carbs !== "0g" && dietPlan.carbs !== "0") {
        return dietPlan.carbs.includes("g") ? dietPlan.carbs : `${dietPlan.carbs}g`
      }
      return "Dados não disponíveis"
    })(),
    fats: (() => {
      if (dietPlan?.totalFats && dietPlan.totalFats !== "0g" && dietPlan.totalFats !== "0") {
        return dietPlan.totalFats.includes("g") ? dietPlan.totalFats : `${dietPlan.totalFats}g`
      }
      if (dietPlan?.fats && dietPlan.fats !== "0g" && dietPlan.fats !== "0") {
        return dietPlan.fats.includes("g") ? dietPlan.fats : `${dietPlan.fats}g`
      }
      return "Dados não disponíveis"
    })(),
  }

  const calculatedTotals = calculateTotalMacros(dietPlan?.meals || [])
  const adjustedTotals = calculateAdjustedTotals(calculatedTotals)

  console.log("[v0] About to render, loading:", loading, "error:", error)

  const downloadDietPDF = () => {
    if (!dietPlan) return

    // Create PDF content as HTML string
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Plano de Dieta Personalizado</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
          .header h1 { color: #3b82f6; margin: 0; font-size: 28px; }
          .header p { color: #666; margin: 5px 0; }
          .macros-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .macro-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
          .macro-title { font-weight: bold; color: #475569; font-size: 14px; margin-bottom: 5px; }
          .macro-value { font-size: 24px; font-weight: bold; }
          .calories { color: #3b82f6; }
          .protein { color: #dc2626; }
          .carbs { color: #d97706; }
          .fats { color: #059669; }
          .meal { margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .meal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
          .meal-title { font-size: 18px; font-weight: bold; color: #1e293b; }
          .meal-time { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
          .meal-calories { color: #666; font-size: 14px; }
          .food-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .food-item:last-child { border-bottom: none; }
          .food-name { font-weight: 500; }
          .food-quantity { color: #3b82f6; font-size: 14px; }
          .food-calories { color: #666; font-size: 14px; }
          .food-macros { font-size: 12px; color: #666; margin-top: 2px; }
          .tips { margin-top: 30px; }
          .tips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
          .tip { padding: 15px; border-radius: 8px; }
          .tip-1 { background: #dbeafe; border-left: 4px solid #3b82f6; }
          .tip-2 { background: #dcfce7; border-left: 4px solid #059669; }
          .tip-3 { background: #fef3c7; border-left: 4px solid #d97706; }
          .tip-4 { background: #fee2e2; border-left: 4px solid #dc2626; }
          .tip-title { font-weight: bold; margin-bottom: 5px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Plano de Dieta Personalizado</h1>
          <p>Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
          <p>Plano científico baseado em suas necessidades individuais</p>
        </div>

        <div class="macros-grid">
          <div class="macro-card">
            <div class="macro-title">Calorias Totais</div>
            <div class="macro-value calories">${dietPlan?.totalDailyCalories || displayTotals.calories}</div>
          </div>
          <div class="macro-card">
            <div class="macro-title">Proteína</div>
            <div class="macro-value protein">${displayTotals.protein}</div>
          </div>
          <div class="macro-card">
            <div class="macro-title">Carboidratos</div>
            <div class="macro-value carbs">${displayTotals.carbs}</div>
          </div>
          <div class="macro-card">
            <div class="macro-title">Gorduras</div>
            <div class="macro-value fats">${displayTotals.fats}</div>
          </div>
        </div>

        ${dietPlan.meals
          .map((meal, index) => {
            if (!meal || typeof meal !== "object") return ""

            return `
            <div class="meal">
              <div class="meal-header">
                <div>
                  <div class="meal-title">${meal.name || `Refeição ${index + 1}`}</div>
                  <div class="meal-calories">${meal.calories || "0 kcal"}</div>
                </div>
                <div class="meal-time">${meal.time || "Horário não definido"}</div>
              </div>
              
              ${
                Array.isArray(meal.foods) && meal.foods.length > 0
                  ? meal.foods
                      .map((food, foodIndex) => {
                        let foodName = ""
                        let foodQuantity = ""
                        let foodCalories = ""
                        let macros = ""

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

                          if (food.protein || food.carbs || food.fats) {
                            const macrosParts = []
                            if (food.protein) macrosParts.push(`P: ${food.protein}g`)
                            if (food.carbs) macrosParts.push(`C: ${food.carbs}g`)
                            if (food.fats) macrosParts.push(`G: ${food.fats}g`)
                            macros = macrosParts.join(" | ")
                          }
                        } else {
                          foodName = `Alimento ${foodIndex + 1}`
                        }

                        if (!foodName || foodName.trim() === "") {
                          foodName = `Alimento ${foodIndex + 1}`
                        }

                        return `
                    <div class="food-item">
                      <div>
                        <div class="food-name">${foodName}</div>
                        ${foodQuantity ? `<div class="food-quantity">${foodQuantity}</div>` : ""}
                        ${macros ? `<div class="food-macros">${macros}</div>` : ""}
                      </div>
                      ${foodCalories ? `<div class="food-calories">${foodCalories}</div>` : ""}
                    </div>
                  `
                      })
                      .join("")
                  : '<div class="food-item"><div class="food-name">Nenhum alimento especificado</div></div>'
              }
            </div>
          `
          })
          .join("")}

        <div class="tips">
          <h2>Dicas Nutricionais</h2>
          <div class="tips-grid">
            <div class="tip tip-1">
              <div class="tip-title">Dica 1</div>
              <div>Coma alimentos ricos em proteínas para manter seu corpo saudável.</div>
            </div>
            <div class="tip tip-2">
              <div class="tip-title">Dica 2</div>
              <div>Inclua frutas e vegetais em suas refeições para obter vitaminas e minerais.</div>
            </div>
            <div class="tip tip-3">
              <div class="tip-title">Dica 3</div>
              <div>Controle suas porções para evitar excesso de calorias.</div>
            </div>
            <div class="tip tip-4">
              <div class="tip-title">Dica 4</div>
              <div>Evite alimentos processados e ricos em açúcares.</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Este plano foi gerado com base em cálculos científicos personalizados para suas necessidades.</p>
          <p>Consulte sempre um nutricionista para orientações específicas.</p>
        </div>
      </body>
      </html>
    `

    // Create blob and download
    const blob = new Blob([pdfContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `plano-dieta-${new Date().toISOString().split("T")[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Plano de Dieta</h1>
            <div className="flex items-center gap-4">
              {dietPlan && (
                <Button
                  onClick={downloadDietPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              )}
              {error && <p className="text-red-500">{error}</p>}
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calorias Reais</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">{adjustedTotals.calories} kcal</p>
                  {(manualAdjustments.addedFoods.length > 0 || manualAdjustments.removedFoods.length > 0) && (
                    <p className="text-xs text-gray-500 mt-1">(Original: {calculatedTotals.calories} kcal)</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Proteínas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{adjustedTotals.protein}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Carboidratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">{adjustedTotals.carbs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Gorduras</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{adjustedTotals.fats}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {dietPlan && (
            <div className="mb-6 flex gap-4">
              <Button onClick={() => setShowAddFoodModal(true)} className="bg-lime-500 hover:bg-lime-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Alimento
              </Button>

              {(manualAdjustments.addedFoods.length > 0 || manualAdjustments.removedFoods.length > 0) && (
                <Button onClick={() => setManualAdjustments({ addedFoods: [], removedFoods: [] })} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar Alterações
                </Button>
              )}
            </div>
          )}

          {showAddFoodModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Adicionar Alimento</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome do Alimento *</label>
                    <input
                      type="text"
                      value={newFood.name}
                      onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      placeholder="Ex: Banana"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Calorias *</label>
                    <input
                      type="number"
                      value={newFood.calories}
                      onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      placeholder="Ex: 105"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Proteína (g)</label>
                      <input
                        type="number"
                        value={newFood.protein}
                        onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Carboidratos (g)</label>
                      <input
                        type="number"
                        value={newFood.carbs}
                        onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Gorduras (g)</label>
                      <input
                        type="number"
                        value={newFood.fats}
                        onChange={(e) => setNewFood({ ...newFood, fats: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Adicionar à Refeição</label>
                    <select
                      value={newFood.mealIndex}
                      onChange={(e) => setNewFood({ ...newFood, mealIndex: Number(e.target.value) })}
                      className="w-full p-2 border rounded-md"
                    >
                      {dietPlan?.meals.map((meal, index) => (
                        <option key={index} value={index}>
                          {meal.name || `Refeição ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleAddFood} className="flex-1">
                    Adicionar
                  </Button>
                  <Button onClick={() => setShowAddFoodModal(false)} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {dietPlan && (
            <div className="space-y-4">
              {dietPlan.meals.map((meal, index) => {
                if (!meal || typeof meal !== "object") {
                  return null
                }

                const filteredFoods = Array.isArray(meal.foods)
                  ? meal.foods.filter(
                      (_, foodIndex) =>
                        !manualAdjustments.removedFoods.some(
                          (removed) => removed.mealIndex === index && removed.foodIndex === foodIndex,
                        ),
                    )
                  : []

                const manualFoodsForMeal = manualAdjustments.addedFoods.filter((food) => food.mealIndex === index)

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
                        {filteredFoods.length > 0 ? (
                          filteredFoods.map((food, foodIndex) => {
                            const originalIndex =
                              meal.foods?.findIndex(
                                (originalFood, idx) =>
                                  originalFood === food &&
                                  !manualAdjustments.removedFoods.some(
                                    (removed) => removed.mealIndex === index && removed.foodIndex <= idx,
                                  ),
                              ) ?? foodIndex

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
                                  {typeof food === "object" && food && (food.protein || food.carbs || food.fats) && (
                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                      {food.protein && <span className="text-red-500">P: {food.protein}g</span>}
                                      {food.carbs && <span className="text-yellow-500">C: {food.carbs}g</span>}
                                      {food.fats && <span className="text-green-500">G: {food.fats}g</span>}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {foodCalories && (
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">{foodCalories}</p>
                                    </div>
                                  )}
                                  <Button
                                    onClick={() => handleRemoveFood(index, originalIndex)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => handleReplaceFood(index, originalIndex)}
                                    disabled={
                                      replacingFood?.mealIndex === index && replacingFood?.foodIndex === originalIndex
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                  >
                                    {replacingFood?.mealIndex === index &&
                                    replacingFood?.foodIndex === originalIndex ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                        Substituindo...
                                      </>
                                    ) : (
                                      <>
                                        <Replace className="h-3 w-3 mr-2" />
                                        Substituir
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhum alimento especificado</p>
                        )}

                        {manualFoodsForMeal.map((food, foodIndex) => (
                          <div
                            key={`manual-${foodIndex}`}
                            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0 bg-lime-50"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{food.name}</p>
                              <p className="text-xs text-lime-600 font-medium">Adicionado manualmente</p>
                              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                <span className="text-red-500">P: {food.protein}g</span>
                                <span className="text-yellow-500">C: {food.carbs}g</span>
                                <span className="text-green-500">G: {food.fats}g</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm text-gray-600">{food.calories} kcal</p>
                              </div>
                              <Button
                                onClick={() => {
                                  const updatedAdjustments = {
                                    ...manualAdjustments,
                                    addedFoods: manualAdjustments.addedFoods.filter(
                                      (_, idx) => !(manualAdjustments.addedFoods.indexOf(food) === idx),
                                    ),
                                  }
                                  setManualAdjustments(updatedAdjustments)
                                }}
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}

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
