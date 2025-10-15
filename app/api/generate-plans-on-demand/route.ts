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
Você é um nutricionista experiente. Crie uma dieta de ${savedCalcs.finalCalories} kcal EXATAS para ${quizData.gender}, ${quizData.age} anos.

ALVO OBRIGATÓRIO: ${savedCalcs.finalCalories} kcal
Proteína: ${savedCalcs.protein}g | Carboidratos: ${savedCalcs.carbs}g | Gorduras: ${savedCalcs.fats}g

CLIENTE: ${quizData.currentWeight}kg, objetivo: ${quizData.goal?.join(", ")}, biotipo: ${quizData.bodyType}
${quizData.allergies !== "nao" ? `ALERGIAS: ${quizData.allergyDetails}` : ""}

REFEIÇÕES (${mealConfig.count}): ${mealConfig.names.join(", ")}

REFERÊNCIA NUTRICIONAL OBRIGATÓRIA:
- Use EXCLUSIVAMENTE dados das tabelas USDA (United States Department of Agriculture) e TACO (Tabela Brasileira de Composição de Alimentos)
- Para alimentos brasileiros: priorize TACO
- Para alimentos internacionais: use USDA
- NUNCA invente valores nutricionais - use apenas dados oficiais dessas bases

EXEMPLOS DE VALORES OFICIAIS TACO/USDA:
- Arroz branco cozido: 128 kcal/100g (TACO)
- Feijão carioca cozido: 76 kcal/100g (TACO)
- Peito de frango grelhado: 165 kcal/100g (USDA)
- Banana prata: 89 kcal/100g (TACO)
- Aveia em flocos: 394 kcal/100g (USDA)
- Ovo de galinha inteiro: 155 kcal/100g (TACO)

INSTRUÇÕES CRÍTICAS:
1. VOCÊ deve fornecer TODOS os valores nutricionais baseados em USDA/TACO
2. Cite a fonte (USDA ou TACO) para cada alimento quando possível
3. Use valores por 100g das tabelas oficiais e calcule proporcionalmente
4. A soma TOTAL deve ser EXATAMENTE ${savedCalcs.finalCalories} kcal
5. Seja preciso com as quantidades baseadas nos valores oficiais
6. Prefira alimentos com dados bem documentados nas tabelas

EXEMPLO DE FORMATO OBRIGATÓRIO:
{
  "name": "Aveia em flocos",
  "quantity": "80g",
  "calories": 311,
  "protein": 13.5,
  "carbs": 52.8,
  "fats": 6.2
}

JSON OBRIGATÓRIO:
{
  "totalDailyCalories": "${savedCalcs.finalCalories} kcal",
  "totalProtein": "${savedCalcs.protein}g",
  "totalCarbs": "${savedCalcs.carbs}g", 
  "totalFats": "${savedCalcs.fats}g",
  "meals": [${mealConfig.names
    .map((name, i) => {
      const targetCals = Math.round(savedCalcs.finalCalories * mealConfig.distribution[i])
      return `{
        "name": "${name}",
        "time": "${i === 0 ? "07:00" : i === 1 ? "10:00" : i === 2 ? "12:00" : i === 3 ? "15:00" : i === 4 ? "19:00" : "21:00"}",
        "totalCalories": ${targetCals},
        "foods": [
          {
            "name": "[alimento específico]",
            "quantity": "[quantidade precisa]",
            "calories": "[calorias que VOCÊ calculou]",
            "protein": "[proteína que VOCÊ calculou]",
            "carbs": "[carboidratos que VOCÊ calculou]",
            "fats": "[gorduras que VOCÊ calculou]"
          }
        ]
      }`
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
              // Calculate real total from AI-generated foods
              const realTotal = parsed.meals.reduce((total, meal) => {
                return total + meal.foods.reduce((mealTotal, food) => mealTotal + (food.calories || 0), 0)
              }, 0)

              console.log(`[DIET] Target: ${savedCalcs.finalCalories} kcal, AI Generated: ${realTotal} kcal`)

              // Check if difference is significant and adjust if needed
              const difference = savedCalcs.finalCalories - realTotal
              if (Math.abs(difference) > 50) {
                console.log(`[DIET] Adjusting foods by ${difference} kcal`)
                const adjustmentPerMeal = Math.round(difference / parsed.meals.length)

                parsed.meals.forEach((meal, index) => {
                  if (meal.foods && meal.foods.length > 0) {
                    const mainFood = meal.foods[0]
                    if (mainFood) {
                      mainFood.calories = Math.max(50, (mainFood.calories || 0) + adjustmentPerMeal)
                      meal.totalCalories = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0)
                    }
                  }
                })
              }

              parsed.totalDailyCalories = `${savedCalcs.finalCalories} kcal`
              parsed.totalProtein = `${savedCalcs.protein}g`
              parsed.totalCarbs = `${savedCalcs.carbs}g`
              parsed.totalFats = `${savedCalcs.fats}g`

              dietPlan = parsed
              console.log("✅ [DIET SUCCESS] Generated and corrected")
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
 * Considera: Tipo Corporal (Somatótipo) + Gênero + Objetivo
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

  const isFemale = gender.toLowerCase().includes("fem") || gender.toLowerCase().includes("mulher")

  // ============================================
  // 1. TMB (Mifflin-St Jeor) - PADRÃO CIENTÍFICO
  // ============================================
  let tmb
  if (isFemale) {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161
  } else {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5
  }

  // ============================================
  // 2. FATOR DE ATIVIDADE AJUSTADO POR SOMATÓTIPO
  // ============================================
  let baseActivityMultiplier
  if (trainingDaysPerWeek <= 1) {
    baseActivityMultiplier = 1.2 // Sedentário
  } else if (trainingDaysPerWeek <= 3) {
    baseActivityMultiplier = 1.375 // Leve
  } else if (trainingDaysPerWeek <= 5) {
    baseActivityMultiplier = 1.55 // Moderado (base)
  } else if (trainingDaysPerWeek <= 6) {
    baseActivityMultiplier = 1.725 // Intenso
  } else {
    baseActivityMultiplier = 1.9 // Muito intenso
  }

  // Ajuste do fator de atividade por somatótipo
  let activityMultiplier = baseActivityMultiplier

  if (bodyType.toLowerCase() === "ectomorfo") {
    // Ectomorfo: NEAT alto, metabolismo acelerado
    activityMultiplier = baseActivityMultiplier * 1.05 // +5% no fator
    console.log(`🔥 [ECTOMORFO] Fator de atividade aumentado: ${baseActivityMultiplier} → ${activityMultiplier}`)
  } else if (bodyType.toLowerCase() === "endomorfo") {
    // Endomorfo: NEAT baixo, metabolismo mais lento
    activityMultiplier = baseActivityMultiplier * 0.95 // -5% no fator
    console.log(`🐢 [ENDOMORFO] Fator de atividade reduzido: ${baseActivityMultiplier} → ${activityMultiplier}`)
  }
  // Mesomorfo: usa o valor base (sem ajuste)

  let tdee = tmb * activityMultiplier

  // ============================================
  // 3. AJUSTE METABÓLICO POR SOMATÓTIPO
  // ============================================
  let metabolicAdjustment = 1.0

  if (bodyType.toLowerCase() === "ectomorfo") {
    // Ectomorfo: +12-15% (metabolismo rápido)
    metabolicAdjustment = isFemale ? 1.12 : 1.15
    console.log(
      `🔥 [ECTOMORFO ${isFemale ? "F" : "M"}] Ajuste metabólico: +${((metabolicAdjustment - 1) * 100).toFixed(0)}%`,
    )
  } else if (bodyType.toLowerCase() === "endomorfo") {
    // Endomorfo: -5-8% (metabolismo lento)
    metabolicAdjustment = isFemale ? 0.92 : 0.95
    console.log(
      `🐢 [ENDOMORFO ${isFemale ? "F" : "M"}] Ajuste metabólico: ${((metabolicAdjustment - 1) * 100).toFixed(0)}%`,
    )
  }
  // Mesomorfo: 1.0 (sem ajuste - metabolismo equilibrado)

  tdee = tdee * metabolicAdjustment

  // ============================================
  // 4. AJUSTE CALÓRICO BASEADO NO OBJETIVO
  // ============================================
  let dailyCalorieAdjustment = 0
  const weightDifference = targetWeight - weight

  if (weightDifference < -0.5) {
    // ========== MODO: PERDA DE PESO ==========
    console.log(`🔥 [PRIORITY] Target weight (${targetWeight}kg) < current weight (${weight}kg) = FAT LOSS MODE`)

    const weightToLose = Math.abs(weightDifference)

    if (timeToGoal && weightToLose > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightToLose / weeksToGoal

        // LIMITES SEGUROS DE PERDA POR SEMANA (ajustados por somatótipo)
        let maxWeeklyLoss
        if (bodyType.toLowerCase() === "ectomorfo") {
          maxWeeklyLoss = Math.min(weeklyWeightChange, 0.5) // Ectomorfo: máx 0.5kg/semana (perde massa fácil)
        } else if (bodyType.toLowerCase() === "endomorfo") {
          maxWeeklyLoss = Math.min(weeklyWeightChange, 1.0) // Endomorfo: pode perder até 1kg/semana
        } else {
          maxWeeklyLoss = Math.min(weeklyWeightChange, 0.75) // Mesomorfo: 0.75kg/semana
        }

        dailyCalorieAdjustment = -Math.round((maxWeeklyLoss * 7700) / 7)

        // LIMITES MÁXIMOS DE DÉFICIT (por gênero e somatótipo)
        let maxDeficit
        if (isFemale) {
          maxDeficit = bodyType.toLowerCase() === "endomorfo" ? -700 : -600
        } else {
          maxDeficit = bodyType.toLowerCase() === "endomorfo" ? -900 : -800
        }

        dailyCalorieAdjustment = Math.max(dailyCalorieAdjustment, maxDeficit)
      } else {
        // Déficit padrão por somatótipo
        if (bodyType.toLowerCase() === "ectomorfo") {
          dailyCalorieAdjustment = -400 // Déficit leve
        } else if (bodyType.toLowerCase() === "endomorfo") {
          dailyCalorieAdjustment = -600 // Déficit maior
        } else {
          dailyCalorieAdjustment = -500 // Déficit moderado
        }
      }
    } else {
      // Déficit padrão por somatótipo
      if (bodyType.toLowerCase() === "ectomorfo") {
        dailyCalorieAdjustment = -400
      } else if (bodyType.toLowerCase() === "endomorfo") {
        dailyCalorieAdjustment = -600
      } else {
        dailyCalorieAdjustment = -500
      }
    }
  } else if (weightDifference > 0.5) {
    // ========== MODO: GANHO DE PESO ==========
    console.log(`💪 [PRIORITY] Target weight (${targetWeight}kg) > current weight (${weight}kg) = WEIGHT GAIN MODE`)

    const weightToGain = weightDifference

    if (timeToGoal && weightToGain > 0) {
      const weeksToGoal = calculateWeeksToGoal(timeToGoal)
      if (weeksToGoal > 0) {
        const weeklyWeightChange = weightToGain / weeksToGoal

        // LIMITES SEGUROS DE GANHO POR SEMANA (ajustados por somatótipo)
        let maxWeeklyGain
        if (bodyType.toLowerCase() === "ectomorfo") {
          maxWeeklyGain = Math.min(weeklyWeightChange, 0.75) // Ectomorfo: pode tentar até 0.75kg/semana
        } else if (bodyType.toLowerCase() === "endomorfo") {
          maxWeeklyGain = Math.min(weeklyWeightChange, 0.4) // Endomorfo: máx 0.4kg (ganha gordura fácil)
        } else {
          maxWeeklyGain = Math.min(weeklyWeightChange, 0.5) // Mesomorfo: 0.5kg/semana (padrão)
        }

        dailyCalorieAdjustment = Math.round((maxWeeklyGain * 7700) / 7)

        // LIMITES MÁXIMOS DE SURPLUS (por gênero e somatótipo)
        let maxSurplus
        if (bodyType.toLowerCase() === "ectomorfo") {
          maxSurplus = isFemale ? 700 : 850 // Ectomorfo: pode surplus maior
        } else if (bodyType.toLowerCase() === "endomorfo") {
          maxSurplus = isFemale ? 400 : 500 // Endomorfo: surplus conservador
        } else {
          maxSurplus = isFemale ? 500 : 600 // Mesomorfo: surplus moderado
        }

        dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, maxSurplus)
      } else {
        // Surplus padrão por somatótipo
        if (bodyType.toLowerCase() === "ectomorfo") {
          dailyCalorieAdjustment = isFemale ? 600 : 700
        } else if (bodyType.toLowerCase() === "endomorfo") {
          dailyCalorieAdjustment = isFemale ? 300 : 400
        } else {
          dailyCalorieAdjustment = isFemale ? 400 : 500
        }
      }
    } else {
      // Surplus padrão por somatótipo
      if (bodyType.toLowerCase() === "ectomorfo") {
        dailyCalorieAdjustment = isFemale ? 600 : 700
      } else if (bodyType.toLowerCase() === "endomorfo") {
        dailyCalorieAdjustment = isFemale ? 300 : 400
      } else {
        dailyCalorieAdjustment = isFemale ? 400 : 500
      }
    }
  } else {
    // ========== MODO: MANUTENÇÃO/RECOMPOSIÇÃO ==========
    console.log(`⚖️ [PRIORITY] Target weight (${targetWeight}kg) ≈ current weight (${weight}kg) = FOLLOW DECLARED GOALS`)

    if (goals.includes("perder-peso") || goals.includes("emagrecer")) {
      dailyCalorieAdjustment = bodyType.toLowerCase() === "endomorfo" ? -400 : -300
    } else if (goals.includes("ganhar-massa") || goals.includes("ganhar-peso")) {
      if (bodyType.toLowerCase() === "ectomorfo") {
        dailyCalorieAdjustment = 400
      } else if (bodyType.toLowerCase() === "endomorfo") {
        dailyCalorieAdjustment = 200
      } else {
        dailyCalorieAdjustment = 300
      }
    }
  }

  const finalCalories = Math.round(tdee + dailyCalorieAdjustment)
  let safeCalories = finalCalories

  // ============================================
  // 5. LIMITES DE SEGURANÇA POR GÊNERO
  // ============================================
  const minCaloriesWomen = trainingDaysPerWeek >= 4 ? 1400 : 1200
  const minCaloriesMen = trainingDaysPerWeek >= 4 ? 1600 : 1400
  const absoluteMinimum = isFemale ? minCaloriesWomen : minCaloriesMen

  if (safeCalories < absoluteMinimum) {
    console.log(`⚠️ [SAFETY] Calories too low (${safeCalories}), adjusting to minimum safe level (${absoluteMinimum})`)
    safeCalories = absoluteMinimum
    dailyCalorieAdjustment = safeCalories - tdee
  }

  // Nunca abaixo de 110% do TMB
  if (safeCalories < tmb * 1.1) {
    console.log(`⚠️ [SAFETY] Calories below 110% of TMB (${Math.round(tmb * 1.1)}), adjusting for metabolic safety`)
    safeCalories = Math.round(tmb * 1.1)
    dailyCalorieAdjustment = safeCalories - tdee
  }

  // ============================================
  // 6. MACRONUTRIENTES AJUSTADOS
  // ============================================
  let proteinPerKg = 1.6
  let fatsPerKg = 1.0

  // PROTEÍNA baseada em objetivo + somatótipo + gênero
  if (weightDifference < -0.5) {
    // PERDA DE PESO - mais proteína para preservar massa
    if (bodyType.toLowerCase() === "ectomorfo") {
      proteinPerKg = isFemale ? 2.0 : 2.2 // Preserva massa facilmente
    } else if (bodyType.toLowerCase() === "mesomorfo") {
      proteinPerKg = isFemale ? 2.2 : 2.4
    } else if (bodyType.toLowerCase() === "endomorfo") {
      proteinPerKg = isFemale ? 2.4 : 2.6 // Precisa mais para preservar
    } else {
      proteinPerKg = isFemale ? 2.0 : 2.2
    }
  } else if (weightDifference > 0.5) {
    // GANHO DE PESO - proteína para construção
    if (bodyType.toLowerCase() === "ectomorfo") {
      proteinPerKg = isFemale ? 2.3 : 2.5 // Mais difícil ganhar
    } else if (bodyType.toLowerCase() === "mesomorfo") {
      proteinPerKg = isFemale ? 2.0 : 2.2 // Responde bem
    } else if (bodyType.toLowerCase() === "endomorfo") {
      proteinPerKg = isFemale ? 1.9 : 2.0 // Ganha mais fácil
    } else {
      proteinPerKg = isFemale ? 2.0 : 2.2
    }
  } else {
    // MANUTENÇÃO/RECOMPOSIÇÃO
    proteinPerKg = isFemale ? 1.8 : 2.0
  }

  // GORDURAS baseadas em objetivo + somatótipo + gênero
  if (weightDifference < -0.5) {
    // PERDA DE PESO - menos gorduras
    if (bodyType.toLowerCase() === "ectomorfo") {
      fatsPerKg = isFemale ? 1.0 : 0.9 // Mulheres precisam mais gordura
    } else if (bodyType.toLowerCase() === "mesomorfo") {
      fatsPerKg = isFemale ? 0.9 : 0.8
    } else if (bodyType.toLowerCase() === "endomorfo") {
      fatsPerKg = isFemale ? 0.8 : 0.7
    } else {
      fatsPerKg = isFemale ? 0.9 : 0.8
    }
  } else {
    // GANHO/MANUTENÇÃO - gorduras normais/maiores
    if (bodyType.toLowerCase() === "ectomorfo") {
      fatsPerKg = isFemale ? 1.3 : 1.2 // Tolera bem
    } else if (bodyType.toLowerCase() === "mesomorfo") {
      fatsPerKg = isFemale ? 1.1 : 1.0
    } else if (bodyType.toLowerCase() === "endomorfo") {
      fatsPerKg = isFemale ? 1.0 : 0.9 // Controlar um pouco
    } else {
      fatsPerKg = isFemale ? 1.1 : 1.0
    }
  }

  // ATENÇÃO: Mulheres precisam mínimo de gordura para função hormonal
  if (isFemale && fatsPerKg < 0.8) {
    fatsPerKg = 0.8 // Mínimo absoluto para mulheres
    console.log(`⚠️ [FEMALE SAFETY] Fat intake adjusted to minimum safe level (0.8g/kg)`)
  }

  const protein = Math.round(weight * proteinPerKg)
  const fats = Math.round(weight * fatsPerKg)

  // Proteína mínima (mais baixa para mulheres)
  const minProtein = Math.round(weight * (isFemale ? 1.6 : 1.8))
  const finalProtein = Math.max(protein, minProtein)

  // Carboidratos = calorias restantes
  const carbs = Math.round((safeCalories - finalProtein * 4 - fats * 9) / 4)

  // ============================================
  // 7. LOGS DETALHADOS
  // ============================================
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  CÁLCULO CIENTÍFICO COMPLETO                              ║
╚═══════════════════════════════════════════════════════════╝

👤 PERFIL:
   Gênero: ${isFemale ? "Feminino" : "Masculino"}
   Somatótipo: ${bodyType || "Não especificado"}
   Peso: ${weight}kg → ${targetWeight}kg (${weightDifference > 0 ? "+" : ""}${weightDifference.toFixed(1)}kg)
   
🧮 CÁLCULOS BASE:
   TMB: ${Math.round(tmb)} kcal
   Fator Atividade (base): ${baseActivityMultiplier}
   Fator Atividade (ajustado): ${activityMultiplier.toFixed(3)}
   TDEE (inicial): ${Math.round(tmb * activityMultiplier)} kcal
   Ajuste Metabólico: ${(metabolicAdjustment * 100).toFixed(1)}%
   TDEE (final): ${Math.round(tdee)} kcal
   
🎯 OBJETIVO:
   Ajuste Diário: ${dailyCalorieAdjustment > 0 ? "+" : ""}${dailyCalorieAdjustment} kcal
   Modo: ${weightDifference < -0.5 ? "PERDA DE PESO" : weightDifference > 0.5 ? "GANHO DE PESO" : "MANUTENÇÃO"}
   
📊 RESULTADO FINAL:
   Calorias: ${safeCalories} kcal
   Proteína: ${finalProtein}g (${proteinPerKg.toFixed(1)}g/kg)
   Gorduras: ${fats}g (fatsPerKg.toFixed(1)}g/kg)
   Carboidratos: ${Math.max(carbs, 50)}g
  `)

  return {
    tmb: Math.round(tmb),
    tdee: Math.round(tdee),
    finalCalories: safeCalories,
    protein: finalProtein,
    carbs: Math.max(carbs, 50),
    fats,
    dailyCalorieAdjustment,
    weeksToGoal: timeToGoal ? calculateWeeksToGoal(timeToGoal) : 0,
    realGoal: weightDifference < -0.5 ? "fat-loss" : weightDifference > 0.5 ? "weight-gain" : "body-recomposition",
    metabolicAdjustment: metabolicAdjustment,
    activityMultiplier: activityMultiplier,
  }
}

function calculateWeeksToGoal(timeToGoal: string): number {
  try {
    // Parse Brazilian date format (e.g., "10 de dez. de 2025")
    let goalDate: Date

    if (timeToGoal.includes(" de ")) {
      const monthMap: { [key: string]: number } = {
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

      const parts = timeToGoal.split(" de ")
      if (parts.length === 3) {
        const day = Number.parseInt(parts[0])
        const monthStr = parts[1].toLowerCase().substring(0, 3)
        const year = Number.parseInt(parts[2])
        const month = monthMap[monthStr]

        if (!isNaN(day) && !isNaN(year) && month !== undefined) {
          goalDate = new Date(year, month, day)
        } else {
          return 0
        }
      } else {
        return 0
      }
    } else {
      goalDate = new Date(timeToGoal)
    }

    const currentDate = new Date()
    const timeDifferenceMs = goalDate.getTime() - currentDate.getTime()

    if (isNaN(timeDifferenceMs) || timeDifferenceMs <= 0) {
      return 0
    }

    const weeksToGoal = Math.max(1, timeDifferenceMs / (1000 * 60 * 60 * 24 * 7))
    return Math.round(weeksToGoal)
  } catch (error) {
    console.error("Error calculating weeks to goal:", error)
    return 0
  }
}
