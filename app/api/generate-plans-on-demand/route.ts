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

    // Gerar prompt para dieta (com fórmulas científicas completas)
    const dietPrompt = `
VOCÊ É UM NUTRICIONISTA ESPORTIVO ESPECIALIZADO. Use EXATAMENTE estas fórmulas científicas:

DADOS DO USUÁRIO:
- Sexo: ${quizData.gender || "não informado"}
- Idade: ${quizData.age || "não informado"} anos
- Peso atual: ${quizData.currentWeight || "não informado"}kg
- Altura: ${quizData.height || "não informado"}cm
- Objetivo: ${quizData.goal?.join(", ") || "não informado"}
- Tipo corporal: ${quizData.bodyType || "não informado"}
- Dias de treino: ${quizData.trainingDaysPerWeek || 5} por semana
- Tempo de treino: ${quizData.workoutTime || "45-60min"}
- Experiência: ${quizData.experience || "intermediário"}
- Preferências alimentares: ${quizData.dietPreferences || "nenhuma"}
- Alergias: ${quizData.allergyDetails || "nenhuma"}
- Consumo de água: ${quizData.waterIntake || "2-3L"}

FÓRMULAS OBRIGATÓRIAS:

1. **TMB (Mifflin-St Jeor)**:
   - Homens: TMB = (10 × peso) + (6.25 × altura) - (5 × idade) + 5
   - Mulheres: TMB = (10 × peso) + (6.25 × altura) - (5 × idade) - 161

2. **TDEE (Multiplicadores de Atividade)**:
   - 1-2 dias: TMB × 1.2 (sedentário)
   - 3-4 dias: TMB × 1.375 (levemente ativo)
   - 5-6 dias: TMB × 1.55 (moderadamente ativo)
   - 7 dias: TMB × 1.725 (muito ativo)

3. **Ajuste Calórico por Objetivo**:
   - Perda de peso: TDEE - 300-500 kcal (déficit moderado)
   - Manutenção: TDEE
   - Ganho muscular: TDEE + 200-400 kcal (superávit moderado)

4. **Distribuição de Macros (g/kg de peso)**:
   - Proteína: 1.6-2.2g/kg (maior para déficit calórico)
   - Carboidratos: 3-5g/kg (ajustar por atividade)
   - Gorduras: 0.8-1.2g/kg (mínimo 20% das calorias)

INSTRUÇÕES CRÍTICAS:
- CALCULE e MOSTRE todos os valores (TMB, TDEE, calorias finais)
- Use EXATAMENTE as fórmulas acima
- Distribua as calorias em 4-6 refeições
- Inclua macros detalhados para cada alimento
- Considere preferências alimentares e alergias

FORMATO JSON OBRIGATÓRIO:
{
  "calculations": {
    "tmb": "[valor calculado] kcal",
    "tdee": "[valor calculado] kcal",
    "finalCalories": "[valor ajustado] kcal",
    "proteinGrams": "[valor em g]",
    "carbsGrams": "[valor em g]",
    "fatsGrams": "[valor em g]"
  },
  "totalDailyCalories": "[valor final]",
  "totalProtein": "[valor]g",
  "totalCarbs": "[valor]g",
  "totalFats": "[valor]g",
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
      "totalCalories": "[soma dos alimentos] kcal",
      "totalProtein": "[soma]g",
      "totalCarbs": "[soma]g",
      "totalFats": "[soma]g"
    }
  ],
  "tips": [
    "Beba pelo menos ${quizData.waterIntake || "2-3L"} de água por dia",
    "Distribua a proteína igualmente entre as refeições",
    "Consuma carboidratos antes e após o treino"
  ]
}`

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
              content:
                "Você é um nutricionista esportivo especializado. SEMPRE use as fórmulas científicas exatas fornecidas.",
            },
            { role: "user", content: dietPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 3000,
        })

        const parsed = JSON.parse(dietResponse.choices[0].message?.content || "{}")

        // Validar se tem os campos essenciais
        if (parsed.totalDailyCalories && parsed.meals && Array.isArray(parsed.meals)) {
          dietPlan = parsed
          console.log(`✅ [DIET SUCCESS] Generated diet with ${parsed.meals.length} meals`)
          break
        } else {
          throw new Error("Invalid diet response structure")
        }
      } catch (error) {
        console.error(`[DIET ATTEMPT ${attempts + 1}] Failed:`, error)
        attempts++
      }
    }

    if (!dietPlan) {
      console.log("🔧 [DIET FALLBACK] Generating manual diet plan")
      const weight = Number.parseFloat(quizData.currentWeight) || 70
      const estimatedCalories = Math.round(weight * 30) // Estimativa básica
      const protein = Math.round(weight * 2)
      const fats = Math.round(weight * 1)
      const carbs = Math.round((estimatedCalories - protein * 4 - fats * 9) / 4)

      dietPlan = {
        totalDailyCalories: `${estimatedCalories}`,
        totalProtein: `${protein}g`,
        totalCarbs: `${carbs}g`,
        totalFats: `${fats}g`,
        calculations: {
          tmb: "Não calculado (fallback)",
          tdee: "Não calculado (fallback)",
          finalCalories: `${estimatedCalories} kcal`,
          proteinGrams: `${protein}g`,
          carbsGrams: `${carbs}g`,
          fatsGrams: `${fats}g`,
        },
        meals: [
          {
            name: "Café da Manhã",
            time: "07:00",
            foods: [
              {
                name: "Aveia",
                quantity: "50g",
                calories: "190 kcal",
                protein: "6g",
                carbs: "32g",
                fats: "3g",
              },
            ],
            totalCalories: "400 kcal",
            totalProtein: "25g",
            totalCarbs: "50g",
            totalFats: "12g",
          },
        ],
        tips: [
          `Beba pelo menos ${quizData.waterIntake || "2-3L"} de água por dia`,
          "Este é um plano básico - consulte um nutricionista para personalização",
        ],
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
    console.log(`  - Requested days: ${requestedDays}`)
    console.log(`  - Generated days: ${workoutPlan.days.length}`)
    console.log(`  - Diet calories: ${dietPlan.totalDailyCalories || "N/A"}`)
    console.log(`  - Diet meals: ${dietPlan.meals?.length || 0}`)
    console.log(`  - Validation: ${workoutPlan.days.length === requestedDays ? "✅ PASSED" : "❌ FAILED"}`)

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
