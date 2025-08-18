"use client"

interface Exercise {
  name: string
  sets: number
  reps: string
  rest: string
  description: string
}

interface WorkoutDay {
  day: string
  title: string
  focus: string
  duration: string
  exercises: Exercise[]
}

interface TrainingValidationResult {
  isValid: boolean
  errors: string[]
  expectedDays: number
  actualDays: number
  exerciseCounts: number[]
}

// Validate training plan structure and completeness
export function validateTrainingPlan(workoutPlan: any, expectedDays: number): TrainingValidationResult {
  const errors: string[] = []
  const exerciseCounts: number[] = []

  if (!workoutPlan || !workoutPlan.days || !Array.isArray(workoutPlan.days)) {
    errors.push("Plano de treino inválido ou ausente")
    return {
      isValid: false,
      errors,
      expectedDays,
      actualDays: 0,
      exerciseCounts: [],
    }
  }

  const actualDays = workoutPlan.days.length

  if (actualDays !== expectedDays) {
    errors.push(`Número incorreto de dias: esperado ${expectedDays}, recebido ${actualDays}`)
  }

  workoutPlan.days.forEach((day: any, index: number) => {
    const exerciseCount = day.exercises?.length || 0
    exerciseCounts.push(exerciseCount)

    if (!day.title || !day.focus) {
      errors.push(`Dia ${index + 1}: título ou foco ausente`)
    }

    if (exerciseCount < 6) {
      errors.push(`Dia ${index + 1}: apenas ${exerciseCount} exercícios (mínimo 6)`)
    }

    if (day.exercises) {
      day.exercises.forEach((exercise: any, exerciseIndex: number) => {
        if (!exercise.name || !exercise.sets || !exercise.reps || !exercise.rest) {
          errors.push(`Dia ${index + 1}, Exercício ${exerciseIndex + 1}: dados incompletos`)
        }
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    expectedDays,
    actualDays,
    exerciseCounts,
  }
}

// Generate focused training prompt with better structure
export function buildTrainingPrompt(quizData: any): string {
  const expectedDays = quizData.trainingDaysPerWeek || 5
  const targetDate = quizData.eventDate || quizData.timeToGoal || "Não informado"

  return `
Você é um personal trainer especializado. Crie um plano de treino seguindo EXATAMENTE estas especificações:

DADOS DO CLIENTE:
- Sexo: ${quizData.gender || "Não informado"}
- Idade: ${quizData.age || "Não informado"}
- Altura: ${quizData.height || "Não informado"} cm
- Peso: ${quizData.currentWeight || "Não informado"} kg
- Objetivo: ${quizData.goal?.join(", ") || "Não informado"}
- Experiência: ${quizData.experience || "Intermediário"}
- Equipamentos: ${quizData.equipment?.join(", ") || "Academia completa"}
- DIAS DE TREINO: ${expectedDays} dias por semana (OBRIGATÓRIO)

ESTRUTURA OBRIGATÓRIA DO JSON:
{
  "workoutPlan": {
    "weeklySchedule": "Treino ${expectedDays}x por semana",
    "days": [
      {
        "day": "Dia 1",
        "title": "Nome do Treino",
        "focus": "Grupos musculares trabalhados",
        "duration": "60 min",
        "exercises": [
          {
            "name": "Nome do exercício",
            "sets": 4,
            "reps": "8-12",
            "rest": "90s",
            "description": "Descrição técnica do exercício"
          }
        ]
      }
    ],
    "tips": ["Dica 1", "Dica 2"]
  }
}

REGRAS OBRIGATÓRIAS:
1. EXATAMENTE ${expectedDays} dias no array "days"
2. CADA dia deve ter 7-9 exercícios completos
3. Distribua os grupos musculares adequadamente
4. Use exercícios apropriados para o nível de experiência
5. Inclua aquecimento quando necessário
6. Séries entre 3-5, repetições adequadas ao objetivo
7. Descanso entre 45s-120s dependendo do exercício

RETORNE APENAS O JSON VÁLIDO, SEM TEXTO ADICIONAL.
`
}

// Enhanced retry logic with progressive prompting
export async function generateTrainingWithRetry(openai: any, quizData: any, maxAttempts = 3): Promise<any> {
  const expectedDays = quizData.trainingDaysPerWeek || 5

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[v0] Tentativa ${attempt}/${maxAttempts}: Gerando plano de treino...`)

    try {
      let prompt = buildTrainingPrompt(quizData)

      // Add more specific instructions on retry attempts
      if (attempt > 1) {
        prompt += `\n\nATENÇÃO: Esta é a tentativa ${attempt}. O plano anterior não atendeu aos requisitos.
CERTIFIQUE-SE DE:
- Criar EXATAMENTE ${expectedDays} dias de treino
- Cada dia deve ter 7-9 exercícios completos
- Não omitir nenhum campo obrigatório
- Retornar apenas JSON válido`
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um personal trainer especializado. Retorne apenas JSON válido conforme solicitado.",
          },
          { role: "user", content: prompt },
        ],
        temperature: attempt === 1 ? 0.7 : 0.3, // Lower temperature on retries for more consistency
        response_format: { type: "json_object" },
        max_tokens: 20000, // Increased token limit
      })

      const content = response.choices[0].message?.content
      if (!content) {
        throw new Error("Resposta vazia da OpenAI")
      }

      console.log(`[v0] Resposta recebida (${content.length} caracteres)`)

      const parsed = JSON.parse(content)
      const validation = validateTrainingPlan(parsed.workoutPlan, expectedDays)

      console.log(`[v0] Validação - Tentativa ${attempt}:`, {
        válido: validation.isValid,
        diasEsperados: validation.expectedDays,
        diasRecebidos: validation.actualDays,
        exercíciosPorDia: validation.exerciseCounts,
        erros: validation.errors,
      })

      if (validation.isValid) {
        console.log(`[v0] ✅ Plano válido gerado na tentativa ${attempt}`)
        return parsed
      }

      if (attempt === maxAttempts) {
        console.warn(`[v0] ⚠️ Máximo de tentativas atingido. Usando plano com erros:`, validation.errors)
        return parsed // Return even if not perfect after max attempts
      }

      console.log(`[v0] ❌ Plano inválido, tentando novamente...`)
    } catch (error) {
      console.error(`[v0] Erro na tentativa ${attempt}:`, error)

      if (attempt === maxAttempts) {
        throw error
      }
    }
  }

  throw new Error("Falha ao gerar plano de treino após todas as tentativas")
}

// Generate fallback training plan if API fails
export function generateFallbackTrainingPlan(quizData: any): any {
  const expectedDays = quizData.trainingDaysPerWeek || 5
  const isBeginnerLevel = quizData.experience === "iniciante"

  const fallbackDays = []

  // Generate basic training days based on common splits
  const trainingTemplates = {
    3: ["Corpo Superior", "Corpo Inferior", "Corpo Completo"],
    4: ["Peito e Tríceps", "Costas e Bíceps", "Pernas", "Ombros e Core"],
    5: ["Peito e Tríceps", "Costas e Bíceps", "Pernas", "Ombros", "Core e Cardio"],
    6: ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"],
  }

  const templates = trainingTemplates[expectedDays as keyof typeof trainingTemplates] || trainingTemplates[5]

  for (let i = 0; i < expectedDays; i++) {
    const dayTemplate = templates[i] || `Treino ${i + 1}`

    fallbackDays.push({
      day: `Dia ${i + 1}`,
      title: dayTemplate,
      focus: `Treino focado em ${dayTemplate.toLowerCase()}`,
      duration: "60 min",
      exercises: generateFallbackExercises(dayTemplate, isBeginnerLevel),
    })
  }

  return {
    workoutPlan: {
      weeklySchedule: `Treino ${expectedDays}x por semana`,
      days: fallbackDays,
      tips: [
        "Mantenha a forma correta em todos os exercícios",
        "Aumente a carga progressivamente",
        "Descanse adequadamente entre as séries",
        "Hidrate-se durante o treino",
      ],
    },
  }
}

function generateFallbackExercises(focus: string, isBeginnerLevel: boolean): Exercise[] {
  const exerciseDatabase = {
    "Peito e Tríceps": [
      { name: "Supino reto", sets: 4, reps: "8-12", rest: "90s", description: "Exercício principal para peito" },
      { name: "Supino inclinado", sets: 3, reps: "10-12", rest: "90s", description: "Trabalha peito superior" },
      { name: "Crucifixo", sets: 3, reps: "12-15", rest: "60s", description: "Isolamento do peitoral" },
      { name: "Paralelas", sets: 3, reps: "8-12", rest: "90s", description: "Peito inferior e tríceps" },
      { name: "Tríceps testa", sets: 4, reps: "10-12", rest: "60s", description: "Isolamento do tríceps" },
      { name: "Tríceps corda", sets: 3, reps: "12-15", rest: "45s", description: "Tríceps lateral" },
      { name: "Mergulho", sets: 3, reps: "8-12", rest: "60s", description: "Tríceps e peito inferior" },
    ],
    "Costas e Bíceps": [
      { name: "Puxada frontal", sets: 4, reps: "8-12", rest: "90s", description: "Exercício principal para costas" },
      { name: "Remada curvada", sets: 4, reps: "8-12", rest: "90s", description: "Espessura das costas" },
      { name: "Remada unilateral", sets: 3, reps: "10-12", rest: "60s", description: "Isolamento das costas" },
      { name: "Pullover", sets: 3, reps: "12-15", rest: "60s", description: "Serrátil e dorsal" },
      { name: "Rosca direta", sets: 4, reps: "10-12", rest: "60s", description: "Bíceps principal" },
      { name: "Rosca martelo", sets: 3, reps: "12-15", rest: "45s", description: "Bíceps e antebraço" },
      { name: "Rosca concentrada", sets: 3, reps: "10-12", rest: "45s", description: "Isolamento do bíceps" },
    ],
    Pernas: [
      { name: "Agachamento", sets: 4, reps: "8-12", rest: "120s", description: "Exercício principal para pernas" },
      { name: "Leg press", sets: 4, reps: "12-15", rest: "90s", description: "Quadríceps e glúteos" },
      { name: "Stiff", sets: 4, reps: "10-12", rest: "90s", description: "Posterior de coxa" },
      { name: "Cadeira extensora", sets: 3, reps: "12-15", rest: "60s", description: "Isolamento do quadríceps" },
      { name: "Mesa flexora", sets: 3, reps: "12-15", rest: "60s", description: "Isolamento do posterior" },
      { name: "Panturrilha em pé", sets: 4, reps: "15-20", rest: "45s", description: "Gastrocnêmio" },
      { name: "Panturrilha sentado", sets: 3, reps: "15-20", rest: "45s", description: "Sóleo" },
    ],
    Ombros: [
      { name: "Desenvolvimento", sets: 4, reps: "8-12", rest: "90s", description: "Ombro principal" },
      { name: "Elevação lateral", sets: 4, reps: "12-15", rest: "60s", description: "Deltóide médio" },
      { name: "Elevação frontal", sets: 3, reps: "12-15", rest: "60s", description: "Deltóide anterior" },
      { name: "Crucifixo inverso", sets: 4, reps: "12-15", rest: "60s", description: "Deltóide posterior" },
      { name: "Encolhimento", sets: 4, reps: "12-15", rest: "60s", description: "Trapézio superior" },
      { name: "Remada alta", sets: 3, reps: "10-12", rest: "60s", description: "Deltóide e trapézio" },
      { name: "Elevação posterior", sets: 3, reps: "15-20", rest: "45s", description: "Deltóide posterior" },
    ],
  }

  const defaultExercises = [
    { name: "Aquecimento", sets: 1, reps: "10 min", rest: "0s", description: "Aquecimento geral" },
    { name: "Exercício 1", sets: 4, reps: "8-12", rest: "90s", description: "Exercício principal" },
    { name: "Exercício 2", sets: 3, reps: "10-12", rest: "60s", description: "Exercício secundário" },
    { name: "Exercício 3", sets: 3, reps: "12-15", rest: "60s", description: "Exercício auxiliar" },
    { name: "Exercício 4", sets: 3, reps: "12-15", rest: "45s", description: "Exercício de isolamento" },
    { name: "Exercício 5", sets: 3, reps: "15-20", rest: "45s", description: "Exercício final" },
    { name: "Alongamento", sets: 1, reps: "5 min", rest: "0s", description: "Alongamento final" },
  ]

  return exerciseDatabase[focus as keyof typeof exerciseDatabase] || defaultExercises
}
