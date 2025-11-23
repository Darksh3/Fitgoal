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
import { StyledButton } from "@/components/ui/styled-button"
import { useRouter } from "next/navigation"
import type { Meal, DietPlan } from "@/types"

export const dynamic = "force-dynamic"

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
  const [editingFood, setEditingFood] = useState<{
    mealIndex: number
    foodIndex: number
    food: any
    isSupplement?: boolean
  } | null>(null)
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

  const handleEditFood = async () => {
    if (!editingFood || !dietPlan) return

    try {
      const validateNumber = (value: any, fieldName: string): number => {
        const num = Number(value)
        if (isNaN(num) || num < 0) {
          console.error(`[v0] Invalid ${fieldName}:`, value)
          throw new Error(`Valor inválido para ${fieldName}`)
        }
        return num
      }

      console.log("[v0] Editing food:", editingFood)

      if (editingFood.isSupplement) {
        // Edit supplement
        const updatedSupplements = [...(dietPlan.supplements || [])]

        const calories = validateNumber(editingFood.food.calories, "calorias")
        const protein = validateNumber(editingFood.food.protein, "proteínas")
        const carbs = validateNumber(editingFood.food.carbs, "carboidratos")
        const fat = validateNumber(editingFood.food.fats, "gorduras")

        updatedSupplements[editingFood.foodIndex] = {
          ...updatedSupplements[editingFood.foodIndex],
          name: editingFood.food.name,
          portion: editingFood.food.quantity || editingFood.food.portion,
          calories,
          protein,
          carbs,
          fat,
        }

        console.log("[v0] Updated supplement:", updatedSupplements[editingFood.foodIndex])

        const updatedDietPlan = {
          ...dietPlan,
          supplements: updatedSupplements,
        }

        setDietPlan(updatedDietPlan)
        await saveDietPlan(updatedDietPlan)
      } else {
        // Edit regular food
        const updatedMeals = [...dietPlan.meals]
        const meal = updatedMeals[editingFood.mealIndex]

        const calories = validateNumber(editingFood.food.calories, "calorias")
        const protein = validateNumber(editingFood.food.protein, "proteínas")
        const carbs = validateNumber(editingFood.food.carbs, "carboidratos")
        const fats = validateNumber(editingFood.food.fats, "gorduras")

        if (typeof meal.foods[editingFood.foodIndex] === "string") {
          // Convert string to object format
          meal.foods[editingFood.foodIndex] = {
            name: editingFood.food.name,
            quantity: editingFood.food.quantity,
            calories,
            protein,
            carbs,
            fats,
          }
        } else {
          // Update existing object
          meal.foods[editingFood.foodIndex] = {
            ...meal.foods[editingFood.foodIndex],
            name: editingFood.food.name,
            quantity: editingFood.food.quantity,
            calories,
            protein,
            carbs,
            fats,
          }
        }

        console.log("[v0] Updated food:", meal.foods[editingFood.foodIndex])

        const updatedDietPlan = {
          ...dietPlan,
          meals: updatedMeals,
        }

        setDietPlan(updatedDietPlan)
        await saveDietPlan(updatedDietPlan)
      }

      setEditingFood(null)
    } catch (error) {
      console.error("[v0] Error editing food:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao editar alimento. Tente novamente."
      setError(errorMessage)
    }
  }

  const calculateAdjustedTotals = (originalTotals: any) => {
    let adjustedCalories = 0
    let adjustedProtein = 0
    let adjustedCarbs = 0
    let adjustedFats = 0

    if (dietPlan?.supplements && Array.isArray(dietPlan.supplements)) {
      dietPlan.supplements.forEach((supplement: any) => {
        adjustedCalories += Number(supplement.calories) || 0
        adjustedProtein += Number(supplement.protein) || 0
        adjustedCarbs += Number(supplement.carbs) || 0
        adjustedFats += Number(supplement.fat) || 0
      })
    }

    // Calculate totals from actual diet plan meals - sum individual foods
    if (dietPlan?.meals) {
      dietPlan.meals.forEach((meal: any, mealIndex: number) => {
        let mealCalories = 0
        let mealProtein = 0
        let mealCarbs = 0
        let mealFats = 0

        // Always try to sum from individual foods first for accuracy
        if (Array.isArray(meal.foods)) {
          meal.foods.forEach((food: any, foodIndex: number) => {
            let foodCalories = 0
            let foodProtein = 0
            let foodCarbs = 0
            let foodFats = 0

            if (typeof food === "object" && food.calories) {
              // Extract number from various formats: "190 kcal", "190", 190
              const caloriesStr = food.calories.toString()
              const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
              if (match) {
                foodCalories = Number.parseFloat(match[1])
              }

              if (food.protein) {
                const proteinMatch = food.protein.toString().match(/(\d+(?:\.\d+)?)/)
                if (proteinMatch) foodProtein = Number.parseFloat(proteinMatch[1])
              }
              if (food.carbs) {
                const carbsMatch = food.carbs.toString().match(/(\d+(?:\.\d+)?)/)
                if (carbsMatch) foodCarbs = Number.parseFloat(carbsMatch[1])
              }
              if (food.fats) {
                const fatsMatch = food.fats.toString().match(/(\d+(?:\.\d+)?)/)
                if (fatsMatch) foodFats = Number.parseFloat(fatsMatch[1])
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
              mealProtein += foodProtein
              mealCarbs += foodCarbs
              mealFats += foodFats
              console.log(
                `[v0] Food ${foodIndex} in meal ${mealIndex}: ${foodCalories} kcal, P:${foodProtein}g, C:${foodCarbs}g, F:${foodFats}g`,
              )
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

        adjustedCalories += mealCalories
        console.log(`[v0] Meal ${mealIndex} total: ${mealCalories} kcal`)

        if (mealProtein > 0 || mealCarbs > 0 || mealFats > 0) {
          adjustedProtein += mealProtein
          adjustedCarbs += mealCarbs
          adjustedFats += mealFats
        } else if (meal.macros) {
          adjustedProtein += Number.parseFloat(meal.macros.protein?.match(/(\d+\.?\d*)/)?.[1] || "0")
          adjustedCarbs += Number.parseFloat(meal.macros.carbs?.match(/(\d+\.?\d*)/)?.[1] || "0")
          adjustedFats += Number.parseFloat(meal.macros.fats?.match(/(\d+\.?\d*)/)?.[1] || "0")
        } else if (mealCalories > 0) {
          // Estimate macros from calories using standard ratios
          const estimatedProtein = (mealCalories * 0.25) / 4 // 25% protein
          const estimatedCarbs = (mealCalories * 0.45) / 4 // 45% carbs
          const estimatedFats = (mealCalories * 0.3) / 9 // 30% fats
          adjustedProtein += estimatedProtein
          adjustedCarbs += estimatedCarbs
          adjustedFats += estimatedFats
          console.log(
            `[v0] Estimated macros for meal ${mealIndex}: P:${estimatedProtein.toFixed(1)}g, C:${estimatedCarbs.toFixed(1)}g, F:${estimatedFats.toFixed(1)}g`,
          )
        }
      })
    }

    // Add manually added foods
    manualAdjustments.addedFoods.forEach((food) => {
      adjustedCalories += food.calories
      adjustedProtein += food.protein
      adjustedCarbs += food.carbs
      adjustedFats += food.fats
    })

    // Subtract removed foods (estimate macros from calories if not available)
    manualAdjustments.removedFoods.forEach((food) => {
      adjustedCalories -= food.calories
      // For removed foods, we only have calories, so we need to estimate macros
      const estimatedProtein = (food.calories * 0.25) / 4 // 25% protein
      const estimatedCarbs = (food.calories * 0.45) / 4 // 45% carbs
      const estimatedFats = (food.calories * 0.3) / 9 // 30% fats
      adjustedProtein -= estimatedProtein
      adjustedCarbs -= estimatedCarbs
      adjustedFats -= estimatedFats
    })

    console.log("[v0] Final adjusted totals:", { adjustedCalories, adjustedProtein, adjustedCarbs, adjustedFats })

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
      setError(null)
    } catch (error) {
      console.error("[v0] Error saving diet plan:", error)
      throw new Error("Erro ao salvar alterações. Tente novamente.")
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

    if (dietPlan?.supplements && Array.isArray(dietPlan.supplements)) {
      dietPlan.supplements.forEach((supplement: any) => {
        totalCalories += Number(supplement.calories) || 0
        totalProtein += Number(supplement.protein) || 0
        totalCarbs += Number(supplement.carbs) || 0
        totalFats += Number(supplement.fat) || 0
      })
    }

    meals.forEach((meal, mealIndex) => {
      if (meal && typeof meal === "object") {
        let mealCalories = 0
        let mealProtein = 0
        let mealCarbs = 0
        let mealFats = 0

        // Always try to sum from individual foods first for accuracy
        if (Array.isArray(meal.foods)) {
          meal.foods.forEach((food, foodIndex) => {
            let foodCalories = 0
            let foodProtein = 0
            let foodCarbs = 0
            let foodFats = 0

            if (typeof food === "object" && food.calories) {
              // Extract number from various formats: "190 kcal", "190", 190
              const caloriesStr = food.calories.toString()
              const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
              if (match) {
                foodCalories = Number.parseFloat(match[1])
              }

              if (food.protein) {
                const proteinMatch = food.protein.toString().match(/(\d+(?:\.\d+)?)/)
                if (proteinMatch) foodProtein = Number.parseFloat(proteinMatch[1])
              }
              if (food.carbs) {
                const carbsMatch = food.carbs.toString().match(/(\d+(?:\.\d+)?)/)
                if (carbsMatch) foodCarbs = Number.parseFloat(carbsMatch[1])
              }
              if (food.fats) {
                const fatsMatch = food.fats.toString().match(/(\d+(?:\.\d+)?)/)
                if (fatsMatch) foodFats = Number.parseFloat(fatsMatch[1])
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
              mealProtein += foodProtein
              mealCarbs += foodCarbs
              mealFats += foodFats
              console.log(
                `[v0] Food ${foodIndex} in meal ${mealIndex}: ${foodCalories} kcal, P:${foodProtein}g, C:${foodCarbs}g, F:${foodFats}g`,
              )
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

        if (mealProtein > 0 || mealCarbs > 0 || mealFats > 0) {
          totalProtein += mealProtein
          totalCarbs += mealCarbs
          totalFats += mealFats
        } else if (meal.macros && typeof meal.macros === "object") {
          const extractMacro = (macroValue: any) => {
            if (!macroValue) return 0
            const match = macroValue.toString().match(/(\d+(?:\.\d+)?)/)
            return match ? Number.parseFloat(match[1]) : 0
          }

          totalProtein += extractMacro(meal.macros.protein)
          totalCarbs += extractMacro(meal.macros.carbs)
          totalFats += extractMacro(meal.macros.fats)
        } else if (mealCalories > 0) {
          // Estimate macros from calories using standard ratios
          const estimatedProtein = (mealCalories * 0.25) / 4 // 25% protein
          const estimatedCarbs = (mealCalories * 0.45) / 4 // 45% carbs
          const estimatedFats = (mealCalories * 0.3) / 9 // 30% fats
          totalProtein += estimatedProtein
          totalCarbs += estimatedCarbs
          totalFats += estimatedFats
          console.log(
            `[v0] Estimated macros for meal ${mealIndex}: P:${estimatedProtein.toFixed(1)}g, C:${estimatedCarbs.toFixed(1)}g, F:${estimatedFats.toFixed(1)}g`,
          )
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
    const height = Number.parseFloat(quizData.height) || 170
    const age = Number.parseFloat(quizData.age) || 25
    const gender = quizData.gender || "masculino"
    const trainingDaysPerWeek = quizData.trainingDaysPerWeek || 5
    const goals = Array.isArray(quizData.goal) ? quizData.goal : [quizData.goal || "ganhar-massa"]

    const targetWeight = Number.parseFloat(quizData.targetWeight) || weight
    const timeToGoal = quizData.timeToGoal || ""
    const bodyType = quizData.bodyType || ""

    const isFemale = gender.toLowerCase().includes("fem") || gender.toLowerCase().includes("mulher")

    // TMB (Mifflin-St Jeor)
    let tmb
    if (isFemale) {
      tmb = 10 * weight + 6.25 * height - 5 * age - 161
    } else {
      tmb = 10 * weight + 6.25 * height - 5 * age + 5
    }

    // Fator de atividade base
    let baseActivityMultiplier
    if (trainingDaysPerWeek <= 1) {
      baseActivityMultiplier = 1.2
    } else if (trainingDaysPerWeek <= 3) {
      baseActivityMultiplier = 1.375
    } else if (trainingDaysPerWeek <= 5) {
      baseActivityMultiplier = 1.55
    } else if (trainingDaysPerWeek <= 6) {
      baseActivityMultiplier = 1.725
    } else {
      baseActivityMultiplier = 1.9
    }

    // Ajuste do fator de atividade por somatótipo
    let activityMultiplier = baseActivityMultiplier
    if (bodyType.toLowerCase() === "ectomorfo") {
      activityMultiplier = baseActivityMultiplier * 1.05
    } else if (bodyType.toLowerCase() === "endomorfo") {
      activityMultiplier = baseActivityMultiplier * 0.95
    }

    let tdee = tmb * activityMultiplier

    // Ajuste metabólico por somatótipo
    let metabolicAdjustment = 1.0
    if (bodyType.toLowerCase() === "ectomorfo") {
      metabolicAdjustment = isFemale ? 1.12 : 1.15
    } else if (bodyType.toLowerCase() === "endomorfo") {
      metabolicAdjustment = isFemale ? 0.92 : 0.95
    }

    tdee = tdee * metabolicAdjustment

    // Ajuste calórico baseado no objetivo
    let dailyCalorieAdjustment = 0
    const weightDifference = targetWeight - weight

    if (weightDifference < -0.5) {
      // Perda de peso
      const weightToLose = Math.abs(weightDifference)
      if (timeToGoal && weightToLose > 0) {
        const weeksToGoal = calculateWeeksToGoal(timeToGoal)
        if (weeksToGoal > 0) {
          const weeklyWeightChange = weightToLose / weeksToGoal
          let maxWeeklyLoss
          if (bodyType.toLowerCase() === "ectomorfo") {
            maxWeeklyLoss = Math.min(weeklyWeightChange, 0.5)
          } else if (bodyType.toLowerCase() === "endomorfo") {
            maxWeeklyLoss = Math.min(weeklyWeightChange, 1.0)
          } else {
            maxWeeklyLoss = Math.min(weeklyWeightChange, 0.75)
          }
          dailyCalorieAdjustment = -Math.round((maxWeeklyLoss * 7700) / 7)
          const maxDeficit = isFemale
            ? bodyType.toLowerCase() === "endomorfo"
              ? -700
              : -600
            : bodyType.toLowerCase() === "endomorfo"
              ? -900
              : -800
          dailyCalorieAdjustment = Math.max(dailyCalorieAdjustment, maxDeficit)
        } else {
          dailyCalorieAdjustment =
            bodyType.toLowerCase() === "ectomorfo" ? -400 : bodyType.toLowerCase() === "endomorfo" ? -600 : -500
        }
      } else {
        dailyCalorieAdjustment =
          bodyType.toLowerCase() === "ectomorfo" ? -400 : bodyType.toLowerCase() === "endomorfo" ? -600 : -500
      }
    } else if (weightDifference > 0.5) {
      // Ganho de peso
      const weightToGain = weightDifference
      if (timeToGoal && weightToGain > 0) {
        const weeksToGoal = calculateWeeksToGoal(timeToGoal)
        if (weeksToGoal > 0) {
          const weeklyWeightChange = weightToGain / weeksToGoal
          let maxWeeklyGain
          if (bodyType.toLowerCase() === "ectomorfo") {
            maxWeeklyGain = Math.min(weeklyWeightChange, 0.75)
          } else if (bodyType.toLowerCase() === "endomorfo") {
            maxWeeklyGain = Math.min(weeklyWeightChange, 0.4)
          } else {
            maxWeeklyGain = Math.min(weeklyWeightChange, 0.5)
          }
          dailyCalorieAdjustment = Math.round((maxWeeklyGain * 7700) / 7)
          const maxSurplus =
            bodyType.toLowerCase() === "ectomorfo"
              ? isFemale
                ? 700
                : 850
              : bodyType.toLowerCase() === "endomorfo"
                ? isFemale
                  ? 400
                  : 500
                : isFemale
                  ? 500
                  : 600
          dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, maxSurplus)
        } else {
          dailyCalorieAdjustment =
            bodyType.toLowerCase() === "ectomorfo"
              ? isFemale
                ? 600
                : 700
              : bodyType.toLowerCase() === "endomorfo"
                ? isFemale
                  ? 300
                  : 400
                : isFemale
                  ? 400
                  : 500
        }
      } else {
        dailyCalorieAdjustment =
          bodyType.toLowerCase() === "ectomorfo"
            ? isFemale
              ? 600
              : 700
            : bodyType.toLowerCase() === "endomorfo"
              ? isFemale
                ? 300
                : 400
              : isFemale
                ? 400
                : 500
      }
    } else {
      // Manutenção/Recomposição
      if (goals.includes("perder-peso") || goals.includes("emagrecer")) {
        dailyCalorieAdjustment = bodyType.toLowerCase() === "endomorfo" ? -400 : -300
      } else if (goals.includes("ganhar-massa") || goals.includes("ganhar-peso")) {
        dailyCalorieAdjustment =
          bodyType.toLowerCase() === "ectomorfo" ? 400 : bodyType.toLowerCase() === "endomorfo" ? 200 : 300
      }
    }

    const finalCalories = Math.round(tdee + dailyCalorieAdjustment)
    let safeCalories = finalCalories

    // Limites de segurança
    const minCaloriesWomen = trainingDaysPerWeek >= 4 ? 1400 : 1200
    const minCaloriesMen = trainingDaysPerWeek >= 4 ? 1600 : 1400
    const absoluteMinimum = isFemale ? minCaloriesWomen : minCaloriesMen

    if (safeCalories < absoluteMinimum) {
      safeCalories = absoluteMinimum
    }

    if (safeCalories < tmb * 1.1) {
      safeCalories = Math.round(tmb * 1.1)
    }

    return safeCalories
  }

  const calculateWeeksToGoal = (timeToGoal: string): number => {
    try {
      let goalDate: Date

      if (timeToGoal.includes(" de ")) {
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
            return 0
          }
        } else {
          return 0
        }
      } else {
        goalDate = new Date(timeToGoal)
      }

      const currentDate = new Date()
      const timeDifferenceMs = goalDate.getTime() - currentDate.getTime()

      if (isNaN(timeDifferenceMs) || timeDifferenceMs <= 0) {
        return 0
      }

      const weeksToGoal = Math.max(1, timeDifferenceMs / (1000 * 60 * 60 * 24 * 7))
      return Math.round(weeksToGoal)
    } catch (error) {
      console.error("Error calculating weeks to goal:", error)
      return 0
    }
  }

  const displayTotals = (() => {
    // Always use calculated totals from actual meals for accuracy
    const calculatedTotals = calculateTotalMacros(dietPlan?.meals || [])
    const adjustedTotals = calculateAdjustedTotals(calculatedTotals)

    // If we have calculated values, use them
    if (adjustedTotals.calories !== "0") {
      return {
        calories: `${adjustedTotals.calories} kcal`,
        protein: adjustedTotals.protein,
        carbs: adjustedTotals.carbs,
        fats: adjustedTotals.fats,
      }
    }

    // Fallback to saved values only if no calculated values
    return {
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
  })()

  const calculatedTotals = calculateTotalMacros(dietPlan?.meals || [])
  const adjustedTotals = calculateAdjustedTotals(calculatedTotals)

  console.log("[v0] About to render, loading:", loading, "error:", error)

  const downloadDietPDF = async () => {
    if (!dietPlan) return

    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default

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
            .meal { margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; }
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
            .tips { margin-top: 30px; page-break-inside: avoid; }
            .tips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
            .tip { padding: 15px; border-radius: 8px; }
            .tip-1 { background: #dbeafe; border-left: 4px solid #3b82f6; }
            .tip-2 { background: #dcfce7; border-left: 4px solid #059669; }
            .tip-3 { background: #fef3c7; border-left: 4px solid #d97706; }
            .tip-4 { background: #fee2e2; border-left: 4px solid #dc2626; }
            .tip-title { font-weight: bold; margin-bottom: 5px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
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
              <div class="macro-value calories">${displayTotals.calories}</div>
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

          ${
            dietPlan.tips && Array.isArray(dietPlan.tips) && dietPlan.tips.length > 0
              ? `
            <div class="tips">
              <h2 style="color: #1e293b; margin-bottom: 10px;">Dicas Importantes</h2>
              <div class="tips-grid">
                ${dietPlan.tips
                  .map(
                    (tip, index) => `
                  <div class="tip tip-${(index % 4) + 1}">
                    <div class="tip-title">Dica ${index + 1}</div>
                    <div>${tip}</div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          <div class="footer">
            <p><strong>FitGoal</strong> - Seu plano de dieta personalizado</p>
            <p>Este plano foi criado especificamente para você com base em seus objetivos e necessidades.</p>
          </div>
        </body>
        </html>
      `

      // Create a temporary div to hold the HTML content
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = pdfContent
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      document.body.appendChild(tempDiv)

      // Configure PDF options
      const options = {
        margin: 10,
        filename: `plano-dieta-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }

      // Generate and download PDF
      await html2pdf().set(options).from(tempDiv).save()

      // Clean up
      document.body.removeChild(tempDiv)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      alert("Erro ao gerar PDF. Tente novamente.")
    }
  }

  const calculateTotals = (meals: any[]) => {
    console.log("[v0] Calculating totals for meals:", meals)

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return { calories: "0", protein: "0g", carbs: "0g", fats: "0g" }
    }

    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0

    if (dietPlan?.supplements && Array.isArray(dietPlan.supplements)) {
      dietPlan.supplements.forEach((supplement: any) => {
        totalCalories += Number(supplement.calories) || 0
        totalProtein += Number(supplement.protein) || 0
        totalCarbs += Number(supplement.carbs) || 0
        totalFats += Number(supplement.fat) || 0
      })
    }

    meals.forEach((meal, mealIndex) => {
      if (meal && typeof meal === "object") {
        let mealCalories = 0
        let mealProtein = 0
        let mealCarbs = 0
        let mealFats = 0

        // Always try to sum from individual foods first for accuracy
        if (Array.isArray(meal.foods)) {
          meal.foods.forEach((food, foodIndex) => {
            let foodCalories = 0
            let foodProtein = 0
            let foodCarbs = 0
            let foodFats = 0

            if (typeof food === "object" && food.calories) {
              // Extract number from various formats: "190 kcal", "190", 190
              const caloriesStr = food.calories.toString()
              const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
              if (match) {
                foodCalories = Number.parseFloat(match[1])
              }

              if (food.protein) {
                const proteinMatch = food.protein.toString().match(/(\d+(?:\.\d+)?)/)
                if (proteinMatch) foodProtein = Number.parseFloat(proteinMatch[1])
              }
              if (food.carbs) {
                const carbsMatch = food.carbs.toString().match(/(\d+(?:\.\d+)?)/)
                if (carbsMatch) foodCarbs = Number.parseFloat(carbsMatch[1])
              }
              if (food.fats) {
                const fatsMatch = food.fats.toString().match(/(\d+(?:\.\d+)?)/)
                if (fatsMatch) foodFats = Number.parseFloat(fatsMatch[1])
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
              mealProtein += foodProtein
              mealCarbs += foodCarbs
              mealFats += foodFats
              console.log(
                `[v0] Food ${foodIndex} in meal ${mealIndex}: ${foodCalories} kcal, P:${foodProtein}g, C:${foodCarbs}g, F:${foodFats}g`,
              )
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

        if (mealProtein > 0 || mealCarbs > 0 || mealFats > 0) {
          totalProtein += mealProtein
          totalCarbs += mealCarbs
          totalFats += mealFats
        } else if (meal.macros && typeof meal.macros === "object") {
          const extractMacro = (macroValue: any) => {
            if (!macroValue) return 0
            const match = macroValue.toString().match(/(\d+(?:\.\d+)?)/)
            return match ? Number.parseFloat(match[1]) : 0
          }

          totalProtein += extractMacro(meal.macros.protein)
          totalCarbs += extractMacro(meal.macros.carbs)
          totalFats += extractMacro(meal.macros.fats)
        } else if (mealCalories > 0) {
          // Estimate macros from calories using standard ratios
          const estimatedProtein = (mealCalories * 0.25) / 4 // 25% protein
          const estimatedCarbs = (mealCalories * 0.45) / 4 // 45% carbs
          const estimatedFats = (mealCalories * 0.3) / 9 // 30% fats
          totalProtein += estimatedProtein
          totalCarbs += estimatedCarbs
          totalFats += estimatedFats
          console.log(
            `[v0] Estimated macros for meal ${mealIndex}: P:${estimatedProtein.toFixed(1)}g, C:${estimatedCarbs.toFixed(1)}g, F:${estimatedFats.toFixed(1)}g`,
          )
        }
      }
    })

    console.log("[v0] Final calculated totals:", { totalCalories, totalProtein, totalCarbs, totalFats })

    return {
      calories: totalCalories > 0 ? `${Math.round(totalCalories)}` : "0",
      protein: totalProtein > 0 ? `${Math.round(totalProtein)}g` : "0g",
      carbs: totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : "0g",
      fats: totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : "0g",
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plano de Dieta</h1>
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
              {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
            </div>
          </div>

          {loading && <p className="text-gray-500 dark:text-gray-400">Carregando plano de dieta...</p>}

          {(displayTotals.calories === "Dados não disponíveis" ||
            displayTotals.protein === "Dados não disponíveis" ||
            displayTotals.carbs === "Dados não disponíveis" ||
            displayTotals.fats === "Dados não disponíveis") && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                ⚠️ Alguns dados nutricionais não estão disponíveis
              </p>
              <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                Os cálculos podem estar incorretos. Tente regenerar os planos para obter cálculos precisos baseados nas
                fórmulas científicas.
              </p>
              <Button
                onClick={generatePlans}
                variant="outline"
                size="sm"
                className="mt-2 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 bg-transparent"
              >
                Regenerar Planos com Cálculos Científicos
              </Button>
            </div>
          )}

          {quizData && dietPlan && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-300 font-medium">🔄 Sincronizar Valores</p>
              <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                Atualizar os valores salvos no plano de dieta com o cálculo científico atual (
                {calculateScientificCalories(quizData)} kcal). Valor atual salvo:{" "}
                {dietPlan?.totalDailyCalories || "não encontrado"}.
              </p>
              <Button
                onClick={updateSavedValuesWithScientificCalculation}
                variant="outline"
                size="sm"
                className="mt-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 bg-transparent"
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
              <StyledButton
                onClick={() => setShowAddFoodModal(true)}
                className="bg-lime-500 hover:bg-lime-600 text-white border-lime-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Alimento
              </StyledButton>

              {(manualAdjustments.addedFoods.length > 0 || manualAdjustments.removedFoods.length > 0) && (
                <StyledButton
                  onClick={() => setManualAdjustments({ addedFoods: [], removedFoods: [] })}
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar Alterações
                </StyledButton>
              )}
            </div>
          )}

          {showAddFoodModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Adicionar Alimento</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Nome do Alimento *
                    </label>
                    <input
                      type="text"
                      value={newFood.name}
                      onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Banana"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Calorias *
                    </label>
                    <input
                      type="number"
                      value={newFood.calories}
                      onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: 105"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Proteína (g)
                      </label>
                      <input
                        type="number"
                        value={newFood.protein}
                        onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                        className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Carboidratos (g)
                      </label>
                      <input
                        type="number"
                        value={newFood.carbs}
                        onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                        className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Gorduras (g)
                      </label>
                      <input
                        type="number"
                        value={newFood.fats}
                        onChange={(e) => setNewFood({ ...newFood, fats: e.target.value })}
                        className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Adicionar à Refeição
                    </label>
                    <select
                      value={newFood.mealIndex}
                      onChange={(e) => setNewFood({ ...newFood, mealIndex: Number(e.target.value) })}
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  <StyledButton onClick={handleAddFood} className="flex-1">
                    Adicionar
                  </StyledButton>
                  <StyledButton onClick={() => setShowAddFoodModal(false)} variant="outline" className="flex-1">
                    Cancelar
                  </StyledButton>
                </div>
              </div>
            </div>
          )}

          {editingFood && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {editingFood.isSupplement ? "Editar Suplemento" : "Editar Alimento"}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nome *</label>
                    <input
                      type="text"
                      value={editingFood.food.name}
                      onChange={(e) =>
                        setEditingFood({
                          ...editingFood,
                          food: { ...editingFood.food, name: e.target.value },
                        })
                      }
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Banana"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Quantidade
                    </label>
                    <input
                      type="text"
                      value={editingFood.food.quantity || editingFood.food.portion || ""}
                      onChange={(e) =>
                        setEditingFood({
                          ...editingFood,
                          food: { ...editingFood.food, quantity: e.target.value },
                        })
                      }
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: 100g ou 1 unidade"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Calorias *
                    </label>
                    <input
                      type="number"
                      value={editingFood.food.calories}
                      onChange={(e) =>
                        setEditingFood({
                          ...editingFood,
                          food: { ...editingFood.food, calories: e.target.value },
                        })
                      }
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: 105"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Proteína (g)
                      </label>
                      <input
                        type="number"
                        value={editingFood.food.protein}
                        onChange={(e) =>
                          setEditingFood({
                            ...editingFood,
                            food: { ...editingFood.food, protein: e.target.value },
                          })
                        }
                        className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Carboidratos (g)
                      </label>
                      <input
                        type="number"
                        value={editingFood.food.carbs}
                        onChange={(e) =>
                          setEditingFood({
                            ...editingFood,
                            food: { ...editingFood.food, carbs: e.target.value },
                          })
                        }
                        className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Gorduras (g)
                      </label>
                      <input
                        type="number"
                        value={editingFood.food.fats || editingFood.food.fat || ""}
                        onChange={(e) =>
                          setEditingFood({
                            ...editingFood,
                            food: { ...editingFood.food, fats: e.target.value },
                          })
                        }
                        className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <StyledButton onClick={handleEditFood} className="flex-1">
                    Salvar Alterações
                  </StyledButton>
                  <StyledButton onClick={() => setEditingFood(null)} variant="outline" className="flex-1">
                    Cancelar
                  </StyledButton>
                </div>
              </div>
            </div>
          )}

          {dietPlan && (
            <div className="space-y-4">
              {dietPlan.supplements && Array.isArray(dietPlan.supplements) && dietPlan.supplements.length > 0 && (
                <Card className="border-lime-500 border-2 bg-lime-50 dark:bg-lime-900/30 dark:border-lime-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-lime-700 dark:text-lime-300">
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                        Suplementação Recomendada
                      </CardTitle>
                      <Badge variant="secondary" className="bg-lime-600 text-white dark:bg-lime-500">
                        Incluído nos macros
                      </Badge>
                    </div>
                    <CardDescription className="text-lime-700 dark:text-lime-400">
                      Suplementos personalizados para seu objetivo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dietPlan.supplements.map((supplement: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-lime-200 dark:border-lime-700 shadow-sm"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{supplement.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{supplement.portion}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-lg font-bold text-lime-600 dark:text-lime-300">
                                  {supplement.calories} kcal
                                </p>
                              </div>
                              <Button
                                onClick={() =>
                                  setEditingFood({
                                    mealIndex: -1,
                                    foodIndex: index,
                                    isSupplement: true,
                                    food: {
                                      name: supplement.name,
                                      quantity: supplement.portion,
                                      calories: supplement.calories,
                                      protein: supplement.protein,
                                      carbs: supplement.carbs,
                                      fats: supplement.fat,
                                    },
                                  })
                                }
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                              <p className="text-xs text-gray-600 dark:text-gray-300">Proteína</p>
                              <p className="text-sm font-bold text-red-600 dark:text-red-400">{supplement.protein}g</p>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                              <p className="text-xs text-gray-600 dark:text-gray-300">Carboidratos</p>
                              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                                {supplement.carbs}g
                              </p>
                            </div>
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <p className="text-xs text-gray-600 dark:text-gray-300">Gorduras</p>
                              <p className="text-sm font-bold text-green-600 dark:text-green-400">{supplement.fat}g</p>
                            </div>
                          </div>

                          {supplement.timing && (
                            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">⏰ Horário ideal:</p>
                              <p className="text-sm text-blue-900 dark:text-blue-100">{supplement.timing}</p>
                            </div>
                          )}

                          {supplement.benefits && (
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                              <p className="text-xs font-medium text-purple-700 dark:text-purple-300">✨ Benefícios:</p>
                              <p className="text-sm text-purple-900 dark:text-purple-100">{supplement.benefits}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                        <CardTitle className="flex items-center text-gray-900 dark:text-white">
                          <Clock className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                          {meal.name || `Refeição ${index + 1}`}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        >
                          {meal.time || "Horário não definido"}
                        </Badge>
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
                                className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">{foodName}</p>
                                  {foodQuantity && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                      {foodQuantity}
                                    </p>
                                  )}
                                  {typeof food === "object" && food && (food.protein || food.carbs || food.fats) && (
                                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      {food.protein && (
                                        <span className="text-red-500 dark:text-red-400">P: {food.protein}g</span>
                                      )}
                                      {food.carbs && (
                                        <span className="text-yellow-500 dark:text-yellow-400">C: {food.carbs}g</span>
                                      )}
                                      {food.fats && (
                                        <span className="text-green-500 dark:text-green-400">G: {food.fats}g</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {foodCalories && (
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600 dark:text-gray-300">{foodCalories}</p>
                                    </div>
                                  )}
                                  <Button
                                    onClick={() => {
                                      const extractNumber = (value: any) => {
                                        if (!value) return ""
                                        const match = value.toString().match(/(\d+(?:\.\d+)?)/)
                                        return match ? match[1] : ""
                                      }

                                      setEditingFood({
                                        mealIndex: index,
                                        foodIndex: originalIndex,
                                        food: {
                                          name: foodName,
                                          quantity: foodQuantity,
                                          calories: extractNumber(
                                            typeof food === "object" ? food.calories : foodCalories,
                                          ),
                                          protein: extractNumber(typeof food === "object" ? food.protein : ""),
                                          carbs: extractNumber(typeof food === "object" ? food.carbs : ""),
                                          fats: extractNumber(typeof food === "object" ? food.fats : ""),
                                        },
                                      })
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </Button>
                                  <Button
                                    onClick={() => handleRemoveFood(index, originalIndex)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-300 hover:border-red-400"
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
                                    className="h-8 px-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
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
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum alimento especificado</p>
                        )}

                        {manualFoodsForMeal.map((food, foodIndex) => (
                          <div
                            key={`manual-${foodIndex}`}
                            className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 bg-lime-50 dark:bg-lime-900/30"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{food.name}</p>
                              <p className="text-xs text-lime-600 dark:text-lime-400 font-medium">
                                Adicionado manualmente
                              </p>
                              <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="text-red-500 dark:text-red-400">P: {food.protein}g</span>
                                <span className="text-yellow-500 dark:text-yellow-400">C: {food.carbs}g</span>
                                <span className="text-green-500 dark:text-green-400">G: {food.fats}g</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-300">{food.calories} kcal</p>
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
                                className="h-8 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-300 hover:border-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {Array.isArray(meal.foods) && meal.foods.length > 0 && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              onClick={() => handleReplaceMeal(index)}
                              disabled={replacingMeal === index}
                              variant="outline"
                              size="sm"
                              className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
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
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Macros da refeição:
                              </span>
                              <div className="flex gap-4 text-sm font-medium">
                                <span className="text-red-600 dark:text-red-400">P: {meal.macros.protein || "0g"}</span>
                                <span className="text-yellow-600 dark:text-yellow-400">
                                  C: {meal.macros.carbs || "0g"}
                                </span>
                                <span className="text-green-600 dark:text-green-400">
                                  G: {meal.macros.fats || "0g"}
                                </span>
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
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Dicas Nutricionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-800 dark:text-blue-300 font-medium">Dica 1</p>
                <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                  Coma alimentos ricos em proteínas para manter seu corpo saudável.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-300 font-medium">Dica 2</p>
                <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                  Inclua frutas e vegetais em suas refeições para obter vitaminas e minerais.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-300 font-medium">Dica 3</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                  Controle suas porções para evitar excesso de calorias.
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300 font-medium">Dica 4</p>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                  Evite alimentos processados e ricos em açúcares.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
