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
Você é um personal trainer e nutricionista especializado. Analise as fotos do usuário (${photoDescriptions}) e forneça um feedback detalhado e profissional.

**DADOS DO USUÁRIO:**
- Objetivo: ${userQuizData?.goal || "Não informado"}
- Peso atual: ${userQuizData?.currentWeight || "Não informado"} kg
- Altura: ${userQuizData?.height || "Não informado"} cm
- Idade: ${userQuizData?.age || "Não informado"} anos
- Sexo: ${userQuizData?.gender || "Não informado"}
- Nível de atividade: ${userQuizData?.activityLevel || "Não informado"}

**PLANO ALIMENTAR REAL DO USUÁRIO (valores reais consumidos):**
- Calorias totais diárias: ${Math.round(realTotalCalories)} kcal
- Proteínas: ${Math.round(realTotalProtein)}g (${((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2)}g/kg)
- Carboidratos: ${Math.round(realTotalCarbs)}g
- Gorduras: ${Math.round(realTotalFats)}g

Forneça sua análise NO SEGUINTE FORMATO JSON (sem markdown, sem explicações extras, APENAS o JSON):

{
  "composicaoCorporal": {
    "percentualGorduraEstimado": "Estimativa visual do % de gordura corporal (ex: 18-22%)",
    "massaMuscularVisivel": "Avaliação da massa muscular visível (baixa/moderada/boa/excelente)",
    "observacoes": "Observações sobre estrutura corporal, simetria, proporções"
  },
  "avaliacaoPostural": {
    "postura": "Análise da postura nas fotos",
    "pontosMelhoria": ["Lista de pontos posturais a melhorar"]
  },
  "gruposMusculares": {
    "maisDesenvolvidaos": ["Grupos musculares que parecem mais desenvolvidos"],
    "precisamAtencao": ["Grupos que precisam de mais trabalho"]
  },
  "feedbackTreino": {
    "focoSugerido": "Com base no objetivo (${userQuizData?.goal}), qual deve ser o foco do treino",
    "sugestoesTreino": ["Sugestões específicas de tipos de exercícios ou splits"],
    "frequenciaSugerida": "Quantos dias por semana treinar e como dividir"
  },
  "feedbackNutricional": {
    "avaliacaoDieta": "Análise se as ${Math.round(realTotalCalories)} kcal e ${Math.round(realTotalProtein)}g de proteína estão adequadas para o objetivo",
    "ajustesSugeridos": ["Sugestões específicas de ajuste baseadas na DIETA REAL do usuário"],
    "hidratacao": "Recomendações de hidratação"
  },
  "progressoObservacoes": {
    "pontosPositivos": ["Pontos positivos visíveis nas fotos"],
    "areasDesenvolver": ["Áreas que precisam de desenvolvimento"],
    "motivacao": "Mensagem motivacional personalizada"
  },
  "resumoExecutivo": "Um resumo em 2-3 frases do estado atual e próximos passos recomendados"
}

IMPORTANTE: 
- Base suas recomendações nutricionais nos valores REAIS fornecidos (${Math.round(realTotalCalories)} kcal, ${Math.round(realTotalProtein)}g proteína)
- Considere o objetivo específico: ${userQuizData?.goal}
- Seja honesto mas encorajador
- Retorne APENAS o JSON, sem markdown nem texto adicional
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
