import { NextRequest, NextResponse } from "next/server"
import { getAIModel } from "@/lib/getAIModel"

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { foodName, mealContext, mealFoods, availableMacros, userPreferences } = requestData

    if (!foodName || !mealContext || !availableMacros) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios ausentes: foodName, mealContext, availableMacros" },
        { status: 400 }
      )
    }

    const model = getAIModel()

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
  "reason": "motivo específico"
}`

    const response = await model.generateText({
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    })

    let result
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error("[v0] JSON parse error in add-food response:", e)
      result = null
    }

    if (!result) {
      return NextResponse.json(
        { error: "Resposta inválida da IA" },
        { status: 500 }
      )
    }

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
