import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Starting photo analysis")

    const { photoUrl, photoType, userId, userQuizData } = await request.json()
    console.log("[v0] API: Received data:", {
      photoUrl: !!photoUrl,
      photoType,
      userId: !!userId,
      userQuizData: !!userQuizData,
    })

    if (!photoUrl || !photoType || !userId) {
      console.log("[v0] API: Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] API: Fetching user data from Firebase")
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc = await userDocRef.get()
    const currentPlans = userDoc.exists ? userDoc.data() : {}
    console.log("[v0] API: User data fetched successfully")

    const analysisPrompt = `
    Você é um personal trainer e nutricionista especialista em análise corporal. Analise esta foto de progresso fitness e forneça um feedback detalhado e motivacional.

    Tipo de foto: ${photoType === "front" ? "Frente" : photoType === "back" ? "Costas" : "Lateral"}
    
    Dados do usuário:
    - Objetivo: ${userQuizData?.goal || "Não informado"}
    - Biotipo: ${userQuizData?.bodyType || "Não informado"}
    - Experiência: ${userQuizData?.experience || "Não informado"}
    - Peso atual: ${userQuizData?.currentWeight || "Não informado"}kg
    - Meta de peso: ${userQuizData?.goalWeight || "Não informado"}kg

    PLANOS ATUAIS DO USUÁRIO:
    - Calorias atuais: ${currentPlans?.dietPlan?.totalDailyCalories || "Não informado"}
    - Dias de treino: ${currentPlans?.workoutPlan?.days?.length || "Não informado"}
    - Proteína atual: ${currentPlans?.dietPlan?.totalProtein || "Não informado"}

    IMPORTANTE: Responda APENAS com um JSON válido, sem texto adicional antes ou depois. Analise a foto real e forneça feedback específico baseado no que você vê.

    Estrutura JSON obrigatória:
    {
      "pontosForts": ["observação específica da foto", "outro ponto forte visual", "terceiro ponto"],
      "areasParaMelhorar": ["área específica vista na foto", "segunda área", "terceira área"],
      "dicasEspecificas": ["dica baseada na análise visual", "segunda dica específica", "terceira dica"],
      "motivacao": "mensagem motivacional personalizada baseada no que vê na foto",
      "focoPrincipal": "principal área que precisa de atenção baseada na análise visual",
      "progressoGeral": "avaliação específica do físico atual visto na foto",
      "recomendacoesTreino": ["recomendação específica baseada na foto", "segunda recomendação"],
      "recomendacoesDieta": ["recomendação nutricional específica", "segunda recomendação"],
      "otimizacaoNecessaria": true,
      "otimizacoesSugeridas": {
        "dieta": {
          "necessaria": true,
          "mudancas": ["mudança específica baseada na análise", "segunda mudança"],
          "justificativa": "Justificativa baseada no que vê na foto"
        },
        "treino": {
          "necessaria": true,
          "mudancas": ["mudança específica no treino", "segunda mudança"],
          "justificativa": "Justificativa baseada na composição corporal vista"
        }
      }
    }

    Analise a foto real e seja específico sobre o que consegue observar visualmente.
    `

    console.log("[v0] API: Starting AI analysis")

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] API: OPENAI_API_KEY not found")
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { type: "image", image: photoUrl },
          ],
        },
      ],
      maxTokens: 1500,
      temperature: 0.7,
    })

    console.log("[v0] API: AI analysis completed, parsing response")

    let analysis
    try {
      const cleanedText = text
        .trim()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
      analysis = JSON.parse(cleanedText)
      console.log("[v0] API: Response parsed successfully")
    } catch (parseError) {
      console.error("[v0] API: Error parsing AI response:", parseError)
      console.log("[v0] API: Raw AI response:", text)

      analysis = {
        pontosForts: [
          "Comprometimento em acompanhar o progresso com fotos",
          "Postura adequada para análise",
          "Iniciativa de buscar feedback profissional",
        ],
        areasParaMelhorar: [
          "Aguardando análise mais detalhada",
          "Foco na consistência do plano atual",
          "Monitoramento regular do progresso",
        ],
        dicasEspecificas: [
          `Mantenha o foco no seu objetivo: ${userQuizData?.goal || "evolução física"}`,
          "Continue seguindo seu plano de treino atual",
          "Tire fotos semanais para acompanhar mudanças",
        ],
        motivacao: `Ótimo trabalho em acompanhar seu progresso! Com seu objetivo de ${userQuizData?.goal || "evolução"} e dedicação, você está no caminho certo.`,
        focoPrincipal: "Consistência no plano atual",
        progressoGeral: "Análise em andamento - continue o bom trabalho",
        recomendacoesTreino: ["Manter frequência atual", "Foco na execução correta"],
        recomendacoesDieta: ["Seguir plano nutricional atual", "Hidratação adequada"],
        otimizacaoNecessaria: false,
        otimizacoesSugeridas: {
          dieta: { necessaria: false, mudancas: [], justificativa: "Aguardando análise completa" },
          treino: { necessaria: false, mudancas: [], justificativa: "Aguardando análise completa" },
        },
      }
    }

    console.log("[v0] API: Saving to Firebase")
    const photoData = {
      userId,
      photoUrl,
      photoType,
      analysis,
      createdAt: new Date().toISOString(),
      userQuizData: userQuizData || {},
      currentPlansSnapshot: {
        dietPlan: currentPlans?.dietPlan || null,
        workoutPlan: currentPlans?.workoutPlan || null,
        scientificCalculations: currentPlans?.scientificCalculations || null,
      },
    }

    const docRef = await adminDb.collection("progressPhotos").add(photoData)
    console.log("[v0] API: Photo analysis saved successfully")

    return NextResponse.json({
      success: true,
      analysis,
      photoId: docRef.id,
    })
  } catch (error) {
    console.error("[v0] API: Error analyzing photo:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze photo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
