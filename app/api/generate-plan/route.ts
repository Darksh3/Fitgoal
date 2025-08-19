import { type NextRequest, NextResponse } from "next/server"
import { adminDb, admin } from "@/lib/firebaseAdmin"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

/**
 * Calcula o número de exercícios baseado no tempo disponível
 */
function getExerciseCountRange(workoutTime: string) {
  switch (workoutTime) {
    case "30-45min":
      return { min: 5, max: 6, description: "5-6 exercícios (treino rápido)" }
    case "45-60min":
      return { min: 6, max: 7, description: "6-7 exercícios (treino moderado)" }
    case "mais-1h":
      return { min: 7, max: 8, description: "7-8 exercícios (treino completo)" }
    default:
      return { min: 6, max: 7, description: "6-7 exercícios (padrão)" }
  }
}

// Função auxiliar para extrair JSON de uma string, mesmo que contenha texto extra
function extractJson(text: string): any | null {
  try {
    // Tenta encontrar o primeiro e último { } para extrair o JSON
    const startIndex = text.indexOf("{")
    const endIndex = text.lastIndexOf("}")

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonString = text.substring(startIndex, endIndex + 1)
      return JSON.parse(jsonString)
    }
    // Se não encontrar { } ou se a estrutura for inválida, tenta parsear diretamente
    return JSON.parse(text)
  } catch (e) {
    console.error("Failed to extract and parse JSON:", e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, quizData } = body

    if (!userId || !quizData) {
      return NextResponse.json({ error: "Missing userId or quizData" }, { status: 400 })
    }

    console.log("[v0] API /api/generate-plan: Recebido quizData para userID:", userId)
    console.log("[v0] DETAILED quizData received:", JSON.stringify(quizData, null, 2))
    console.log("[v0] Training frequency analysis:", {
      trainingDaysPerWeek: quizData.trainingDaysPerWeek,
      typeOfTrainingDays: typeof quizData.trainingDaysPerWeek,
      fallbackWillBeUsed: !quizData.trainingDaysPerWeek,
      finalValue: quizData.trainingDaysPerWeek || 5,
    })

    console.log(`[v0] Diet generation - User data:`, {
      gender: quizData.gender,
      age: quizData.age,
      weight: quizData.currentWeight || quizData.weight,
      height: quizData.height,
      goal: quizData.goal,
      activityLevel: quizData.activityLevel,
      trainingDaysPerWeek: quizData.trainingDaysPerWeek,
    })

    const userDocRef = adminDb.collection("users").doc(userId)
    const existingDoc = await userDocRef.get()

    if (existingDoc.exists) {
      const existingData = existingDoc.data()

      let lastUpdated: Date | null = null
      if (existingData?.updatedAt) {
        if (typeof existingData.updatedAt === "string") {
          // Handle ISO string timestamps
          lastUpdated = new Date(existingData.updatedAt)
        } else if (existingData.updatedAt.toDate) {
          // Handle Firestore timestamps
          lastUpdated = existingData.updatedAt.toDate()
        }
      }

      const now = new Date()
      const hoursSinceUpdate = lastUpdated ? (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60) : 24

      console.log(`[v0] Existing plan found, hours since update: ${hoursSinceUpdate}`)

      // If plan was generated less than 1 hour ago, return existing plan
      if (hoursSinceUpdate < 1 && existingData?.dietPlan && existingData?.workoutPlan) {
        console.log(`[v0] Returning cached plan (generated ${hoursSinceUpdate.toFixed(1)} hours ago)`)
        return NextResponse.json({
          success: true,
          dietPlan: existingData.dietPlan,
          workoutPlan: existingData.workoutPlan,
          cached: true,
        })
      }
    }

    const exerciseRange = getExerciseCountRange(quizData.workoutTime)
    console.log(`[v0] Exercise range for ${quizData.workoutTime}: ${exerciseRange.min}-${exerciseRange.max} exercises`)

    const requestId = `${userId}_${Date.now()}`
    console.log(`[v0] Generating new plan with requestId: ${requestId}`)

    const dietPrompt = `
    REQUISIÇÃO ID: ${requestId}
    
    Você é um nutricionista esportivo profissional. Crie um plano de dieta personalizado ÚNICO em português brasileiro.
    
    Dados do usuário:
    - Gênero: ${quizData.gender}
    - Idade: ${quizData.age}
    - Peso atual: ${quizData.currentWeight || quizData.weight}kg
    - Altura: ${quizData.height}cm
    - Nível de atividade: ${quizData.activityLevel}
    - Objetivo: ${Array.isArray(quizData.goal) ? quizData.goal.join(", ") : quizData.goal}
    - Tipo corporal: ${quizData.bodyType}
    - Restrições alimentares: ${quizData.dietaryRestrictions || "Nenhuma"}
    - Preferências alimentares: ${quizData.foodPreferences || "Nenhuma"}

    INSTRUÇÕES OBRIGATÓRIAS:
    1. Calcule TMB usando Mifflin-St Jeor: Homens = (10×peso) + (6.25×altura) - (5×idade) + 5 | Mulheres = (10×peso) + (6.25×altura) - (5×idade) - 161
    2. Calcule GET baseado no nível de atividade: Sedentário×1.2, Leve×1.375, Moderado×1.55, Intenso×1.725
    3. Defina meta calórica: Perda (GET-400), Manutenção (GET), Ganho (GET+400)
    4. Distribua macros: Proteína 1.8-2.2g/kg, Gorduras 25-30% calorias, Carboidratos restante
    5. Crie OBRIGATORIAMENTE 5-6 refeições detalhadas com alimentos específicos, quantidades exatas e macros
    6. TODOS os alimentos devem ter quantidades específicas (ex: "100g peito de frango", "1 banana média (120g)")
    7. VARIE os alimentos - não use sempre os mesmos ingredientes básicos

    Responda APENAS com um JSON válido no seguinte formato:
    {
      "totalDailyCalories": 2500,
      "macros": {
        "protein": "150g",
        "carbs": "300g", 
        "fat": "85g"
      },
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "07:00",
          "foods": [
            {
              "name": "100g aveia em flocos",
              "quantity": "100g",
              "calories": 380,
              "protein": 13,
              "carbs": 67,
              "fats": 7
            },
            {
              "name": "1 banana média",
              "quantity": "120g",
              "calories": 100,
              "protein": 1,
              "carbs": 27,
              "fats": 0
            }
          ],
          "totalCalories": 480,
          "macros": {
            "protein": "14g",
            "carbs": "94g",
            "fats": "7g"
          }
        }
      ],
      "tips": [
        "Beba pelo menos 2.5L de água por dia",
        "Consuma proteína em todas as refeições",
        "Prefira carboidratos complexos"
      ]
    }

    IMPORTANTE: Crie um plano profissional com pelo menos 5 refeições completas, cada uma com 2-4 alimentos específicos e macros detalhados.
    `

    console.log(`[v0] Sending diet generation request to OpenAI...`)
    const dietResult = await generateText({
      model: openai("gpt-4o"),
      prompt: dietPrompt,
      maxTokens: 3000,
      response_format: { type: "json_object" },
      temperature: 0.7, // Add temperature for variation
    })

    console.log(`[v0] OpenAI diet response received, length: ${dietResult.text.length}`)
    console.log(`[v0] OpenAI diet response preview: ${dietResult.text.substring(0, 200)}...`)

    const workoutPrompt = `
    REQUISIÇÃO ID: ${requestId}
    
    ⚠️ ATENÇÃO CRÍTICA: O usuário selecionou EXATAMENTE ${quizData.trainingDaysPerWeek} DIAS DE TREINO POR SEMANA. 
    VOCÊ DEVE CRIAR UM PLANO COM EXATAMENTE ${quizData.trainingDaysPerWeek} DIAS, NEM MAIS, NEM MENOS.
    
    Com base nas seguintes informações do usuário, crie um plano de treino personalizado ÚNICO em português brasileiro.
    
    Dados do usuário:
    - Gênero: ${quizData.gender}
    - Idade: ${quizData.age}
    - Peso: ${quizData.currentWeight || quizData.weight}kg
    - Altura: ${quizData.height}cm
    - Nível de atividade: ${quizData.activityLevel}
    - Objetivo: ${Array.isArray(quizData.goal) ? quizData.goal.join(", ") : quizData.goal}
    - Tipo corporal: ${quizData.bodyType}
    - Experiência com exercícios: ${quizData.exerciseExperience || "Iniciante"}
    - Tempo disponível: ${quizData.workoutTime || "45-60min"}
    - ⭐ DIAS DE TREINO POR SEMANA: ${quizData.trainingDaysPerWeek} (OBRIGATÓRIO - USE EXATAMENTE ESTE NÚMERO)
    - Áreas de foco corporal: ${quizData.problemAreas?.join(", ") || "Corpo inteiro"}
    - Preferências de exercício: Cardio (${quizData.exercisePreferences?.cardio || "neutro"}), Força (${quizData.exercisePreferences?.pullups || "neutro"}), Yoga (${quizData.exercisePreferences?.yoga || "neutro"})
    - Equipamentos disponíveis: ${quizData.equipment?.join(", ") || "Academia completa"}

    🎯 PERSONALIZAÇÃO OBRIGATÓRIA DO TREINO:
    
    **Tipo Corporal - ${quizData.bodyType}:**
    ${quizData.bodyType === "ectomorfo" ? "- Foque em exercícios compostos pesados, menos cardio, mais descanso entre séries (90-120s), rep range 6-8 para força" : ""}
    ${quizData.bodyType === "mesomorfo" ? "- Balance entre exercícios compostos e isolamento, cardio moderado, descanso médio (60-90s), rep range 8-12 para hipertrofia" : ""}
    ${quizData.bodyType === "endomorfo" ? "- Mais exercícios de isolamento, cardio intenso, menos descanso (45-60s), rep range 12-15 para definição" : ""}
    
    **Gênero - ${quizData.gender}:**
    ${quizData.gender === "homem" ? "- Foque mais em membros superiores, exercícios de força, cargas mais pesadas" : ""}
    ${quizData.gender === "mulher" ? "- Equilibre membros superiores e inferiores, inclua mais exercícios para glúteos e pernas, foque em resistência muscular" : ""}
    
    **Áreas de Foco Corporal:**
    ${quizData.problemAreas?.includes("Peito") ? "- OBRIGATÓRIO: Inclua 2-3 exercícios de peito em pelo menos 2 dias da semana" : ""}
    ${quizData.problemAreas?.includes("Braços") ? "- OBRIGATÓRIO: Inclua exercícios específicos para bíceps e tríceps em pelo menos 2 dias" : ""}
    ${quizData.problemAreas?.includes("Barriga") ? "- OBRIGATÓRIO: Inclua exercícios abdominais e core em TODOS os dias de treino" : ""}
    ${quizData.problemAreas?.includes("Pernas") ? "- OBRIGATÓRIO: Dedique pelo menos 2 dias completos para membros inferiores" : ""}
    ${quizData.problemAreas?.includes("Corpo inteiro") ? "- OBRIGATÓRIO: Balance todos os grupos musculares igualmente" : ""}

    🚨 REGRAS ABSOLUTAS - NÃO IGNORE:
    1. CRIE EXATAMENTE ${quizData.trainingDaysPerWeek} DIAS DE TREINO (não 5, não 3, EXATAMENTE ${quizData.trainingDaysPerWeek})
    2. Se ${quizData.trainingDaysPerWeek} = 6, crie 6 dias (Segunda a Sábado)
    3. Se ${quizData.trainingDaysPerWeek} = 7, crie 7 dias (Segunda a Domingo)
    4. Se ${quizData.trainingDaysPerWeek} = 4, crie 4 dias (Segunda, Terça, Quinta, Sexta)
    5. NUNCA assuma que 5 dias é "melhor" - use EXATAMENTE o que o usuário escolheu

    Responda APENAS com um JSON válido no seguinte formato. Não inclua nenhum texto adicional ou markdown (como \`\`\`json):
    {
      "days": [
        {
          "day": "Segunda-feira",
          "focus": "Foco do treino (e.g., Peito e Tríceps)",
          "duration": "${quizData.workoutTime || "60 minutos"}",
          "exercises": [
            {
              "name": "Supino Reto com Barra",
              "sets": "3",
              "reps": "8-12",
              "rest": "60-90 segundos",
              "instructions": "Deite-se no banco, segure a barra com as mãos um pouco mais afastadas que a largura dos ombros, desça até tocar o peito e empurre para cima."
            }
          ]
        }
        // Repita para TODOS os ${quizData.trainingDaysPerWeek} dias
      ],
      "weeklySchedule": "Treino ${quizData.trainingDaysPerWeek}x por semana",
      "tips": ["Aqueça antes de cada treino.", "Mantenha a forma correta."]
    }

    INSTRUÇÕES OBRIGATÓRIAS:
    - ⚠️ CRÍTICO: Crie um plano para EXATAMENTE ${quizData.trainingDaysPerWeek} dias da semana (não mais, não menos)
    - CADA dia deve ter OBRIGATORIAMENTE ${exerciseRange.description} baseado no tempo disponível
    - Tempo disponível: ${quizData.workoutTime || "45-60min"} - ajuste a intensidade e número de exercícios adequadamente
    - Para treinos mais curtos (30-45min): Foque em exercícios compostos e reduza o tempo de descanso
    - Para treinos médios (45-60min): Balance exercícios compostos e isolamento
    - Para treinos longos (mais de 1h): Inclua mais exercícios de isolamento e aquecimento específico
    - Distribua os exercícios: 60% compostos + 40% isolamento para treinos curtos, 50/50 para treinos longos
    - NUNCA crie dias com menos de ${exerciseRange.min} exercícios ou mais de ${exerciseRange.max} exercícios
    - PRIORIZE as áreas de foco selecionadas pelo usuário em TODOS os treinos relevantes
    - VARIE os exercícios - não use sempre os mesmos movimentos básicos
    
    ⭐ LEMBRE-SE: O usuário escolheu ${quizData.trainingDaysPerWeek} dias por uma razão específica. Respeite essa escolha SEMPRE.
    `

    console.log(`[v0] About to generate workout for ${quizData.trainingDaysPerWeek} days per week`)
    console.log(`[v0] Sending workout generation request to OpenAI...`)

    const workoutResult = await generateText({
      model: openai("gpt-4o"),
      prompt: workoutPrompt,
      maxTokens: 3000,
      response_format: { type: "json_object" },
      temperature: 0.7, // Add temperature for variation
    })

    console.log(`[v0] OpenAI workout response received, length: ${workoutResult.text.length}`)

    // Parse dos resultados JSON usando a função auxiliar
    let dietPlan, workoutPlan
    let usedFallbackDiet = false
    let usedFallbackWorkout = false

    try {
      dietPlan = extractJson(dietResult.text)
      if (!dietPlan) throw new Error("Diet plan JSON extraction failed.")

      console.log(`[v0] Diet plan parsed successfully:`, {
        totalCalories: dietPlan.totalDailyCalories,
        mealsCount: dietPlan.meals?.length || 0,
        hasProperMacros: !!(dietPlan.macros?.protein && dietPlan.macros?.carbs && dietPlan.macros?.fat),
        firstMealName: dietPlan.meals?.[0]?.name,
        firstFoodItem: dietPlan.meals?.[0]?.foods?.[0]?.name,
      })

      // Validate diet plan quality
      if (!dietPlan.meals || dietPlan.meals.length < 5) {
        console.warn(`[v0] Diet plan has insufficient meals: ${dietPlan.meals?.length || 0}`)
      }
    } catch (error) {
      console.error(`[v0] ERROR: Diet plan parsing failed, using fallback:`, error)
      console.error(`[v0] Raw OpenAI diet response:`, dietResult.text)
      usedFallbackDiet = true

      const weight = Number.parseFloat(quizData.currentWeight || quizData.weight) || 70
      const height = Number.parseFloat(quizData.height) || 170
      const age = Number.parseInt(quizData.age) || 30
      const gender = quizData.gender || "masculino"

      // Calculate BMR using Mifflin-St Jeor equation
      const bmr =
        gender === "feminino" ? 10 * weight + 6.25 * height - 5 * age - 161 : 10 * weight + 6.25 * height - 5 * age + 5

      // Estimate TDEE (using moderate activity level as fallback)
      const tdee = Math.round(bmr * 1.55)

      // Calculate macros based on weight
      const proteinG = Math.round(weight * 2.0) // 2g per kg
      const fatG = Math.round((tdee * 0.25) / 9) // 25% of calories from fat
      const carbsG = Math.round((tdee - proteinG * 4 - fatG * 9) / 4) // Remaining calories from carbs

      console.log(`[v0] FALLBACK diet calculations:`, {
        bmr,
        tdee,
        proteinG,
        fatG,
        carbsG,
        weight,
        height,
        age,
        gender,
      })

      dietPlan = {
        totalDailyCalories: tdee,
        macros: {
          protein: `${proteinG}g`,
          carbs: `${carbsG}g`,
          fat: `${fatG}g`,
        },
        meals: [
          {
            name: "Café da Manhã",
            time: "07:00",
            foods: [
              { name: "100g aveia em flocos", quantity: "100g", calories: 380, protein: 13, carbs: 67, fats: 7 },
              { name: "1 banana média", quantity: "120g", calories: 100, protein: 1, carbs: 27, fats: 0 },
            ],
            totalCalories: 480,
            macros: { protein: "14g", carbs: "94g", fats: "7g" },
          },
          {
            name: "Almoço",
            time: "12:00",
            foods: [
              {
                name: "150g peito de frango grelhado",
                quantity: "150g",
                calories: 250,
                protein: 47,
                carbs: 0,
                fats: 5,
              },
              { name: "100g arroz integral cozido", quantity: "100g", calories: 110, protein: 3, carbs: 23, fats: 1 },
            ],
            totalCalories: 360,
            macros: { protein: "50g", carbs: "23g", fats: "6g" },
          },
        ],
        tips: ["Beba pelo menos 2.5L de água por dia", "Consuma proteína em todas as refeições"],
      }
    }

    try {
      workoutPlan = extractJson(workoutResult.text)
      if (!workoutPlan) throw new Error("Workout plan JSON extraction failed.")

      console.log(`[v0] Workout plan parsed successfully:`, {
        daysCount: workoutPlan.days?.length || 0,
        expectedDays: quizData.trainingDaysPerWeek,
        actualDaysGenerated: workoutPlan.days?.length,
        mismatch: (workoutPlan.days?.length || 0) !== quizData.trainingDaysPerWeek,
        workoutTime: quizData.workoutTime,
        exerciseRange: exerciseRange.description,
        firstDayFocus: workoutPlan.days?.[0]?.focus,
        firstExercise: workoutPlan.days?.[0]?.exercises?.[0]?.name,
      })

      // Validate exercise count per day
      if (workoutPlan.days) {
        workoutPlan.days.forEach((day: any, index: number) => {
          const exerciseCount = day.exercises?.length || 0
          console.log(`[v0] Day ${index + 1} (${day.focus}): ${exerciseCount} exercises`)

          if (exerciseCount < exerciseRange.min || exerciseCount > exerciseRange.max) {
            console.warn(
              `[v0] WARNING: Day ${index + 1} has ${exerciseCount} exercises (should be ${exerciseRange.min}-${exerciseRange.max} for ${quizData.workoutTime})`,
            )
          }
        })
      }
    } catch (error) {
      console.error(`[v0] ERROR: Workout plan parsing failed, using fallback:`, error)
      console.error(`[v0] Raw OpenAI workout response:`, workoutResult.text)
      usedFallbackWorkout = true

      workoutPlan = {
        days: [],
        weeklySchedule: `Treino ${quizData.trainingDaysPerWeek || 5}x por semana`,
        tips: [],
      }
    }

    console.log(`[v0] Plan generation summary:`, {
      requestId,
      usedFallbackDiet,
      usedFallbackWorkout,
      dietMeals: dietPlan?.meals?.length || 0,
      workoutDays: workoutPlan?.days?.length || 0,
    })

    console.log(`[v0] About to save to Firestore:`, {
      userId,
      trainingDaysFromQuiz: quizData.trainingDaysPerWeek,
      workoutDaysGenerated: workoutPlan?.days?.length,
      weeklySchedule: workoutPlan?.weeklySchedule,
    })

    // Salvar no Firestore usando a sintaxe correta do Admin SDK
    await userDocRef.set(
      {
        quizData,
        dietPlan,
        workoutPlan,
        trainingDaysPerWeek: quizData.trainingDaysPerWeek,
        name: quizData.name,
        email: quizData.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generationMetadata: {
          requestId,
          usedFallbackDiet,
          usedFallbackWorkout,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    )

    console.log(`[v0] Plans saved successfully for user: ${userId}`)

    return NextResponse.json({
      success: true,
      dietPlan,
      workoutPlan,
      metadata: {
        usedFallbackDiet,
        usedFallbackWorkout,
        requestId,
      },
    })
  } catch (error) {
    console.error("[v0] Erro ao gerar plano:", error)
    return NextResponse.json({ error: "Erro interno do servidor", details: (error as Error).message }, { status: 500 })
  }
}
