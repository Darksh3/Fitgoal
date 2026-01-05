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
    Você é um PERSONAL TRAINER e NUTRICIONISTA ESPORTIVO certificado com 15 anos de experiência em análise de composição corporal e transformação física.

    Tipo de foto: ${photoType === "front" ? "Frente" : photoType === "back" ? "Costas" : "Lateral"}
    
    DADOS DO CLIENTE:
    - Objetivo: ${userQuizData?.goal || "Não informado"}
    - Biotipo: ${userQuizData?.bodyType || "Não informado"}
    - Experiência: ${userQuizData?.experience || "Não informado"}
    - Peso atual: ${userQuizData?.currentWeight || "Não informado"}kg
    - Meta de peso: ${userQuizData?.goalWeight || "Não informado"}kg

    PROTOCOLO ATUAL:
    - Calorias diárias: ${currentPlans?.dietPlan?.totalDailyCalories || "Não informado"} kcal
    - Proteína diária: ${currentPlans?.dietPlan?.totalProtein || "Não informado"}g
    - Frequência de treino: ${currentPlans?.workoutPlan?.days?.length || "Não informado"}x/semana

    INSTRUÇÕES PARA ANÁLISE PROFISSIONAL:

    1. Analise a composição corporal REAL visível na foto com olhar técnico
    2. Identifique percentual de gordura estimado, desenvolvimento muscular por grupo, simetria e proporções
    3. Seja CRÍTICO e HONESTO - aponte o que precisa melhorar sem rodeios
    4. Use terminologia técnica quando apropriado (hipertrofia, déficit calórico, superávit, periodização, etc)
    5. Compare o físico atual com o objetivo declarado e avalie a distância
    6. Avalie se o protocolo atual (calorias/proteína/treino) está adequado para o físico observado
    7. Se necessário, sugira ajustes ESPECÍFICOS e QUANTIFICADOS (ex: "aumentar 200kcal", "adicionar 30g proteína", "incluir 2x treino de pernas")

    IMPORTANTE: Responda APENAS com JSON válido. Seja direto, técnico e profissional.

    {
      "pontosForts": ["observação técnica específica do físico", "segundo ponto forte observado", "terceiro aspecto positivo"],
      "areasParaMelhorar": ["área crítica que precisa atenção URGENTE", "segunda área deficiente", "terceira área para desenvolvimento"],
      "dicasEspecificas": ["ação concreta e mensurável", "segunda ação específica", "terceira recomendação prática"],
      "motivacao": "feedback profissional direto sobre o estado atual e potencial de evolução",
      "focoPrincipal": "área prioritária que terá maior impacto nos resultados",
      "progressoGeral": "avaliação técnica do percentual de gordura estimado, massa muscular e condicionamento geral",
      "recomendacoesTreino": ["ajuste específico no treino com justificativa", "segunda recomendação técnica"],
      "recomendacoesDieta": ["ajuste nutricional quantificado", "segunda recomendação dietética"],
      "otimizacaoNecessaria": true ou false,
      "otimizacoesSugeridas": {
        "dieta": {
          "necessaria": true ou false,
          "mudancas": ["mudança ESPECÍFICA e QUANTIFICADA (ex: aumentar 200kcal)", "segunda mudança concreta"],
          "justificativa": "Justificativa técnica baseada na composição corporal observada e objetivo"
        },
        "treino": {
          "necessaria": true ou false,
          "mudancas": ["mudança ESPECÍFICA no protocolo de treino", "segunda alteração concreta"],
          "justificativa": "Justificativa técnica baseada no desenvolvimento muscular observado"
        }
      }
    }

    Seja CRÍTICO, TÉCNICO e DIRETO. Não use linguagem motivacional genérica. Foque em dados observáveis e ações concretas.
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
