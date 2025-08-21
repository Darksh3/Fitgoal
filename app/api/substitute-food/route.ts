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

    const { type, currentItem, targetMacros, userPreferences, mealContext } = requestData

    console.log("[v0] Request data:", { type, mealContext, targetMacros })

    if (!type || !currentItem || !targetMacros || !mealContext) {
      return NextResponse.json(
        {
          error: "Parâmetros obrigatórios ausentes",
          required: ["type", "currentItem", "targetMacros", "mealContext"],
        },
        { status: 400 },
      )
    }

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

    const prompt =
      type === "food"
        ? `Substitua este alimento por outro equivalente em macros:

ALIMENTO: ${currentItem.name || currentItem} (${targetMacros.calories} kcal)
MACROS ALVO: ${targetMacros.protein}g proteína, ${targetMacros.carbs}g carboidratos, ${targetMacros.fats}g gorduras
REFEIÇÃO: ${mealContext}
RESTRIÇÕES: ${userPreferences?.allergies || "Nenhuma"}

Retorne JSON:
{
  "substitutes": [
    {
      "name": "Nome do alimento",
      "quantity": "50g",
      "calories": ${targetMacros.calories},
      "protein": "${targetMacros.protein}g",
      "carbs": "${targetMacros.carbs}g",
      "fats": "${targetMacros.fats}g",
      "reason": "Motivo da substituição"
    }
  ]
}`
        : `Substitua esta refeição completa por outra equivalente em macros:

REFEIÇÃO ATUAL: ${mealContext}
ALIMENTOS: ${JSON.stringify(currentItem)}
MACROS TOTAIS: ${targetMacros.calories} kcal, ${targetMacros.protein}g proteína, ${targetMacros.carbs}g carboidratos, ${targetMacros.fats}g gorduras
RESTRIÇÕES: ${userPreferences?.allergies || "Nenhuma"}

Retorne JSON com nova refeição equivalente:
{
  "meal": {
    "name": "${mealContext}",
    "time": "07:00",
    "foods": [
      {
        "name": "Nome do alimento 1",
        "quantity": "100g",
        "calories": 200,
        "protein": "15g",
        "carbs": "20g",
        "fats": "5g"
      },
      {
        "name": "Nome do alimento 2", 
        "quantity": "50g",
        "calories": 150,
        "protein": "10g",
        "carbs": "15g",
        "fats": "3g"
      }
    ],
    "totalCalories": ${targetMacros.calories},
    "totalProtein": "${targetMacros.protein}g",
    "totalCarbs": "${targetMacros.carbs}g", 
    "totalFats": "${targetMacros.fats}g"
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
              name: "Aveia em flocos",
              quantity: "50g",
              calories: targetMacros.calories || 200,
              protein: targetMacros.protein + "g" || "6g",
              carbs: targetMacros.carbs + "g" || "30g",
              fats: targetMacros.fats + "g" || "3g",
              reason: "Substituto padrão rico em fibras",
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
                name: "Aveia em flocos",
                quantity: "50g",
                calories: Math.round((targetMacros.calories || 400) * 0.6),
                protein: Math.round((targetMacros.protein || 20) * 0.6) + "g",
                carbs: Math.round((targetMacros.carbs || 50) * 0.6) + "g",
                fats: Math.round((targetMacros.fats || 10) * 0.6) + "g",
              },
              {
                name: "Banana",
                quantity: "100g",
                calories: Math.round((targetMacros.calories || 400) * 0.4),
                protein: Math.round((targetMacros.protein || 20) * 0.4) + "g",
                carbs: Math.round((targetMacros.carbs || 50) * 0.4) + "g",
                fats: Math.round((targetMacros.fats || 10) * 0.4) + "g",
              },
            ],
            totalCalories: targetMacros.calories || 400,
            totalProtein: (targetMacros.protein || 20) + "g",
            totalCarbs: (targetMacros.carbs || 50) + "g",
            totalFats: (targetMacros.fats || 10) + "g",
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
    return NextResponse.json({
      success: true,
      substitution: substitutionData,
      type,
    })
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
