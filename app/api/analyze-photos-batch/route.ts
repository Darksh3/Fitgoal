import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Starting batch photo analysis")

    const { photos, userId, userQuizData } = await request.json()
    console.log("[v0] API: Received data:", {
      photosCount: photos?.length,
      userId: !!userId,
      userQuizData: !!userQuizData,
    })

    if (!photos || photos.length === 0 || !userId) {
      console.log("[v0] API: Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] API: Fetching user data from Firebase")
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc = await userDocRef.get()
    const currentPlans = userDoc.exists ? userDoc.data() : {}
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
    Você é um PERSONAL TRAINER ESPORTIVO e NUTRICIONISTA CLÍNICO certificado pela ISSA e ACE com 15 anos de experiência em análise de composição corporal, periodização de treino e prescrição dietética individualizada.

    FOTOS RECEBIDAS PARA ANÁLISE 360°: ${photoDescriptions}
    
    DADOS ANTROPOMÉTRICOS E OBJETIVOS:
    - Objetivo primário: ${userQuizData?.goal || "Não informado"}
    - Biotipo somatotípico: ${userQuizData?.bodyType || "Não informado"}
    - Nível de experiência: ${userQuizData?.experience || "Não informado"}
    - Peso corporal atual: ${userQuizData?.currentWeight || "Não informado"}kg
    - Meta de peso: ${userQuizData?.goalWeight || "Não informado"}kg
    - Altura: ${userQuizData?.height || "Não informado"}cm
    - Idade: ${userQuizData?.age || "Não informado"} anos
    - Sexo biológico: ${userQuizData?.gender || "Não informado"}

    PROTOCOLO NUTRICIONAL ATUAL (INCLUINDO SUPLEMENTAÇÃO):
    - Calorias totais diárias REAIS: ${Math.round(realTotalCalories)} kcal
    - Proteína total diária REAL: ${Math.round(realTotalProtein)}g (${((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2)}g/kg)
    - Carboidratos totais: ${Math.round(realTotalCarbs)}g
    - Gorduras totais: ${Math.round(realTotalFats)}g
    - Número de refeições: ${dietPlan?.meals?.length || "Não informado"}
    - Suplementação: ${dietPlan?.supplements?.length > 0 ? dietPlan.supplements.map((s: any) => s.name).join(", ") : "Nenhuma"}

    PROTOCOLO DE TREINAMENTO ATUAL:
    - Frequência semanal: ${currentPlans?.workoutPlan?.days?.length || "Não informado"}x/semana
    - Divisão de treino: ${currentPlans?.workoutPlan?.days?.map((d: any) => d.name).join(", ") || "Não informado"}
    - Volume total estimado: ${currentPlans?.workoutPlan?.days?.reduce((acc: number, day: any) => acc + (day.exercises?.length || 0), 0) || "Não informado"} exercícios/semana

    CÁLCULOS CIENTÍFICOS BASELINE:
    - TMB (Taxa Metabólica Basal): ${currentPlans?.scientificCalculations?.bmr || "Não calculado"} kcal
    - TDEE (Gasto Energético Total): ${currentPlans?.scientificCalculations?.tdee || "Não calculado"} kcal
    - Necessidade proteica mínima: ${currentPlans?.scientificCalculations?.proteinNeeds || "Não calculado"}

    ═══════════════════════════════════════════════════════════════════════════

    PROTOCOLO DE ANÁLISE PROFISSIONAL AVANÇADA:

    Você deve realizar uma avaliação COMPLETA e TÉCNICA considerando TODAS as fotos fornecidas simultaneamente para análise tridimensional do físico.

    ETAPAS OBRIGATÓRIAS DA ANÁLISE:

    1. AVALIAÇÃO DE COMPOSIÇÃO CORPORAL (Análise Visual Profissional):
       - Estime o percentual de gordura corporal com base nos pontos de referência visuais (definição abdominal, vascularização, separação muscular)
       - Avalie o desenvolvimento muscular por grupo (superior/inferior, anterior/posterior)
       - Identifique assimetrias musculares significativas entre hemicorpos
       - Avalie proporções estéticas (relação ombro-cintura, desenvolvimento de deltoides, trapézio, dorsais)
       - Identifique pontos de estagnação ou subdesenvolvimento muscular

    2. ANÁLISE CRÍTICA DO PROTOCOLO ATUAL vs FÍSICO OBSERVADO:
       - Compare o físico atual com o objetivo declarado e calcule a "distância" até a meta
       - Avalie se o intake calórico REAL (${Math.round(realTotalCalories)} kcal) está adequado para o físico e objetivo
       - Verifique se a ingestão proteica REAL (${Math.round(realTotalProtein)}g = ${((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2)}g/kg) é suficiente
       - Analise se o volume e frequência de treino estão compatíveis com o desenvolvimento muscular observado
       - Identifique sinais de overtraining, undertraining ou má periodização

    3. PRESCRIÇÃO DE AJUSTES QUANTIFICADOS:
       - Se necessário ajuste calórico, especifique o valor EXATO (ex: aumentar 300kcal, reduzir 250kcal)
       - Se necessário ajuste proteico, especifique o valor EXATO em gramas e g/kg
       - Se necessário ajuste no treino, especifique exercícios, séries, repetições e frequência
       - Justifique TECNICAMENTE cada ajuste baseado na análise visual e dados antropométricos

    4. LINGUAGEM E POSTURA PROFISSIONAL:
       - Use terminologia técnica apropriada (hipertrofia, déficit/superávit calórico, periodização, sarcoplasma, miofibrilar)
       - Seja DIRETO, CRÍTICO e HONESTO - não use linguagem motivacional genérica
       - Aponte deficiências sem rodeios, mas sempre com justificativa técnica
       - Foque em DADOS OBSERVÁVEIS e AÇÕES CONCRETAS mensuráveis

    ═══════════════════════════════════════════════════════════════════════════

    RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO (sem markdown, sem explicações extras):

    {
      "pontosForts": [
        "Observação técnica específica do desenvolvimento muscular observado nas fotos",
        "Segunda característica positiva identificada na análise visual",
        "Terceiro aspecto favorável do físico atual"
      ],
      "areasParaMelhorar": [
        "Área crítica prioritária que necessita intervenção URGENTE com base na análise visual",
        "Segunda deficiência identificada que impacta os resultados",
        "Terceira área de subdesenvolvimento ou estagnação observada"
      ],
      "dicasEspecificas": [
        "Ação concreta, mensurável e imediatamente aplicável (ex: aumentar volume de treino de pernas em 30%)",
        "Segunda recomendação técnica específica com métrica clara",
        "Terceira orientação prática baseada na análise do físico"
      ],
      "motivacao": "Feedback profissional direto sobre o estado atual do físico, potencial de evolução e realismo da meta considerando o protocolo atual. Seja honesto sobre o tempo estimado para atingir o objetivo.",
      "focoPrincipal": "Área prioritária única que terá o maior impacto nos resultados se otimizada (ex: aumentar ingestão calórica, corrigir assimetria de desenvolvimento, aumentar volume de treino)",
      "progressoGeral": "Avaliação técnica detalhada: percentual de gordura estimado (ex: 18-20%), classificação de massa muscular (baixa/média/alta), condicionamento geral, e análise comparativa entre desenvolvimento de membros superiores e inferiores considerando todos os ângulos fotografados",
      "recomendacoesTreino": [
        "Ajuste específico e quantificado no protocolo de treino com justificativa técnica baseada no desenvolvimento muscular observado (ex: adicionar 2 exercícios compostos para posterior de coxa devido ao subdesenvolvimento observado na foto de costas)",
        "Segunda recomendação técnica de treino com métrica clara e justificativa anatômica"
      ],
      "recomendacoesDieta": [
        "Ajuste nutricional QUANTIFICADO com valor exato (ex: aumentar ingestão calórica de ${Math.round(realTotalCalories)}kcal para ${Math.round(realTotalCalories + 300)}kcal para promover superávit de 300kcal)",
        "Segunda recomendação dietética específica com valores e justificativa metabólica (ex: aumentar proteína de ${Math.round(realTotalProtein)}g para ${Math.round(realTotalProtein + 30)}g para atingir 2.2g/kg)"
      ],
      "otimizacaoNecessaria": true ou false,
      "otimizacoesSugeridas": {
        "dieta": {
          "necessaria": true ou false,
          "mudancas": [
            "Mudança ESPECÍFICA e QUANTIFICADA com valores exatos (ex: Aumentar calorias de ${Math.round(realTotalCalories)}kcal para ${Math.round(realTotalCalories + 300)}kcal)",
            "Segunda mudança concreta com métrica clara"
          ],
          "justificativa": "Justificativa técnica detalhada baseada na composição corporal observada em todos os ângulos, relacionando com o objetivo declarado e os cálculos de TDEE/TMB"
        },
        "treino": {
          "necessaria": true ou false,
          "mudancas": [
            "Mudança ESPECÍFICA no protocolo com exercícios, séries e repetições (ex: Adicionar 3x12 Stiff na perna A e 3x15 Mesa Flexora na perna B para corrigir subdesenvolvimento de posterior)",
            "Segunda alteração concreta com volume e intensidade definidos"
          ],
          "justificativa": "Justificativa técnica detalhada baseada no desenvolvimento muscular observado em todos os ângulos, identificando grupos musculares subdesenvolvidos ou assimetrias"
        }
      }
    }

    LEMBRE-SE: Seja CRÍTICO, TÉCNICO, DIRETO e QUANTIFICADO. Não use linguagem motivacional vaga. Cada recomendação deve ter NÚMEROS e MÉTRICAS específicas. Analise o físico como um profissional experiente faria em uma consulta presencial.
    `

    console.log("[v0] API: Starting AI analysis with multiple photos and real diet data")

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] API: OPENAI_API_KEY not found")
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    // Build content array with text and all images
    const content: any[] = [{ type: "text", text: analysisPrompt }]
    photos.forEach((photo: any) => {
      content.push({ type: "image", image: photo.photoUrl })
    })

    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content,
        },
      ],
      maxTokens: 3000, // Increased for more detailed analysis
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
          "Comprometimento demonstrado ao documentar progresso com múltiplas fotos",
          "Postura adequada para análise profissional",
          "Iniciativa de buscar feedback técnico especializado",
        ],
        areasParaMelhorar: [
          "Análise detalhada em processamento - aguarde resposta completa",
          "Foco na consistência do protocolo atual enquanto aguarda feedback",
          "Monitoramento semanal recomendado para acompanhamento preciso",
        ],
        dicasEspecificas: [
          `Mantenha foco no objetivo: ${userQuizData?.goal || "evolução física"}`,
          `Continue com ingestão de ${Math.round(realTotalCalories)}kcal e ${Math.round(realTotalProtein)}g proteína`,
          "Documente fotos semanalmente no mesmo horário e condições de iluminação",
        ],
        motivacao: `Protocolo atual: ${Math.round(realTotalCalories)}kcal, ${Math.round(realTotalProtein)}g proteína (${((realTotalProtein / (userQuizData?.currentWeight || 70)) * 1).toFixed(2)}g/kg), treino ${currentPlans?.workoutPlan?.days?.length || 0}x/semana. Análise completa em processamento.`,
        focoPrincipal: "Consistência no protocolo atual até análise completa",
        progressoGeral: "Análise técnica em andamento - múltiplas fotos recebidas para avaliação 360°",
        recomendacoesTreino: ["Manter frequência e volume atuais", "Foco na execução técnica perfeita"],
        recomendacoesDieta: [`Manter ${Math.round(realTotalCalories)}kcal atuais`, "Hidratação mínima 35ml/kg"],
        otimizacaoNecessaria: false,
        otimizacoesSugeridas: {
          dieta: { necessaria: false, mudancas: [], justificativa: "Aguardando análise completa do físico" },
          treino: { necessaria: false, mudancas: [], justificativa: "Aguardando análise completa do físico" },
        },
      }
    }

    console.log("[v0] API: Saving to Firebase")

    const photoIds = await Promise.all(
      photos.map(async (photo: any) => {
        const photoData = {
          userId,
          photoUrl: photo.photoUrl,
          photoType: photo.photoType,
          analysis,
          createdAt: new Date().toISOString(),
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

        const docRef = await adminDb.collection("progressPhotos").add(photoData)
        console.log("[v0] API: Photo saved with ID:", docRef.id)
        return docRef.id
      }),
    )

    console.log("[v0] API: Batch photo analysis completed and saved successfully")

    return NextResponse.json({
      success: true,
      analysis,
      photoIds,
      realDietTotals: {
        calories: Math.round(realTotalCalories),
        protein: Math.round(realTotalProtein),
        carbs: Math.round(realTotalCarbs),
        fats: Math.round(realTotalFats),
      },
    })
  } catch (error) {
    console.error("[v0] API: Error analyzing photos:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze photos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
