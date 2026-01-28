// Validação de alimentos para substituição

export interface Food {
  name?: string
  calories?: number | string
  protein?: number | string
  carbs?: number | string
  fats?: number | string
}

/**
 * Extrai o nome base do alimento removendo quantidade/unidades
 */
export function extractBaseFoodName(foodName: string): string {
  if (!foodName) return ""
  
  // Remove quantidade (100g, 50ml, 1 unidade, etc)
  let baseName = foodName
    .replace(/\(\d+[gmlунidade]*\)/gi, "") // Remove (100g), (50ml)
    .replace(/^\d+\s*[gmlунidade]+\s*/i, "") // Remove 100g no início
    .replace(/^\d+\s*unidade/i, "") // Remove unidades
    .trim()
  
  return baseName.toLowerCase()
}

/**
 * Verifica se um alimento é composto (contém "e", "com", etc)
 */
export function isCompositeFood(foodName: string): boolean {
  if (!foodName) return false
  
  const compositePatterns = [
    /\be\b/i,           // "e" = banana e mel
    /\bcom\b/i,         // "com" = pão com queijo
    /\b\+\b/,           // "+" = frango + brócolis
    /\be \b/i,          // "e " com espaço
    /,/,                // vírgula = frango, batata
  ]
  
  return compositePatterns.some(pattern => pattern.test(foodName))
}

/**
 * Valida se um alimento pode ser sugerido como substituto
 */
export function validateSubstituteFood(
  foodName: string,
  existingFoodsInMeal: (string | Food)[]
): { valid: boolean; reason?: string } {
  if (!foodName) {
    return { valid: false, reason: "Nome do alimento vazio" }
  }

  // Verificar se é alimento composto
  if (isCompositeFood(foodName)) {
    return {
      valid: false,
      reason: `"${foodName}" é um alimento composto. Use alimentos simples e individuais (ex: iogurte, mel, frango - separados)`,
    }
  }

  // Extrair nome base do novo alimento
  const baseName = extractBaseFoodName(foodName).toLowerCase()

  // Verificar se já existe na refeição
  const existingNames = existingFoodsInMeal.map((food) => {
    const name = typeof food === "string" ? food : food?.name || ""
    return extractBaseFoodName(name).toLowerCase()
  })

  if (existingNames.includes(baseName)) {
    return {
      valid: false,
      reason: `"${foodName}" já está incluído nesta refeição. Escolha outro alimento.`,
    }
  }

  return { valid: true }
}

/**
 * Valida lista de alimentos sugeridos pela IA
 */
export function validateAISuggestions(
  suggestions: Food[] | { name: string }[],
  existingFoodsInMeal: (string | Food)[]
): {
  valid: boolean
  invalidFoods: { name: string; reason: string }[]
  validFoods: any[]
} {
  const invalidFoods: { name: string; reason: string }[] = []
  const validFoods: any[] = []

  for (const suggestion of suggestions) {
    const foodName = suggestion.name || ""
    const validation = validateSubstituteFood(foodName, existingFoodsInMeal)

    if (!validation.valid) {
      invalidFoods.push({
        name: foodName,
        reason: validation.reason || "Alimento inválido",
      })
    } else {
      validFoods.push(suggestion)
    }
  }

  return {
    valid: invalidFoods.length === 0,
    invalidFoods,
    validFoods,
  }
}

/**
 * Sanitiza o nome do alimento removendo composições
 */
export function sanitizeFoodName(foodName: string): string {
  if (!foodName) return ""

  // Se for composto, tenta extrair o componente principal
  if (isCompositeFood(foodName)) {
    // Separa por "e", "com", "+"
    const parts = foodName
      .split(/\be\b|\bcom\b|\+/i)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)

    // Retorna a parte maior (provavelmente o componente principal)
    return parts.reduce((a, b) => (a.length > b.length ? a : b))
  }

  return foodName
}
