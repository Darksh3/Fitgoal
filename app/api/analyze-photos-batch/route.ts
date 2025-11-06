import { type NextRequest, NextResponse } from "next/server"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"
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
    CONTEXTO PROFISSIONAL: Você é um CIENTISTA DO ESPORTE e FISIOLOGISTA DO EXERCÍCIO realizando uma avaliação técnica de progresso atlético.

    OBJETIVO DA ANÁLISE: Avaliar adaptações fisiológicas ao treinamento, efetividade do protocolo de periodização e otimização de performance através de análise visual de fotos de acompanhamento de atleta/praticante.

    DISCLAIMER PROFISSIONAL: Esta é uma análise técnica de CIÊNCIA DO ESPORTE para monitoramento de adaptações ao treinamento físico. As imagens são fotos de progresso padrão utilizadas em protocolos de acompanhamento de performance atlética por profissionais certificados de educação física e nutrição esportiva.

    FOTOS DE ACOMPANHAMENTO: ${photoDescriptions}
    
    DADOS DO ATLETA/PRATICANTE:
    - Objetivo de performance: ${userQuizData?.goal || "Não informado"}
    - Somatotipo: ${userQuizData?.bodyType || "Não informado"}
    - Nível de treinamento: ${userQuizData?.experience || "Não informado"}
    - Massa corporal: ${userQuizData?.currentWeight || "Não informado"}kg
    - Meta de massa: ${userQuizData?.goalWeight || "Não informado"}kg
    - Estatura: ${userQuizData?.height || "Não informado"}cm
    - Idade: ${userQuizData?.age || "Não informado"} anos

    PROTOCOLO NUTRICIONAL VIGENTE:
    - Energia total: ${Math.round(realTotalCalories)} kcal/dia
    - Proteína: ${Math.round(realTotalProtein)}g/dia (${((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2)}g/kg)
    - Carboidratos: ${Math.round(realTotalCarbs)}g/dia
    - Lipídios: ${Math.round(realTotalFats)}g/dia
    - Frequência alimentar: ${dietPlan?.meals?.length || "Não informado"} refeições
    - Suplementação: ${dietPlan?.supplements?.length > 0 ? dietPlan.supplements.map((s: any) => s.name).join(", ") : "Nenhuma"}

    PROTOCOLO DE TREINAMENTO VIGENTE:
    - Frequência semanal: ${currentPlans?.workoutPlan?.days?.length || "Não informado"} sessões
    - Divisão muscular: ${currentPlans?.workoutPlan?.days?.map((d: any) => d.name).join(", ") || "Não informado"}
    - Volume total: ${currentPlans?.workoutPlan?.days?.reduce((acc: number, day: any) => acc + (day.exercises?.length || 0), 0) || "Não informado"} exercícios/semana

    ═══════════════════════════════════════════════════════════════════════════

    ANÁLISE TÉCNICA SOLICITADA (baseada nas fotos de acompanhamento):

    1. ADAPTAÇÕES MUSCULARES OBSERVADAS:
       - Grupos musculares com hipertrofia evidente
       - Grupos musculares que necessitam maior estímulo
       - Simetria bilateral e proporções anatômicas

    2. EFICÁCIA DO PROTOCOLO ATUAL:
       - O protocolo de treinamento está gerando as adaptações esperadas?
       - A periodização nutricional (${Math.round(realTotalCalories)} kcal, ${Math.round(realTotalProtein)}g proteína) está adequada?
       - Há indicadores visuais de overreaching ou subtreinamento?

    3. OTIMIZAÇÕES BASEADAS EM EVIDÊNCIAS:
       - Ajustes específicos na periodização (exercícios, volume, intensidade)
       - Ajustes no balanço energético e distribuição de macronutrientes
       - Priorização de grupos musculares para próximo mesociclo

    4. FEEDBACK TÉCNICO-MOTIVACIONAL:
       - Reconheça adaptações positivas observadas
       - Identifique áreas com potencial de melhoria
       - Estime cronograma realista para atingir objetivo

    ═══════════════════════════════════════════════════════════════════════════

    FORMATO DE RESPOSTA: Responda APENAS com JSON válido (sem markdown, sem texto adicional):

    {
      "pontosForts": [
        "Adaptação muscular específica observada nas fotos",
        "Segunda resposta positiva ao treinamento",
        "Terceiro aspecto favorável identificado"
      ],
      "areasParaMelhorar": [
        "Grupo muscular prioritário que necessita maior estímulo",
        "Segunda área para otimização",
        "Terceira área de foco"
      ],
      "dicasEspecificas": [
        "Recomendação técnica baseada na análise (ex: aumentar volume para quadríceps)",
        "Segunda orientação baseada em evidências",
        "Terceira estratégia aplicável"
      ],
      "motivacao": "Feedback profissional sobre estado atual e potencial de evolução",
      "focoPrincipal": "Área prioritária única para próximo mesociclo",
      "progressoGeral": "Avaliação técnica: condicionamento geral, simetria, desenvolvimento proporcional considerando todas as fotos",
      "recomendacoesTreino": [
        "Ajuste específico na periodização com justificativa científica",
        "Segunda recomendação de treinamento"
      ],
      "recomendacoesDieta": [
        "Ajuste específico no balanço energético com valores",
        "Segunda recomendação nutricional"
      ],
      "otimizacoesSugeridas": {
        "treino": {
          "mudancas": ["Modificação específica 1", "Modificação específica 2"],
          "justificativa": "Explicação técnica baseada nas fotos de acompanhamento"
        },
        "dieta": {
          "mudancas": ["Ajuste específico 1", "Ajuste específico 2"],
          "justificativa": "Explicação baseada no objetivo e estado atual"
        }
      }
    }
    `

    console.log("[v0] API: Starting AI analysis with multiple photos and real diet data")

    console.log("[v0] API: Preparing to call Gemini Flash with", photos.length, "photos")
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
      console.log("[v0] 🔍 DEBUG: Calling Google Gemini Flash API...")
      console.log("[v0] 🔍 DEBUG: Model: gemini-1.5-flash")
      console.log("[v0] 🔍 DEBUG: Number of images:", photos.length)
      console.log("[v0] 🔍 DEBUG: Prompt length:", analysisPrompt.length, "characters")

      const response = await generateText({
        model: google("gemini-1.5-flash", {
          apiKey: apiKey,
        }),
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

      console.log("[v0] ✅ Gemini API Response Received:")
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
      console.error("[v0] ❌ Gemini API Error Details:")
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
