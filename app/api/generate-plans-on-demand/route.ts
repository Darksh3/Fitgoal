import OpenAI from "openai"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

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
 * Gera o prompt para o ChatGPT com base no quizData
 */
function buildPrompt(quizData: any) {
  const targetDate = quizData.eventDate || quizData.timeToGoal || "Não informado"
  const exerciseRange = getExerciseCountRange(quizData.workoutTime)

  const bodyFocusAreas = quizData.problemAreas || []
  const bodyType = quizData.bodyType || "mesomorfo"
  const gender = quizData.gender || "homem"
  const goals = Array.isArray(quizData.goal) ? quizData.goal : [quizData.goal]
  const experience = quizData.experience || "intermediario"

  // Body type specific training guidelines
  const bodyTypeGuidelines = {
    ectomorfo:
      "Foque em exercícios compostos pesados, menos cardio, mais descanso entre séries (90-120s), rep range 6-8 para força",
    mesomorfo:
      "Balance entre exercícios compostos e isolamento, cardio moderado, descanso médio (60-90s), rep range 8-12 para hipertrofia",
    endomorfo: "Mais exercícios de isolamento, cardio intenso, menos descanso (45-60s), rep range 12-15 para definição",
  }

  // Gender specific guidelines
  const genderGuidelines = {
    homem: "Foque mais em membros superiores, exercícios de força, cargas mais pesadas",
    mulher:
      "Equilibre membros superiores e inferiores, inclua mais exercícios para glúteos e pernas, foque em resistência muscular",
  }

  // Goal specific programming
  const goalProgramming = {
    "perder-peso": "Priorize exercícios compostos, circuitos, cardio HIIT, menor descanso entre séries",
    "ganhar-massa": "Foque em exercícios compostos pesados, progressão de carga, descanso adequado para hipertrofia",
    "melhorar-saude": "Balance entre força e cardio, exercícios funcionais, mobilidade e flexibilidade",
    "aumentar-resistencia": "Exercícios de resistência muscular, cardio variado, circuitos de alta intensidade",
  }

  return `
Você é um nutricionista esportivo e personal trainer profissional.  
Receberá os dados de um cliente e deve retornar **APENAS um JSON válido** seguindo a estrutura abaixo:  

{
  "dietPlan": {
    "title": "Plano Nutricional Personalizado - [Objetivo]",
    "summary": "Resumo dos dados do cliente e objetivos",
    "tmb": "Valor da TMB calculada (ex: '1650 kcal')",
    "get": "Valor do GET calculado (ex: '2280 kcal')",
    "calories": "Meta calórica diária (ex: '2500')",
    "protein": "Proteína total em gramas (ex: '150g')",
    "carbs": "Carboidratos totais em gramas (ex: '300g')",
    "fats": "Gorduras totais em gramas (ex: '85g')",
    "meals": [
      {
        "name": "Café da manhã",
        "time": "07:00",
        "foods": [
          { "item": "100g aveia em flocos", "calories": 380, "protein": 13, "carbs": 67, "fats": 7 },
          { "item": "1 banana média (120g)", "calories": 100, "protein": 1, "carbs": 27, "fats": 0 },
          { "item": "200ml leite desnatado", "calories": 70, "protein": 7, "carbs": 10, "fats": 0 }
        ],
        "mealTotal": { "calories": 550, "protein": 21, "carbs": 104, "fats": 7 }
      }
    ],
    "tips": [
      "Dicas nutricionais específicas para o objetivo",
      "Orientações sobre hidratação e suplementação"
    ]
  },
  "workoutPlan": {
    "days": [
      {
        "day": "Dia 1",
        "title": "Peito e Tríceps", 
        "focus": "Hipertrofia de membros superiores",
        "duration": "${quizData.workoutTime || "60 min"}",
        "exercises": [
          { "name": "Supino reto com barra", "sets": 4, "reps": "8-12", "rest": "90s", "description": "Exercício principal para peito, foco na porção média do peitoral maior" },
          { "name": "Supino inclinado com halteres", "sets": 4, "reps": "10-12", "rest": "90s", "description": "Trabalha a porção superior do peitoral" },
          { "name": "Crucifixo inclinado", "sets": 3, "reps": "12-15", "rest": "60s", "description": "Isolamento do peitoral superior" },
          { "name": "Paralelas", "sets": 3, "reps": "8-12", "rest": "90s", "description": "Exercício composto para peito inferior e tríceps" },
          { "name": "Tríceps testa com barra", "sets": 4, "reps": "10-12", "rest": "60s", "description": "Isolamento do tríceps, porção longa" },
          { "name": "Tríceps corda na polia", "sets": 3, "reps": "12-15", "rest": "45s", "description": "Isolamento do tríceps lateral" }
        ]
      }
    ],
    "weeklySchedule": "Treino ${quizData.trainingDaysPerWeek || 5}x por semana",
    "tips": [
      "Dicas específicas para o nível de experiência",
      "Orientações sobre progressão de carga"
    ]
  }
}

⚠️ Regras OBRIGATÓRIAS:
- Use EXATAMENTE ${quizData.trainingDaysPerWeek || 5} dias de treino (não mais, não menos).
- CADA dia deve ter OBRIGATORIAMENTE ${exerciseRange.description} baseado no tempo disponível.
- Tempo disponível: ${quizData.workoutTime || "não informado"} - ajuste a intensidade e número de exercícios adequadamente.
- Para treinos mais curtos (30-45min): Foque em exercícios compostos e reduza o tempo de descanso.
- Para treinos médios (45-60min): Balance exercícios compostos e isolamento.
- Para treinos longos (mais de 1h): Inclua mais exercícios de isolamento e aquecimento específico.
- Distribua os exercícios: 60% compostos + 40% isolamento para treinos curtos, 50/50 para treinos longos.

🎯 PERSONALIZAÇÃO OBRIGATÓRIA DO TREINO:
- **Áreas de Foco**: ${bodyFocusAreas.length > 0 ? bodyFocusAreas.join(", ") : "Corpo inteiro"} - PRIORIZE exercícios para essas áreas em TODOS os treinos
- **Tipo Corporal**: ${bodyType} - ${bodyTypeGuidelines[bodyType as keyof typeof bodyTypeGuidelines]}
- **Gênero**: ${gender} - ${genderGuidelines[gender as keyof typeof genderGuidelines]}
- **Objetivos**: ${goals.join(", ")} - Aplique as estratégias: ${goals.map((g) => goalProgramming[g as keyof typeof goalProgramming] || "Treino balanceado").join("; ")}
- **Experiência**: ${experience} - Ajuste complexidade e volume adequadamente

🔥 REGRAS DE FOCO CORPORAL:
${bodyFocusAreas.includes("Peito") ? "- OBRIGATÓRIO: Inclua 2-3 exercícios de peito em pelo menos 2 dias da semana" : ""}
${bodyFocusAreas.includes("Braços") ? "- OBRIGATÓRIO: Inclua exercícios específicos para bíceps e tríceps em pelo menos 2 dias" : ""}
${bodyFocusAreas.includes("Barriga") ? "- OBRIGATÓRIO: Inclua exercícios abdominais e core em TODOS os dias de treino" : ""}
${bodyFocusAreas.includes("Pernas") ? "- OBRIGATÓRIO: Dedique pelo menos 2 dias completos para membros inferiores" : ""}
${bodyFocusAreas.includes("Corpo inteiro") ? "- OBRIGATÓRIO: Balance todos os grupos musculares igualmente" : ""}

- Calcule TMB usando Mifflin-St Jeor: Homens = (10×peso) + (6.25×altura) - (5×idade) + 5 | Mulheres = (10×peso) + (6.25×altura) - (5×idade) - 161
- Calcule GET baseado no nível de atividade: Sedentário×1.2, Leve×1.375, Moderado×1.55, Intenso×1.725
- Defina meta calórica: Perda (GET-400), Manutenção (GET), Ganho (GET+400)
- Distribua macros: Proteína 1.8-2.2g/kg, Gorduras 25-30% calorias, Carboidratos restante
- Crie 5-6 refeições com alimentos comuns (arroz, frango, batata, ovos, aveia, frutas)
- TODOS os alimentos devem ter quantidades específicas e macros detalhados
- Retorne apenas JSON válido, sem texto extra.

### Dados do cliente:
- Sexo: ${quizData.gender || "Não informado"}
- Idade: ${quizData.age || "Não informado"}
- Altura: ${quizData.height || "Não informado"} cm
- Peso: ${quizData.currentWeight || "Não informado"} kg
- Tipo corporal: ${quizData.bodyType || "Não informado"}
- Objetivo: ${quizData.goal?.join(", ") || "Não informado"}
- Áreas de foco: ${bodyFocusAreas.join(", ") || "Não informado"}
- Dias de treino: ${quizData.trainingDaysPerWeek || 5} por semana
- Tempo disponível: ${quizData.workoutTime || "45-60min"} por treino
- Experiência: ${quizData.experience || "Intermediário"}
- Equipamentos: ${quizData.equipment?.join(", ") || "Academia completa"}
- Alergias: ${quizData.allergies === "sim" ? quizData.allergyDetails || "Não especificado" : "Nenhuma"}
- Meta de peso: ${quizData.targetWeight || "Não informado"}kg
- Prazo: ${targetDate}
`
}

export async function POST(req: Request) {
  try {
    const { userId, quizData: providedQuizData } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    let quizData = providedQuizData
    if (!quizData) {
      const userDocRef = doc(db, "users", userId)
      const docSnap = await getDoc(userDocRef)
      if (!docSnap.exists() || !docSnap.data()?.quizData) {
        return new Response(JSON.stringify({ error: "Quiz data not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      quizData = docSnap.data().quizData
    }

    console.log("🔹 Gerando plano para user:", userId)
    console.log("🔹 Dados do quiz recebidos:", {
      trainingDaysPerWeek: quizData.trainingDaysPerWeek,
      goal: quizData.goal,
      experience: quizData.experience,
    })
    console.log(`[API] Training frequency received: ${quizData.trainingDaysPerWeek}`)

    const generatePlansWithValidation = async (attempt = 1): Promise<any> => {
      const maxAttempts = 3
      const exerciseRange = getExerciseCountRange(quizData.workoutTime)

      console.log(`[v0] Tentativa ${attempt}: Enviando prompt para OpenAI...`)
      console.log(`[v0] Prompt includes ${quizData.trainingDaysPerWeek} training days requirement`)
      console.log(
        `[v0] Exercise range for ${quizData.workoutTime}: ${exerciseRange.min}-${exerciseRange.max} exercises`,
      )

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um especialista em nutrição e treino." },
          { role: "user", content: buildPrompt(quizData) },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        response_format: { type: "json_object" },
        max_tokens: 16000,
      })

      const content = response.choices[0].message?.content
      if (!content) throw new Error("Resposta da OpenAI vazia")

      console.log(`[v0] Resposta recebida da OpenAI (${content.length} caracteres)`)

      const parsed = JSON.parse(content)

      const expectedDays = quizData.trainingDaysPerWeek || 5
      const actualDays = parsed.workoutPlan?.days?.length || 0

      console.log(`[v0] Tentativa ${attempt}: Esperado ${expectedDays} dias, recebido ${actualDays} dias`)

      if (parsed.workoutPlan?.days) {
        let totalExercises = 0
        parsed.workoutPlan.days.forEach((day: any, index: number) => {
          const exerciseCount = day.exercises?.length || 0
          totalExercises += exerciseCount
          console.log(`[v0] Dia ${index + 1} (${day.title}): ${exerciseCount} exercícios`)

          if (exerciseCount < exerciseRange.min || exerciseCount > exerciseRange.max) {
            console.warn(
              `[v0] WARNING: Day ${index + 1} has ${exerciseCount} exercises (should be ${exerciseRange.min}-${exerciseRange.max} for ${quizData.workoutTime})`,
            )
          }
        })
        console.log(`[v0] Total exercises across all days: ${totalExercises}`)
        console.log(`[v0] Expected range per day: ${exerciseRange.description}`)
      }

      const hasCorrectDays = actualDays === expectedDays
      const hasCorrectExerciseCount = parsed.workoutPlan?.days?.every(
        (day: any) =>
          day.exercises && day.exercises.length >= exerciseRange.min && day.exercises.length <= exerciseRange.max,
      )

      if ((!hasCorrectDays || !hasCorrectExerciseCount) && attempt < maxAttempts) {
        console.log(
          `[v0] Plan validation failed! Days: ${hasCorrectDays}, Exercise count: ${hasCorrectExerciseCount}. Retrying... (${attempt}/${maxAttempts})`,
        )
        return generatePlansWithValidation(attempt + 1)
      }

      console.log(`[v0] Plano final gerado:`, {
        diasTreino: actualDays,
        tempoTreino: quizData.workoutTime,
        faixaExercicios: `${exerciseRange.min}-${exerciseRange.max}`,
        totalExercicios: parsed.workoutPlan?.days?.reduce(
          (total: number, day: any) => total + (day.exercises?.length || 0),
          0,
        ),
        calorias: parsed.dietPlan?.calories,
        refeicoes: parsed.dietPlan?.meals?.length,
      })

      return parsed
    }

    const parsed = await generatePlansWithValidation()

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          quizData,
          plans: parsed,
          dietPlan: parsed.dietPlan,
          workoutPlan: parsed.workoutPlan,
          plansGeneratedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      console.log("✅ Planos salvos no Firestore")
    } catch (firestoreError) {
      console.warn("⚠️ Erro ao salvar no Firestore:", firestoreError)
    }

    return new Response(JSON.stringify({ success: true, plans: parsed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("❌ Erro ao gerar plano:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
