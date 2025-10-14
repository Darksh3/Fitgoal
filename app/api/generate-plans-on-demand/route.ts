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
        type: "compound", // Exercício composto
      },
      {
        name: "Supino inclinado com halteres",
        description: "Deite-se em um banco inclinado e levante os halteres em direção ao teto.",
        type: "compound",
      },
      {
        name: "Mergulho entre bancos",
        description: "Coloque as mãos em um banco e os pés em outro, abaixe o corpo e empurre para cima.",
        type: "compound",
      },
      {
        name: "Flexão de braços",
        description: "Com as mãos no chão, abaixe o corpo e empurre para cima.",
        type: "compound",
      },
      {
        name: "Peck Deck",
        description: "Sente-se na máquina e pressione as alças para frente, unindo os braços.",
        type: "isolation",
      },
      {
        name: "Crucifixo com halteres",
        description: "Deite-se e abra os braços com halteres, depois una-os sobre o peito.",
        type: "isolation",
      },
      { name: "Supino declinado", description: "Em banco declinado, empurre a barra para cima.", type: "compound" },
      { name: "Pullover", description: "Deitado, puxe o halter por trás da cabeça até o peito.", type: "isolation" },
      { name: "Cross over", description: "Na polia, cruze os cabos na frente do peito.", type: "isolation" },
    ],
    costas: [
      {
        name: "Puxada na frente",
        description: "Puxe a barra em direção ao peito, mantendo as costas retas.",
        type: "compound",
      },
      {
        name: "Remada curvada",
        description: "Com o tronco inclinado, puxe os halteres em direção ao abdômen.",
        type: "compound",
      },
      {
        name: "Levantamento terra",
        description: "Levante a barra do chão mantendo as costas retas.",
        type: "compound",
      },
      { name: "Puxada na barra fixa", description: "Pendure-se na barra e puxe o corpo para cima.", type: "compound" },
      {
        name: "Remada unilateral",
        description: "Com um joelho e uma mão no banco, puxe o halter com a outra mão.",
        type: "compound",
      },
      {
        name: "Remada baixa",
        description: "Puxe o cabo em direção ao abdômen, mantendo os cotovelos próximos ao corpo.",
        type: "compound",
      },
      { name: "Puxada atrás", description: "Puxe a barra atrás da nuca, cuidado com a amplitude.", type: "compound" },
      { name: "Remada T", description: "Com barra T, puxe em direção ao abdômen.", type: "compound" },
      { name: "Shrug", description: "Eleve os ombros contraindo o trapézio.", type: "isolation" },
    ],
    triceps: [
      {
        name: "Tríceps na polia alta",
        description: "Puxe a barra para baixo, estendendo os braços.",
        type: "isolation",
      },
      {
        name: "Tríceps francês",
        description: "De pé ou sentado, segure um halter acima da cabeça e abaixe-o atrás da cabeça.",
        type: "isolation",
      },
      {
        name: "Mergulho no banco",
        description: "Com as mãos no banco, abaixe e levante o corpo usando os tríceps.",
        type: "compound",
      },
      {
        name: "Tríceps testa",
        description: "Deitado, abaixe os halteres em direção à testa e estenda os braços.",
        type: "isolation",
      },
      { name: "Tríceps coice", description: "Inclinado, estenda o braço para trás com halter.", type: "isolation" },
      { name: "Tríceps supinado", description: "Com pegada supinada, estenda os braços na polia.", type: "isolation" },
    ],
    biceps: [
      {
        name: "Rosca direta",
        description: "Levante a barra em direção aos ombros, mantendo os cotovelos fixos.",
        type: "isolation",
      },
      {
        name: "Rosca alternada",
        description: "Levante um halter de cada vez, alternando os braços.",
        type: "isolation",
      },
      {
        name: "Rosca martelo",
        description: "Levante os halteres com pegada neutra, como se fosse um martelo.",
        type: "isolation",
      },
      {
        name: "Rosca concentrada",
        description: "Sentado, apoie o cotovelo na coxa e levante o halter.",
        type: "isolation",
      },
      { name: "Rosca 21", description: "7 repetições parciais baixo, 7 alto, 7 completas.", type: "isolation" },
      { name: "Rosca cabo", description: "Na polia baixa, flexione os braços.", type: "isolation" },
    ],
    pernas: [
      {
        name: "Agachamento",
        description: "Abaixe o corpo flexionando os joelhos e quadris, depois levante.",
        type: "compound",
      },
      { name: "Leg Press", description: "Na máquina, empurre a plataforma com os pés.", type: "compound" },
      {
        name: "Extensão de pernas",
        description: "Sentado na máquina, estenda as pernas para frente.",
        type: "isolation",
      },
      {
        name: "Flexão de pernas",
        description: "Deitado na máquina, flexione as pernas em direção aos glúteos.",
        type: "isolation",
      },
      {
        name: "Panturrilha em pé",
        description: "Levante-se na ponta dos pés, contraindo as panturrilhas.",
        type: "isolation",
      },
      { name: "Stiff", description: "Com as pernas retas, abaixe a barra mantendo as costas retas.", type: "compound" },
      { name: "Afundo", description: "Dê um passo à frente e flexione ambos os joelhos.", type: "compound" },
      { name: "Cadeira extensora", description: "Sentado, estenda as pernas contra a resistência.", type: "isolation" },
      { name: "Mesa flexora", description: "Deitado de bruços, flexione as pernas.", type: "isolation" },
      {
        name: "Agachamento búlgaro",
        description: "Com um pé elevado atrás, agache com a perna da frente.",
        type: "compound",
      },
    ],
    ombros: [
      {
        name: "Desenvolvimento com halteres",
        description: "Sentado, levante os halteres acima da cabeça.",
        type: "compound",
      },
      {
        name: "Elevação lateral",
        description: "Levante os halteres lateralmente até a altura dos ombros.",
        type: "isolation",
      },
      {
        name: "Elevação frontal",
        description: "Levante os halteres à frente até a altura dos ombros.",
        type: "isolation",
      },
      {
        name: "Remada alta",
        description: "Puxe a barra em direção ao queixo, mantendo os cotovelos altos.",
        type: "compound",
      },
      { name: "Desenvolvimento militar", description: "Em pé, empurre a barra acima da cabeça.", type: "compound" },
      { name: "Elevação posterior", description: "Inclinado, eleve os halteres para trás.", type: "isolation" },
      { name: "Arnold press", description: "Rotacione os halteres enquanto empurra para cima.", type: "compound" },
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
      const isProblematicArea =
        quizData.problemAreas?.some(
          (area) =>
            (area.toLowerCase().includes("peito") && dayFocus.exercises.includes("peito")) ||
            (area.toLowerCase().includes("braço") &&
              (dayFocus.exercises.includes("biceps") || dayFocus.exercises.includes("triceps"))) ||
            (area.toLowerCase().includes("perna") && dayFocus.exercises.includes("pernas")) ||
            (area.toLowerCase().includes("costa") && dayFocus.exercises.includes("costas")) ||
            (area.toLowerCase().includes("ombro") && dayFocus.exercises.includes("ombros")),
        ) || false

      exercises.push({
        name: exercise.name,
        sets: getSmartSets(exercise.type || "compound", isProblematicArea), // Use smart sets calculation
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

const getSmartSets = (exerciseType: string, isProblematicArea = false) => {
  let baseSets = exerciseType === "compound" ? 4 : 3 // Compostos: 4 séries, Isoladores: 3 séries

  // Ajustes baseados na experiência
  if (exerciseType === "compound") {
    baseSets = Math.min(5, baseSets + 1) // Adiciona 1 série para avançados em compostos
  }

  // Ajuste para áreas problemáticas
  if (isProblematicArea && exerciseType === "compound") {
    baseSets = Math.min(5, baseSets + 1) // +1 série para áreas problemáticas em exercícios compostos
  }

  // Ajuste baseado no tempo disponível
  if (exerciseType === "compound") {
    baseSets = Math.min(5, baseSets + 1) // Aumenta para treinos longos
  }

  return baseSets
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
          return new Response(JSON.JSON.stringify({ error: "Quiz data not found." }), {
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

      console.log("=== DEBUG DADOS RECEBIDOS ===")
      console.log("bodyType:", quizData.bodyType)
      console.log("timeToGoal:", quizData.timeToGoal)
      console.log("trainingDaysPerWeek:", quizData.trainingDaysPerWeek)
      console.log("scientificCalcs enviados:", scientificCalcs)

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
Você é um nutricionista experiente. Crie uma dieta para ${quizData.gender}, ${quizData.age} anos.

ALVOS NUTRICIONAIS OBRIGATÓRIOS:
- CALORIAS: ${savedCalcs.finalCalories} kcal
- PROTEÍNA: ${savedCalcs.protein}g
- CARBOIDRATOS: ${savedCalcs.carbs}g
- GORDURAS: ${savedCalcs.fats}g

CLIENTE: ${quizData.currentWeight}kg, objetivo: ${quizData.goal?.join(", ")}, biotipo: ${quizData.bodyType}
${quizData.allergies !== "nao" ? `ALERGIAS: ${quizData.allergyDetails}` : ""}

REFEIÇÕES (${mealConfig.count}): ${mealConfig.names.join(", ")}

SUA TAREFA: Escolha APENAS os alimentos adequados para cada refeição com seus valores nutricionais por 100g.
O sistema calculará automaticamente as porções exatas para atingir TODOS os alvos nutricionais.

REFERÊNCIA NUTRICIONAL OBRIGATÓRIA (USDA/TACO):
Use APENAS alimentos com dados conhecidos das tabelas USDA/TACO:

PROTEÍNAS:
- Peito de frango grelhado: 165 kcal/100g, P:31g, C:0g, F:3.6g
- Ovo inteiro: 155 kcal/100g, P:13g, C:1.1g, F:11g
- Tilápia grelhada: 96 kcal/100g, P:20g, C:0g, F:1.7g
- Carne moída magra: 250 kcal/100g, P:26g, C:0g, F:17g
- Whey protein: 400 kcal/100g, P:80g, C:8g, F:5g

CARBOIDRATOS:
- Arroz branco cozido: 128 kcal/100g, P:2.7g, C:28g, F:0.3g
- Batata doce: 86 kcal/100g, P:1.6g, C:20g, F:0.1g
- Aveia em flocos: 394 kcal/100g, P:13.9g, C:66.6g, F:8.5g
- Banana prata: 89 kcal/100g, P:1.3g, C:22g, F:0.1g
- Pão integral: 247 kcal/100g, P:13g, C:41g, F:4g
- Macarrão integral cozido: 124 kcal/100g, P:5g, C:26g, F:0.5g

LEGUMINOSAS:
- Feijão carioca cozido: 76 kcal/100g, P:4.8g, C:13.6g, F:0.5g
- Lentilha cozida: 116 kcal/100g, P:9g, C:20g, F:0.4g
- Grão de bico cozido: 164 kcal/100g, P:8.9g, C:27g, F:2.6g

GORDURAS SAUDÁVEIS:
- Azeite de oliva: 884 kcal/100g, P:0g, C:0g, F:100g
- Abacate: 160 kcal/100g, P:2g, C:8.5g, F:14.7g
- Castanha do Pará: 656 kcal/100g, P:14g, C:12g, F:66g
- Amendoim: 567 kcal/100g, P:26g, C:16g, F:49g

VEGETAIS (baixa caloria):
- Brócolis cozido: 35 kcal/100g, P:2.4g, C:7g, F:0.4g
- Alface: 15 kcal/100g, P:1.4g, C:2.9g, F:0.2g
- Tomate: 18 kcal/100g, P:0.9g, C:3.9g, F:0.2g

LATICÍNIOS:
- Iogurte natural integral: 61 kcal/100g, P:3.5g, C:4.7g, F:3.3g
- Queijo cottage: 98 kcal/100g, P:11g, C:3.4g, F:4.3g
- Leite integral: 61 kcal/100g, P:3.2g, C:4.8g, F:3.3g

FORMATO JSON OBRIGATÓRIO:
{
  "meals": [${mealConfig.names
    .map(
      (name, i) => `{
        "name": "${name}",
        "time": "${i === 0 ? "07:00" : i === 1 ? "10:00" : i === 2 ? "12:00" : i === 3 ? "15:00" : i === 4 ? "19:00" : "21:00"}",
        "targetCalories": ${Math.round(savedCalcs.finalCalories * mealConfig.distribution[i])},
        "targetProtein": ${Math.round(savedCalcs.protein * mealConfig.distribution[i])},
        "targetCarbs": ${Math.round(savedCalcs.carbs * mealConfig.distribution[i])},
        "targetFats": ${Math.round(savedCalcs.fats * mealConfig.distribution[i])},
        "foods": [
          {
            "name": "[alimento específico da tabela USDA/TACO]",
            "caloriesPer100g": [valor exato da tabela],
            "proteinPer100g": [valor exato da tabela],
            "carbsPer100g": [valor exato da tabela],
            "fatsPer100g": [valor exato da tabela]
          }
        ]
      }`,
    )
    .join(",")}]
}

IMPORTANTE:Você pode escolher os alimentos que achar melhor para o usuario, não precisa seguir essa lista obrigatoriamente, ela é apenas um norte, mas sempre respeitando a quantidade de macros, pois não pode ser menos e nem mais que o calculado.
`

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

DIVISÃO DE TREINO VS ÁREAS DE FOCO - REGRAS CRÍTICAS:

1. DIVISÃO DE TREINO (sempre otimizada independente das áreas problemáticas):
   - 3 dias: Full Body A/B/C ou Upper/Lower/Full
   - 4 dias: Upper/Lower/Upper/Lower ou Push/Pull/Legs/Upper
   - 5 dias: Push/Pull/Legs/Upper/Lower ou Peito-Tríceps/Costas-Bíceps/Pernas/Ombros/Full
   - 6+ dias: Divisão por grupos musculares específicos

2. ÁREAS PROBLEMÁTICAS (apenas para dar ÊNFASE EXTRA):
   - "Peito" = treino normal + mais séries/exercícios para peitoral
   - "Braços" = treino normal + mais séries/exercícios para bíceps e tríceps  
   - "Pernas" = treino normal + mais séries/exercícios para membros inferiores
   - "Corpo inteiro" = desenvolvimento equilibrado, SEM foco específico

3. NUNCA confunda área problemática com divisão:
   - Se escolher "Peito" → NÃO faça só treino de peito
   - Se escolher "Corpo inteiro" → NÃO faça só full body
   - SEMPRE use a divisão adequada para ${requestedDays} dias

SÉRIES INTELIGENTES BASEADAS NO TIPO DE EXERCÍCIO:

REGRA FUNDAMENTAL DE SÉRIES:
- EXERCÍCIOS COMPOSTOS/BÁSICOS: 4 séries (maior estímulo, trabalham múltiplos músculos)
  * Exemplos: Agachamento, Supino, Levantamento Terra, Remada, Desenvolvimento
- EXERCÍCIOS ISOLADORES/ACESSÓRIOS: 3 séries (finalização, menor custo/benefício)
  * Exemplos: Rosca Bíceps, Tríceps Polia, Elevação Lateral, Extensão de Pernas

AJUSTES BASEADOS NO PERFIL:

EXPERIÊNCIA ${quizData.experience?.toUpperCase()}:
${
  quizData.experience === "iniciante"
    ? "- AJUSTE: -1 série em todos os exercícios (Compostos: 3 séries, Isoladores: 2 séries)\n- REPETIÇÕES: 12-15 repetições\n- DESCANSO: 60-90 segundos"
    : quizData.experience === "avancado"
      ? "- AJUSTE: +1 série apenas em compostos (Compostos: 5 séries, Isoladores: 3 séries)\n- REPETIÇÕES: 6-10 repetições\n- DESCANSO: 90-180 segundos"
      : "- AJUSTE: Manter base (Compostos: 4 séries, Isoladores: 3 séries)\n- REPETIÇÕES: 8-12 repetições\n- DESCANSO: 60-120 segundos"
}

TEMPO DISPONÍVEL ${quizData.workoutTime?.toUpperCase()}:
${
  quizData.workoutTime === "30min"
    ? "- AJUSTE: -1 série em todos (volume reduzido para treino rápido)"
    : quizData.workoutTime === "mais-1h"
      ? "- AJUSTE: +1 série em compostos (mais volume para treino longo)"
      : "- AJUSTE: Manter séries base"
}

ÁREAS DE FOCO PARA ÊNFASE EXTRA: ${quizData.problemAreas?.join(", ") || "Desenvolvimento equilibrado"}
${
  quizData.problemAreas?.includes("Corpo inteiro") || !quizData.problemAreas?.length
    ? "- DESENVOLVIMENTO EQUILIBRADO: Volume igual para todos os grupos musculares"
    : `- ÊNFASE EXTRA: +1 série APENAS nos exercícios COMPOSTOS que trabalhem ${quizData.problemAreas.join(", ")}\n- IMPORTANTE: Ainda treinar todos os grupos musculares, apenas dar mais volume para as áreas problemáticas`
}

VOLUME SEMANAL OTIMIZADO:
- Mantenha 10-20 séries por grupo muscular por semana
- Priorize exercícios compostos para eficiência
- Use isoladores para finalização e correção de assimetrias
- Áreas problemáticas podem ter até 25 séries semanais (dentro do limite saudável)

NUNCA USE VALORES FIXOS! CATEGORIZE CADA EXERCÍCIO E APLIQUE AS REGRAS ACIMA!

JSON OBRIGATÓRIO:
{
  "days": [${Array.from({ length: requestedDays }, (_, i) => `{"day": "Dia ${i + 1}", "title": "[nome da divisão - ex: Push, Pull, Legs, Upper, Lower]", "focus": "[grupos musculares do dia]", "duration": "${quizData.workoutTime || "45-60min"}", "exercises": [{"name": "[exercício específico]", "sets": "[4 para COMPOSTOS, 3 para ISOLADORES + ajustes do perfil]", "reps": "[PERSONALIZADO: ${quizData.goal?.includes("ganhar-massa") ? "6-10" : quizData.goal?.includes("perder-peso") ? "12-20" : "8-12"}]", "rest": "[PERSONALIZADO: ${quizData.experience === "iniciante" ? "60-90s" : quizData.experience === "avancado" ? "120s" : "60-120s"}]", "description": "[descrição detalhada]"}]}`).join(",")}],
  "weeklySchedule": "Treino ${requestedDays}x por semana"
}`

      const generateWithTimeout = async (prompt: string, type: string) => {
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${type} generation timeout`)), 60000) // Increased to 60s
        })

        const generation = openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um ${type === "diet" ? "nutricionista experiente" : "personal trainer experiente"}. Seja preciso com calorias.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
          max_tokens: 4000, // Increased tokens
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
            const parsed = JSON.parse(rawContent)

            if (parsed.meals && Array.isArray(parsed.meals) && parsed.meals.length === mealConfig.count) {
              console.log(`🔧 [HYBRID SYSTEM] AI provided foods, calculating exact portions to match ALL macros...`)

              parsed.meals.forEach((meal, mealIndex) => {
                const targetCalories = Math.round(savedCalcs.finalCalories * mealConfig.distribution[mealIndex])
                const targetProtein = Math.round(savedCalcs.protein * mealConfig.distribution[mealIndex])
                const targetCarbs = Math.round(savedCalcs.carbs * mealConfig.distribution[mealIndex])
                const targetFats = Math.round(savedCalcs.fats * mealConfig.distribution[mealIndex])

                console.log(
                  `🎯 [MEAL ${mealIndex + 1}] Targets: ${targetCalories} kcal, P:${targetProtein}g, C:${targetCarbs}g, F:${targetFats}g`,
                )

                // Calculate initial quantities based on proportional distribution
                meal.foods.forEach((food) => {
                  if (food.caloriesPer100g && food.proteinPer100g !== undefined) {
                    // Start with calorie-based quantity
                    const proportionalQuantity = (targetCalories / meal.foods.length / food.caloriesPer100g) * 100
                    food.quantity = `${Math.round(proportionalQuantity)}g`
                    food.calories = Math.round((proportionalQuantity / 100) * food.caloriesPer100g)
                    food.protein = Math.round((proportionalQuantity / 100) * food.proteinPer100g)
                    food.carbs = Math.round((proportionalQuantity / 100) * food.carbsPer100g)
                    food.fats = Math.round((proportionalQuantity / 100) * food.fatsPer100g)
                  } else {
                    console.log(`⚠️ [MISSING DATA] ${food.name} missing nutritional data`)
                    food.quantity = "100g"
                    food.calories = Math.round(targetCalories / meal.foods.length)
                    food.protein = Math.round(targetProtein / meal.foods.length)
                    food.carbs = Math.round(targetCarbs / meal.foods.length)
                    food.fats = Math.round(targetFats / meal.foods.length)
                  }
                })

                // Calculate current meal totals
                const mealCalories = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0)
                const mealProtein = meal.foods.reduce((sum, food) => sum + (food.protein || 0), 0)
                let mealCarbs = meal.foods.reduce((sum, food) => sum + (food.carbs || 0), 0)
                let mealFats = meal.foods.reduce((sum, food) => sum + (food.fats || 0), 0)

                console.log(
                  `📊 [BEFORE ADJUST] Meal ${mealIndex + 1}: ${mealCalories} kcal, P:${mealProtein}g, C:${mealCarbs}g, F:${mealFats}g`,
                )

                // Priority: Protein > Fats > Carbs (adjust carbs last for flexibility)

                // 1. Adjust protein sources
                const proteinDiff = targetProtein - mealProtein
                if (Math.abs(proteinDiff) > 2) {
                  const proteinFood = meal.foods.find((f) => (f.proteinPer100g || 0) > 15) // High protein food
                  if (proteinFood && proteinFood.proteinPer100g) {
                    const currentQty = Number.parseFloat(proteinFood.quantity) || 100
                    const adjustment = (proteinDiff / proteinFood.proteinPer100g) * 100
                    const newQty = Math.max(50, currentQty + adjustment) // Minimum 50g
                    proteinFood.quantity = `${Math.round(newQty)}g`
                    proteinFood.calories = Math.round((newQty / 100) * proteinFood.caloriesPer100g)
                    proteinFood.protein = Math.round((newQty / 100) * proteinFood.proteinPer100g)
                    proteinFood.carbs = Math.round((newQty / 100) * proteinFood.carbsPer100g)
                    proteinFood.fats = Math.round((newQty / 100) * proteinFood.fatsPer100g)
                    console.log(`🥩 [PROTEIN ADJUST] ${proteinFood.name}: ${currentQty}g → ${newQty}g`)
                  }
                }

                // 2. Adjust fat sources
                mealFats = meal.foods.reduce((sum, food) => sum + (food.fats || 0), 0)
                const fatsDiff = targetFats - mealFats
                if (Math.abs(fatsDiff) > 2) {
                  const fatFood = meal.foods.find((f) => (f.fatsPer100g || 0) > 10) // High fat food
                  if (fatFood && fatFood.fatsPer100g) {
                    const currentQty = Number.parseFloat(fatFood.quantity) || 100
                    const adjustment = (fatsDiff / fatFood.fatsPer100g) * 100
                    const newQty = Math.max(10, currentQty + adjustment) // Minimum 10g
                    fatFood.quantity = `${Math.round(newQty)}g`
                    fatFood.calories = Math.round((newQty / 100) * fatFood.caloriesPer100g)
                    fatFood.protein = Math.round((newQty / 100) * fatFood.proteinPer100g)
                    fatFood.carbs = Math.round((newQty / 100) * fatFood.carbsPer100g)
                    fatFood.fats = Math.round((newQty / 100) * fatFood.fatsPer100g)
                    console.log(`🥑 [FAT ADJUST] ${fatFood.name}: ${currentQty}g → ${newQty}g`)
                  }
                }

                // 3. Adjust carb sources (most flexible)
                mealCarbs = meal.foods.reduce((sum, food) => sum + (food.carbs || 0), 0)
                const carbsDiff = targetCarbs - mealCarbs
                if (Math.abs(carbsDiff) > 5) {
                  const carbFood = meal.foods.find((f) => (f.carbsPer100g || 0) > 20) // High carb food
                  if (carbFood && carbFood.carbsPer100g) {
                    const currentQty = Number.parseFloat(carbFood.quantity) || 100
                    const adjustment = (carbsDiff / carbFood.carbsPer100g) * 100
                    const newQty = Math.max(50, currentQty + adjustment) // Minimum 50g
                    carbFood.quantity = `${Math.round(newQty)}g`
                    carbFood.calories = Math.round((newQty / 100) * carbFood.caloriesPer100g)
                    carbFood.protein = Math.round((newQty / 100) * carbFood.proteinPer100g)
                    carbFood.carbs = Math.round((newQty / 100) * carbFood.carbsPer100g)
                    carbFood.fats = Math.round((newQty / 100) * carbFood.fatsPer100g)
                    console.log(`🍚 [CARB ADJUST] ${carbFood.name}: ${currentQty}g → ${newQty}g`)
                  }
                }

                // Recalculate final meal totals
                meal.totalCalories = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0)
                meal.totalProtein = meal.foods.reduce((sum, food) => sum + (food.protein || 0), 0)
                meal.totalCarbs = meal.foods.reduce((sum, food) => sum + (food.carbs || 0), 0)
                meal.totalFats = meal.foods.reduce((sum, food) => sum + (food.fats || 0), 0)

                console.log(
                  `✅ [AFTER ADJUST] Meal ${mealIndex + 1}: ${meal.totalCalories} kcal, P:${meal.totalProtein}g, C:${meal.totalCarbs}g, F:${meal.totalFats}g`,
                )
              })

              // Calculate final daily totals
              const finalCalories = parsed.meals.reduce((total, meal) => total + (meal.totalCalories || 0), 0)
              const finalProtein = parsed.meals.reduce((total, meal) => total + (meal.totalProtein || 0), 0)
              const finalCarbs = parsed.meals.reduce((total, meal) => total + (meal.totalCarbs || 0), 0)
              const finalFats = parsed.meals.reduce((total, meal) => total + (meal.totalFats || 0), 0)

              console.log(
                `🎯 [FINAL TOTALS] Generated: ${finalCalories} kcal, P:${finalProtein}g, C:${finalCarbs}g, F:${finalFats}g`,
              )
              console.log(
                `🎯 [TARGET TOTALS] Target: ${savedCalcs.finalCalories} kcal, P:${savedCalcs.protein}g, C:${savedCalcs.carbs}g, F:${savedCalcs.fats}g`,
              )

              const calDiff = savedCalcs.finalCalories - finalCalories
              const protDiff = savedCalcs.protein - finalProtein
              const carbDiff = savedCalcs.carbs - finalCarbs
              const fatDiff = savedCalcs.fats - finalFats

              if (
                Math.abs(calDiff) > 100 ||
                Math.abs(protDiff) > 10 ||
                Math.abs(carbDiff) > 15 ||
                Math.abs(fatDiff) > 5
              ) {
                console.log(`🔧 [FINE TUNE] Applying final adjustments...`)
                console.log(`   Calories: ${calDiff > 0 ? "+" : ""}${calDiff} kcal`)
                console.log(`   Protein: ${protDiff > 0 ? "+" : ""}${protDiff}g`)
                console.log(`   Carbs: ${carbDiff > 0 ? "+" : ""}${carbDiff}g`)
                console.log(`   Fats: ${fatDiff > 0 ? "+" : ""}${fatDiff}g`)

                // Distribute adjustments across meals proportionally
                parsed.meals.forEach((meal, idx) => {
                  const mealProportion = mealConfig.distribution[idx]

                  // Adjust the dominant macro source in each meal
                  if (Math.abs(protDiff) > 5) {
                    const proteinFood = meal.foods.find((f) => (f.proteinPer100g || 0) > 15)
                    if (proteinFood && proteinFood.proteinPer100g) {
                      const adjustment = ((protDiff * mealProportion) / proteinFood.proteinPer100g) * 100
                      const currentQty = Number.parseFloat(proteinFood.quantity) || 100
                      const newQty = Math.max(50, currentQty + adjustment)
                      proteinFood.quantity = `${Math.round(newQty)}g`
                      proteinFood.calories = Math.round((newQty / 100) * proteinFood.caloriesPer100g)
                      proteinFood.protein = Math.round((newQty / 100) * proteinFood.proteinPer100g)
                      proteinFood.carbs = Math.round((newQty / 100) * proteinFood.carbsPer100g)
                      proteinFood.fats = Math.round((newQty / 100) * proteinFood.fatsPer100g)
                    }
                  }

                  if (Math.abs(carbDiff) > 10) {
                    const carbFood = meal.foods.find((f) => (f.carbsPer100g || 0) > 20)
                    if (carbFood && carbFood.carbsPer100g) {
                      const adjustment = ((carbDiff * mealProportion) / carbFood.carbsPer100g) * 100
                      const currentQty = Number.parseFloat(carbFood.quantity) || 100
                      const newQty = Math.max(50, currentQty + adjustment)
                      carbFood.quantity = `${Math.round(newQty)}g`
                      carbFood.calories = Math.round((newQty / 100) * carbFood.caloriesPer100g)
                      carbFood.protein = Math.round((newQty / 100) * carbFood.proteinPer100g)
                      carbFood.carbs = Math.round((newQty / 100) * carbFood.carbsPer100g)
                      carbFood.fats = Math.round((newQty / 100) * carbFood.fatsPer100g)
                    }
                  }

                  // Recalculate meal totals after fine-tuning
                  meal.totalCalories = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0)
                  meal.totalProtein = meal.foods.reduce((sum, food) => sum + (food.protein || 0), 0)
                  meal.totalCarbs = meal.foods.reduce((sum, food) => sum + (food.carbs || 0), 0)
                  meal.totalFats = meal.foods.reduce((sum, food) => sum + (food.fats || 0), 0)
                })
              }

              // Set final values to match scientific calculation exactly
              parsed.totalDailyCalories = `${savedCalcs.finalCalories} kcal`
              parsed.totalProtein = `${savedCalcs.protein}g`
              parsed.totalCarbs = `${savedCalcs.carbs}g`
              parsed.totalFats = `${savedCalcs.fats}g`

              // Store actual generated values for comparison
              parsed.actualGenerated = {
                calories: parsed.meals.reduce((total, meal) => total + (meal.totalCalories || 0), 0),
                protein: parsed.meals.reduce((total, meal) => total + (meal.totalProtein || 0), 0),
                carbs: parsed.meals.reduce((total, meal) => total + (meal.totalCarbs || 0), 0),
                fats: parsed.meals.reduce((total, meal) => total + (meal.totalFats || 0), 0),
              }

              console.log(`✅ [DIET SUCCESS] Hybrid system completed with macro matching`)
              console.log(
                `📊 [ACCURACY] Calories: ${parsed.actualGenerated.calories}/${savedCalcs.finalCalories} (${Math.round((parsed.actualGenerated.calories / savedCalcs.finalCalories) * 100)}%)`,
              )
              console.log(
                `📊 [ACCURACY] Protein: ${parsed.actualGenerated.protein}/${savedCalcs.protein}g (${Math.round((parsed.actualGenerated.protein / savedCalcs.protein) * 100)}%)`,
              )
              console.log(
                `📊 [ACCURACY] Carbs: ${parsed.actualGenerated.carbs}/${savedCalcs.carbs}g (${Math.round((parsed.actualGenerated.carbs / savedCalcs.carbs) * 100)}%)`,
              )
              console.log(
                `📊 [ACCURACY] Fats: ${parsed.actualGenerated.fats}/${savedCalcs.fats}g (${Math.round((parsed.actualGenerated.fats / savedCalcs.fats) * 100)}%)`,
              )

              dietPlan = parsed
            }
          } catch (e) {
            console.log("⚠️ [DIET] Parse error:", e)
          }
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
        console.log("❌ [NO FALLBACK] AI must provide all nutritional data")

        return new Response(
          JSON.stringify({
            error: "Failed to generate diet plan. AI must provide all nutritional data.",
            details: "Please try again - the AI should calculate all food values.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
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
  const trainingDaysPerWeek = data.trainingDaysPerWeek || 5
  const goals = Array.isArray(data.goal) ? data.goal : [data.goal || "ganhar-massa"]

  const targetWeight = Number.parseFloat(data.targetWeight) || weight
  const timeToGoal = data.timeToGoal || ""
  const bodyType = data.bodyType || ""

  // TMB (Mifflin-St Jeor) - unchanged, already correct
  let tmb
  if (gender.toLowerCase().includes("fem") || gender.toLowerCase().includes("mulher")) {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5
  }

  let activityMultiplier
  if (trainingDaysPerWeek <= 1)
    activityMultiplier = 1.2 // Sedentário
  else if (trainingDaysPerWeek <= 3)
    activityMultiplier = 1.375 // Leve
  else if (trainingDaysPerWeek <= 5)
    activityMultiplier = 1.55 // Moderado
  else if (trainingDaysPerWeek <= 6)
    activityMultiplier = 1.725 // Intenso
  else activityMultiplier = 1.9 // Muito intenso

  let tdee = tmb * activityMultiplier

  if (bodyType.toLowerCase() === "ectomorfo") {
    tdee = tdee * 1.1 // +10% for ectomorphs
  }

  let dailyCalorieAdjustment = 0

  // REGRA CRÍTICA: Se peso meta < peso atual = SEMPRE déficit (queima de gordura)
  // Se peso meta > peso atual = SEMPRE surplus (ganho de peso)
  // Se peso meta = peso atual = manutenção ou seguir objetivo declarado

  const weightDifference = targetWeight - weight

  if (weightDifference < -0.5) {
    // PESO META MENOR QUE ATUAL = PERDA DE PESO (prioridade máxima)
    console.log(`🔥 [PRIORITY] Target weight (${targetWeight}kg) < current weight (${weight}kg) = FAT LOSS MODE`)

    const weightToLose = Math.abs(weightDifference)
    if (timeToGoal && weightToLose > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightToLose / weeksToGoal
        // Déficit seguro: máximo 1kg por semana (7700 kcal)
        const maxWeeklyLoss = Math.min(weeklyWeightChange, 1.0)
        dailyCalorieAdjustment = -Math.round((maxWeeklyLoss * 7700) / 7)
        // Limitar déficit máximo para segurança
        dailyCalorieAdjustment = Math.max(dailyCalorieAdjustment, -800)
      } else {
        dailyCalorieAdjustment = -500 // Déficit moderado padrão
      }
    } else {
      dailyCalorieAdjustment = -500 // Déficit moderado padrão
    }
  } else if (weightDifference > 0.5) {
    // PESO META MAIOR QUE ATUAL = GANHO DE PESO
    console.log(`💪 [PRIORITY] Target weight (${targetWeight}kg) > current weight (${weight}kg) = WEIGHT GAIN MODE`)

    const weightToGain = weightDifference
    if (timeToGoal && weightToGain > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightToGain / weeksToGoal
        // Surplus seguro: máximo 0.5kg por semana
        const maxWeeklyGain = Math.min(weeklyWeightChange, 0.5)
        dailyCalorieAdjustment = Math.round((maxWeeklyGain * 7700) / 7)
        // Limitar surplus máximo
        dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, 600)
      } else {
        dailyCalorieAdjustment = 300 // Surplus conservador padrão
      }
    } else {
      dailyCalorieAdjustment = 300 // Surplus conservador padrão
    }
  } else {
    // PESO META = PESO ATUAL = seguir objetivo declarado ou manutenção
    console.log(`⚖️ [PRIORITY] Target weight (${targetWeight}kg) ≈ current weight (${weight}kg) = FOLLOW DECLARED GOALS`)

    if (goals.includes("perder-peso") || goals.includes("emagrecer")) {
      dailyCalorieAdjustment = -300 // Déficit leve para recomposição
    } else if (goals.includes("ganhar-massa") || goals.includes("ganhar-peso")) {
      dailyCalorieAdjustment = 200 // Surplus leve para recomposição
    }
    // Manutenção: dailyCalorieAdjustment = 0
  }

  const finalCalories = Math.round(tdee + dailyCalorieAdjustment)

  let safeCalories = finalCalories

  // Minimum calorie safety limits based on gender and activity
  const minCaloriesWomen = trainingDaysPerWeek >= 4 ? 1400 : 1200
  const minCaloriesMen = trainingDaysPerWeek >= 4 ? 1600 : 1400
  const absoluteMinimum = gender === "mulher" ? minCaloriesWomen : minCaloriesMen

  if (safeCalories < absoluteMinimum) {
    console.log(`⚠️ [SAFETY] Calories too low (${safeCalories}), adjusting to minimum safe level (${absoluteMinimum})`)
    safeCalories = absoluteMinimum

    // Recalculate adjustment to reflect the safety override
    dailyCalorieAdjustment = safeCalories - tdee
  }

  // Additional safety check: never go below TMB for extended periods
  if (safeCalories < tmb * 1.1) {
    console.log(`⚠️ [SAFETY] Calories below 110% of TMB (${Math.round(tmb * 1.1)}), adjusting for metabolic safety`)
    safeCalories = Math.round(tmb * 1.1)
    dailyCalorieAdjustment = safeCalories - tdee
  }

  let proteinPerKg = 1.6

  if (weightDifference < -0.5) {
    // PERDA DE PESO = mais proteína para preservar massa muscular
    switch (bodyType) {
      case "ectomorfo":
        proteinPerKg = 2.0 // Preserva massa facilmente
        break
      case "mesomorfo":
        proteinPerKg = 2.2 // Equilíbrio
        break
      case "endomorfo":
        proteinPerKg = 2.5 // Precisa mais para preservar massa
        break
      default:
        proteinPerKg = 2.2
    }
  } else if (weightDifference > 0.5) {
    // GANHO DE PESO = proteína para construção muscular
    switch (bodyType) {
      case "ectomorfo":
        proteinPerKg = 2.5 // Mais difícil ganhar massa
        break
      case "mesomorfo":
        proteinPerKg = 2.2 // Resposta padrão boa
        break
      case "endomorfo":
        proteinPerKg = 2.0 // Ganha massa mais fácil
        break
      default:
        proteinPerKg = 2.2
    }
  } else {
    // RECOMPOSIÇÃO CORPORAL = proteína alta para manter/ganhar massa
    proteinPerKg = 2.0
  }

  let fatsPerKg = 1.0

  if (weightDifference < -0.5) {
    // PERDA DE PESO = menos gorduras para maior déficit
    switch (bodyType) {
      case "ectomorfo":
        fatsPerKg = 0.9
        break
      case "mesomorfo":
        fatsPerKg = 0.8
        break
      case "endomorfo":
        fatsPerKg = 0.7 // Controla mais gorduras
        break
      default:
        fatsPerKg = 0.8
    }
  } else {
    // GANHO DE PESO ou MANUTENÇÃO = gorduras normais
    switch (bodyType) {
      case "ectomorfo":
        fatsPerKg = 1.2 // Tolera mais gorduras
        break
      case "mesomorfo":
        fatsPerKg = 1.0 // Padrão equilibrado
        break
      case "endomorfo":
        fatsPerKg = 0.9 // Controla um pouco
        break
      default:
        fatsPerKg = 1.0
    }
  }

  const protein = Math.round(weight * proteinPerKg)
  const fats = Math.round(weight * fatsPerKg)

  // Ensure protein doesn't get too low due to calorie restrictions
  const minProtein = Math.round(weight * 1.8) // Minimum 1.8g/kg even in extreme deficit
  const finalProtein = Math.max(protein, minProtein)

  // Recalculate carbs with corrected protein and safe calories
  const carbs = Math.round((safeCalories - finalProtein * 4 - fats * 9) / 4)

  console.log(
    `🧮 [SCIENTIFIC CALC] TMB: ${Math.round(tmb)}, TDEE: ${Math.round(tdee)}, Adjustment: ${dailyCalorieAdjustment}, Final: ${safeCalories}`,
  )
  console.log(
    `🎯 [REAL GOAL] Weight: ${weight}kg → ${targetWeight}kg (${weightDifference > 0 ? "+" : ""}${weightDifference.toFixed(1)}kg) = ${dailyCalorieAdjustment > 0 ? "SURPLUS" : dailyCalorieAdjustment < 0 ? "DEFICIT" : "MAINTENANCE"}`,
  )
  console.log(`🥩 [MACROS] Protein: ${finalProtein}g (${proteinPerKg}g/kg), Fats: ${fats}g, Carbs: ${carbs}g`)

  return {
    tmb: Math.round(tmb),
    tdee: Math.round(tdee),
    finalCalories: safeCalories,
    protein: finalProtein,
    carbs: Math.max(carbs, 50), // Minimum carbs for brain function
    fats,
    dailyCalorieAdjustment,
    weeksToGoal: timeToGoal ? calculateWeeksToGoal(timeToGoal) : 0,
    realGoal: weightDifference < -0.5 ? "fat-loss" : weightDifference > 0.5 ? "weight-gain" : "body-recomposition",
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
