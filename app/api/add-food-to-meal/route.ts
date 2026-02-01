import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Add-food-to-meal API called")

    let requestData
    try {
      requestData = await request.json()
    } catch (jsonError) {
      console.error("[v0] Invalid JSON in request:", jsonError)
      return NextResponse.json({ error: "JSON inválido na requisição" }, { status: 400 })
    }

    const { foodName, mealContext, mealFoods, availableMacros, userPreferences } = requestData

    if (!foodName || !mealContext || !availableMacros) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios ausentes: foodName, mealContext, availableMacros" },
        { status: 400 }
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

    // Extrair nomes dos alimentos já presentes
    const existingFoodNames = (mealFoods || [])
      .map((food) => (typeof food === "string" ? food : food?.name || ""))
      .filter(Boolean)
      .map((name) => name.toLowerCase())

    const badFoods = [
      "refrigerante",
      "refrigerante de cola",
      "refrigerante açucarado",
      "sorvete",
      "chocolate",
      "doces",
      "docinhos",
      "salgados",
      "batatas fritas",
      "cheetos",
      "doritos",
      "pizza",
      "hambúrguer",
      "chiclete",
      "chiclete açucarado",
      "cerveja",
      "destilado",
      "vodka",
      "rum",
      "whisky",
    ]

    const foodNameLower = foodName.toLowerCase()
    const isBadFood = badFoods.some((bad) => foodNameLower.includes(bad))

    if (isBadFood) {
      return NextResponse.json({
        success: true,
        canAdd: false,
        message: "Infelizmente esse alimento não encaixa. Escolha algo mais saudável!",
        reason: "unhealthy",
      })
    }

    const prompt = `Você é um nutricionista verificando se um alimento pode ser adicionado a uma refeição.

NOVO ALIMENTO PARA ADICIONAR: "${foodName}"
REFEIÇÃO ATUAL: ${mealContext}
ALIMENTOS JÁ NA REFEIÇÃO: ${existingFoodNames.length > 0 ? existingFoodNames.join(", ") : "nenhum"}
MACROS DISPONÍVEIS (macroCredit): ${availableMacros.calories} kcal, ${availableMacros.protein}g proteína, ${availableMacros.carbs}g carboidrato, ${availableMacros.fats}g gordura

REGRAS:
1. Se o alimento é SIMPLES e SAUDÁVEL, considere adicioná-lo
2. Se é alimento COMPOSTO (ex: "iogurte com mel"), REJEITE com "Alimento composto não é permitido"
3. Se já existe algo similar na refeição, REJEITE
4. Se é algo NÃO SAUDÁVEL (frituras, ultra processado, muito açúcar), REJEITE com "Alimento não é saudável"
5. Se precisa de MUITA quantidade e não cabe nos macros, REJEITE
6. Prefira alimentos simples e individuais para fácil medição

Se ACEITAR, retorne JSON:
{
  "canAdd": true,
  "message": "Sim, é possível!",
  "food": {
    "name": "${foodName}",
    "quantity": "XYZg",
    "calories": NUMBER,
    "protein": "Xg",
    "carbs": "Xg",
    "fats": "Xg",
    "reason": "Motivo da adição"
  }
}

Se REJEITAR, retorne JSON:
{
  "canAdd": false,
  "message": "Infelizmente esse alimento não encaixa",
  "reason": "Motivo breve (ex: Alimento composto, Muito calórico, Muito similar ao já adicionado, etc)"
}`

    const response = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    })

    console.log("[v0] AI response text:", response.text)

    let result
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("[v0] No JSON found in response:", response.text)
        throw new Error("Sem JSON na resposta")
      }
      result = JSON.parse(jsonMatch[0])
      console.log("[v0] Parsed AI response:", result)
    } catch (e) {
      console.error("[v0] JSON parse error in add-food response:", e, "Response:", response.text)
      result = null
    }

    if (!result) {
      console.error("[v0] Invalid result from AI")
      return NextResponse.json(
        { error: "Resposta inválida da IA", details: response.text },
        { status: 500 }
      )
    }

    console.log("[v0] Returning success response:", result)
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[v0] Erro ao adicionar alimento:", error)
    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
