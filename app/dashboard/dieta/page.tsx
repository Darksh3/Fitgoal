"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { Meal, DietPlan } from "@/types" // Declare Meal and DietPlan interfaces

export default function DietPage() {
  const [user] = useAuthState(auth)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      const fetchDietPlan = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()

            if (userData.dietPlan) {
              setDietPlan(userData.dietPlan as DietPlan)
            } else {
              const leadsDocRef = doc(db, "leads", user.uid)
              const leadsDocSnap = await getDoc(leadsDocRef)

              if (leadsDocSnap.exists()) {
                const leadsData = leadsDocSnap.data()
                if (leadsData.dietPlan) {
                  setDietPlan(leadsData.dietPlan as DietPlan)
                } else {
                  setError("Nenhum plano de dieta encontrado. Tente regenerar os planos.")
                }
              } else {
                setError("Nenhum plano de dieta encontrado. Tente regenerar os planos.")
              }
            }
          } else {
            setError("Dados do usuário não encontrados")
          }
        } catch (err) {
          console.error("[v0] Error fetching diet plan:", err)
          setError("Erro ao carregar o plano de dieta")
        } finally {
          setLoading(false)
        }
      }

      fetchDietPlan()
    }
  }, [user])

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
      protein: totalProtein > 0 ? `${Math.round(totalProtein)}g` : "0g",
      carbs: totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : "0g",
      fats: totalFats > 0 ? `${Math.round(totalFats)}g` : "0g",
    }
  }

  const calculatedTotals = calculateTotalMacros(dietPlan?.meals || [])

  const displayTotals = {
    calories: (() => {
      if (dietPlan?.totalDailyCalories && dietPlan.totalDailyCalories !== "0") {
        return `${dietPlan.totalDailyCalories} kcal`
      }
      if (dietPlan?.calories && dietPlan.calories !== "0" && dietPlan.calories !== "0 kcal") {
        return dietPlan.calories.includes("kcal") ? dietPlan.calories : `${dietPlan.calories} kcal`
      }
      if (calculatedTotals.calories !== "0") {
        return `${calculatedTotals.calories} kcal`
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
      if (calculatedTotals.protein !== "0g") {
        return calculatedTotals.protein
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
      if (calculatedTotals.carbs !== "0g") {
        return calculatedTotals.carbs
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
      if (calculatedTotals.fats !== "0g") {
        return calculatedTotals.fats
      }
      return "Dados não disponíveis"
    })(),
  }

  return (
    <ProtectedRoute>
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

        {dietPlan && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Calorias Totais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{displayTotals.calories}</p>
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
    </ProtectedRoute>
  )
}
