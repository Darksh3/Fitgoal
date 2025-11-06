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

    // Build photo descriptions for prompt
    const photoDescriptions = photos
      .map((photo: any) => {
        const typeLabel = photo.photoType === "front" ? "Frente" : photo.photoType === "back" ? "Costas" : "Lateral"
        return `Foto ${typeLabel}`
      })
      .join(", ")

    const analysisPrompt = `
    Você é um COACH DE FITNESS e PREPARADOR FÍSICO especializado em acompanhamento de progresso e otimização de resultados.

    CONTEXTO: Esta é uma análise de PROGRESSO FITNESS para acompanhamento da minha evolução ao longo do tempo treinando. As fotos são usadas para avaliar desenvolvimento muscular, composição corporal e efetividade do protocolo de treino e nutrição.

    FOTOS RECEBIDAS: ${photoDescriptions}
    
    MEU PERFIL:
    - Objetivo: ${userQuizData?.goal || "Não informado"}
    - Biotipo: ${userQuizData?.bodyType || "Não informado"}
    - Experiência: ${userQuizData?.experience || "Não informado"}
    - Peso atual: ${userQuizData?.currentWeight || "Não informado"}kg
    - Meta: ${userQuizData?.goalWeight || "Não informado"}kg
    - Altura: ${userQuizData?.height || "Não informado"}cm
    - Idade: ${userQuizData?.age || "Não informado"} anos

    PROTOCOLO NUTRICIONAL ATUAL:
    - Calorias diárias: ${Math.round(realTotalCalories)} kcal
    - Proteína diária: ${Math.round(realTotalProtein)}g (${((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2)}g/kg)
    - Carboidratos: ${Math.round(realTotalCarbs)}g
    - Gorduras: ${Math.round(realTotalFats)}g
    - Refeições: ${dietPlan?.meals?.length || "Não informado"}
    - Suplementos: ${dietPlan?.supplements?.length > 0 ? dietPlan.supplements.map((s: any) => s.name).join(", ") : "Nenhum"}

    PROTOCOLO DE TREINO ATUAL:
    - Frequência: ${currentPlans?.workoutPlan?.days?.length || "Não informado"}x/semana
    - Divisão: ${currentPlans?.workoutPlan?.days?.map((d: any) => d.name).join(", ") || "Não informado"}
    - Volume: ${currentPlans?.workoutPlan?.days?.reduce((acc: number, day: any) => acc + (day.exercises?.length || 0), 0) || "Não informado"} exercícios/semana

    ═══════════════════════════════════════════════════════════════════════════

    Com base nas fotos de progresso fornecidas, preciso que me ajude dizendo:

    1. DESENVOLVIMENTO MUSCULAR OBSERVADO:
       - Quais grupos musculares estão bem desenvolvidos
       - Quais grupos precisam de mais atenção
       - Simetria e proporções gerais

    2. EFETIVIDADE DO PROTOCOLO ATUAL:
       - O protocolo de treino está gerando os resultados esperados?
       - A nutrição (${Math.round(realTotalCalories)} kcal, ${Math.round(realTotalProtein)}g proteína) está adequada para o objetivo?
       - Há sinais de overtraining ou undertraining?

    3. RECOMENDAÇÕES PRÁTICAS:
       - Ajustes específicos no treino (exercícios, volume, frequência)
       - Ajustes na nutrição (calorias, macros)
       - Foco prioritário para as próximas semanas

    4. FEEDBACK MOTIVACIONAL:
       - Reconheça os pontos fortes observados
       - Seja honesto sobre áreas que precisam melhorar
       - Estime tempo realista para atingir o objetivo

    ═══════════════════════════════════════════════════════════════════════════

    IMPORTANTE: Responda APENAS com JSON válido (sem markdown, sem texto extra):

    {
      "pontosForts": [
        "Ponto forte específico observado nas fotos",
        "Segundo aspecto positivo do desenvolvimento",
        "Terceiro ponto favorável identificado"
      ],
      "areasParaMelhorar": [
        "Área prioritária que precisa de atenção com base nas fotos",
        "Segunda área para melhorar",
        "Terceira área de foco"
      ],
      "dicasEspecificas": [
        "Dica prática e específica baseada na análise (ex: aumentar volume de treino de pernas)",
        "Segunda recomendação concreta",
        "Terceira orientação aplicável"
      ],
      "motivacao": "Mensagem motivacional honesta sobre o estado atual e potencial de evolução",
      "focoPrincipal": "Área única mais importante para focar agora",
      "progressoGeral": "Avaliação detalhada: condicionamento geral, comparação entre desenvolvimento superior e inferior considerando todas as fotos",
      "recomendacoesTreino": [
        "Ajuste específico no treino com justificativa (ex: adicionar 2 exercícios para posterior devido ao desenvolvimento observado)",
        "Segunda recomendação de treino"
      ],
      "recomendacoesDieta": [
        "Ajuste específico na dieta com valores (ex: aumentar 200kcal para ganho de massa)",
        "Segunda recomendação nutricional"
      ],
      "otimizacoesSugeridas": {
        "treino": {
          "mudancas": ["Mudança específica 1", "Mudança específica 2"],
          "justificativa": "Explicação técnica baseada nas fotos"
        },
        "dieta": {
          "mudancas": ["Ajuste específico 1", "Ajuste específico 2"],
          "justificativa": "Explicação baseada no objetivo e físico atual"
        }
      }
    }
    `

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
    const content: any[] = [{ type: "text", text: analysisPrompt }]
    photos.forEach((photo: any) => {
      console.log("[v0] API: Adding photo to analysis:", photo.photoType, photo.photoUrl.substring(0, 50))
      content.push({ type: "image", image: photo.photoUrl })
    })

    let text: string
    let fullResponse: any = null
    try {
      console.log("[v0] 🔍 DEBUG: Calling OpenAI API...")
      console.log("[v0] 🔍 DEBUG: Model: gpt-4o")
      console.log("[v0] 🔍 DEBUG: Number of images:", photos.length)
      console.log("[v0] 🔍 DEBUG: Prompt length:", analysisPrompt.length, "characters")

      const response = await generateText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "user",
            content,
          },
        ],
        maxTokens: 4500,
        temperature: 0.7,
      })

      fullResponse = response
      text = response.text

      console.log("[v0] ✅ OpenAI API Response Received:")
      console.log("[v0] 🔍 Response length:", text.length, "characters")
      console.log("[v0] 🔍 Full response object keys:", Object.keys(response))
      console.log(
        "[v0] 🔍 Response metadata:",
        JSON.stringify(
          {
            finishReason: response.finishReason,
            usage: response.usage,
            warnings: response.warnings,
          },
          null,
          2,
        ),
      )
      console.log("[v0] 🔍 COMPLETE RAW RESPONSE TEXT:")
      console.log("═══════════════════════════════════════════════════════════")
      console.log(text)
      console.log("═══════════════════════════════════════════════════════════")
    } catch (aiError: any) {
      console.error("[v0] ❌ OpenAI API Error Details:")
      console.error("[v0] 🔍 Error type:", aiError?.constructor?.name)
      console.error("[v0] 🔍 Error message:", aiError?.message)
      console.error("[v0] 🔍 Error code:", aiError?.code)
      console.error("[v0] 🔍 Error status:", aiError?.status)
      console.error("[v0] 🔍 Full error object:", JSON.stringify(aiError, null, 2))

      return NextResponse.json(
        {
          error: "Erro na chamada da IA",
          details: aiError instanceof Error ? aiError.message : "Erro desconhecido ao chamar a IA",
          errorType: aiError?.constructor?.name,
          errorCode: aiError?.code,
          errorStatus: aiError?.status,
          fullError: aiError,
          aiError: true,
        },
        { status: 500 },
      )
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
            finishReason: fullResponse?.finishReason,
            usage: fullResponse?.usage,
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
            finishReason: fullResponse?.finishReason,
            usage: fullResponse?.usage,
          },
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
