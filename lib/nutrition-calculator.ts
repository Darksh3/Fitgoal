"use client"

interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fats: number
}

interface Food {
  name: string
  quantity?: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
}

interface Meal {
  name: string
  time: string
  foods: (string | Food)[]
  calories?: string
  macros?: {
    protein: string
    carbs: string
    fats: string
  }
}

interface DietPlan {
  calories?: string
  protein?: string
  carbs?: string
  fats?: string
  totalDailyCalories?: string | number
  totalProtein?: string | number
  totalCarbs?: string | number
  totalFats?: string | number
  meals: Meal[]
}

// Parse numeric value from string (e.g., "150g" -> 150, "2500 kcal" -> 2500)
function parseNumericValue(value: string | number | undefined): number {
  if (typeof value === "number") return value
  if (!value || typeof value !== "string") return 0

  const match = value.match(/(\d+\.?\d*)/)
  return match ? Number.parseFloat(match[1]) : 0
}

// Format nutrition value with unit
function formatNutritionValue(value: number, unit: string): string {
  return `${Math.round(value)}${unit}`
}

// Calculate nutrition from individual foods
function calculateFoodNutrition(food: string | Food): NutritionData {
  if (typeof food === "object" && food.calories !== undefined) {
    return {
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fats: food.fats || 0,
    }
  }

  // Estimate nutrition for string-based foods
  const foodStr = typeof food === "string" ? food.toLowerCase() : ""
  let calories = 0
  let protein = 0
  let carbs = 0
  let fats = 0

  // Basic food estimation (this could be expanded with a proper food database)
  if (foodStr.includes("ovo")) {
    calories = 70
    protein = 6
    carbs = 1
    fats = 5
  } else if (foodStr.includes("frango") || foodStr.includes("peito")) {
    calories = 165
    protein = 31
    carbs = 0
    fats = 3.6
  } else if (foodStr.includes("arroz")) {
    calories = 130
    protein = 2.7
    carbs = 28
    fats = 0.3
  } else if (foodStr.includes("pão")) {
    calories = 80
    protein = 3
    carbs = 15
    fats = 1
  } else if (foodStr.includes("aveia")) {
    calories = 150
    protein = 5
    carbs = 27
    fats = 3
  } else if (foodStr.includes("banana")) {
    calories = 90
    protein = 1
    carbs = 23
    fats = 0.3
  } else if (foodStr.includes("leite")) {
    calories = 60
    protein = 3
    carbs = 5
    fats = 3.5
  } else {
    // Generic food estimation
    calories = 100
    protein = 5
    carbs = 15
    fats = 3
  }

  return { calories, protein, carbs, fats }
}

// Calculate total nutrition from meals
export function calculateMealNutrition(meals: Meal[]): NutritionData {
  if (!Array.isArray(meals) || meals.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0 }
  }

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFats = 0

  meals.forEach((meal) => {
    if (!meal || typeof meal !== "object") return

    // First try to get nutrition from meal-level data
    if (meal.calories) {
      totalCalories += parseNumericValue(meal.calories)
    }

    if (meal.macros) {
      totalProtein += parseNumericValue(meal.macros.protein)
      totalCarbs += parseNumericValue(meal.macros.carbs)
      totalFats += parseNumericValue(meal.macros.fats)
    }

    // If meal-level data is missing, calculate from individual foods
    if ((!meal.calories || !meal.macros) && Array.isArray(meal.foods)) {
      meal.foods.forEach((food) => {
        const nutrition = calculateFoodNutrition(food)
        if (!meal.calories) totalCalories += nutrition.calories
        if (!meal.macros) {
          totalProtein += nutrition.protein
          totalCarbs += nutrition.carbs
          totalFats += nutrition.fats
        }
      })
    }
  })

  return {
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fats: totalFats,
  }
}

// Get nutrition totals with proper fallback logic
export function getNutritionTotals(dietPlan: DietPlan): {
  calories: string
  protein: string
  carbs: string
  fats: string
} {
  // Priority 1: Use API-provided totals
  const apiCalories = parseNumericValue(dietPlan.totalDailyCalories)
  const apiProtein = parseNumericValue(dietPlan.totalProtein)
  const apiCarbs = parseNumericValue(dietPlan.totalCarbs)
  const apiFats = parseNumericValue(dietPlan.totalFats)

  if (apiCalories > 0 && apiProtein > 0 && apiCarbs > 0 && apiFats > 0) {
    return {
      calories: formatNutritionValue(apiCalories, " kcal"),
      protein: formatNutritionValue(apiProtein, "g"),
      carbs: formatNutritionValue(apiCarbs, "g"),
      fats: formatNutritionValue(apiFats, "g"),
    }
  }

  // Priority 2: Use diet plan totals
  const planCalories = parseNumericValue(dietPlan.calories)
  const planProtein = parseNumericValue(dietPlan.protein)
  const planCarbs = parseNumericValue(dietPlan.carbs)
  const planFats = parseNumericValue(dietPlan.fats)

  if (planCalories > 0 && planProtein > 0 && planCarbs > 0 && planFats > 0) {
    return {
      calories: formatNutritionValue(planCalories, " kcal"),
      protein: formatNutritionValue(planProtein, "g"),
      carbs: formatNutritionValue(planCarbs, "g"),
      fats: formatNutritionValue(planFats, "g"),
    }
  }

  // Priority 3: Calculate from meals
  const calculated = calculateMealNutrition(dietPlan.meals)

  if (calculated.calories > 0) {
    return {
      calories: formatNutritionValue(calculated.calories, " kcal"),
      protein: formatNutritionValue(calculated.protein, "g"),
      carbs: formatNutritionValue(calculated.carbs, "g"),
      fats: formatNutritionValue(calculated.fats, "g"),
    }
  }

  // Priority 4: Reasonable defaults based on common dietary needs
  return {
    calories: "2000 kcal",
    protein: "120g",
    carbs: "250g",
    fats: "65g",
  }
}

// Validate nutrition data
export function validateNutritionData(data: NutritionData): boolean {
  return (
    data.calories > 0 &&
    data.calories < 10000 && // Reasonable upper limit
    data.protein >= 0 &&
    data.protein < 500 && // Reasonable upper limit
    data.carbs >= 0 &&
    data.carbs < 1000 && // Reasonable upper limit
    data.fats >= 0 &&
    data.fats < 300 // Reasonable upper limit
  )
}

// Calculate macro percentages
export function calculateMacroPercentages(nutrition: NutritionData): {
  proteinPercent: number
  carbsPercent: number
  fatsPercent: number
} {
  const proteinCalories = nutrition.protein * 4
  const carbsCalories = nutrition.carbs * 4
  const fatsCalories = nutrition.fats * 9
  const totalCalories = proteinCalories + carbsCalories + fatsCalories

  if (totalCalories === 0) {
    return { proteinPercent: 0, carbsPercent: 0, fatsPercent: 0 }
  }

  return {
    proteinPercent: Math.round((proteinCalories / totalCalories) * 100),
    carbsPercent: Math.round((carbsCalories / totalCalories) * 100),
    fatsPercent: Math.round((fatsCalories / totalCalories) * 100),
  }
}
