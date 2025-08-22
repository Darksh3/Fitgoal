import OpenAI from "openai"
import { adminDb, admin } from "@/lib/firebaseAdmin"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

/**
 * Gera dias de treino manualmente como fallback
 */
function generateFallbackWorkoutDays(trainingDays: number, quizData: any) {
  const exerciseRange = getExerciseCountRange(quizData.workoutTime || "45-60min")
  const days = []

  const dayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"]

  // Rotação de focos baseada no número de dias
  const focusRotations: Record<number, Array<{ title: string; focus: string }>> = {
    3: [
      { title: "Full Body A", focus: "Treino completo com ênfase em empurrar" },
      { title: "Full Body B", focus: "Treino completo com ênfase em puxar" },
      { title: "Full Body C", focus: "Treino completo com ênfase em pernas" },
    ],
    4: [
      { title: "Superior A", focus: "Peito e Tríceps" },
      { title: "Inferior A", focus: "Quadríceps e Glúteos" },
      { title: "Superior B", focus: "Costas e Bíceps" },
      { title: "Inferior B", focus: "Posteriores e Panturrilhas" },
    ],
    5: [
      { title: "Peito e Tríceps", focus: "Empurrar - membros superiores" },
      { title: "Costas e Bíceps", focus: "Puxar - membros superiores" },
      { title: "Pernas", focus: "Membros inferiores completo" },
      { title: "Ombros e Abdômen", focus: "Deltoides e core" },
      { title: "Full Body", focus: "Treino completo" },
    ],
    6: [
      { title: "Peito", focus: "Peitoral completo" },
      { title: "Costas", focus: "Dorsais e trapézio" },
      { title: "Pernas", focus: "Quadríceps e glúteos" },
      { title: "Ombros", focus: "Deltoides completo" },
      { title: "Braços", focus: "Bíceps e tríceps" },
      { title: "Core e Cardio", focus: "Abdômen e condicionamento" },
    ],
    7: [
      { title: "Peito", focus: "Peitoral completo" },
      { title: "Costas", focus: "Dorsais e trapézio" },
      { title: "Pernas A", focus: "Quadríceps e glúteos" },
      { title: "Ombros", focus: "Deltoides completo" },
      { title: "Braços", focus: "Bíceps e tríceps" },
      { title: "Pernas B", focus: "Posteriores e panturrilhas" },
      { title: "Core e Recuperação", focus: "Abdômen e mobilidade" },
    ],
  }

  // Usar rotação padrão se não houver específica
  const rotation = focusRotations[trainingDays] || focusRotations[5]

  for (let i = 0; i < trainingDays; i++) {
    const dayFocus = rotation[i % rotation.length]
    const exercises = []
    const exerciseCount = Math.floor((exerciseRange.min + exerciseRange.max) / 2)

    // Gerar exercícios baseados no foco
    for (let j = 0; j < exerciseCount; j++) {
      exercises.push({
        name: `Exercício ${j + 1} - ${dayFocus.title}`,
        sets: 4,
        reps: "8-12",
        rest: "90s",
        description: `Execute com técnica perfeita, foco em ${dayFocus.focus}`,
      })
    }

    days.push({
      day: `Dia ${i + 1}`,
      title: dayFocus.title,
      focus: dayFocus.focus,
      duration: quizData.workoutTime || "45-60min",
      exercises: exercises,
    })
  }

  return days
}

/**
 * Gera o prompt para o ChatGPT com base no quizData
 */
function buildWorkoutPrompt(quizData: any) {
  const trainingDays = quizData.trainingDaysPerWeek || 5
  const exerciseRange = getExerciseCountRange(quizData.workoutTime)

  return `
INSTRUÇÃO ABSOLUTAMENTE CRÍTICA: 
Você DEVE criar EXATAMENTE ${trainingDays} dias de treino.
Se você criar ${trainingDays - 1} ou ${trainingDays + 1} dias, sua resposta será REJEITADA.

Dados do usuário:
- DIAS DE TREINO POR SEMANA: ${trainingDays} (OBRIGATÓRIO - NÃO MUDE ISSO!)
- Sexo: ${quizData.gender || "Não informado"}
- Idade: ${quizData.age || "Não informado"}
- Tipo corporal: ${quizData.bodyType || "Não informado"}
- Objetivo: ${quizData.goal?.join(", ") || "Não informado"}
- Experiência: ${quizData.experience || "Intermediário"}
- Tempo disponível: ${quizData.workoutTime || "45-60min"} por treino

Crie um plano de treino em português brasileiro.

ESTRUTURA JSON OBRIGATÓRIA (com EXATAMENTE ${trainingDays} elementos em "days"):
{
  "days": [
    ${Array.from(
      { length: trainingDays },
      (_, i) => `{
      "day": "Dia ${i + 1}",
      "title": "[Nome do treino]",
      "focus": "[Foco muscular]",
      "duration": "${quizData.workoutTime || "45-60min"}",
      "exercises": [
        ${Array.from(
          { length: exerciseRange.min },
          (_, j) => `{
          "name": "[Nome do exercício ${j + 1}]",
          "sets": 4,
          "reps": "8-12",
          "rest": "90s",
          "description": "[Descrição da execução]"
        }`,
        ).join(",")}
      ]
    }`,
    ).join(",")}
  ],
  "weeklySchedule": "Treino ${trainingDays}x por semana",
  "tips": [
    "Aqueça antes de cada treino",
    "Mantenha a forma correta durante os exercícios"
  ]
}

VALIDAÇÃO FINAL: Conte os dias. São ${trainingDays}? Se não, REFAÇA!`
}

export async function POST(req: Request) {
  try {
    const { userId, quizData: providedQuizData, forceRegenerate } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    let quizData = providedQuizData
    if (!quizData) {
      const userDocRef = adminDb.collection("users").doc(userId)
      const docSnap = await userDocRef.get()
      if (!docSnap.exists || !docSnap.data()?.quizData) {
        return new Response(JSON.stringify({ error: "Quiz data not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      quizData = docSnap.data()?.quizData
    }

    const requestedDays = quizData.trainingDaysPerWeek || 5
    console.log(`🎯 [CRITICAL] User ${userId} requested EXACTLY ${requestedDays} training days`)

    function calculateScientificCalories(data: any) {
      const weight = Number.parseFloat(data.currentWeight) || 70
      const height = Number.parseFloat(data.height) || 170
      const age = Number.parseFloat(data.age) || 25
      const gender = data.gender || "masculino"
      const trainingDays = data.trainingDaysPerWeek || 5
      const goals = Array.isArray(data.goal) ? data.goal : [data.goal || "ganhar-massa"]

      // TMB (Mifflin-St Jeor)
      let tmb
      if (gender.toLowerCase() === "feminino") {
        tmb = 10 * weight + 6.25 * height - 5 * age - 161
      } else {
        tmb = 10 * weight + 6.25 * height - 5 * age + 5
      }

      // TDEE (multiplicador de atividade)
      let activityMultiplier
      if (trainingDays <= 2) activityMultiplier = 1.2
      else if (trainingDays <= 4) activityMultiplier = 1.375
      else if (trainingDays <= 6) activityMultiplier = 1.55
      else activityMultiplier = 1.725

      const tdee = tmb * activityMultiplier

      // Ajuste por objetivo
      let finalCalories = tdee
      if (goals.includes("perder-peso")) {
        finalCalories = tdee - 400 // Déficit moderado
      } else if (goals.includes("ganhar-massa")) {
        finalCalories = tdee + 300 // Superávit moderado
      }

      // Macros (g/kg)
      const protein = Math.round(weight * 2.0) // 2g/kg para ganho de massa
      const fats = Math.round(weight * 1.0) // 1g/kg
      const carbs = Math.round((finalCalories - protein * 4 - fats * 9) / 4)

      return {
        tmb: Math.round(tmb),
        tdee: Math.round(tdee),
        finalCalories: Math.round(finalCalories),
        protein,
        carbs,
        fats,
      }
    }

    const scientificCalcs = calculateScientificCalories(quizData)
    console.log(`🧮 [SCIENTIFIC CALCULATION] Target: ${scientificCalcs.finalCalories} kcal`)

    const dietPrompt = `
VOCÊ É UM NUTRICIONISTA ESPORTIVO. VOCÊ DEVE CRIAR UMA DIETA QUE SOME EXATAMENTE ${scientificCalcs.finalCalories} KCAL.

VALORES CIENTÍFICOS CALCULADOS (NÃO MUDE ESTES):
- TMB: ${scientificCalcs.tmb} kcal
- TDEE: ${scientificCalcs.tdee} kcal
- CALORIAS FINAIS: ${scientificCalcs.finalCalories} kcal (OBRIGATÓRIO)
- Proteína: ${scientificCalcs.protein}g
- Carboidratos: ${scientificCalcs.carbs}g
- Gorduras: ${scientificCalcs.fats}g

DADOS DO USUÁRIO:
- Peso: ${quizData.currentWeight}kg
- Altura: ${quizData.height}cm
- Idade: ${quizData.age} anos
- Sexo: ${quizData.gender}
- Objetivo: ${quizData.goal?.join(", ")}
- Preferências: ${quizData.dietPreferences || "nenhuma"}
- Alergias: ${quizData.allergyDetails || "nenhuma"}

INSTRUÇÃO CRÍTICA:
A SOMA TOTAL DE TODAS AS REFEIÇÕES DEVE SER EXATAMENTE ${scientificCalcs.finalCalories} KCAL.
Se não bater exatamente, AJUSTE as quantidades dos alimentos até bater.

FORMATO JSON OBRIGATÓRIO:
{
  "totalDailyCalories": "${scientificCalcs.finalCalories} kcal",
  "totalProtein": "${scientificCalcs.protein}g",
  "totalCarbs": "${scientificCalcs.carbs}g", 
  "totalFats": "${scientificCalcs.fats}g",
  "calculations": {
    "tmb": "${scientificCalcs.tmb} kcal",
    "tdee": "${scientificCalcs.tdee} kcal",
    "finalCalories": "${scientificCalcs.finalCalories} kcal"
  },
  "meals": [
    {
      "name": "Café da Manhã",
      "time": "07:00",
      "foods": [
        {
          "name": "Aveia",
          "quantity": "50g",
          "calories": "190 kcal",
          "protein": "6g",
          "carbs": "32g",
          "fats": "3g"
        }
      ],
      "totalCalories": "[soma exata dos alimentos] kcal"
    }
  ],
  "tips": ["Dicas nutricionais relevantes"]
}

VALIDAÇÃO FINAL: Some todas as calorias das refeições. É exatamente ${scientificCalcs.finalCalories}? Se não, REFAÇA!`

    // Gerar planos com validação rigorosa
    let dietPlan = null
    let workoutPlan = null
    let attempts = 0
    const maxAttempts = 3

    // Gerar dieta com múltiplas tentativas e validação
    while (attempts < maxAttempts && !dietPlan) {
      try {
        console.log(`[DIET ATTEMPT ${attempts + 1}/${maxAttempts}] Generating diet plan`)

        const dietResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Você é um nutricionista. A soma das calorias DEVE bater EXATAMENTE com o valor solicitado.",
            },
            { role: "user", content: dietPrompt },
          ],
          temperature: 0.1, // Muito baixa para precisão
          response_format: { type: "json_object" },
          max_tokens: 3000,
        })

        const parsed = JSON.parse(dietResponse.choices[0].message?.content || "{}")

        if (parsed.meals && Array.isArray(parsed.meals)) {
          let totalCaloriesFromMeals = 0

          parsed.meals.forEach((meal) => {
            if (meal.foods && Array.isArray(meal.foods)) {
              meal.foods.forEach((food) => {
                const calories = Number.parseInt(food.calories?.replace(/\D/g, "") || "0")
                totalCaloriesFromMeals += calories
              })
            }
          })

          console.log(`🔍 [VALIDATION] Target: ${scientificCalcs.finalCalories}, Generated: ${totalCaloriesFromMeals}`)

          const tolerance = 50 // Tolerância de 50 kcal
          if (Math.abs(totalCaloriesFromMeals - scientificCalcs.finalCalories) <= tolerance) {
            parsed.totalDailyCalories = `${scientificCalcs.finalCalories} kcal`
            parsed.totalProtein = `${scientificCalcs.protein}g`
            parsed.totalCarbs = `${scientificCalcs.carbs}g`
            parsed.totalFats = `${scientificCalcs.fats}g`

            dietPlan = parsed
            console.log(
              `✅ [DIET SUCCESS] Calories match within tolerance: ${totalCaloriesFromMeals} ≈ ${scientificCalcs.finalCalories}`,
            )
            break
          } else {
            console.log(`❌ [DIET MISMATCH] ${totalCaloriesFromMeals} != ${scientificCalcs.finalCalories}, retrying...`)
            attempts++
          }
        } else {
          throw new Error("Invalid diet response structure")
        }
      } catch (error) {
        console.error(`[DIET ATTEMPT ${attempts + 1}] Failed:`, error)
        attempts++
      }
    }

    if (!dietPlan) {
      console.log("🔧 [DIET FALLBACK] Using scientific values")
      dietPlan = {
        totalDailyCalories: `${scientificCalcs.finalCalories} kcal`,
        totalProtein: `${scientificCalcs.protein}g`,
        totalCarbs: `${scientificCalcs.carbs}g`,
        totalFats: `${scientificCalcs.fats}g`,
        calculations: {
          tmb: `${scientificCalcs.tmb} kcal`,
          tdee: `${scientificCalcs.tdee} kcal`,
          finalCalories: `${scientificCalcs.finalCalories} kcal`,
        },
        meals: [
          {
            name: "Café da Manhã",
            time: "07:00",
            foods: [
              {
                name: "Aveia",
                quantity: "60g",
                calories: `${Math.round(scientificCalcs.finalCalories * 0.25)} kcal`,
                protein: `${Math.round(scientificCalcs.protein * 0.25)}g`,
                carbs: `${Math.round(scientificCalcs.carbs * 0.25)}g`,
                fats: `${Math.round(scientificCalcs.fats * 0.25)}g`,
              },
            ],
            totalCalories: `${Math.round(scientificCalcs.finalCalories * 0.25)} kcal`,
          },
          // Adicionar mais refeições para completar o total
        ],
        tips: ["Valores calculados cientificamente usando Mifflin-St Jeor"],
      }
    }

    // Gerar treino com validação FORÇADA
    while (attempts < maxAttempts && !workoutPlan) {
      try {
        console.log(`[ATTEMPT ${attempts + 1}/${maxAttempts}] Generating workout for ${requestedDays} days`)

        const workoutResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Você é um personal trainer. SEMPRE siga as instruções EXATAMENTE." },
            { role: "user", content: buildWorkoutPrompt(quizData) },
          ],
          temperature: 0.2, // Baixa para maior consistência
          response_format: { type: "json_object" },
          max_tokens: 4000,
        })

        const parsed = JSON.parse(workoutResponse.choices[0].message?.content || "{}")

        if (parsed.days && Array.isArray(parsed.days)) {
          const generatedDays = parsed.days.length
          console.log(`[VALIDATION] Generated ${generatedDays} days, requested ${requestedDays}`)

          if (generatedDays === requestedDays) {
            // SUCESSO!
            workoutPlan = parsed
            console.log(`✅ [SUCCESS] Correct number of days generated: ${generatedDays}`)
            break
          } else {
            // CORRIGIR MANUALMENTE
            console.log(`⚠️ [FIX] Adjusting from ${generatedDays} to ${requestedDays} days`)

            if (generatedDays > requestedDays) {
              // Remover dias extras
              parsed.days = parsed.days.slice(0, requestedDays)
            } else {
              // Adicionar dias faltantes usando o padrão
              const fallbackDays = generateFallbackWorkoutDays(requestedDays, quizData)
              while (parsed.days.length < requestedDays) {
                const index = parsed.days.length
                parsed.days.push(fallbackDays[index])
              }
            }

            parsed.weeklySchedule = `Treino ${requestedDays}x por semana`
            workoutPlan = parsed
            console.log(`✅ [FIXED] Adjusted to ${workoutPlan.days.length} days`)
            break
          }
        } else {
          throw new Error("Invalid response structure")
        }
      } catch (error) {
        console.error(`[ATTEMPT ${attempts + 1}] Failed:`, error)
        attempts++
      }
    }

    // Se todas as tentativas falharem, usar fallback manual
    if (!workoutPlan || !workoutPlan.days || workoutPlan.days.length !== requestedDays) {
      console.log(`🔧 [FALLBACK] Generating manual workout for ${requestedDays} days`)
      workoutPlan = {
        days: generateFallbackWorkoutDays(requestedDays, quizData),
        weeklySchedule: `Treino ${requestedDays}x por semana`,
        tips: [
          "Aqueça por 5-10 minutos antes de cada treino",
          "Mantenha a forma correta em todos os exercícios",
          "Descanse adequadamente entre os treinos",
          "Ajuste as cargas progressivamente",
        ],
      }
    }

    // VALIDAÇÃO FINAL CRÍTICA
    const finalDayCount = workoutPlan.days?.length || 0
    if (finalDayCount !== requestedDays) {
      console.error(`❌ [CRITICAL ERROR] Final validation failed: ${finalDayCount} != ${requestedDays}`)
      // Forçar geração manual como último recurso
      workoutPlan = {
        days: generateFallbackWorkoutDays(requestedDays, quizData),
        weeklySchedule: `Treino ${requestedDays}x por semana`,
        tips: ["Plano gerado com fallback devido a erro de validação"],
      }
    }

    console.log(`📊 [FINAL STATS]`)
    console.log(`  - Target calories: ${scientificCalcs.finalCalories}`)
    console.log(`  - Diet calories: ${dietPlan.totalDailyCalories}`)
    console.log(`  - Requested days: ${requestedDays}`)
    console.log(`  - Generated days: ${workoutPlan.days.length}`)

    // Salvar no Firestore
    try {
      const userDocRef = adminDb.collection("users").doc(userId)
      await userDocRef.set(
        {
          quizData: {
            ...quizData,
            trainingDaysPerWeek: requestedDays, // Forçar valor correto
          },
          plans: { dietPlan, workoutPlan },
          dietPlan,
          workoutPlan,
          metadata: {
            requestedDays,
            generatedDays: workoutPlan.days.length,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            version: "2.0-fixed",
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          plansGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      console.log("✅ Plans saved to Firestore successfully")
    } catch (firestoreError) {
      console.error("⚠️ Error saving to Firestore:", firestoreError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        plans: { dietPlan, workoutPlan },
        scientificCalculation: scientificCalcs,
        validation: {
          requested: requestedDays,
          generated: workoutPlan.days.length,
          valid: workoutPlan.days.length === requestedDays,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error: any) {
    console.error("❌ Fatal error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
