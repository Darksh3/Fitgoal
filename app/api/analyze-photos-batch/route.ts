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
    try {
      const previousAnalysisSnapshot = await adminDb
        .collection("progressHistory")
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
        console.log("[v0] API: Previous analysis found from:", previousAnalysis.date)
      } else {
        console.log("[v0] API: No previous analysis found - this is the first analysis")
      }
    } catch (error) {
      console.error("[v0] API: Error fetching previous analysis:", error)
      // Continue without previous analysis
    }

    const systemPrompt = `Você é um personal trainer e nutricionista esportivo altamente especializado. Analise as fotos de composição corporal fornecidas e forneça uma avaliação profissional DETALHADA e TÉCNICA.

${
  previousAnalysis
    ? `
IMPORTANTE: Esta NÃO é a primeira análise do cliente. Há uma análise anterior de ${previousAnalysis.date.toLocaleDateString("pt-BR")}.

ANÁLISE ANTERIOR:
${JSON.stringify(previousAnalysis.analysis, null, 2)}

FOTOS ANTERIORES: O cliente tinha ${previousAnalysis.photos?.length || 0} foto(s) na análise anterior.

VOCÊ DEVE FAZER UMA ANÁLISE COMPARATIVA DE PROGRESSO:
- Compare o desenvolvimento muscular atual vs anterior
- Identifique melhorias visíveis (ganho muscular, perda de gordura, definição, postura, etc)
- Identifique áreas que regrediram ou estagnaram
- Avalie se o progresso está adequado para o tempo decorrido (~${Math.ceil((new Date().getTime() - previousAnalysis.date.getTime()) / (1000 * 60 * 60 * 24))} dias)
- Seja específico sobre O QUE mudou e QUANTO mudou visualmente
`
    : `
IMPORTANTE: Esta é a PRIMEIRA análise do cliente. Não há dados anteriores para comparação.
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

FOTOS RECEBIDAS PARA ANÁLISE ATUAL:
${photos.map((p: any) => `- ${p.type}: disponível para análise visual`).join("\n")}

INSTRUÇÕES DE ANÁLISE:

${
  previousAnalysis
    ? `
1. ANÁLISE COMPARATIVA DE PROGRESSO (OBRIGATÓRIO):
   - Compare cada aspecto atual vs anterior
   - Quantifique mudanças visíveis (ex: "Ombros 15% mais desenvolvidos", "Definição abdominal melhorou 2 níveis")
   - Identifique o que melhorou, o que piorou, o que estagnou
   - Avalie se o ritmo de progresso está adequado
`
    : `
1. ESTABELECER LINHA DE BASE (primeira análise):
   - Documente estado atual detalhadamente
   - Estabeleça pontos de referência para futuras comparações
`
}

2. ANÁLISE POR FOTO (frente, costas, lateral):
   Para cada foto, identifique:
   - Pontos Fortes (✅): Grupos musculares desenvolvidos, simetria, postura positiva
   - Áreas para Melhorar (⚠️): Grupos atrasados, assimetrias, postura a corrigir
   - Desenvolvimento percentual estimado de cada grupo muscular visível

3. COMPOSIÇÃO CORPORAL:
   - Percentual de gordura estimado
   - Nível de massa muscular
   - Retenção de líquidos visível
   - Qualidade da pele e vascularização

4. AJUSTES DE TREINO:
   - Status: "adequado" ou "necessário"
   - Se necessário, forneça ajustes ESPECÍFICOS com exercícios, séries, repetições
   - Priorize grupos musculares que precisam mais atenção
   ${previousAnalysis ? "- Considere o progresso observado para determinar se mudanças são necessárias" : ""}

5. AJUSTES NUTRICIONAIS:
   - Status: "adequado" ou "necessário"
   - Compare dieta atual com objetivo do cliente
   - Se necessário, sugira ajustes ESPECÍFICOS (±X kcal, ±Xg proteína, etc)
   ${previousAnalysis ? "- Considere se a dieta atual está gerando os resultados esperados" : ""}

6. RESUMO EXECUTIVO:
   - Síntese profissional da avaliação
   ${previousAnalysis ? "- Destaque o progresso geral e próximos passos" : "- Estabeleça expectativas e próximos passos"}
   - Mensagem motivacional personalizada

IMPORTANTE:
- Só sugira ajustes se realmente necessário
- Se está adequado, confirme que o cliente está no caminho certo
- Seja específico, técnico e honesto
- Use linguagem profissional mas acessível
${previousAnalysis ? "- SEMPRE mencione o progresso (positivo ou negativo) em relação à análise anterior" : ""}

FORMATO DE RESPOSTA (JSON):
{
  ${
    previousAnalysis
      ? `
  "progressoComparativo": {
    "diasDesdeUltimaAnalise": número,
    "resumoProgresso": "texto descritivo geral do progresso",
    "melhorias": ["melhoria 1 com detalhes", "melhoria 2 com detalhes"],
    "retrocessos": ["retrocesso 1 se houver", "retrocesso 2 se houver"],
    "estagnacoes": ["área estagnada 1 se houver"],
    "avaliacaoRitmo": "adequado/rápido/lento",
    "observacoes": "análise detalhada da evolução"
  },
  `
      : ""
  }
  "analisePorFoto": {
    "frente": {
      "pontosFortes": ["ponto 1", "ponto 2"],
      "areasParaMelhorar": ["área 1", "área 2"],
      "desenvolvimentoMuscular": {
        "ombros": "percentual%",
        "peitorais": "percentual%",
        "bracos": "percentual%",
        "abdomen": "percentual%",
        "pernas": "percentual%"
      }
    },
    "costas": { /* mesmo formato */ },
    "lateral": { /* mesmo formato */ }
  },
  "composicaoCorporal": {
    "percentualGorduraEstimado": "X-Y%",
    "nivelMassaMuscular": "iniciante/intermediário/avançado",
    "observacoes": "detalhes adicionais"
  },
  "ajustesTreino": {
    "status": "adequado" ou "necessário",
    "sugestoes": ["sugestão específica 1 se necessário", "sugestão 2 se necessário"]
  },
  "ajustesNutricionais": {
    "status": "adequado" ou "necessário",
    "sugestoes": ["ajuste específico 1 se necessário", "ajuste 2 se necessário"]
  },
  "resumoExecutivo": "síntese profissional completa da avaliação"
}`

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

    console.log("[v0] API: Preparing to call OpenAI with", photos.length, "photos")
    console.log("[v0] API: Photo types:", photos.map((p: any) => p.photoType).join(", "))

    // Build content array with text and all images
    const content: any[] = [{ type: "text", text: systemPrompt }]
    photos.forEach((photo: any) => {
      console.log("[v0] API: Adding photo to analysis:", photo.photoType, photo.photoUrl.substring(0, 50))
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
        maxTokens: 4500,
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
