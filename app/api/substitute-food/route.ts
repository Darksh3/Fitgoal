import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Substitute-food API called")

    let requestData
    try {
      requestData = await request.json()
    } catch (jsonError) {
      console.error("[v0] Invalid JSON in request:", jsonError)
      return NextResponse.json({ error: "JSON inválido na requisição" }, { status: 400 })
    }

    const { type, currentItem, targetMacros, userPreferences, mealContext, mealFoods } = requestData

    console.log("[v0] Request data:", { type, mealContext, targetMacros, mealFoods })

    if (!type || !currentItem || !targetMacros || !mealContext || !mealFoods) {
      console.error("[v0] Missing required parameters")
      return NextResponse.json(
        {
          error: "Parâmetros obrigatórios ausentes",
          required: ["type", "currentItem", "targetMacros", "mealContext", "mealFoods"],
        },
        { status: 400 },
      )
    }

    // Normalizar targetMacros para números
    const normalizedMacros = {
      calories: typeof targetMacros.calories === "string" ? parseFloat(targetMacros.calories) : targetMacros.calories,
      protein: typeof targetMacros.protein === "string" ? parseFloat(targetMacros.protein) : targetMacros.protein,
      carbs: typeof targetMacros.carbs === "string" ? parseFloat(targetMacros.carbs) : targetMacros.carbs,
      fats: typeof targetMacros.fats === "string" ? parseFloat(targetMacros.fats) : targetMacros.fats,
    }

    console.log("[v0] Normalized macros:", normalizedMacros)

    // Verificar autenticação
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[v0] Missing or invalid auth header")
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (authError) {
      console.error("[v0] Auth token verification failed:", authError)
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log("[v0] User authenticated:", userId)

    let userData = {}
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get()
      userData = userDoc.data() || {}
    } catch (dbError) {
      console.error("[v0] Error fetching user data:", dbError)
      // Continue without user data
    }

    const expensiveIngredientsInBrazil = [
      "grão-de-bico",
      "grão de bico",
      "chickpea",
      "quinoa",
      "cogumelo",
      "cogumelos",
      "mushroom",
      "mushrooms",
      "açaí",
      "acai",
    ]

    const allergiesAndRestrictions = [
      ...(userPreferences?.allergies ? [userPreferences.allergies] : []),
      `IMPORTANTE: Evite COMPLETAMENTE estes ingredientes (caros no Brasil): ${expensiveIngredientsInBrazil.join(", ")}. 
      Prefira alimentos acessíveis e comuns no Brasil como: ovos, frango, arroz, feijão, batata, banana, maçã, cenoura, brócolis, carne vermelha, iogurte, leite, pão, batata doce.`,
    ].filter(Boolean)

    // Extrair nomes dos alimentos já presentes na refeição
    const existingFoodNames = (mealFoods || [])
      .map((food) => (typeof food === "string" ? food : food?.name || ""))
      .filter(Boolean)
      .map((name) => name.toLowerCase())

    const foodsInMealStr = existingFoodNames.length > 0 ? existingFoodNames.join(", ") : "nenhum"

    const prompt =
      type === "food"
        ? `Substitua este alimento por outro equivalente em macros:

ALIMENTO ATUAL: ${currentItem.name || currentItem} (${normalizedMacros.calories} kcal)
MACROS ALVO: ${normalizedMacros.protein}g proteína, ${normalizedMacros.carbs}g carboidratos, ${normalizedMacros.fats}g gorduras
REFEIÇÃO: ${mealContext}
ALIMENTOS JÁ NA REFEIÇÃO: ${foodsInMealStr}

REGRAS OBRIGATÓRIAS:
1. NÃO REPITA alimentos já presentes na refeição (${foodsInMealStr})
2. NÃO SUGIRA alimentos compostos (Ex: "iogurte com mel", "pão com queijo", "frango com brócolis")
   - Sugestões devem ser de UM ÚNICO alimento apenas
   - Se o alimento é uma mistura, retorne apenas o componente principal
3. Prefira alimentos simples e individuais para fácil medição
4. RESTRIÇÕES: ${allergiesAndRestrictions.join(" | ")}

Retorne JSON:
{
  "substitutes": [
    {
      "name": "Nome do alimento SIMPLES (um único item)",
      "quantity": "50g",
      "calories": ${normalizedMacros.calories},
      "protein": "${normalizedMacros.protein}g",
      "carbs": "${normalizedMacros.carbs}g",
      "fats": "${normalizedMacros.fats}g",
      "reason": "Motivo da substituição"
    }
  ]
}`
        : `Substitua esta refeição completa por outra equivalente em macros:

REFEIÇÃO ATUAL: ${mealContext}
ALIMENTOS: ${JSON.stringify(currentItem)}
MACROS TOTAIS: ${normalizedMacros.calories} kcal, ${normalizedMacros.protein}g proteína, ${normalizedMacros.carbs}g carboidratos, ${normalizedMacros.fats}g gorduras
RESTRIÇÕES: ${allergiesAndRestrictions.join(" | ")}

REGRAS OBRIGATÓRIAS:
1. Cada alimento deve ser SIMPLES e INDIVIDUAL (nunca compostos como "iogurte com mel")
2. Facilitar a medição - cada item deve ser mensurável separadamente
3. Evite alimentos caros no Brasil

Retorne JSON com nova refeição equivalente:
{
  "meal": {
    "name": "${mealContext}",
    "time": "07:00",
    "foods": [
      {
        "name": "Nome do alimento SIMPLES 1",
        "quantity": "100g",
        "calories": 200,
        "protein": "15g",
        "carbs": "20g",
        "fats": "5g"
      },
      {
        "name": "Nome do alimento SIMPLES 2", 
        "quantity": "50g",
        "calories": 150,
        "protein": "10g",
        "carbs": "15g",
        "fats": "3g"
      }
    ],
    "totalCalories": ${normalizedMacros.calories},
    "totalProtein": "${normalizedMacros.protein}g",
    "totalCarbs": "${normalizedMacros.carbs}g", 
    "totalFats": "${normalizedMacros.fats}g"
  }
}`

    console.log("[v0] Calling OpenAI...")

    let aiResponse
    try {
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
      })
      aiResponse = result.text
    } catch (aiError) {
      console.error("[v0] OpenAI API error:", aiError)
      return NextResponse.json(
        {
          error: "Erro na API de IA",
          details: aiError instanceof Error ? aiError.message : "Erro desconhecido",
        },
        { status: 500 },
      )
    }

    console.log("[v0] OpenAI response received:", aiResponse.substring(0, 200))

    let substitutionData
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse
      substitutionData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      console.error("[v0] Raw response:", aiResponse)

      if (type === "food") {
        substitutionData = {
          substitutes: [
            {
              name: "Alimento substituto",
              quantity: "quantidade apropriada",
              calories: normalizedMacros.calories || 200,
              protein: String(normalizedMacros.protein || 6) + "g",
              carbs: String(normalizedMacros.carbs || 30) + "g",
              fats: String(normalizedMacros.fats || 3) + "g",
              reason: "Substituto com macros equivalentes",
            },
          ],
        }
      } else {
        substitutionData = {
          meal: {
            name: mealContext,
            time: "07:00",
            foods: [
              {
                name: "Alimento principal",
                quantity: "quantidade calculada",
                calories: Math.round((normalizedMacros.calories || 400) * 0.6),
                protein: String(Math.round((normalizedMacros.protein || 20) * 0.6)) + "g",
                carbs: String(Math.round((normalizedMacros.carbs || 50) * 0.6)) + "g",
                fats: String(Math.round((normalizedMacros.fats || 10) * 0.6)) + "g",
              },
              {
                name: "Alimento complementar",
                quantity: "quantidade calculada",
                calories: Math.round((normalizedMacros.calories || 400) * 0.4),
                protein: String(Math.round((normalizedMacros.protein || 20) * 0.4)) + "g",
                carbs: String(Math.round((normalizedMacros.carbs || 50) * 0.4)) + "g",
                fats: String(Math.round((normalizedMacros.fats || 10) * 0.4)) + "g",
              },
            ],
            totalCalories: normalizedMacros.calories || 400,
            totalProtein: String(normalizedMacros.protein || 20) + "g",
            totalCarbs: String(normalizedMacros.carbs || 50) + "g",
            totalFats: String(normalizedMacros.fats || 10) + "g",
          },
        }
      }
    }

    try {
      await adminDb.collection("users").doc(userId).collection("substitutions").add({
        type,
        originalItem: currentItem,
        substitution: substitutionData,
        targetMacros,
        mealContext,
        timestamp: new Date(),
      })
    } catch (logError) {
      console.error("[v0] Error saving substitution log:", logError)
      // Don't fail the request for logging errors
    }

    console.log("[v0] Substitution successful")

    if (type === "meal") {
      return NextResponse.json({
        success: true,
        substitution: {
          newMeal: substitutionData.meal, // Frontend expects newMeal field
        },
        type,
      })
    } else {
      return NextResponse.json({
        success: true,
        substitution: substitutionData,
        type,
      })
    }
  } catch (error) {
    console.error("[v0] Unexpected error in substitute-food API:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
