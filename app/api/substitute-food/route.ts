import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const {
      type, // 'food' ou 'meal'
      currentItem, // alimento atual ou refeição completa
      targetMacros, // macros que devem ser mantidos
      userPreferences, // preferências alimentares do usuário
      mealContext, // contexto da refeição (café da manhã, almoço, etc.)
    } = await request.json()

    // Verificar autenticação
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Buscar dados do usuário para personalização
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    // Prompt para OpenAI baseado no tipo de substituição
    const prompt =
      type === "food"
        ? `Você é um nutricionista especializado. Preciso substituir um alimento específico por outro equivalente em macronutrientes.

ALIMENTO ATUAL:
${JSON.stringify(currentItem, null, 2)}

MACROS ALVO (devem ser mantidos aproximadamente):
- Calorias: ${targetMacros.calories} kcal
- Proteínas: ${targetMacros.protein}g
- Carboidratos: ${targetMacros.carbs}g
- Gorduras: ${targetMacros.fats}g

CONTEXTO DA REFEIÇÃO: ${mealContext}

PREFERÊNCIAS DO USUÁRIO:
- Restrições alimentares: ${userPreferences?.allergies || "Nenhuma"}
- Preferências dietéticas: ${userPreferences?.dietType || "Sem restrições"}

INSTRUÇÕES:
1. Sugira 3 alimentos substitutos que tenham macros similares (±10% de diferença)
2. Mantenha a mesma função nutricional na refeição
3. Considere praticidade e disponibilidade
4. Respeite as restrições alimentares

Retorne APENAS um JSON válido no formato:
{
  "substitutes": [
    {
      "name": "Nome do alimento",
      "quantity": "quantidade com unidade",
      "calories": número,
      "protein": "Xg",
      "carbs": "Xg", 
      "fats": "Xg",
      "reason": "Por que é um bom substituto"
    }
  ]
}`
        : `Você é um nutricionista especializado. Preciso substituir uma refeição completa por outra equivalente em macronutrientes.

REFEIÇÃO ATUAL:
${JSON.stringify(currentItem, null, 2)}

MACROS ALVO TOTAIS (devem ser mantidos):
- Calorias: ${targetMacros.calories} kcal
- Proteínas: ${targetMacros.protein}g
- Carboidratos: ${targetMacros.carbs}g
- Gorduras: ${targetMacros.fats}g

CONTEXTO: ${mealContext}

PREFERÊNCIAS DO USUÁRIO:
- Restrições alimentares: ${userPreferences?.allergies || "Nenhuma"}
- Preferências dietéticas: ${userPreferences?.dietType || "Sem restrições"}

INSTRUÇÕES:
1. Crie uma refeição substituta com macros equivalentes (±5% de diferença)
2. Mantenha o mesmo propósito nutricional (pré/pós treino, etc.)
3. Use 3-5 alimentos diferentes
4. Considere praticidade de preparo
5. Respeite as restrições alimentares

Retorne APENAS um JSON válido no formato:
{
  "newMeal": {
    "name": "${mealContext}",
    "foods": [
      {
        "name": "Nome do alimento",
        "quantity": "quantidade com unidade", 
        "calories": número,
        "protein": "Xg",
        "carbs": "Xg",
        "fats": "Xg"
      }
    ],
    "totalCalories": número,
    "totalProtein": "Xg",
    "totalCarbs": "Xg", 
    "totalFats": "Xg",
    "reason": "Por que esta refeição é equivalente"
  }
}`

    console.log("[v0] Calling OpenAI for substitution:", { type, mealContext })

    // Chamar OpenAI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxTokens: 1500,
    })

    console.log("[v0] OpenAI response:", text)

    // Parse da resposta
    let substitutionData
    try {
      substitutionData = JSON.parse(text)
    } catch (parseError) {
      console.error("[v0] Error parsing OpenAI response:", parseError)
      return NextResponse.json(
        {
          error: "Erro ao processar resposta da IA",
          details: "Resposta inválida da OpenAI",
        },
        { status: 500 },
      )
    }

    // Salvar log da substituição
    await adminDb.collection("users").doc(userId).collection("substitutions").add({
      type,
      originalItem: currentItem,
      substitution: substitutionData,
      targetMacros,
      mealContext,
      timestamp: new Date(),
    })

    return NextResponse.json({
      success: true,
      substitution: substitutionData,
      type,
    })
  } catch (error) {
    console.error("[v0] Error in substitute-food API:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
