import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, photos, userQuizData, currentPlans } = body

    console.log("[v0] Batch analysis request received for user:", userId)
    console.log("[v0] Number of photos:", photos?.length)

    if (!userId || !photos || photos.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] OPENAI_API_KEY not found")
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const dietPlan = currentPlans?.dietPlan
    const supplementCalories =
      dietPlan?.supplements?.reduce((sum: number, supp: any) => sum + (supp.calories || 0), 0) || 0
    const supplementProtein =
      dietPlan?.supplements?.reduce((sum: number, supp: any) => sum + (supp.protein || 0), 0) || 0
    const supplementCarbs = dietPlan?.supplements?.reduce((sum: number, supp: any) => sum + (supp.carbs || 0), 0) || 0
    const supplementFats = dietPlan?.supplements?.reduce((sum: number, supp: any) => sum + (supp.fats || 0), 0) || 0

    const realTotalCalories = (dietPlan?.totalDailyCalories || 0) + supplementCalories
    const realTotalProtein = (dietPlan?.totalProtein || 0) + supplementProtein
    const realTotalCarbs = (dietPlan?.totalCarbs || 0) + supplementCarbs
    const realTotalFats = (dietPlan?.totalFats || 0) + supplementFats

    console.log("[v0] Real nutrition values (with supplements):", {
      calories: realTotalCalories,
      protein: realTotalProtein,
      carbs: realTotalCarbs,
      fats: realTotalFats,
    })

    const prompt = `Você é um treinador de atletismo e especialista em biomecânica com 15 anos de experiência analisando fotos de progresso de atletas para otimizar performance e prevenir lesões.

CONTEXTO DO ATLETA:
- Objetivo: ${userQuizData?.goal || "Não informado"}
- Peso atual: ${userQuizData?.currentWeight || "Não informado"}kg
- Meta: ${userQuizData?.goalWeight || "Não informado"}kg
- Altura: ${userQuizData?.height || "Não informado"}cm
- Idade: ${userQuizData?.age || "Não informado"} anos

PROTOCOLO NUTRICIONAL ATUAL:
- Calorias diárias: ${Math.round(realTotalCalories)} kcal
- Proteína diária: ${Math.round(realTotalProtein)}g
- Carboidratos: ${Math.round(realTotalCarbs)}g
- Gorduras: ${Math.round(realTotalFats)}g

PROTOCOLO DE TREINO ATUAL:
- Frequência: ${currentPlans?.workoutPlan?.days?.length || "Não informado"}x/semana
- Divisão: ${currentPlans?.workoutPlan?.days?.map((d: any) => d.name).join(", ") || "Não informado"}

TAREFA: Analise as fotos de progresso do atleta e forneça feedback sobre:

1. DESENVOLVIMENTO MUSCULAR observado (grupos musculares visíveis, simetria)
2. EFETIVIDADE do protocolo atual (treino + nutrição)
3. AJUSTES RECOMENDADOS específicos e quantificados
4. FEEDBACK MOTIVACIONAL honesto e profissional

Responda APENAS com JSON válido (sem markdown, sem texto antes/depois):

{
  "motivacao": "Mensagem motivacional personalizada baseada no que você observou (2-3 frases)",
  "pontosForts": [
    "Primeiro ponto forte específico observado",
    "Segundo ponto forte",
    "Terceiro ponto forte"
  ],
  "areasParaMelhorar": [
    "Primeira área prioritária com base nas fotos",
    "Segunda área para melhorar",
    "Terceira área de foco"
  ],
  "dicasEspecificas": [
    "Dica prática específica (ex: aumentar volume de treino de pernas em 20%)",
    "Segunda dica técnica",
    "Terceira recomendação"
  ],
  "focoPrincipal": "Foco prioritário único para as próximas 4 semanas",
  "progressoGeral": "Avaliação honesta do progresso observado (3-4 frases técnicas)",
  "recomendacoesTreino": [
    "Ajuste específico no treino com justificativa",
    "Segunda recomendação de treino"
  ],
  "recomendacoesDieta": [
    "Ajuste específico na dieta com valores (ex: aumentar proteína para 2.2g/kg)",
    "Segunda recomendação nutricional"
  ],
  "otimizacoesSugeridas": {
    "treino": {
      "mudancas": ["Mudança específica 1", "Mudança específica 2"],
      "justificativa": "Por que essas mudanças são necessárias"
    },
    "dieta": {
      "mudancas": ["Ajuste nutricional 1", "Ajuste nutricional 2"],
      "justificativa": "Razão técnica para os ajustes"
    }
  }
}`

    console.log("[v0] Calling OpenAI with", photos.length, "photos")

    const imageContent = photos.map((photo: any) => ({
      type: "image_url" as const,
      image_url: {
        url: photo.url,
        detail: "high" as const,
      },
    }))

    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...imageContent],
        },
      ],
      maxTokens: 4500,
      temperature: 0.7,
    })

    console.log("[v0] OpenAI response received, length:", text.length)
    console.log("[v0] Raw response preview:", text.substring(0, 200))

    let cleanedText = text.trim()

    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "")

    // Find JSON object boundaries
    const jsonStart = cleanedText.indexOf("{")
    const jsonEnd = cleanedText.lastIndexOf("}") + 1

    if (jsonStart === -1 || jsonEnd === 0) {
      console.error("[v0] No JSON found in response:", cleanedText)
      throw new Error(`No JSON found in AI response. Raw response: ${cleanedText}`)
    }

    cleanedText = cleanedText.substring(jsonStart, jsonEnd)

    console.log("[v0] Cleaned JSON:", cleanedText.substring(0, 200))

    let analysis
    try {
      analysis = JSON.parse(cleanedText)
      console.log("[v0] Successfully parsed analysis")
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      console.error("[v0] Attempted to parse:", cleanedText)
      throw new Error(`Failed to parse AI response: ${parseError}. Raw response: ${cleanedText}`)
    }

    const analysisData = {
      userId,
      photos: photos.map((p: any) => ({
        url: p.url,
        type: p.type,
      })),
      analysis,
      userQuizData,
      currentPlans: {
        workout: currentPlans?.workoutPlan,
        diet: {
          ...currentPlans?.dietPlan,
          realTotalCalories,
          realTotalProtein,
          realTotalCarbs,
          realTotalFats,
        },
      },
      createdAt: new Date().toISOString(),
    }

    console.log("[v0] Saving to Firebase...")

    const docRef = await adminDb.collection("progressPhotos").add(analysisData)

    console.log("[v0] Saved to Firebase with ID:", docRef.id)

    return NextResponse.json({
      success: true,
      analysis,
      documentId: docRef.id,
    })
  } catch (error: any) {
    console.error("[v0] Analysis API error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze photos",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
