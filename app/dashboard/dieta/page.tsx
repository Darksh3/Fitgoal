"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, Replace, Download, Plus, RotateCcw, Trash2 } from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { StyledButton } from "@/components/ui/styled-button"
import { useRouter } from "next/navigation"
import type { Meal, DietPlan } from "@/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FoodAutocomplete } from "@/components/food-autocomplete"
import { extractFoodMacros, addToMacroCredit, resetMacroCredit, applyMacroCreditToFood, getMacroCreditDisplay } from "@/lib/macroCreditUtils"
import { MacroCreditDisplay } from "@/components/macro-credit-display"
import { validateAISuggestions } from "@/lib/foodValidation"

export default function DietPage() {
  const [isHydrated, setIsHydrated] = useState(false)

  console.log("[v0] DietPage component rendering")

  const [user] = useAuthState(auth)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replacingMeal, setReplacingMeal] = useState<number | null>(null)
  const [replacingFood, setReplacingFood] = useState<{ mealIndex: number; foodIndex: number } | null>(null)
  const [addingFood, setAddingFood] = useState<{ mealIndex: number; foodIndex: number } | null>(null)
  const [addFoodInput, setAddFoodInput] = useState("")
  const [addFoodMessage, setAddFoodMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [isSubmittingFood, setIsSubmittingFood] = useState(false)
  const [recommendedFood, setRecommendedFood] = useState<any>(null)
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
  const [foodSearchInput, setFoodSearchInput] = useState("")
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

  useEffect(() => {
    setIsHydrated(true)
    
    // Initialize foods database on component mount
    const initFoodsDB = async () => {
      try {
        const response = await fetch("/api/foods/init")
        const data = await response.json()
        console.log("[v0] Foods DB initialized:", data)
      } catch (error) {
        console.error("[v0] Error initializing foods DB:", error)
      }
    }
    
    initFoodsDB()
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

    // Reset form
    setNewFood({ name: "", calories: "", protein: "", carbs: "", fats: "", mealIndex: 0 })
    setFoodSearchInput("")
    setShowAddFoodModal(false)
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
    console.log("[v0] Removing food at indices:", { mealIndex, foodIndex, totalFoods: dietPlan?.meals[mealIndex]?.foods.length })
    
    if (!dietPlan?.meals[mealIndex]?.foods[foodIndex]) {
      console.warn("[v0] Food not found at index:", { mealIndex, foodIndex })
      return
    }

    const foodToRemove = dietPlan.meals[mealIndex].foods[foodIndex]
    const foodMacros = extractFoodMacros(foodToRemove)

    console.log("[v0] Food to remove:", { foodToRemove, foodMacros, foodIndex })

    // Atualizar a refeição com o macroCredit
    const updatedMeals = [...(dietPlan?.meals || [])]
    updatedMeals[mealIndex] = addToMacroCredit(updatedMeals[mealIndex], foodMacros)

    // Remover o alimento da refeição - usar splice para ser mais direto
    const removedFoods = updatedMeals[mealIndex].foods.splice(foodIndex, 1)
    console.log("[v0] Removed foods:", removedFoods, "Remaining:", updatedMeals[mealIndex].foods.length)

    // Atualizar o estado
    const updatedDietPlan = { ...dietPlan, meals: updatedMeals }
    setDietPlan(updatedDietPlan)

    const removedFood = {
      mealIndex,
      foodIndex: -1, // Usar -1 para indicar que foi removido permanentemente
      name: typeof foodToRemove === "string" ? foodToRemove : (foodToRemove as any).name || `Alimento ${foodIndex + 1}`,
      calories: foodMacros.calories,
      macros: foodMacros,
    }

    const updatedAdjustments = {
      ...manualAdjustments,
      removedFoods: [...manualAdjustments.removedFoods, removedFood],
    }

    setManualAdjustments(updatedAdjustments)

    console.log("[v0] Food removed. macroCredit added to meal:", mealIndex, foodMacros)

    // Salvar no Firebase
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid)
        await updateDoc(userDocRef, {
          manualDietAdjustments: updatedAdjustments,
          dietPlan: updatedDietPlan,
        })
      } catch (error) {
        console.error("[v0] Erro ao salvar ajustes de dieta:", error)
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

  const calculateMealCalories = (meal: Meal) => {
    if (!meal || !Array.isArray(meal.foods)) return "0 kcal"

    let totalCalories = 0

    meal.foods.forEach((food: any) => {
      let foodCalories = 0

      if (typeof food === "object" && food.calories) {
        const caloriesStr = food.calories.toString()
        const match = caloriesStr.match(/(\d+(?:\.\d+)?)/)
        if (match) {
          foodCalories = Number.parseFloat(match[1])
        }
      } else if (typeof food === "string") {
        const match = food.match(/(\d+(?:\.\d+)?)\s*kcal/i)
        if (match) {
          foodCalories = Number.parseFloat(match[1])
        }
      }

      if (!isNaN(foodCalories) && foodCalories > 0) {
        totalCalories += foodCalories
      }
    })

    // Add manually added foods for this meal
    manualAdjustments.addedFoods.forEach((food) => {
      if (food.mealIndex === meal && food.calories > 0) {
        totalCalories += food.calories
      }
    })

    // Subtract removed foods for this meal
    manualAdjustments.removedFoods.forEach((food) => {
      if (food.mealIndex === meal && food.calories > 0) {
        totalCalories -= food.calories
      }
    })

    return totalCalories > 0 ? `${Math.round(totalCalories)} kcal` : "0 kcal"
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
          targetMacros: targetMacros || { calories: 0, protein: 0, carbs: 0, fats: 0 },
          userPreferences: userPreferences || {},
          mealContext: currentMeal.name || `Refeição ${mealIndex + 1}`,
          mealFoods: currentMeal.foods || [], // Passar alimentos da refeição
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
          mealFoods: currentMeal.foods, // Passar alimentos já na refeição
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.substitution?.substitutes?.length > 0) {
          // Validar sugestões da IA
          const validation = validateAISuggestions(
            result.substitution.substitutes,
            dietPlan.meals[mealIndex].foods
          )

          if (!validation.valid) {
            console.warn("[v0] IA suggested invalid foods:", validation.invalidFoods)
            if (validation.validFoods.length === 0) {
              setError(
                "A IA sugeriu alimentos inválidos (compostos ou repetidos). " +
                  validation.invalidFoods.map((f) => f.reason).join("; ")
              )
              setReplacingFood(null)
              return
            }
            // Se houver válidos, continua com eles
            result.substitution.substitutes = validation.validFoods
          }

          // Use the first substitute (could add UI to let user choose)
          let newFood = result.substitution.substitutes[0]

          // Criar cópia dos alimentos para atualizar
          const updatedMeals = [...dietPlan.meals]
          
          // Aplicar macroCredit ao novo alimento
          const currentMealWithCredit = updatedMeals[mealIndex]
          if (currentMealWithCredit.macroCredit) {
            newFood = applyMacroCreditToFood(newFood, currentMealWithCredit.macroCredit)
            console.log("[v0] macroCredit applied to new food:", currentMealWithCredit.macroCredit)
          }

          // Update the diet plan with the new food
          updatedMeals[mealIndex] = {
            ...updatedMeals[mealIndex],
            foods: [
              ...updatedMeals[mealIndex].foods.slice(0, foodIndex),
              newFood,
              ...updatedMeals[mealIndex].foods.slice(foodIndex + 1),
            ],
            // Reseta o macroCredit após usar
            macroCredit: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fats: 0,
            },
          }

          const updatedDietPlan = {
            ...dietPlan,
            meals: updatedMeals,
          }

          setDietPlan(updatedDietPlan)

          await saveDietPlan(updatedDietPlan)

          console.log("[v0] Food replacement completed with macroCredit applied and reset")
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

  const handleAddFoodToMeal = async (mealIndex: number, foodIndex: number) => {
    if (!addFoodInput.trim() || !user || !dietPlan) {
      console.log("[v0] Invalid state for adding food")
      return
    }

    setIsSubmittingFood(true)
    setAddingFood({ mealIndex, foodIndex })
    setAddFoodMessage(null)

    try {
      const currentMeal = dietPlan.meals[mealIndex]
      if (!currentMeal) {
        setAddFoodMessage({
          text: "Erro: Refeição não encontrada",
          type: "error",
        })
        setIsSubmittingFood(false)
        return
      }

      // Calcular macroCredit disponível
      const availableMacros = currentMeal.macroCredit || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      }

      console.log("[v0] Requesting food addition:", {
        food: addFoodInput,
        meal: currentMeal.name,
        availableMacros,
      })

      const token = await user.getIdToken()

      const response = await fetch("/api/add-food-to-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          foodName: addFoodInput,
          mealContext: currentMeal.name || `Refeição ${mealIndex + 1}`,
          mealFoods: currentMeal.foods,
          availableMacros,
          userPreferences: userPreferences || {},
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] API error response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        setAddFoodMessage({
          text: errorData.error || `Erro na requisição: ${response.statusText}`,
          type: "error",
        })
        setAddingFood(null)
        setIsSubmittingFood(false)
        return
      }

      const result = await response.json()
      console.log("[v0] Add-food API response:", result)

      if (result.success && result.canAdd && result.food) {
        // NÃO adicionar automaticamente - apenas mostrar mensagem de sucesso
        const newFood = result.food
        
        setRecommendedFood(newFood)
        setAddFoodMessage({
          text: `✓ Esse alimento se encaixa na sua dieta!\n\nRecomendado: ${newFood.quantity || '1 porção'} de ${newFood.name}`,
          type: "success",
        })

        setAddFoodInput("")
        setIsSubmittingFood(false)

        console.log("[v0] Food accepted by AI:", newFood)
      } else {
        console.warn("[v0] AI rejected food:", result)
        const errorMessage = result.message || "Infelizmente esse alimento não encaixa"
        const reasonText = result.reason ? `\n\n${result.reason}` : ""
        setAddFoodMessage({
          text: `${errorMessage}${reasonText}`,
          type: "error",
        })
        setAddingFood(null)
        setIsSubmittingFood(false)
      }
    } catch (err) {
      console.error("[v0] Error adding food:", err)
      setAddFoodMessage({
        text: "Erro ao adicionar alimento. Tente novamente.",
        type: "error",
      })
      setAddingFood(null)
      setIsSubmittingFood(false)
    }
  }

  const handleIncludeRecommendedFood = async () => {
    if (!addingFood || !recommendedFood || !dietPlan) return

    try {
      const mealIndex = addingFood.mealIndex
      const updatedMeals = [...dietPlan.meals]

      // Adicionar o alimento recomendado
      updatedMeals[mealIndex].foods.push(recommendedFood)

      // Resetar macroCredit após usar
      updatedMeals[mealIndex].macroCredit = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      }

      const updatedDietPlan = {
        ...dietPlan,
        meals: updatedMeals,
      }

      setDietPlan(updatedDietPlan)
      await saveDietPlan(updatedDietPlan)

      console.log("[v0] Food included in meal:", recommendedFood)

      // Fechar modal
      setAddingFood(null)
      setAddFoodInput("")
      setAddFoodMessage(null)
      setIsSubmittingFood(false)
      setRecommendedFood(null)
    } catch (err) {
      console.error("[v0] Error including food:", err)
      setAddFoodMessage({
        text: "Erro ao incluir alimento. Tente novamente.",
        type: "error",
      })
    }
  }

  const handleCancelRecommendedFood = () => {
    setAddingFood(null)
    setAddFoodInput("")
    setAddFoodMessage(null)
    setIsSubmittingFood(false)
    setRecommendedFood(null)
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
      // Create PDF content as HTML string
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Plano de Dieta Personalizado</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              color: #1f2937; 
              background: white; 
              padding: 20px 18px;
              line-height: 1.4;
              font-size: 13px;
            }
            
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              padding: 12px 15px;
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border-radius: 8px;
              border-bottom: 2px solid #f59e0b;
            }
            
            .header h1 { 
              color: #b45309; 
              margin: 0; 
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 6px;
              letter-spacing: -0.5px;
            }
            
            .header-subtitle {
              color: #92400e;
              font-size: 11px;
              margin-top: 4px;
            }
            
            .macros-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 10px; 
              margin: 12px 0;
            }
            
            .macro-card { 
              background: white;
              padding: 10px; 
              border-radius: 8px; 
              text-align: center; 
              border: 1px solid #e5e7eb;
              box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            }
            
            .macro-card.active {
              border-color: #f59e0b;
              background: #fffbeb;
            }
            
            .macro-title { 
              font-weight: 600; 
              color: #6b7280; 
              font-size: 10px; 
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            
            .macro-value { 
              font-size: 20px; 
              font-weight: 700;
            }
            
            .macro-icon {
              font-size: 16px;
              margin-bottom: 3px;
            }
            
            .calories { color: #f59e0b; }
            .protein { color: #ef4444; }
            .carbs { color: #f97316; }
            .fats { color: #10b981; }
            
            .meal { 
              margin: 10px 0; 
              padding: 10px; 
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              background: white;
              page-break-inside: avoid;
            }
            
            .meal-header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
              margin-bottom: 8px; 
              border-bottom: 1px solid #f59e0b; 
              padding-bottom: 6px;
            }
            
            .meal-info{
              flex: 1;
            }
            
            .meal-title { 
              font-size: 13px; 
              font-weight: 700; 
              color: #1f2937;
              margin-bottom: 2px;
            }
            
            .meal-calories { 
              color: #9ca3af; 
              font-size: 11px;
              font-weight: 500;
            }
            
            .meal-time { 
              background: #fbbf24;
              color: #78350f; 
              padding: 3px 8px; 
              border-radius: 4px; 
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              display: inline-block;
            }
            
            .meal-foods{
              padding: 6px 0;
            }
            
            .food-item { 
              display: flex; 
              justify-content: space-between;
              align-items: flex-start;
              padding: 6px 8px; 
              border-radius: 4px;
              background: #f9fafb;
              margin-bottom: 4px;
              border-left: 2px solid #f59e0b;
              font-size: 11px;
            }
            
            .food-item:last-child {
              margin-bottom: 0;
            }
            
            .food-info{
              flex: 1;
            }
            
            .food-name { 
              font-weight: 600;
              color: #1f2937;
              font-size: 11px;
              margin-bottom: 2px;
            }
            
            .food-quantity { 
              color: #f59e0b; 
              font-size: 10px;
              font-weight: 600;
              margin-bottom: 1px;
            }
            
            .food-macros { 
              font-size: 9px; 
              color: #6b7280;
            }
            
            .food-calories { 
              color: #f59e0b; 
              font-size: 11px;
              font-weight: 700;
              text-align: right;
            }
            
            .tips { 
              margin: 12px 0;
              padding: 10px;
              background: #fffbeb;
              border-radius: 8px;
              border-top: 2px solid #f59e0b;
            }
            
            .tips h2 {
              color: #1f2937;
              margin-bottom: 8px;
              font-size: 13px;
              font-weight: 700;
            }
            
            .tips-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 8px;
            }
            
            .tip { 
              padding: 8px 10px; 
              border-radius: 6px;
              border-left: 3px solid #f59e0b;
              background: white;
            }
            
            .tip-1 { background: #ecf0f1; border-left-color: #3b82f6; }
            .tip-2 { background: #d1f8e8; border-left-color: #10b981; }
            .tip-3 { background: #fef3c7; border-left-color: #f59e0b; }
            .tip-4 { background: #fee2e2; border-left-color: #ef4444; }
            
            .tip-title { 
              font-weight: 700;
              margin-bottom: 3px;
              font-size: 11px;
              color: #1f2937;
            }
            
            .tip-text{
              font-size: 10px;
              color: #4b5563;
              line-height: 1.3;
            }
            
            .footer { 
              margin-top: 12px; 
              text-align: center; 
              color: #6b7280; 
              font-size: 9px; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 8px;
            }
            
            .logo{
              font-size: 10px;
              font-weight: 700;
              color: #f59e0b;
              margin-bottom: 3px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🍽️ Plano de Dieta Personalizado</h1>
            <div class="header-subtitle">
              Gerado em ${new Date().toLocaleDateString("pt-BR")} • Plano científico e personalizado
            </div>
          </div>

          <div class="macros-grid">
            <div class="macro-card active">
              <div class="macro-icon">🔥</div>
              <div class="macro-title">Calorias</div>
              <div class="macro-value calories">${displayTotals.calories}</div>
            </div>
            <div class="macro-card">
              <div class="macro-icon">🍗</div>
              <div class="macro-title">Proteína</div>
              <div class="macro-value protein">${displayTotals.protein}</div>
            </div>
            <div class="macro-card">
              <div class="macro-icon">🌾</div>
              <div class="macro-title">Carbos</div>
              <div class="macro-value carbs">${displayTotals.carbs}</div>
            </div>
            <div class="macro-card">
              <div class="macro-icon">🥑</div>
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
                <div class="meal-info">
                  <div class="meal-title">🍴 ${meal.name || "Refeição " + (index + 1)}</div>
                  <div class="meal-calories">${meal.calories || "0 kcal"}</div>
                </div>
                <div class="meal-time">⏰ ${meal.time || "Horário não definido"}</div>
              </div>
              
              <div class="meal-foods">
                ${
                  Array.isArray(meal.foods) && meal.foods.length > 0
                    ? meal.foods
                        .map((food) => {
                          let foodName = ""
                          let foodQuantity = ""
                          let foodCalories = ""
                          let macros = ""

                          if (typeof food === "string") {
                            const patterns = [
                              /(\d+g?)\s*de?\s*(.+)/i,
                              /(.+?)\s*-\s*(\d+g?)/i,
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
                            foodName = food.name || "Alimento"
                            foodQuantity = food.quantity || ""
                            foodCalories = food.calories ? food.calories + " kcal" : ""

                            if (food.protein || food.carbs || food.fats) {
                              const macrosParts = []
                              if (food.protein) macrosParts.push("P: " + food.protein + "g")
                              if (food.carbs) macrosParts.push("C: " + food.carbs + "g")
                              if (food.fats) macrosParts.push("G: " + food.fats + "g")
                              macros = macrosParts.join(" | ")
                            }
                          } else {
                            foodName = "Alimento"
                          }

                          if (!foodName || foodName.trim() === "") {
                            foodName = "Alimento"
                          }

                          return `
                            <div class="food-item">
                              <div class="food-info">
                                <div class="food-name">${foodName}</div>
                                ${foodQuantity ? '<div class="food-quantity">' + foodQuantity + '</div>' : ""}
                                ${macros ? '<div class="food-macros">' + macros + '</div>' : ""}
                              </div>
                              ${foodCalories ? '<div class="food-calories">' + foodCalories + '</div>' : ""}
                            </div>
                          `
                        })
                        .join("")
                    : '<div class="food-item"><div class="food-info"><div class="food-name">Nenhum alimento especificado</div></div></div>'
                }
              </div>
            </div>
          `
            })
            .join("")}

          ${
            dietPlan.tips && Array.isArray(dietPlan.tips) && dietPlan.tips.length > 0
              ? `
            <div class="tips">
              <h2>💡 Dicas Nutricionais Importantes</h2>
              <div class="tips-grid">
                ${dietPlan.tips
                  .map(
                    (tip, index) => {
                      const icons = ["💡", "🥗", "⚡", "🎯"];
                      return `
                  <div class="tip tip-${(index % 4) + 1}">
                    <div class="tip-title">${icons[index % 4]} Dica ${index + 1}</div>
                    <div class="tip-text">${tip}</div>
                  </div>
                `;
                    }
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          <div class="footer">
            <div class="logo">🍽️ FitGoal</div>
            <p>Seu plano de dieta personalizado e otimizado para seus objetivos</p>
            <p style="margin-top: 10px; font-size: 10px; color: #9ca3af;">
              Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </body>
        </html>
      `

      // Import html2canvas and jsPDF
      const html2canvas = (await import("html2canvas")).default
      const jsPDF = (await import("jspdf")).jsPDF

      // Create a container with proper dimensions
      const container = document.createElement("div")
      container.innerHTML = pdfContent
      container.style.position = "fixed"
      container.style.top = "0"
      container.style.left = "0"
      container.style.width = "800px"
      container.style.height = "auto"
      container.style.backgroundColor = "white"
      container.style.zIndex = "-9999"
      document.body.appendChild(container)

      // Wait for layout to settle
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Capture canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      })

      // Create PDF
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      const imgData = canvas.toDataURL("image/jpeg", 0.98)

      // Add pages as needed
      while (heightLeft > 0) {
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= 297 // A4 height in mm
        if (heightLeft > 0) {
          pdf.addPage()
          position = -297
        }
      }

      // Download
      pdf.save(`plano-dieta-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`)

      // Clean up
      document.body.removeChild(container)
    } catch (error) {
      console.error("[v0] Erro ao gerar PDF:", error)
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
          <div className="mb-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 dark:hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plano de Dieta</h1>
            <div className="flex items-center gap-4">
              {dietPlan && (
                // Converting Baixar PDF button to HTML with neon border
                <button
                  onClick={downloadDietPDF}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 dark:hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-200"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </button>
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
              <button
                onClick={updateSavedValuesWithScientificCalculation}
                className="mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 dark:hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-200"
              >
                Atualizar Valores Salvos
              </button>
            </div>
          )}

          {dietPlan && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                  <CardTitle>Calorias Recomendadas</CardTitle>
                </CardHeader>
                <CardContent>
                  {quizData?.calorieGoal ? (
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round(quizData.calorieGoal - 50)} - {Math.round(quizData.calorieGoal + 50)} kcal
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-400">—</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Meta: {quizData?.calorieGoal ? Math.round(quizData.calorieGoal) : "—"} kcal</p>
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
              <button
                onClick={() => setShowAddFoodModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 dark:hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Adicionar Alimento
              </button>

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
                    <FoodAutocomplete
                      value={foodSearchInput}
                      onChange={setFoodSearchInput}
                      onSelectFood={(food) => {
                        setNewFood({
                          ...newFood,
                          name: food.name,
                          calories: String(food.calories),
                          protein: String(food.protein),
                          carbs: String(food.carbs),
                          fats: String(food.fats),
                        })
                        setFoodSearchInput("")
                      }}
                      placeholder="Digite para buscar alimentos..."
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

          {addingFood && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recomendar Alimento</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Qual alimento você quer recomendar?
                    </label>
                    <input
                      type="text"
                      value={addFoodInput}
                      onChange={(e) => setAddFoodInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddFoodToMeal(addingFood.mealIndex, addingFood.foodIndex)
                        }
                      }}
                      placeholder="Ex: Batata inglesa, Banana, etc"
                      className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      autoFocus
                    />
                  </div>

                  {isSubmittingFood && !addFoodMessage && (
                    <div className="p-3 rounded-md text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span>Analisando alimento...</span>
                    </div>
                  )}

                  {addFoodMessage && (
                    <div
                      className={`p-3 rounded-md text-sm ${
                        addFoodMessage.type === "success"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                          : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {addFoodMessage.text}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  {addFoodMessage?.type === "success" ? (
                    <>
                      <StyledButton
                        onClick={handleIncludeRecommendedFood}
                        className="flex-1"
                      >
                        Incluir
                      </StyledButton>
                      <StyledButton
                        onClick={handleCancelRecommendedFood}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </StyledButton>
                    </>
                  ) : (
                    <>
                      <StyledButton
                        onClick={() => handleAddFoodToMeal(addingFood.mealIndex, addingFood.foodIndex)}
                        disabled={!addFoodInput.trim() || isSubmittingFood}
                        className="flex-1"
                      >
                        {isSubmittingFood ? "Analisando..." : addFoodMessage?.type === "error" ? "Tentar Novamente" : "Recomendar"}
                      </StyledButton>
                      <StyledButton
                        onClick={() => {
                          setAddingFood(null)
                          setAddFoodInput("")
                          setAddFoodMessage(null)
                          setIsSubmittingFood(false)
                          setRecommendedFood(null)
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </StyledButton>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  💡 A IA analisará se o alimento encaixa nos macros da sua refeição
                </p>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            <Accordion type="multiple" className="space-y-4">
              {dietPlan.supplements && Array.isArray(dietPlan.supplements) && dietPlan.supplements.length > 0 && (
                <AccordionItem
                  value="item-supplements"
                  className="border-lime-500 border-2 bg-lime-50 dark:bg-lime-900/30 dark:border-lime-700 rounded-lg px-4"
                >
                  <AccordionTrigger className="text-lime-700 dark:text-lime-300 font-bold py-4">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                      Suplementação Recomendada
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
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
                  </AccordionContent>
                </AccordionItem>
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
                  <AccordionItem
                    key={index}
                    value={`meal-${index}`}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800/50 backdrop-blur-sm overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-800/70">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {meal.name || `Refeição ${index + 1}`}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {filteredFoods.length + manualFoodsForMeal.length} alimentos • {calculateMealCalories(meal)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        >
                          {meal.time || "Horário não definido"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-3">
                        {/* macroCredit Display */}
                        <MacroCreditDisplay meal={meal} />
                        
                        {filteredFoods.length > 0 ? (
                          filteredFoods.map((food, foodIndex) => {
                            // Calcular o índice original na lista meal.foods
                            // Usando uma busca linear porque indexOf pode retornar duplicatas
                            let originalIndex = foodIndex
                            for (let i = 0; i < meal.foods.length; i++) {
                              if (meal.foods[i] === food) {
                                originalIndex = i
                                break
                              }
                            }

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
                                className="flex justify-between items-center py-4 border-b border-gray-100/50 dark:border-gray-700/50 last:border-b-0"
                              >
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                                    {foodName}
                                  </p>
                                  {foodQuantity && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                                      {foodQuantity}
                                    </p>
                                  )}
                                  {typeof food === "object" && food && (food.protein || food.carbs || food.fats) && (
                                    <div className="flex gap-4 mt-2 text-xs font-medium">
                                      {food.protein && (
                                        <span className="text-[#ff6b6b] dark:text-[#ff6b6b]">P: {food.protein}g</span>
                                      )}
                                      {food.carbs && (
                                        <span className="text-[#f1c40f] dark:text-[#f1c40f]">C: {food.carbs}g</span>
                                      )}
                                      {food.fats && (
                                        <span className="text-[#2ecc71] dark:text-[#2ecc71]">G: {food.fats}g</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {foodCalories && (
                                    <div className="text-right mr-4">
                                      <p className="text-lg font-bold text-white dark:text-white">{foodCalories}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 bg-blue-100/80 dark:bg-gray-700/50 rounded-full p-1 backdrop-blur-sm border border-blue-200/50 dark:border-gray-600/30">
                                    <button
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
                                      className="h-8 w-8 rounded-full flex items-center justify-center text-blue-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-white hover:bg-blue-200/50 dark:hover:bg-gray-700/50 transition-all"
                                    >
                                      <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleRemoveFood(index, originalIndex)}
                                      className="h-8 w-8 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleReplaceFood(index, originalIndex)}
                                      disabled={
                                        replacingFood?.mealIndex === index && replacingFood?.foodIndex === originalIndex
                                      }
                                      className="h-8 px-3 rounded-full flex items-center justify-center bg-blue-200/60 dark:bg-gray-700/30 text-blue-700 dark:text-gray-300 hover:bg-blue-300/60 dark:hover:bg-gray-700/50 border border-blue-300/50 dark:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {replacingFood?.mealIndex === index &&
                                      replacingFood?.foodIndex === originalIndex ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                                          Substituindo...
                                        </>
                                      ) : (
                                        <>
                                          <Replace className="h-3 w-3 mr-1.5" />
                                          Substituir
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                            Nenhum alimento nesta refeição
                          </p>
                        )}

                        {manualFoodsForMeal.map((manualFood, manualFoodIndex) => (
                          <div
                            key={`manual-${manualFoodIndex}`}
                            className="flex justify-between items-center py-4 border-b border-gray-100/50 dark:border-gray-700/50 last:border-b-0 bg-lime-50/30 dark:bg-lime-900/20"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                                {manualFood.name}
                              </p>
                              <p className="text-xs text-lime-600 dark:text-lime-400 font-medium mb-2">
                                Adicionado manualmente
                              </p>
                              <div className="flex gap-4 mt-2 text-xs font-medium">
                                <span className="text-[#ff6b6b] dark:text-[#ff6b6b]">P: {manualFood.protein}g</span>
                                <span className="text-[#f1c40f] dark:text-[#f1c40f]">C: {manualFood.carbs}g</span>
                                <span className="text-[#2ecc71] dark:text-[#2ecc71]">G: {manualFood.fats}g</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right mr-4">
                                <p className="text-lg font-bold text-white dark:text-white">
                                  {manualFood.calories} kcal
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  const updatedAdjustments = {
                                    ...manualAdjustments,
                                    addedFoods: manualAdjustments.addedFoods.filter(
                                      (_, idx) => !(manualAdjustments.addedFoods.indexOf(manualFood) === idx),
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

                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                          <button
                            onClick={() => handleReplaceMeal(index)}
                            disabled={replacingMeal === index}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 dark:hover:bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {replacingMeal === index ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Substituindo Refeição...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Substituir Refeição
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setAddingFood({ mealIndex: index, foodIndex: -1 })}
                            disabled={addingFood?.mealIndex === index && addingFood?.foodIndex === -1}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-200/60 dark:bg-green-700/30 text-green-700 dark:text-green-300 hover:bg-green-300/60 dark:hover:bg-green-700/50 border border-green-300/50 dark:border-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                            Recomendar Alimento
                          </button>
                        </div>
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
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
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
