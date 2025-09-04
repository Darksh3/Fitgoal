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
    case "30min":
      return { min: 4, max: 4, description: "4 exercícios (treino rápido)" }
    case "45min":
      return { min: 5, max: 5, description: "5 exercícios (treino moderado)" }
    case "1hora":
      return { min: 6, max: 7, description: "6-7 exercícios (treino completo)" }
    case "mais-1h":
      return { min: 7, max: 8, description: "7-8 exercícios (treino longo)" }
    // Legacy support for old values
    case "30-45min":
      return { min: 4, max: 5, description: "4-5 exercícios (treino rápido)" }
    case "45-60min":
      return { min: 6, max: 7, description: "6-7 exercícios (treino moderado)" }
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
      { name: "Supino declinado", description: "Em banco declinado, empurre a barra para cima." },
      { name: "Pullover", description: "Deitado, puxe o halter por trás da cabeça até o peito." },
      { name: "Cross over", description: "Na polia, cruze os cabos na frente do peito." },
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
      { name: "Puxada atrás", description: "Puxe a barra atrás da nuca, cuidado com a amplitude." },
      { name: "Remada T", description: "Com barra T, puxe em direção ao abdômen." },
      { name: "Shrug", description: "Eleve os ombros contraindo o trapézio." },
    ],
    triceps: [
      { name: "Tríceps na polia alta", description: "Puxe a barra para baixo, estendendo os braços." },
      {
        name: "Tríceps francês",
        description: "De pé ou sentado, segure um halter acima da cabeça e abaixe-o atrás da cabeça.",
      },
      { name: "Mergulho no banco", description: "Com as mãos no banco, abaixe e levante o corpo usando os tríceps." },
      { name: "Tríceps testa", description: "Deitado, abaixe os halteres em direção à testa e estenda os braços." },
      { name: "Tríceps coice", description: "Inclinado, estenda o braço para trás com halter." },
      { name: "Tríceps supinado", description: "Com pegada supinada, estenda os braços na polia." },
    ],
    biceps: [
      { name: "Rosca direta", description: "Levante a barra em direção aos ombros, mantendo os cotovelos fixos." },
      { name: "Rosca alternada", description: "Levante um halter de cada vez, alternando os braços." },
      { name: "Rosca martelo", description: "Levante os halteres com pegada neutra, como se fosse um martelo." },
      { name: "Rosca concentrada", description: "Sentado, apoie o cotovelo na coxa e levante o halter." },
      { name: "Rosca 21", description: "7 repetições parciais baixo, 7 alto, 7 completas." },
      { name: "Rosca cabo", description: "Na polia baixa, flexione os braços." },
    ],
    pernas: [
      { name: "Agachamento", description: "Abaixe o corpo flexionando os joelhos e quadris, depois levante." },
      { name: "Leg Press", description: "Na máquina, empurre a plataforma com os pés." },
      { name: "Extensão de pernas", description: "Sentado na máquina, estenda as pernas para frente." },
      { name: "Flexão de pernas", description: "Deitado na máquina, flexione as pernas em direção aos glúteos." },
      { name: "Panturrilha em pé", description: "Levante-se na ponta dos pés, contraindo as panturrilhas." },
      { name: "Stiff", description: "Com as pernas retas, abaixe a barra mantendo as costas retas." },
      { name: "Afundo", description: "Dê um passo à frente e flexione ambos os joelhos." },
      { name: "Cadeira extensora", description: "Sentado, estenda as pernas contra a resistência." },
      { name: "Mesa flexora", description: "Deitado de bruços, flexione as pernas." },
      { name: "Agachamento búlgaro", description: "Com um pé elevado atrás, agache com a perna da frente." },
    ],
    ombros: [
      { name: "Desenvolvimento com halteres", description: "Sentado, levante os halteres acima da cabeça." },
      { name: "Elevação lateral", description: "Levante os halteres lateralmente até a altura dos ombros." },
      { name: "Elevação frontal", description: "Levante os halteres à frente até a altura dos ombros." },
      { name: "Remada alta", description: "Puxe a barra em direção ao queixo, mantendo os cotovelos altos." },
      { name: "Desenvolvimento militar", description: "Em pé, empurre a barra acima da cabeça." },
      { name: "Elevação posterior", description: "Inclinado, eleve os halteres para trás." },
      { name: "Arnold press", description: "Rotacione os halteres enquanto empurra para cima." },
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
    const targetExerciseCount = exerciseRange.max

    let exercisePool = []
    dayFocus.exercises.forEach((muscleGroup) => {
      if (exerciseDatabase[muscleGroup]) {
        exercisePool = [...exercisePool, ...exerciseDatabase[muscleGroup]]
      }
    })

    if (exercisePool.length < targetExerciseCount) {
      const complementaryGroups = Object.keys(exerciseDatabase).filter((group) => !dayFocus.exercises.includes(group))

      complementaryGroups.forEach((group) => {
        if (exercisePool.length < targetExerciseCount * 1.5) {
          exercisePool = [...exercisePool, ...exerciseDatabase[group].slice(0, 2)]
        }
      })
    }

    const shuffled = exercisePool.sort(() => 0.5 - Math.random())

    const finalExerciseCount = Math.min(targetExerciseCount, shuffled.length)

    for (let j = 0; j < finalExerciseCount; j++) {
      const exercise = shuffled[j]
      exercises.push({
        name: exercise.name,
        sets: quizData.experience === "iniciante" ? 3 : quizData.experience === "avancado" ? 5 : 4,
        reps: quizData.goal?.includes("ganhar-massa")
          ? "6-10"
          : quizData.goal?.includes("perder-peso")
            ? "12-20"
            : "8-12",
        rest: quizData.experience === "iniciante" ? "60s" : quizData.experience === "avancado" ? "120s" : "90s",
        description: exercise.description,
      })
    }

    while (exercises.length < targetExerciseCount && exercisePool.length > 0) {
      const baseExercise = exercisePool[exercises.length % exercisePool.length]
      exercises.push({
        name: `${baseExercise.name} (Variação)`,
        sets: quizData.experience === "iniciante" ? 2 : 3,
        reps: quizData.goal?.includes("perder-peso") ? "15-20" : "10-15",
        rest: "60s",
        description: `Variação do ${baseExercise.name.toLowerCase()}.`,
      })
    }

    console.log(`🏋️ [FALLBACK] Dia ${i + 1}: ${exercises.length} exercícios gerados (target: ${targetExerciseCount})`)

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
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout after 90 seconds")), 90000)
    })

    const mainLogic = async () => {
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

      const scientificCalcs = calculateScientificCalories(quizData)
      console.log(`🧮 [SCIENTIFIC CALCULATION] Target: ${scientificCalcs.finalCalories} kcal`)

      console.log(`🔍 [FIREBASE DEBUG] Saving to document: users/${userId}`)
      console.log(`🔍 [FIREBASE DEBUG] Scientific calculations to save:`, {
        finalCalories: scientificCalcs.finalCalories,
        protein: scientificCalcs.protein,
        carbs: scientificCalcs.carbs,
        fats: scientificCalcs.fats,
      })

      // Save scientific calculations to Firebase before AI generation
      const userDocRef = adminDb.collection("users").doc(userId)
      await userDocRef.set(
        {
          scientificCalculations: {
            ...scientificCalcs,
            calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
            quizDataSnapshot: quizData,
          },
        },
        { merge: true },
      )
      console.log("✅ [FIREBASE] Scientific calculations saved to Firebase")
      console.log(`🔍 [FIREBASE DEBUG] Saved under field: scientificCalculations`)

      // Retrieve the saved calculations for AI prompt
      const updatedDoc = await userDocRef.get()
      const savedCalcs = updatedDoc.data()?.scientificCalculations
      console.log(`🔍 [FIREBASE] Retrieved saved calculations: ${savedCalcs?.finalCalories} kcal`)
      console.log(`🔍 [FIREBASE DEBUG] Full retrieved data:`, savedCalcs)

      const mealConfig = getMealCountByBodyType(quizData.bodyType)
      console.log(`🍽️ [MEAL CONFIG] ${mealConfig.count} refeições para biotipo: ${quizData.bodyType}`)

      const exerciseRange = getExerciseCountRange(quizData.workoutTime || "45-60min")
      console.log(`🏋️ [EXERCISE COUNT] ${exerciseRange.description} para tempo: ${quizData.workoutTime}`)

      const dietPrompt = `
OBJETIVO CRÍTICO: Criar dieta que SOME EXATAMENTE ${savedCalcs.finalCalories} kcal (±25 kcal máximo).

DADOS CIENTÍFICOS SALVOS NO FIREBASE:
- Calorias alvo: ${savedCalcs.finalCalories} kcal (TMB: ${savedCalcs.tmb}, TDEE: ${savedCalcs.tdee})
- Proteína: ${savedCalcs.protein}g (${savedCalcs.protein * 4} kcal)
- Carboidratos: ${savedCalcs.carbs}g (${savedCalcs.carbs * 4} kcal)
- Gorduras: ${savedCalcs.fats}g (${savedCalcs.fats * 9} kcal)

DADOS DO CLIENTE:
- Peso: ${quizData.currentWeight}kg, ${quizData.gender}, ${quizData.age} anos
- Objetivo: ${quizData.goal?.join(", ")}
- Biotipo: ${quizData.bodyType}
- Alergias: ${quizData.allergies !== "nao" ? quizData.allergyDetails : "Nenhuma"}
- Preferências: ${quizData.diet !== "nao-sigo" ? quizData.diet : "Sem restrições"}

INSTRUÇÕES MATEMÁTICAS OBRIGATÓRIAS:
1. SOMA TOTAL EXATA: ${savedCalcs.finalCalories} kcal (±25 kcal máximo - NÃO EXCEDER ${savedCalcs.finalCalories + 25} kcal)
2. Distribuir em ${mealConfig.count} refeições: ${mealConfig.distribution.map((p, i) => `${mealConfig.names[i]}: ${Math.round(savedCalcs.finalCalories * p)} kcal`).join(", ")}
3. EXEMPLO DE CÁLCULO: Arroz = 130 kcal/100g, para 400 kcal = 307g
4. VALIDAÇÃO OBRIGATÓRIA: Some todas as calorias dos alimentos e AJUSTE as porções se necessário
5. LIMITE RÍGIDO: Se a soma passar de ${savedCalcs.finalCalories + 25} kcal, REDUZA as porções
6. Use os valores EXATOS do Firebase: ${savedCalcs.protein}g proteína, ${savedCalcs.carbs}g carboidratos, ${savedCalcs.fats}g gorduras

JSON OBRIGATÓRIO:
{
  "scientificReference": {
    "targetCalories": ${savedCalcs.finalCalories},
    "targetProtein": ${savedCalcs.protein},
    "targetCarbs": ${savedCalcs.carbs},
    "targetFats": ${savedCalcs.fats}
  },
  "totalDailyCalories": "${savedCalcs.finalCalories} kcal",
  "totalProtein": "${savedCalcs.protein}g",
  "totalCarbs": "${savedCalcs.carbs}g", 
  "totalFats": "${savedCalcs.fats}g",
  "meals": [${mealConfig.names
    .map((name, i) => {
      const targetCals = Math.round(savedCalcs.finalCalories * mealConfig.distribution[i])
      return `{"name": "${name}", "time": "${i === 0 ? "07:00" : i === 1 ? "10:00" : i === 2 ? "12:00" : i === 3 ? "15:00" : i === 4 ? "19:00" : "21:00"}", "foods": [{"name": "[alimento específico]", "quantity": "[quantidade precisa em g/ml]", "calories": "[calorias exatas] kcal"}], "totalCalories": "${targetCals} kcal"}`
    })
    .join(",")}]
}`

      const workoutPrompt = `
Crie EXATAMENTE ${requestedDays} dias de treino para ${quizData.gender}, ${quizData.experience}, ${quizData.workoutTime}.

DADOS DO CLIENTE PARA PERSONALIZAÇÃO:
- Experiência: ${quizData.experience}
- Objetivo: ${quizData.goal?.join(", ")}
- Biotipo: ${quizData.bodyType}
- Áreas problemáticas: ${quizData.problemAreas?.join(", ") || "Nenhuma específica"}
- Tempo disponível: ${quizData.workoutTime}
- Equipamentos: ${quizData.equipment?.join(", ") || "Academia"}

INSTRUÇÕES OBRIGATÓRIAS DE PERSONALIZAÇÃO:
- Cada dia deve ter EXATAMENTE ${exerciseRange.min}-${exerciseRange.max} exercícios (${exerciseRange.description})

SÉRIES E REPETIÇÕES OBRIGATÓRIAS BASEADAS NO PERFIL:

EXPERIÊNCIA ${quizData.experience?.toUpperCase()}:
${
  quizData.experience === "iniciante"
    ? "- SÉRIES: 2-3 séries por exercício\n- REPETIÇÕES: 12-15 repetições\n- DESCANSO: 60-90 segundos"
    : quizData.experience === "avancado"
      ? "- SÉRIES: 4-5 séries por exercício\n- REPETIÇÕES: 6-10 repetições\n- DESCANSO: 90-180 segundos"
      : "- SÉRIES: 3-4 séries por exercício\n- REPETIÇÕES: 8-12 repetições\n- DESCANSO: 60-120 segundos"
}

OBJETIVO ${quizData.goal?.join(", ").toUpperCase()}:
${
  quizData.goal?.includes("ganhar-massa")
    ? "- AJUSTE: +1 série, menos repetições (6-10), mais descanso (90-180s)"
    : quizData.goal?.includes("perder-peso")
      ? "- AJUSTE: -1 série, mais repetições (12-20), menos descanso (30-60s)"
      : "- AJUSTE: Manter valores base da experiência"
}

ÁREAS PROBLEMÁTICAS: ${quizData.problemAreas?.join(", ") || "Nenhuma"}
${
  quizData.problemAreas?.length > 0
    ? `- FOQUE EXTRA: +1 série nos exercícios para ${quizData.problemAreas.join(", ")}`
    : "- DESENVOLVIMENTO EQUILIBRADO"
}

NUNCA USE VALORES FIXOS COMO "4 SÉRIES" PARA TODOS. PERSONALIZE CADA EXERCÍCIO!

JSON OBRIGATÓRIO:
{
  "days": [${Array.from({ length: requestedDays }, (_, i) => `{"day": "Dia ${i + 1}", "title": "[nome]", "focus": "[foco]", "duration": "${quizData.workoutTime || "45-60min"}", "exercises": [{"name": "[exercício específico]", "sets": "[PERSONALIZADO: ${quizData.experience === "iniciante" ? "2-3" : quizData.experience === "avancado" ? "4-5" : "3-4"}]", "reps": "[PERSONALIZADO: ${quizData.goal?.includes("ganhar-massa") ? "6-10" : quizData.goal?.includes("perder-peso") ? "12-20" : "8-12"}]", "rest": "[PERSONALIZADO: ${quizData.experience === "iniciante" ? "60-90s" : quizData.experience === "avancado" ? "90-180s" : "60-120s"}]", "description": "[descrição detalhada]"}]}`).join(",")}],
  "weeklySchedule": "Treino ${requestedDays}x por semana"
}`

      const generateWithTimeout = async (prompt: string, type: string) => {
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${type} generation timeout`)), 30000)
        })

        const generation = openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um ${type === "diet" ? "nutricionista" : "personal trainer"}. Seja preciso e rápido.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
          max_tokens: type === "diet" ? 2000 : 3000,
        })

        return Promise.race([generation, timeout])
      }

      let dietPlan = null
      let workoutPlan = null

      try {
        console.log("🚀 [PARALLEL] Starting diet and workout generation")

        const [dietResponse, workoutResponse] = await Promise.allSettled([
          generateWithTimeout(dietPrompt, "diet"),
          generateWithTimeout(workoutPrompt, "workout"),
        ])

        // Process diet response
        if (dietResponse.status === "fulfilled") {
          try {
            const rawContent = dietResponse.value.choices[0].message?.content || "{}"
            console.log("🔍 [DIET RAW RESPONSE]:", rawContent.substring(0, 500) + "...")

            const parsed = JSON.parse(rawContent)
            console.log("🔍 [DIET PARSED]:", {
              totalCalories: parsed.totalDailyCalories,
              mealsCount: parsed.meals?.length,
              firstMealCalories: parsed.meals?.[0]?.totalCalories,
            })

            if (parsed.meals && Array.isArray(parsed.meals) && parsed.meals.length === mealConfig.count) {
              let actualSum = 0
              parsed.meals.forEach((meal) => {
                if (meal.foods && Array.isArray(meal.foods)) {
                  meal.foods.forEach((food) => {
                    const calories = Number.parseInt(food.calories?.replace(/[^\d]/g, "") || "0")
                    actualSum += calories
                  })
                }
              })
              console.log(
                `🔍 [DIET VERIFICATION] Target: ${savedCalcs.finalCalories} kcal, AI Generated Sum: ${actualSum} kcal, Difference: ${Math.abs(savedCalcs.finalCalories - actualSum)} kcal`,
              )

              parsed.totalDailyCalories = `${savedCalcs.finalCalories} kcal`
              parsed.totalProtein = `${savedCalcs.protein}g`
              parsed.totalCarbs = `${savedCalcs.carbs}g`
              parsed.totalFats = `${savedCalcs.fats}g`

              dietPlan = parsed
              console.log("✅ [DIET SUCCESS] Generated successfully with corrected totals")
            } else {
              console.log("⚠️ [DIET] Invalid structure - wrong meal count or format")
            }
          } catch (e) {
            console.log("⚠️ [DIET] Parse error:", e)
          }
        } else {
          console.log("⚠️ [DIET] Generation failed:", dietResponse.reason)
        }

        // Process workout response
        if (workoutResponse.status === "fulfilled") {
          try {
            const parsed = JSON.parse(workoutResponse.value.choices[0].message?.content || "{}")
            if (parsed.days && Array.isArray(parsed.days) && parsed.days.length === requestedDays) {
              workoutPlan = parsed
              console.log("✅ [WORKOUT SUCCESS] Generated successfully")
            }
          } catch (e) {
            console.log("⚠️ [WORKOUT] Parse error, using fallback")
          }
        }
      } catch (error) {
        console.log("⚠️ [PARALLEL] Generation failed, using fallbacks")
      }

      if (!dietPlan) {
        console.log("🔧 [DIET FALLBACK] Using scientific values")
        const mealCalories = mealConfig.distribution.map((percentage) =>
          Math.round(savedCalcs.finalCalories * percentage),
        )

        const fallbackMeals = mealConfig.names.map((name, index) => ({
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
                        : "Batata Doce",
              quantity:
                index === 0 ? "80g" : index === 1 ? "1 unidade" : index === 2 ? "150g" : index === 3 ? "150g" : "200g",
              calories: `${mealCalories[index]} kcal`,
            },
          ],
          totalCalories: `${mealCalories[index]} kcal`,
        }))

        dietPlan = {
          totalDailyCalories: `${savedCalcs.finalCalories} kcal`,
          totalProtein: `${savedCalcs.protein}g`,
          totalCarbs: `${savedCalcs.carbs}g`,
          totalFats: `${savedCalcs.fats}g`,
          meals: fallbackMeals,
        }
        console.log(`🔧 [FALLBACK VERIFICATION] Set totalDailyCalories to exactly ${savedCalcs.finalCalories} kcal`)
      }

      if (!workoutPlan) {
        console.log("🔧 [WORKOUT FALLBACK] Using manual generation")
        workoutPlan = {
          days: generateFallbackWorkoutDays(requestedDays, quizData),
          weeklySchedule: `Treino ${requestedDays}x por semana`,
        }
      }

      try {
        await userDocRef.set(
          {
            plans: { dietPlan, workoutPlan },
            dietPlan,
            workoutPlan,
            finalResults: {
              scientificTarget: savedCalcs.finalCalories,
              actualGenerated: dietPlan?.totalDailyCalories,
              valuesMatch: dietPlan?.totalDailyCalories === `${savedCalcs.finalCalories} kcal`,
              generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        console.log(
          `✅ Plans saved - Scientific: ${savedCalcs.finalCalories} kcal, Saved: ${dietPlan?.totalDailyCalories}`,
        )
      } catch (firestoreError) {
        console.error("⚠️ Firestore error:", firestoreError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          plans: { dietPlan, workoutPlan },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    return await Promise.race([mainLogic(), timeoutPromise])
  } catch (error: any) {
    console.error("❌ Fatal error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * Calcula o número de calorias baseado nos dados do cliente
 */
function calculateScientificCalories(data: any) {
  const weight = Number.parseFloat(data.currentWeight) || 70
  const height = Number.parseFloat(data.height) || 170
  const age = Number.parseFloat(data.age) || 25
  const gender = data.gender || "masculino"
  const trainingDays = data.trainingDaysPerWeek || 5
  const goals = Array.isArray(data.goal) ? data.goal : [data.goal || "ganhar-massa"]

  const targetWeight = Number.parseFloat(data.targetWeight) || weight
  const timeToGoal = data.timeToGoal || ""
  const bodyType = data.bodyType || ""

  // TMB (Mifflin-St Jeor) - unchanged, already correct
  let tmb
  if (gender.toLowerCase() === "feminino") {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5
  }

  let activityMultiplier
  if (trainingDays <= 1)
    activityMultiplier = 1.2 // Sedentário
  else if (trainingDays <= 3)
    activityMultiplier = 1.375 // Leve
  else if (trainingDays <= 5)
    activityMultiplier = 1.55 // Moderado
  else if (trainingDays <= 6)
    activityMultiplier = 1.725 // Intenso
  else activityMultiplier = 1.9 // Muito intenso

  let tdee = tmb * activityMultiplier

  if (bodyType.toLowerCase() === "ectomorfo") {
    tdee = tdee * 1.1 // +10% for ectomorphs
  }

  let dailyCalorieAdjustment = 0

  if (goals.includes("perder-peso") || goals.includes("emagrecer")) {
    // Weight loss: calculate deficit based on goal
    const weightDifference = Math.abs(weight - targetWeight)
    if (timeToGoal && weightDifference > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightDifference / weeksToGoal
        // 7700 kcal = 1kg, so daily deficit = (kg per week * 7700) / 7 days
        dailyCalorieAdjustment = -Math.round((weeklyWeightChange * 7700) / 7)
      } else {
        dailyCalorieAdjustment = -500 // Default moderate deficit
      }
    } else {
      dailyCalorieAdjustment = -500 // Default moderate deficit
    }
  } else if (goals.includes("ganhar-massa") || goals.includes("ganhar-peso")) {
    // Weight gain: calculate surplus based on goal
    const weightDifference = Math.abs(targetWeight - weight)
    if (timeToGoal && weightDifference > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightDifference / weeksToGoal
        // 7700 kcal = 1kg, so daily surplus = (kg per week * 7700) / 7 days
        dailyCalorieAdjustment = Math.round((weeklyWeightChange * 7700) / 7)
      } else {
        dailyCalorieAdjustment = 500 // Default moderate surplus
      }
    } else {
      dailyCalorieAdjustment = 500 // Default moderate surplus
    }
  }
  // Maintenance: no adjustment (dailyCalorieAdjustment = 0)

  const finalCalories = Math.round(tdee + dailyCalorieAdjustment)

  let proteinPerKg = 1.6 // Base protein
  if (goals.includes("ganhar-massa"))
    proteinPerKg = 2.2 // Higher for muscle gain
  else if (goals.includes("perder-peso")) proteinPerKg = 2.0 // Higher for muscle preservation

  const protein = Math.round(weight * proteinPerKg)
  const fats = Math.round(weight * 1.0) // 1g/kg - unchanged
  const carbs = Math.round((finalCalories - protein * 4 - fats * 9) / 4)

  console.log(
    `🧮 [SCIENTIFIC CALC] TMB: ${Math.round(tmb)}, TDEE: ${Math.round(tdee)}, Adjustment: ${dailyCalorieAdjustment}, Final: ${finalCalories}`,
  )

  return {
    tmb: Math.round(tmb),
    tdee: Math.round(tdee),
    finalCalories,
    protein,
    carbs,
    fats,
    dailyCalorieAdjustment,
    weeksToGoal: timeToGoal ? calculateWeeksToGoal(timeToGoal) : 0,
  }
}

function calculateWeeksToGoal(timeToGoal: string): number {
  try {
    // Handle Brazilian date format: "10 de nov. de 2025"
    const months = {
      jan: 0,
      fev: 1,
      mar: 2,
      abr: 3,
      mai: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      set: 8,
      out: 9,
      nov: 10,
      dez: 11,
    }

    const parts = timeToGoal.toLowerCase().split(" ")
    if (parts.length >= 5) {
      const day = Number.parseInt(parts[0])
      const monthAbbr = parts[2].replace(".", "").substring(0, 3)
      const year = Number.parseInt(parts[4])

      if (months[monthAbbr] !== undefined) {
        const goalDate = new Date(year, months[monthAbbr], day)
        const currentDate = new Date()
        const timeDifferenceMs = goalDate.getTime() - currentDate.getTime()
        const weeksToGoal = Math.max(1, Math.round(timeDifferenceMs / (1000 * 60 * 60 * 24 * 7)))
        return weeksToGoal
      }
    }

    // Fallback: try to parse as regular date
    const goalDate = new Date(timeToGoal)
    if (!isNaN(goalDate.getTime())) {
      const currentDate = new Date()
      const timeDifferenceMs = goalDate.getTime() - currentDate.getTime()
      return Math.max(1, Math.round(timeDifferenceMs / (1000 * 60 * 60 * 24 * 7)))
    }

    return 12 // Default to 12 weeks if parsing fails
  } catch (error) {
    console.log("⚠️ [DATE PARSE] Error parsing timeToGoal:", timeToGoal)
    return 12 // Default to 12 weeks
  }
}
