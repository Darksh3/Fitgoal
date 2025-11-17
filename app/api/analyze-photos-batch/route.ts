import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Starting batch photo analysis")

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY

    console.log("[v0] API: Checking Google API key...")
    console.log("[v0] API: GOOGLE_GENERATIVE_AI_API_KEY exists:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    console.log("[v0] API: GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY)

    if (!apiKey) {
      console.error("[v0] API: Google API key is missing")
      return NextResponse.json(
        {
          error: "AI service not configured",
          details: "Google API key is missing. Please add GOOGLE_GENERATIVE_AI_API_KEY environment variable.",
        },
        { status: 500 },
      )
    }

    console.log("[v0] API: Google API key found, length:", apiKey.length)

    const genAI = new GoogleGenerativeAI(apiKey)

    const body = await request.json()
    const { photos, userId, userQuizData } = body

    console.log("[v0] API: Received data:", {
      photosCount: photos?.length,
      photoUrls: photos?.map((p: any) => p.photoUrl?.substring(0, 50)),
      userId: !!userId,
      userQuizData: !!userQuizData,
    })

    if (!photos || photos.length === 0 || !userId) {
      console.log("[v0] API: Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const invalidPhotos = photos.filter((p: any) => !p.photoUrl || !p.photoUrl.startsWith("http"))
    if (invalidPhotos.length > 0) {
      console.error("[v0] API: Invalid photo URLs detected:", invalidPhotos)
      return NextResponse.json(
        {
          error: "Invalid photo URLs",
          details: "Some photos were not uploaded correctly",
        },
        { status: 400 },
      )
    }

    console.log("[v0] API: Fetching user data from Firebase")
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      console.error("[v0] API: User not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentPlans = userDoc.data() || {}
    console.log("[v0] API: User data fetched successfully")

    const dietPlan = currentPlans?.dietPlan
    let realTotalCalories = 0
    let realTotalProtein = 0
    let realTotalCarbs = 0
    let realTotalFats = 0

    if (dietPlan?.supplements && Array.isArray(dietPlan.supplements)) {
      dietPlan.supplements.forEach((supplement: any) => {
        realTotalCalories += Number(supplement.calories) || 0
        realTotalProtein += Number(supplement.protein) || 0
        realTotalCarbs += Number(supplement.carbs) || 0
        realTotalFats += Number(supplement.fat) || 0
      })
    }

    if (dietPlan?.meals && Array.isArray(dietPlan.meals)) {
      dietPlan.meals.forEach((meal: any) => {
        if (Array.isArray(meal.foods)) {
          meal.foods.forEach((food: any) => {
            if (typeof food === "object" && food.calories) {
              const caloriesMatch = food.calories.toString().match(/(\d+(?:\.\d+)?)/)
              if (caloriesMatch) realTotalCalories += Number.parseFloat(caloriesMatch[1])

              if (food.protein) {
                const proteinMatch = food.protein.toString().match(/(\d+(?:\.\d+)?)/)
                if (proteinMatch) realTotalProtein += Number.parseFloat(proteinMatch[1])
              }
              if (food.carbs) {
                const carbsMatch = food.carbs.toString().match(/(\d+(?:\.\d+)?)/)
                if (carbsMatch) realTotalCarbs += Number.parseFloat(carbsMatch[1])
              }
              if (food.fats) {
                const fatsMatch = food.fats.toString().match(/(\d+(?:\.\d+)?)/)
                if (fatsMatch) realTotalFats += Number.parseFloat(fatsMatch[1])
              }
            }
          })
        }
      })
    }

    console.log("[v0] API: Real diet totals (including supplements):", {
      calories: realTotalCalories,
      protein: realTotalProtein,
      carbs: realTotalCarbs,
      fats: realTotalFats,
    })

    const userContext = `
Dados do Usuário:
- Idade: ${currentPlans?.age || "Não informada"}
- Peso Atual: ${currentPlans?.weight || "Não informado"} kg
- Altura: ${currentPlans?.height || "Não informada"} cm
- Objetivo: ${currentPlans?.goal || "Não informado"}
- Nível de Atividade: ${currentPlans?.activityLevel || "Não informado"}
- Biotipo: ${currentPlans?.bodyType || "Não informado"}
${dietPlan ? `\n[Plano Alimentar Atual]\n${JSON.stringify(dietPlan, null, 2)}` : ""}
    `.trim()

    console.log("[v0] API: User context prepared")
    console.log("[v0] API: Number of photos to analyze:", photos.length)

    console.log("[v0] API: Initializing Gemini 1.5 Pro...")
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" })

    const imageParts = await Promise.all(
      photos.map(async (photo: any) => {
        const response = await fetch(photo.photoUrl)
        const buffer = await response.arrayBuffer()
        return {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: "image/jpeg",
          },
        }
      })
    )

    const prompt = `
CONTEXTO PROFISSIONAL
Você é um especialista em ciência do esporte e avaliação física. Sua função é realizar uma análise técnica objetiva de adaptações morfológicas ao treinamento.

${userContext}

PROTOCOLO DE AVALIAÇÃO
Analise as fotografias fornecidas utilizando os seguintes parâmetros antropométricos e biomecânicos:

1. ANÁLISE POSTURAL E SIMETRIA
   - Alinhamento da coluna vertebral
   - Distribuição de massa corporal
   - Simetria bilateral

2. COMPOSIÇÃO CORPORAL VISUAL
   - Estimativa de percentual de gordura corporal
   - Desenvolvimento muscular relativo
   - Áreas de maior/menor densidade muscular

3. ADAPTAÇÕES AO TREINAMENTO
   - Grupos musculares mais desenvolvidos
   - Potenciais desequilíbrios musculares
   - Zonas de acúmulo adiposo

4. RECOMENDAÇÕES TÉCNICAS
   - Periodização de treino sugerida
   - Grupos musculares prioritários
   - Estratégias nutricionais gerais
   - Marcos de progressão sugeridos

FORMATO DE RESPOSTA (JSON):
{
  "analysis": "Análise técnica detalhada em português",
  "recommendations": "Recomendações profissionais específicas"
}

DISCLAIMER: Esta é uma avaliação visual preliminar para fins educacionais. Recomenda-se avaliação presencial com profissionais certificados.
`

    console.log("[v0] API: Sending request to Gemini...")

    const result = await model.generateContent([prompt, ...imageParts])
    const response = await result.response
    const text = response.text()

    console.log("[v0] API: Gemini response received")
    console.log("[v0] API: Response text:", text)

    let analysisData
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0])
      } else {
        analysisData = {
          analysis: text,
          recommendations: "Consulte um profissional para recomendações personalizadas.",
        }
      }
    } catch (parseError) {
      console.error("[v0] API: Failed to parse JSON response:", parseError)
      analysisData = {
        analysis: text,
        recommendations: "Consulte um profissional para recomendações personalizadas.",
      }
    }

    console.log("[v0] API: AI analysis completed, parsing response")

    const policyRefusalPatterns = [
      "I'm sorry, I can't assist with that",
      "I cannot assist with that",
      "I'm unable to assist",
      "I can't help with that",
      "I cannot help with that",
      "I'm not able to assist",
      "against my guidelines",
      "violates my guidelines",
      "content policy",
      "não posso ajudar",
      "não posso auxiliar",
      "desculpe",
    ]

    const isRefusal = policyRefusalPatterns.some((pattern) => text.toLowerCase().includes(pattern.toLowerCase()))

    if (isRefusal) {
      console.error("[v0] ❌ POLICY VIOLATION DETECTED:")
      console.error("[v0] 🔍 Refusal reason: OpenAI content policy")
      console.error("[v0] 🔍 Complete refusal message:")
      console.error("═══════════════════════════════════════════════════════════")
      console.error(text)
      console.error("═══════════════════════════════════════════════════════════")
      console.error(
        "[v0] 🔍 Response metadata:",
        JSON.stringify(
          {
            finishReason: response.finishReason,
            usage: response.usage,
          },
          null,
          2,
        ),
      )

      return NextResponse.json(
        {
          error: "Política de Conteúdo Violada",
          details:
            "A OpenAI recusou analisar as fotos enviadas. Isso pode acontecer quando:\n\n" +
            "• As fotos mostram muito do corpo (use roupas de treino adequadas)\n" +
            "• A análise é interpretada como avaliação médica/diagnóstico\n" +
            "• O conteúdo viola as políticas de uso da OpenAI\n\n" +
            "Sugestões:\n" +
            "• Tire fotos com roupas de treino (shorts e top/camiseta)\n" +
            "• Certifique-se de que as fotos são apenas para acompanhamento fitness\n" +
            "• Evite fotos muito próximas ou em ângulos inadequados\n\n" +
            `Resposta completa da OpenAI:\n${text}`,
          policyViolation: true,
          rawResponse: text,
          responseMetadata: {
            finishReason: response.finishReason,
            usage: response.usage,
          },
        },
        { status: 400 },
      )
    }

    console.log("[v0] API: ✅ Analysis valid, saving to Firebase")

    const progressEntry = {
      date: new Date().toISOString(),
      photos: photos.map((photo: any) => ({
        photoUrl: photo.photoUrl,
        photoType: photo.photoType,
      })),
      analysis: analysisData.analysis,
      recommendations: analysisData.recommendations,
      weight: currentPlans?.weight || null,
      createdAt: FieldValue.serverTimestamp(),
    }

    console.log("[v0] API: Saving progress to Firebase")

    await adminDb.collection("users").doc(userId).collection("progress").add(progressEntry)

    console.log("[v0] API: Progress saved successfully")

    return NextResponse.json({
      success: true,
      analysis: analysisData.analysis,
      recommendations: analysisData.recommendations,
    })
  } catch (error: any) {
    console.error("[v0] API: Error in batch analysis:", error)
    console.error("[v0] API: Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })

    return NextResponse.json(
      {
        error: "Erro na chamada da IA",
        details: error.message,
        errorType: error.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        attr: error.attr,
      },
      { status: 500 },
    )
  }
}
