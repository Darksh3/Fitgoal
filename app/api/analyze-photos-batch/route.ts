import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Starting batch photo analysis")

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

    // Add supplement macros
    if (dietPlan?.supplements && Array.isArray(dietPlan.supplements)) {
      dietPlan.supplements.forEach((supplement: any) => {
        realTotalCalories += Number(supplement.calories) || 0
        realTotalProtein += Number(supplement.protein) || 0
        realTotalCarbs += Number(supplement.carbs) || 0
        realTotalFats += Number(supplement.fat) || 0
      })
    }

    // Add meal macros
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

    console.log("[v0] API: Fetching previous analysis for comparison")
    let previousAnalysis = null
    let previousPhotos: Array<{ photoUrl: string; photoType: string }> = []
    try {
      const previousAnalysisSnapshot = await adminDb
        .collection("progressPhotos")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()

      if (!previousAnalysisSnapshot.empty) {
        const prevDoc = previousAnalysisSnapshot.docs[0]
        const prevData = prevDoc.data()
        previousAnalysis = {
          date: prevData.createdAt?.toDate?.() || new Date(prevData.createdAt),
          analysis: prevData.analysis,
          photos: prevData.photos,
        }
        if (prevData.photos && Array.isArray(prevData.photos)) {
          previousPhotos = prevData.photos.map((p: any) => ({
            photoUrl: p.photoUrl,
            photoType: p.photoType || "unknown",
          }))
        }
        console.log("[v0] API: Previous analysis found from:", previousAnalysis.date)
        console.log("[v0] API: Previous photos found:", previousPhotos.length)
      } else {
        console.log("[v0] API: No previous analysis found - this is the first analysis")
      }
    } catch (error) {
      console.error("[v0] API: Error fetching previous analysis:", error)
      // Continue without previous analysis
    }

    const systemPrompt = `Você é um personal trainer e nutricionista esportivo altamente especializado. Analise as fotos de composição corporal fornecidas e forneça uma avaliação profissional DETALHADA e TÉCNICA.

IMPORTANTE: Seja direto e objetivo. Evite repetições e explique apenas o essencial de forma técnica e profissional.

${
  previousAnalysis
    ? `
IMPORTANTE: Esta NÃO é a primeira análise do cliente. Há uma análise anterior de ${previousAnalysis.date.toLocaleDateString("pt-BR")} (há ${Math.ceil((new Date().getTime() - previousAnalysis.date.getTime()) / (1000 * 60 * 60 * 24))} dias).

VOCÊ RECEBERÁ AS FOTOS ANTERIORES E AS FOTOS ATUAIS PARA COMPARAÇÃO VISUAL DIRETA.

FOTOS ANTERIORES (${previousPhotos.length}): Essas fotos foram tiradas na análise anterior e serão enviadas primeiro.
FOTOS ATUAIS (${photos.length}): Essas fotos foram tiradas agora e serão enviadas depois das anteriores.

ANÁLISE ANTERIOR:
${JSON.stringify(previousAnalysis.analysis, null, 2)}

VOCÊ DEVE FAZER UMA ANÁLISE COMPARATIVA VISUAL DETALHADA:
- Compare VISUALMENTE as fotos antigas vs atuais (mesmas poses)
- Identifique melhorias VISÍVEIS: ganho muscular, perda de gordura, definição, postura, vascularização
- Identifique áreas que regrediram ou estagnaram VISUALMENTE
- Avalie se o progresso VISUAL está adequado para ${Math.ceil((new Date().getTime() - previousAnalysis.date.getTime()) / (1000 * 60 * 60 * 24))} dias
- Seja ESPECÍFICO: cite grupos musculares, percentuais estimados de mudança, áreas que mudaram
- Compare postura, simetria, proporções entre as fotos
`
    : `
IMPORTANTE: Esta é a PRIMEIRA análise do cliente. Não há dados ou fotos anteriores para comparação.
Foque em estabelecer uma linha de base detalhada para futuras comparações.
`
}

DADOS DO CLIENTE:
- Objetivo: ${userQuizData?.goal || "não especificado"}
- Sexo: ${userQuizData?.gender || "não especificado"}
- Idade: ${userQuizData?.age || "não especificado"}
- Peso: ${userQuizData?.weight || "não especificado"} kg
- Altura: ${userQuizData?.height || "não especificado"} cm
- Nível de Atividade: ${userQuizData?.activityLevel || "não especificado"}
- Restrições Alimentares: ${userQuizData?.dietaryRestrictions?.join(", ") || "nenhuma"}

DIETA ATUAL REAL (calculada com suplementos):
- Calorias totais: ${Math.round(realTotalCalories)} kcal
- Proteínas: ${Math.round(realTotalProtein)}g
- Carboidratos: ${Math.round(realTotalCarbs)}g
- Gorduras: ${Math.round(realTotalFats)}g

TREINO ATUAL:
${currentPlans?.workoutPlan ? JSON.stringify(currentPlans.workoutPlan, null, 2) : "Não definido"}

${
  previousPhotos.length > 0
    ? `
ORDEM DAS FOTOS QUE VOCÊ VAI RECEBER:
1. FOTOS ANTERIORES (análise de ${previousAnalysis?.date.toLocaleDateString("pt-BR")}):
${previousPhotos.map((p: any, i: number) => `   ${i + 1}. ${p.photoType} (ANTIGA)`).join("\n")}

2. FOTOS ATUAIS (análise de hoje):
${photos.map((p: any, i: number) => `   ${i + 1}. ${p.photoType} (ATUAL)`).join("\n")}

COMPARE AS FOTOS DO MESMO TIPO (ex: frente antiga vs frente atual) VISUALMENTE.
`
    : `
FOTOS RECEBIDAS PARA ANÁLISE ATUAL:
${photos.map((p: any) => `- ${p.type}: disponível para análise visual`).join("\n")}
`
}

INSTRUÇÕES DE ANÁLISE - USE ESTE FORMATO EXATO:

RESPONDA EM JSON COM A SEGUINTE ESTRUTURA OBRIGATÓRIA:

{
  "pontosFortes": ["ponto forte 1 com detalhes", "ponto forte 2 com detalhes"],
  "pontosAMelhorar": ["área 1 com detalhes", "área 2 com detalhes"],
  "composicaoCorporal": {
    "percentualGorduraEstimado": "X-Y%",
    "massaMuscular": "iniciante/intermediário/avançado",
    "observacoes": "detalhes sobre composição"
  },
  "sobreTreino": "análise detalhada do treino atual e o que está funcionando",
  "sobreDieta": "análise detalhada da dieta atual e se está adequada para o objetivo",
  ${
    previousAnalysis
      ? `"evolucaoComparada": {
    "diasDesdeUltimaAnalise": ${Math.ceil((new Date().getTime() - previousAnalysis.date.getTime()) / (1000 * 60 * 60 * 24))},
    "resumo": "resumo VISUAL do progresso comparando as fotos antigas vs atuais",
    "melhorias": ["melhoria VISUAL específica 1 (cite grupo muscular e mudança)", "melhoria VISUAL 2"],
    "retrocessos": ["retrocesso VISUAL 1 se houver", "retrocesso VISUAL 2 se houver"],
    "estagnacoes": ["área que não mudou visualmente 1 se houver"],
    "avaliacaoRitmo": "adequado/rápido/lento com base no tempo decorrido e mudanças VISUAIS"
  },`
      : ""
  }
  "dicas": ["dica prática 1", "dica prática 2", "dica prática 3"],
  "ajustes": {
    "necessario": true/false,
    "treino": {
      "status": "adequado" ou "ajuste necessário",
      "sugestoes": ["ajuste específico 1 se necessário", "ajuste 2 se necessário"]
    },
    "dieta": {
      "status": "adequado" ou "ajuste necessário",
      "sugestoes": ["ajuste específico 1 se necessário (ex: +200 kcal, -50g carbs)", "ajuste 2 se necessário"]
    }
  },
  "conclusaoGeral": "${previousAnalysis ? `síntese profissional que DEVE incluir uma avaliação específica da EVOLUÇÃO VISUAL do cliente desde a última análise (cite mudanças VISÍVEIS específicas nas fotos, grupos musculares que progrediram VISUALMENTE, mudanças em definição/volume) e motivação personalizada baseada no progresso real observado` : `síntese profissional estabelecendo linha de base VISUAL detalhada para futuras comparações e motivação para iniciar a jornada`}"
}

IMPORTANTE:
- Seja DIRETO e OBJETIVO em todas as seções
- Liste apenas os pontos mais importantes (3-5 itens por seção)
- Use frases curtas e técnicas, evite repetições
- pontosFortes: Grupos musculares bem desenvolvidos, postura, simetria
- pontosAMelhorar: Grupos atrasados, assimetrias, áreas prioritárias
- sobreTreino: Análise concisa se está adequado para o objetivo
- sobreDieta: Avaliação direta se está gerando resultados
${previousAnalysis ? "- evolucaoComparada: COMPARE AS FOTOS VISUALMENTE - cite mudanças ESPECÍFICAS que você VÊ nas imagens" : ""}
- ajustes.necessario: true SOMENTE se realmente precisar de mudanças
- Se treino/dieta estão adequados, mantenha status "adequado" e sugestoes vazias []
${previousAnalysis ? "- Na conclusaoGeral, mencione MUDANÇAS VISUAIS ESPECÍFICAS que você observou comparando as fotos" : ""}`

    console.log("[v0] API: Starting AI analysis with multiple photos and real diet data")

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] API: OPENAI_API_KEY not found")
      return NextResponse.json(
        {
          error: "AI service not configured",
          details: "OpenAI API key is missing",
        },
        { status: 500 },
      )
    }

    console.log("[v0] API: Preparing to call OpenAI with", photos.length, "current photos")
    if (previousPhotos.length > 0) {
      console.log("[v0] API: Including", previousPhotos.length, "previous photos for comparison")
    }

    const content: any[] = [{ type: "text", text: systemPrompt }]

    // Add previous photos first (marked as OLD in the prompt)
    if (previousPhotos.length > 0) {
      console.log("[v0] API: Adding previous photos for visual comparison:")
      previousPhotos.forEach((photo: any) => {
        console.log("[v0] API:   - Previous photo:", photo.photoType, photo.photoUrl.substring(0, 50))
        content.push({ type: "image", image: photo.photoUrl })
      })
    }

    // Then add current photos
    console.log("[v0] API: Adding current photos:")
    photos.forEach((photo: any) => {
      console.log("[v0] API:   - Current photo:", photo.photoType, photo.photoUrl.substring(0, 50))
      content.push({ type: "image", image: photo.photoUrl })
    })

    let text: string
    try {
      const response = await generateText({
        model: openai("gpt-5.1"),
        messages: [
          {
            role: "user",
            content,
          },
        ],
        maxTokens: 2500,
        temperature: 0.7,
      })
      text = response.text
      console.log("[v0] API: ✅ AI call successful, response length:", text.length)
    } catch (aiError) {
      console.error("[v0] API: ❌ AI call failed:", aiError)
      return NextResponse.json(
        {
          error: "Erro na chamada da IA",
          details: aiError instanceof Error ? aiError.message : "Erro desconhecido ao chamar a IA",
          aiError: true,
        },
        { status: 500 },
      )
    }

    console.log("[v0] API: AI analysis completed, parsing response")
    console.log("[v0] API: Raw AI response preview:", text.substring(0, 200))

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
      console.error("[v0] API: ❌ OpenAI refused to analyze content due to policy violation")
      console.error("[v0] API: Refusal message:", text)
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
            `Resposta da IA: ${text}`,
          policyViolation: true,
          rawResponse: text,
        },
        { status: 400 },
      )
    }

    let analysis
    try {
      const cleanedText = text
        .trim()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/^[^{]*/, "")
        .replace(/[^}]*$/, "")

      console.log("[v0] API: Cleaned text preview:", cleanedText.substring(0, 200))
      analysis = JSON.parse(cleanedText)
      console.log("[v0] API: ✅ Response parsed successfully")
      console.log("[v0] API: Analysis keys:", Object.keys(analysis))
    } catch (parseError) {
      console.error("[v0] API: ❌ Error parsing AI response:", parseError)
      console.log("[v0] API: Full raw AI response:", text)

      return NextResponse.json(
        {
          error: "Erro ao processar resposta da IA",
          details:
            "A IA retornou uma resposta que não pôde ser processada corretamente.\n\n" +
            `Erro: ${parseError instanceof Error ? parseError.message : "Erro desconhecido"}\n\n` +
            `Resposta completa da IA:\n${text}`,
          parseError: true,
          rawResponse: text,
        },
        { status: 500 },
      )
    }

    console.log("[v0] API: ✅ Analysis valid, saving to Firebase")

    console.log("[v0] API: Saving to Firebase")

    const batchPhotoData = {
      userId,
      photos: photos.map((photo: any) => ({
        photoUrl: photo.photoUrl,
        photoType: photo.photoType,
      })),
      analysis,
      createdAt: FieldValue.serverTimestamp(),
      userQuizData: userQuizData || {},
      batchAnalysis: true,
      batchPhotoCount: photos.length,
      currentPlansSnapshot: {
        dietPlan: currentPlans?.dietPlan || null,
        workoutPlan: currentPlans?.workoutPlan || null,
        scientificCalculations: currentPlans?.scientificCalculations || null,
        realDietTotals: {
          calories: Math.round(realTotalCalories),
          protein: Math.round(realTotalProtein),
          carbs: Math.round(realTotalCarbs),
          fats: Math.round(realTotalFats),
          proteinPerKg: ((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2),
        },
      },
      previousAnalysis,
    }

    const docRef = await adminDb.collection("progressPhotos").add(batchPhotoData)
    console.log("[v0] API: Batch analysis saved with ID:", docRef.id)

    console.log("[v0] API: Batch photo analysis completed and saved successfully")

    return NextResponse.json({
      success: true,
      analysis,
      photoId: docRef.id,
      realDietTotals: {
        calories: Math.round(realTotalCalories),
        protein: Math.round(realTotalProtein),
        carbs: Math.round(realTotalCarbs),
        fats: Math.round(realTotalFats),
      },
      previousAnalysis,
    })
  } catch (error) {
    console.error("[v0] API: ❌ Unexpected error analyzing photos:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze photos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
