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

  const exerciseDatabase = {
    peito: [
      {
        name: "Supino reto",
        description: "Deite-se em um banco reto e empurre a barra para cima até os braços estarem estendidos.",
      },
      {
        name: "Supino inclinado com halteres",
        description: "Deite-se em um banco inclinado e levante os halteres em direção ao teto.",
      },
      {
        name: "Mergulho entre bancos",
        description: "Coloque as mãos em um banco e os pés em outro, abaixe o corpo e empurre para cima.",
      },
      { name: "Flexão de braços", description: "Com as mãos no chão, abaixe o corpo e empurre para cima." },
      { name: "Peck Deck", description: "Sente-se na máquina e pressione as alças para frente, unindo os braços." },
      {
        name: "Crucifixo com halteres",
        description: "Deite-se e abra os braços com halteres, depois una-os sobre o peito.",
      },
    ],
    costas: [
      { name: "Puxada na frente", description: "Puxe a barra em direção ao peito, mantendo as costas retas." },
      { name: "Remada curvada", description: "Com o tronco inclinado, puxe os halteres em direção ao abdômen." },
      { name: "Levantamento terra", description: "Levante a barra do chão mantendo as costas retas." },
      { name: "Puxada na barra fixa", description: "Pendure-se na barra e puxe o corpo para cima." },
      { name: "Remada unilateral", description: "Com um joelho e uma mão no banco, puxe o halter com a outra mão." },
      {
        name: "Remada baixa",
        description: "Puxe o cabo em direção ao abdômen, mantendo os cotovelos próximos ao corpo.",
      },
    ],
    triceps: [
      { name: "Tríceps na polia alta", description: "Puxe a barra para baixo, estendendo os braços." },
      {
        name: "Tríceps francês",
        description: "De pé ou sentado, segure um halter acima da cabeça e abaixe-o atrás da cabeça.",
      },
      { name: "Mergulho no banco", description: "Com as mãos no banco, abaixe e levante o corpo usando os tríceps." },
      { name: "Tríceps testa", description: "Deitado, abaixe os halteres em direção à testa e estenda os braços." },
    ],
    biceps: [
      { name: "Rosca direta", description: "Levante a barra em direção aos ombros, mantendo os cotovelos fixos." },
      { name: "Rosca alternada", description: "Levante um halter de cada vez, alternando os braços." },
      { name: "Rosca martelo", description: "Levante os halteres com pegada neutra, como se fosse um martelo." },
      { name: "Rosca concentrada", description: "Sentado, apoie o cotovelo na coxa e levante o halter." },
    ],
    pernas: [
      { name: "Agachamento", description: "Abaixe o corpo flexionando os joelhos e quadris, depois levante." },
      { name: "Leg Press", description: "Na máquina, empurre a plataforma com os pés." },
      { name: "Extensão de pernas", description: "Sentado na máquina, estenda as pernas para frente." },
      { name: "Flexão de pernas", description: "Deitado na máquina, flexione as pernas em direção aos glúteos." },
      { name: "Panturrilha em pé", description: "Levante-se na ponta dos pés, contraindo as panturrilhas." },
      { name: "Stiff", description: "Com as pernas retas, abaixe a barra mantendo as costas retas." },
    ],
    ombros: [
      { name: "Desenvolvimento com halteres", description: "Sentado, levante os halteres acima da cabeça." },
      { name: "Elevação lateral", description: "Levante os halteres lateralmente até a altura dos ombros." },
      { name: "Elevação frontal", description: "Levante os halteres à frente até a altura dos ombros." },
      { name: "Remada alta", description: "Puxe a barra em direção ao queixo, mantendo os cotovelos altos." },
    ],
  }

  // Rotação de focos baseada no número de dias
  const focusRotations: Record<number, Array<{ title: string; focus: string; exercises: string[] }>> = {
    3: [
      {
        title: "Full Body A",
        focus: "Treino completo com ênfase em empurrar",
        exercises: ["peito", "triceps", "pernas"],
      },
      { title: "Full Body B", focus: "Treino completo com ênfase em puxar", exercises: ["costas", "biceps", "pernas"] },
      { title: "Full Body C", focus: "Treino completo com ênfase em pernas", exercises: ["pernas", "ombros"] },
    ],
    4: [
      { title: "Superior A", focus: "Peito e Tríceps", exercises: ["peito", "triceps"] },
      { title: "Inferior A", focus: "Quadríceps e Glúteos", exercises: ["pernas"] },
      { title: "Superior B", focus: "Costas e Bíceps", exercises: ["costas", "biceps"] },
      { title: "Inferior B", focus: "Posteriores e Panturrilhas", exercises: ["pernas"] },
    ],
    5: [
      { title: "Peito e Tríceps", focus: "Empurrar - membros superiores", exercises: ["peito", "triceps"] },
      { title: "Costas e Bíceps", focus: "Puxar - membros superiores", exercises: ["costas", "biceps"] },
      { title: "Pernas", focus: "Membros inferiores completo", exercises: ["pernas"] },
      { title: "Ombros e Abdômen", focus: "Deltoides e core", exercises: ["ombros"] },
      { title: "Full Body", focus: "Treino completo", exercises: ["peito", "costas", "pernas"] },
    ],
    6: [
      { title: "Peito", focus: "Peitoral completo", exercises: ["peito"] },
      { title: "Costas", focus: "Dorsais e trapézio", exercises: ["costas"] },
      { title: "Pernas", focus: "Quadríceps e glúteos", exercises: ["pernas"] },
      { title: "Ombros", focus: "Deltoides completo", exercises: ["ombros"] },
      { title: "Braços", focus: "Bíceps e tríceps", exercises: ["biceps", "triceps"] },
      { title: "Core e Cardio", focus: "Abdômen e condicionamento", exercises: ["peito", "costas"] },
    ],
    7: [
      { title: "Peito", focus: "Peitoral completo", exercises: ["peito"] },
      { title: "Costas", focus: "Dorsais e trapézio", exercises: ["costas"] },
      { title: "Pernas A", focus: "Quadríceps e glúteos", exercises: ["pernas"] },
      { title: "Ombros", focus: "Deltoides completo", exercises: ["ombros"] },
      { title: "Braços", focus: "Bíceps e tríceps", exercises: ["biceps", "triceps"] },
      { title: "Pernas B", focus: "Posteriores e panturrilhas", exercises: ["pernas"] },
      { title: "Core e Recuperação", focus: "Abdômen e mobilidade", exercises: ["peito", "costas"] },
    ],
  }

  // Usar rotação padrão se não houver específica
  const rotation = focusRotations[trainingDays] || focusRotations[5]

  for (let i = 0; i < trainingDays; i++) {
    const dayFocus = rotation[i % rotation.length]
    const exercises = []
    const exerciseCount = Math.floor((exerciseRange.min + exerciseRange.max) / 2)

    let exercisePool = []
    dayFocus.exercises.forEach((muscleGroup) => {
      if (exerciseDatabase[muscleGroup]) {
        exercisePool = [...exercisePool, ...exerciseDatabase[muscleGroup]]
      }
    })

    // Shuffle and select exercises
    const shuffled = exercisePool.sort(() => 0.5 - Math.random())

    for (let j = 0; j < exerciseCount && j < shuffled.length; j++) {
      const exercise = shuffled[j]
      exercises.push({
        name: exercise.name,
        sets: 4,
        reps: "8-12",
        rest: "90s",
        description: exercise.description,
      })
    }

    // Fill remaining slots if needed
    while (exercises.length < exerciseCount && exercisePool.length > 0) {
      const randomExercise = exercisePool[Math.floor(Math.random() * exercisePool.length)]
      if (!exercises.find((ex) => ex.name === randomExercise.name)) {
        exercises.push({
          name: randomExercise.name,
          sets: 4,
          reps: "8-12",
          rest: "90s",
          description: randomExercise.description,
        })
      }
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

/**
 * Determina o número de refeições baseado no biotipo
 */
function getMealCountByBodyType(bodyType: string) {
  switch (bodyType?.toLowerCase()) {
    case "ectomorfo":
      return {
        count: 6,
        distribution: [0.15, 0.1, 0.25, 0.15, 0.25, 0.1], // 6 refeições
        names: ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"],
      }
    case "mesomorfo":
      return {
        count: 5,
        distribution: [0.2, 0.15, 0.3, 0.2, 0.15], // 5 refeições
        names: ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar"],
      }
    case "endomorfo":
      return {
        count: 4,
        distribution: [0.25, 0.35, 0.15, 0.25], // 4 refeições
        names: ["Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar"],
      }
    default:
      return {
        count: 4,
        distribution: [0.25, 0.35, 0.15, 0.25], // Padrão: 4 refeições
        names: ["Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar"],
      }
  }
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

    const mealConfig = getMealCountByBodyType(quizData.bodyType)
    console.log(`🍽️ [MEAL CONFIG] ${mealConfig.count} refeições para biotipo: ${quizData.bodyType}`)

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
- Biotipo: ${quizData.bodyType} (IMPORTANTE: Crie EXATAMENTE ${mealConfig.count} refeições)
- Objetivo: ${quizData.goal?.join(", ")}
- Preferências: ${quizData.dietPreferences || "nenhuma"}
- Alergias: ${quizData.allergyDetails || "nenhuma"}

INSTRUÇÃO CRÍTICA:
- Crie EXATAMENTE ${mealConfig.count} refeições: ${mealConfig.names.join(", ")}
- A SOMA TOTAL DE TODAS AS REFEIÇÕES DEVE SER EXATAMENTE ${scientificCalcs.finalCalories} KCAL
- Se não bater exatamente, AJUSTE as quantidades dos alimentos até bater

FORMATO JSON OBRIGATÓRIO:
{
  "totalDailyCalories": "${scientificCalcs.finalCalories} kcal",
  "totalProtein": "${scientificCalcs.protein}g",
  "totalCarbs": "${scientificCalcs.carbs}g", 
  "totalFats": "${scientificCalcs.fats}g",
  "bodyType": "${quizData.bodyType}",
  "mealCount": ${mealConfig.count},
  "calculations": {
    "tmb": "${scientificCalcs.tmb} kcal",
    "tdee": "${scientificCalcs.tdee} kcal",
    "finalCalories": "${scientificCalcs.finalCalories} kcal"
  },
  "meals": [
    ${mealConfig.names
      .map(
        (name, index) => `{
      "name": "${name}",
      "time": "${index === 0 ? "07:00" : index === 1 ? "10:00" : index === 2 ? "12:00" : index === 3 ? "15:00" : index === 4 ? "19:00" : "21:00"}",
      "foods": [
        {
          "name": "[Nome do alimento]",
          "quantity": "[quantidade]",
          "calories": "[calorias] kcal",
          "protein": "[proteína]g",
          "carbs": "[carboidratos]g",
          "fats": "[gorduras]g"
        }
      ],
      "totalCalories": "[soma exata dos alimentos] kcal"
    }`,
      )
      .join(",")}
  ],
  "tips": ["Dicas nutricionais específicas para ${quizData.bodyType}"]
}

VALIDAÇÃO FINAL: Some todas as calorias das ${mealConfig.count} refeições. É exatamente ${scientificCalcs.finalCalories}? Se não, REFAÇA!`

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
            parsed.bodyType = quizData.bodyType
            parsed.mealCount = mealConfig.count

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
      console.log("🔧 [DIET FALLBACK] Using scientific values with body type configuration")

      const mealCalories = mealConfig.distribution.map((percentage) =>
        Math.round(scientificCalcs.finalCalories * percentage),
      )

      // Ajustar última refeição para bater exato
      const totalCalculated = mealCalories.reduce((sum, cal) => sum + cal, 0)
      mealCalories[mealCalories.length - 1] += scientificCalcs.finalCalories - totalCalculated

      const fallbackMeals = mealConfig.names.map((name, index) => {
        const calories = mealCalories[index]
        const proteinPortion = Math.round(scientificCalcs.protein * mealConfig.distribution[index])
        const carbsPortion = Math.round(scientificCalcs.carbs * mealConfig.distribution[index])
        const fatsPortion = Math.round(scientificCalcs.fats * mealConfig.distribution[index])

        return {
          name,
          time:
            index === 0
              ? "07:00"
              : index === 1
                ? "10:00"
                : index === 2
                  ? "12:00"
                  : index === 3
                    ? "15:00"
                    : index === 4
                      ? "19:00"
                      : "21:00",
          foods: [
            {
              name:
                index === 0
                  ? "Aveia"
                  : index === 1
                    ? "Fruta"
                    : index === 2
                      ? "Arroz Integral"
                      : index === 3
                        ? "Iogurte"
                        : index === 4
                          ? "Batata Doce"
                          : "Castanhas",
              quantity:
                index === 0
                  ? "80g"
                  : index === 1
                    ? "1 unidade"
                    : index === 2
                      ? "150g"
                      : index === 3
                        ? "150g"
                        : index === 4
                          ? "200g"
                          : "20g",
              calories: `${Math.round(calories * 0.6)} kcal`,
              protein: `${Math.round(proteinPortion * 0.6)}g`,
              carbs: `${Math.round(carbsPortion * 0.6)}g`,
              fats: `${Math.round(fatsPortion * 0.6)}g`,
            },
            {
              name:
                index === 0
                  ? "Banana"
                  : index === 1
                    ? "Oleaginosas"
                    : index === 2
                      ? "Frango"
                      : index === 3
                        ? "Aveia"
                        : index === 4
                          ? "Salmão"
                          : "Leite",
              quantity:
                index === 0
                  ? "1 unidade"
                  : index === 1
                    ? "15g"
                    : index === 2
                      ? "150g"
                      : index === 3
                        ? "30g"
                        : index === 4
                          ? "120g"
                          : "200ml",
              calories: `${calories - Math.round(calories * 0.6)} kcal`,
              protein: `${proteinPortion - Math.round(proteinPortion * 0.6)}g`,
              carbs: `${carbsPortion - Math.round(carbsPortion * 0.6)}g`,
              fats: `${fatsPortion - Math.round(fatsPortion * 0.6)}g`,
            },
          ],
          totalCalories: `${calories} kcal`,
        }
      })

      dietPlan = {
        totalDailyCalories: `${scientificCalcs.finalCalories} kcal`,
        totalProtein: `${scientificCalcs.protein}g`,
        totalCarbs: `${scientificCalcs.carbs}g`,
        totalFats: `${scientificCalcs.fats}g`,
        bodyType: quizData.bodyType,
        mealCount: mealConfig.count,
        calculations: {
          tmb: `${scientificCalcs.tmb} kcal`,
          tdee: `${scientificCalcs.tdee} kcal`,
          finalCalories: `${scientificCalcs.finalCalories} kcal`,
        },
        meals: fallbackMeals,
        tips: [
          `Dieta personalizada para biotipo ${quizData.bodyType}`,
          `${mealConfig.count} refeições distribuídas ao longo do dia`,
          "Valores calculados cientificamente usando Mifflin-St Jeor",
          "Mantenha-se hidratado bebendo pelo menos 2L de água",
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
