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
      setTimeout(() => reject(new Error("Request timeout after 180 seconds")), 180000) // 3 minutos
    })

    const processRequest = async () => {
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

      // PROMPT CORRIGIDO PARA PRECISÃO CALÓRICA
      const dietPrompt = `
Você é um nutricionista especialista em cálculo nutricional preciso.

MISSÃO CRÍTICA: Criar uma dieta de EXATAMENTE ${savedCalcs.finalCalories} kcal (diferença máxima: ±20 kcal).

DADOS DO CLIENTE:
- Peso: ${quizData.currentWeight}kg, ${quizData.gender}, ${quizData.age} anos
- Objetivo: ${quizData.goal?.join(", ")}
- Biotipo: ${quizData.bodyType}
- Alergias: ${quizData.allergies !== "nao" ? quizData.allergyDetails : "Nenhuma"}
- Preferências: ${quizData.diet !== "nao-sigo" ? quizData.diet : "Sem restrições"}

ALVO NUTRICIONAL OBRIGATÓRIO:
- Calorias totais: ${savedCalcs.finalCalories} kcal
- Proteína: ${savedCalcs.protein}g
- Carboidratos: ${savedCalcs.carbs}g  
- Gorduras: ${savedCalcs.fats}g

DISTRIBUIÇÃO DE REFEIÇÕES (${mealConfig.count} refeições):
${mealConfig.names
  .map((name, i) => {
    const targetCals = Math.round(savedCalcs.finalCalories * mealConfig.distribution[i])
    return `- ${name}: ${targetCals} kcal (${(mealConfig.distribution[i] * 100).toFixed(1)}%)`
  })
  .join("\n")}

PROCESSO OBRIGATÓRIO PARA CÁLCULO PRECISO:

1. VALORES NUTRICIONAIS REAIS (use estes dados precisos):
   - Aveia: 389 kcal/100g, 16.9g prot, 66.3g carb, 6.9g gord
   - Arroz integral cozido: 111 kcal/100g, 2.3g prot, 22g carb, 0.9g gord
   - Peito de frango grelhado: 165 kcal/100g, 31g prot, 0g carb, 3.6g gord
   - Ovo inteiro: 155 kcal/100g, 13g prot, 1.1g carb, 11g gord
   - Banana: 89 kcal/100g, 1.1g prot, 23g carb, 0.3g gord
   - Batata doce: 86 kcal/100g, 2g prot, 20g carb, 0.1g gord
   - Azeite: 884 kcal/100ml, 0g prot, 0g carb, 100g gord

2. FÓRMULA DE CÁLCULO:
   Quantidade necessária (g) = (Calorias desejadas × 100) ÷ kcal por 100g do alimento

3. EXEMPLO PRÁTICO:
   Refeição alvo: 400 kcal
   - Aveia: Para 240 kcal → (240 × 100) ÷ 389 = 62g
   - Banana: Para 160 kcal → (160 × 100) ÷ 89 = 180g
   TOTAL: 240 + 160 = 400 kcal ✓

4. VALIDAÇÃO OBRIGATÓRIA:
   - SOME todas as calorias de todos os alimentos
   - VERIFIQUE se o total = ${savedCalcs.finalCalories} kcal
   - AJUSTE quantidades se necessário

INSTRUÇÕES FINAIS:
- Use APENAS os valores nutricionais fornecidos acima
- CALCULE as quantidades exatas usando a fórmula
- NÃO invente valores nutricionais
- GARANTA que a soma total seja ${savedCalcs.finalCalories} kcal

JSON OBRIGATÓRIO (calcule as quantidades exatas):
{
  "totalDailyCalories": "${savedCalcs.finalCalories} kcal",
  "totalProtein": "${savedCalcs.protein}g",
  "totalCarbs": "${savedCalcs.carbs}g",
  "totalFats": "${savedCalcs.fats}g",
  "meals": [
    ${mealConfig.names
      .map((name, i) => {
        const targetCals = Math.round(savedCalcs.finalCalories * mealConfig.distribution[i])
        return `{
        "name": "${name}",
        "time": "${i === 0 ? "07:00" : i === 1 ? "10:00" : i === 2 ? "12:00" : i === 3 ? "15:00" : i === 4 ? "19:00" : "21:00"}",
        "totalCalories": "${targetCals} kcal",
        "foods": [
          {
            "name": "[alimento da lista acima]",
            "quantity": "[quantidade CALCULADA usando a fórmula]",
            "calories": "[calorias baseadas na quantidade calculada]",
            "protein": "[proteína calculada]",
            "carbs": "[carboidratos calculados]",
            "fats": "[gorduras calculadas]"
          }
        ]
      }`
      })
      .join(",\n    ")}
  ],
  "calorieValidation": {
    "targetTotal": ${savedCalcs.finalCalories},
    "calculatedTotal": "[SOME todas as calorias dos alimentos]",
    "difference": "[diferença entre calculado e target]",
    "isAccurate": "[true se diferença ≤ 20 kcal]"
  }
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

EXPERIÊNCIA ${quizData.experience?.toUpperCASE()}:
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
          setTimeout(() => reject(new Error(`${type} generation timeout`)), 30000) // Reduzido para 30s
        })

        const generation = openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um ${type === "diet" ? "nutricionista especialista em cálculos nutricionais precisos" : "personal trainer experiente"}. Seja matematicamente preciso com calorias.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
          max_tokens: 4000,
        })

        return Promise.race([generation, timeout])
      }

      let dietPlan = null
      let workoutPlan = null

      const maxRetries = 2 // Reduced max retries from 3 to 2 attempts
      let dietRetries = 0

      while (!dietPlan && dietRetries < maxRetries) {
        try {
          console.log(`🚀 [DIET ATTEMPT ${dietRetries + 1}/${maxRetries}] Starting diet generation`)

          const [dietResponse, workoutResponse] = await Promise.allSettled([
            generateWithTimeout(dietPrompt, "diet"),
            generateWithTimeout(workoutPrompt, "workout"),
          ])

          // VALIDAÇÃO RIGOROSA DA RESPOSTA DA IA
          if (dietResponse.status === "fulfilled") {
            try {
              const rawContent = dietResponse.value.choices[0].message?.content || "{}"
              const parsed = JSON.parse(rawContent)

              if (parsed.meals && Array.isArray(parsed.meals) && parsed.meals.length === mealConfig.count) {
                // Calculate real sum of all food calories with detailed logging
                let realTotalCalories = 0

                console.log(`🔍 [DETAILED VALIDATION] Checking each meal:`)

                parsed.meals.forEach((meal: any, mealIndex: number) => {
                  let mealTotal = 0

                  if (meal.foods && Array.isArray(meal.foods)) {
                    meal.foods.forEach((food: any, foodIndex: number) => {
                      const foodCalories = Number(food.calories?.toString().replace(/[^\d]/g, "")) || 0
                      mealTotal += foodCalories
                      console.log(`  📝 ${meal.name} - ${food.name}: ${food.quantity} = ${foodCalories} kcal`)
                    })
                  }

                  realTotalCalories += mealTotal
                  const targetMealCals = Math.round(savedCalcs.finalCalories * mealConfig.distribution[mealIndex])
                  console.log(`  ✅ ${meal.name} total: ${mealTotal} kcal (target: ${targetMealCals} kcal)`)
                })

                console.log(
                  `🎯 [FINAL VALIDATION] Target: ${savedCalcs.finalCalories} kcal, AI Generated: ${realTotalCalories} kcal`,
                )

                // Tolerância rigorosa baseada na tentativa
                const tolerance = dietRetries === 0 ? 50 : dietRetries === 1 ? 100 : 150 // Muito mais rigorosa!
                const difference = Math.abs(realTotalCalories - savedCalcs.finalCalories)

                if (difference <= tolerance) {
                  // Ajustar os totais para serem consistentes
                  parsed.totalDailyCalories = `${realTotalCalories} kcal` // Use o valor real calculado
                  parsed.totalProtein = `${savedCalcs.protein}g`
                  parsed.totalCarbs = `${savedCalcs.carbs}g`
                  parsed.totalFats = `${savedCalcs.fats}g`

                  dietPlan = parsed
                  console.log(
                    `✅ [DIET SUCCESS] Generated within tolerance (±${difference} kcal, limit: ${tolerance} kcal)`,
                  )
                  break
                } else {
                  console.log(
                    `❌ [DIET REJECTED] Attempt ${dietRetries + 1}: ±${difference} kcal > ${tolerance} kcal limit`,
                  )
                  console.log(
                    `📊 [BREAKDOWN] Target per meal: ${mealConfig.distribution
                      .map(
                        (dist, idx) => `${mealConfig.names[idx]}: ${Math.round(savedCalcs.finalCalories * dist)} kcal`,
                      )
                      .join(", ")}`,
                  )
                }
              } else {
                console.log(
                  `⚠️ [DIET STRUCTURE] Invalid meal structure: expected ${mealConfig.count} meals, got ${parsed.meals?.length || 0}`,
                )
              }
            } catch (e) {
              console.log(`⚠️ [DIET] Parse error on attempt ${dietRetries + 1}:`, e)
            }
          }

          // Process workout response (only on first attempt)
          if (dietRetries === 0 && workoutResponse.status === "fulfilled") {
            try {
              const parsed = JSON.parse(workoutResponse.value.choices[0].message?.content || "{}")
              if (parsed.days && Array.isArray(parsed.days) && parsed.days.length === requestedDays) {
                workoutPlan = parsed
                console.log("✅ [WORKOUT SUCCESS] Generated successfully")
              }
            } catch (e) {
              console.log("⚠️ [WORKOUT] Parse error, will use fallback")
            }
          }

          dietRetries++

          if (!dietPlan && dietRetries < maxRetries) {
            console.log(`🔄 [RETRY] Attempting diet generation again (${dietRetries + 1}/${maxRetries})`)
            await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
          }
        } catch (error) {
          console.log(`⚠️ [ATTEMPT ${dietRetries + 1}] Generation failed:`, error)
          dietRetries++
        }
      }

      // FALLBACK MELHORADO SE A IA FALHAR
      if (!dietPlan) {
        console.log(`❌ [DIET ERROR] AI failed after ${maxRetries} attempts, using calculated fallback`)

        // Gerar fallback com valores exatos
        const fallbackMeals = []
        let runningTotal = 0

        const foodDatabase = [
          { name: "Peito de frango grelhado", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
          { name: "Arroz integral cozido", kcal: 111, protein: 2.3, carbs: 22, fat: 0.9 },
          { name: "Aveia", kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
          { name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
          { name: "Azeite extra virgem", kcal: 884, protein: 0, carbs: 0, fat: 100 },
        ]

        for (let i = 0; i < mealConfig.count; i++) {
          const targetMealCals = Math.round(savedCalcs.finalCalories * mealConfig.distribution[i])
          const food = foodDatabase[i % foodDatabase.length]
          const quantity = Math.round((targetMealCals * 100) / food.kcal)
          const actualCalories = Math.round((food.kcal * quantity) / 100)

          fallbackMeals.push({
            name: mealConfig.names[i],
            time: ["07:00", "10:00", "12:00", "15:00", "19:00", "21:00"][i] || "12:00",
            totalCalories: `${actualCalories} kcal`,
            foods: [
              {
                name: food.name,
                quantity: `${quantity}g`,
                calories: `${actualCalories} kcal`,
                protein: `${Math.round((food.protein * quantity) / 100)}g`,
                carbs: `${Math.round((food.carbs * quantity) / 100)}g`,
                fats: `${Math.round((food.fat * quantity) / 100)}g`,
              },
            ],
          })

          runningTotal += actualCalories
        }

        dietPlan = {
          totalDailyCalories: `${runningTotal} kcal`,
          totalProtein: `${savedCalcs.protein}g`,
          totalCarbs: `${savedCalcs.carbs}g`,
          totalFats: `${savedCalcs.fats}g`,
          meals: fallbackMeals,
          note: "Generated using calculated fallback due to AI precision issues",
        }

        console.log(
          `🔧 [FALLBACK SUCCESS] Generated: ${runningTotal} kcal (target: ${savedCalcs.finalCalories} kcal, diff: ${Math.abs(runningTotal - savedCalcs.finalCalories)} kcal)`,
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

    return await Promise.race([timeoutPromise, processRequest()])
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
