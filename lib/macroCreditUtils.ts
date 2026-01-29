import type { Meal, Food } from "@/types"

/**
 * Extrai os macros de um alimento (objeto ou string)
 */
export function extractFoodMacros(food: Food | string) {
  let macros = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  }

  if (typeof food === "string") {
    // Parse string format: "Frango 165kcal | 31g proteína | 0g carbs | 3.6g gordura"
    const caloriesMatch = food.match(/(\d+(?:\.\d+)?)\s*kcal/i)
    const proteinMatch = food.match(/(\d+(?:\.\d+)?)\s*g\s*proteína/i)
    const carbsMatch = food.match(/(\d+(?:\.\d+)?)\s*g\s*carb/i)
    const fatsMatch = food.match(/(\d+(?:\.\d+)?)\s*g\s*gordura/i)

    macros.calories = caloriesMatch ? parseFloat(caloriesMatch[1]) : 0
    macros.protein = proteinMatch ? parseFloat(proteinMatch[1]) : 0
    macros.carbs = carbsMatch ? parseFloat(carbsMatch[1]) : 0
    macros.fats = fatsMatch ? parseFloat(fatsMatch[1]) : 0
  } else if (food && typeof food === "object") {
    macros.calories = parseFloat(food.calories?.toString() || "0")
    macros.protein = parseFloat(food.protein?.toString() || "0")
    macros.carbs = parseFloat(food.carbs?.toString() || "0")
    macros.fats = parseFloat(food.fats?.toString() || "0")
  }

  return macros
}

/**
 * Adiciona macros ao macroCredit da refeição
 * Chamado quando um alimento é removido
 */
export function addToMacroCredit(meal: Meal, foodMacros: ReturnType<typeof extractFoodMacros>): Meal {
  const updatedMeal = { ...meal }

  if (!updatedMeal.macroCredit) {
    updatedMeal.macroCredit = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    }
  }

  updatedMeal.macroCredit.calories += foodMacros.calories
  updatedMeal.macroCredit.protein += foodMacros.protein
  updatedMeal.macroCredit.carbs += foodMacros.carbs
  updatedMeal.macroCredit.fats += foodMacros.fats

  console.log("[v0] Added to macroCredit:", foodMacros)
  console.log("[v0] New macroCredit:", updatedMeal.macroCredit)

  return updatedMeal
}

/**
 * Aplica o macroCredit a um novo alimento durante a substituição
 * Chamado quando um alimento é substituído
 */
export function applyMacroCreditToFood(
  newFood: Food,
  mealMacroCredit?: Meal["macroCredit"]
): Food {
  if (!mealMacroCredit || !newFood) return newFood

  const updatedFood = { ...newFood }

  updatedFood.calories = (parseFloat(updatedFood.calories?.toString() || "0") + mealMacroCredit.calories).toString()
  updatedFood.protein = (parseFloat(updatedFood.protein?.toString() || "0") + mealMacroCredit.protein).toString()
  updatedFood.carbs = (parseFloat(updatedFood.carbs?.toString() || "0") + mealMacroCredit.carbs).toString()
  updatedFood.fats = (parseFloat(updatedFood.fats?.toString() || "0") + mealMacroCredit.fats).toString()

  console.log("[v0] Applied macroCredit to food")
  console.log("[v0] New food macros:", {
    calories: updatedFood.calories,
    protein: updatedFood.protein,
    carbs: updatedFood.carbs,
    fats: updatedFood.fats,
  })

  return updatedFood
}

/**
 * Reseta o macroCredit da refeição para zero
 * Chamado após uma substituição bem-sucedida
 */
export function resetMacroCredit(meal: Meal): Meal {
  const updatedMeal = { ...meal }

  updatedMeal.macroCredit = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  }

  console.log("[v0] macroCredit reset to zero")

  return updatedMeal
}

/**
 * Calcula o macroCredit atual de uma refeição (para exibição)
 */
export function getMacroCreditDisplay(macroCredit?: Meal["macroCredit"]): string {
  if (!macroCredit || macroCredit.calories === 0) return "Nenhum crédito"

  return `${Math.round(macroCredit.calories)} kcal | ${Math.round(macroCredit.protein)}g proteína | ${Math.round(macroCredit.carbs)}g carbs | ${Math.round(macroCredit.fats)}g gordura`
}
