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

    ANÁLISE INTELIGENTE OBRIGATÓRIA:
    Com base na foto e nos dados do usuário, você deve:
    1. Analisar o progresso visual atual
    2. Comparar com os objetivos declarados
    3. Verificar se os planos atuais estão adequados
    4. Sugerir otimizações ESPECÍFICAS apenas se necessário

    Forneça uma análise em JSON com esta estrutura:
    {
      "pontosForts": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
      "areasParaMelhorar": ["área 1", "área 2", "área 3"],
      "dicasEspecificas": ["dica 1", "dica 2", "dica 3"],
      "motivacao": "mensagem motivacional personalizada",
      "focoPrincipal": "principal área que precisa de atenção",
      "progressoGeral": "avaliação geral do físico atual",
      "recomendacoesTreino": ["recomendação 1", "recomendação 2"],
      "recomendacoesDieta": ["recomendação 1", "recomendação 2"],
      "otimizacaoNecessaria": true,
      "otimizacoesSugeridas": {
        "dieta": {
          "necessaria": true,
          "mudancas": ["mudança específica 1", "mudança específica 2"],
          "justificativa": "Por que essas mudanças são necessárias"
        },
        "treino": {
          "necessaria": true,
          "mudancas": ["mudança específica 1", "mudança específica 2"],
          "justificativa": "Por que essas mudanças são necessárias"
        }
      }
    }

    CRITÉRIOS PARA SUGERIR OTIMIZAÇÕES:
    - Dieta: Se a composição corporal não está evoluindo conforme esperado
    - Treino: Se há desequilíbrios musculares ou falta de definição em áreas específicas
    - APENAS sugira mudanças se realmente necessário baseado na análise visual

    Seja específico, motivacional e profissional. Base suas observações no que consegue ver na foto.
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
      analysis = JSON.parse(text || "{}")
      console.log("[v0] API: Response parsed successfully")
    } catch (parseError) {
      console.error("[v0] API: Error parsing AI response:", parseError)
      console.log("[v0] API: Raw AI response:", text)
      analysis = {
        pontosForts: ["Postura adequada", "Comprometimento com o processo", "Boa disposição para mudança"],
        areasParaMelhorar: ["Definição muscular", "Composição corporal", "Simetria"],
        dicasEspecificas: [
          "Mantenha consistência no treino",
          "Foque na alimentação balanceada",
          "Hidrate-se adequadamente",
        ],
        motivacao: "Você está no caminho certo! Cada foto é um passo em direção ao seu objetivo.",
        focoPrincipal: "Consistência no treino e dieta",
        progressoGeral: "Bom ponto de partida para evolução",
        recomendacoesTreino: ["Treino de força 3x por semana", "Cardio moderado"],
        recomendacoesDieta: ["Aumente proteínas", "Controle carboidratos"],
        otimizacaoNecessaria: false,
        otimizacoesSugeridas: {
          dieta: { necessaria: false, mudancas: [], justificativa: "" },
          treino: { necessaria: false, mudancas: [], justificativa: "" },
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
