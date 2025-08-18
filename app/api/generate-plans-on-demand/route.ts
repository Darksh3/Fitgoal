import OpenAI from "openai"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Gera o prompt para o ChatGPT com base no quizData
 */
function buildPrompt(quizData: any) {
  const targetDate = quizData.eventDate || quizData.timeToGoal || "Não informado"

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
        "duration": "60 min",
        "exercises": [
          { "name": "Supino reto com barra", "sets": 4, "reps": "8-12", "rest": "90s", "description": "Exercício principal para peito, foco na porção média do peitoral maior" },
          { "name": "Supino inclinado com halteres", "sets": 4, "reps": "10-12", "rest": "90s", "description": "Trabalha a porção superior do peitoral" },
          { "name": "Crucifixo inclinado", "sets": 3, "reps": "12-15", "rest": "60s", "description": "Isolamento do peitoral superior" },
          { "name": "Paralelas", "sets": 3, "reps": "8-12", "rest": "90s", "description": "Exercício composto para peito inferior e tríceps" },
          { "name": "Tríceps testa com barra", "sets": 4, "reps": "10-12", "rest": "60s", "description": "Isolamento do tríceps, porção longa" },
          { "name": "Tríceps corda na polia", "sets": 3, "reps": "12-15", "rest": "45s", "description": "Isolamento do tríceps lateral" },
          { "name": "Tríceps francês com halter", "sets": 3, "reps": "10-12", "rest": "60s", "description": "Trabalha toda a musculatura do tríceps" }
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
- CADA dia deve ter 7-9 exercícios completos com séries, repetições, descanso e descrição.
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
- Dias de treino: ${quizData.trainingDaysPerWeek || 5} por semana
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

    const generatePlansWithValidation = async (attempt = 1): Promise<any> => {
      const maxAttempts = 3

      console.log(`[v0] Tentativa ${attempt}: Enviando prompt para OpenAI...`)

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um especialista em nutrição e treino." },
          { role: "user", content: buildPrompt(quizData) },
        ],
        temperature: 0.7,
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
        parsed.workoutPlan.days.forEach((day: any, index: number) => {
          console.log(`[v0] Dia ${index + 1} (${day.title}): ${day.exercises?.length || 0} exercícios`)
        })
      }

      if (actualDays !== expectedDays && attempt < maxAttempts) {
        console.log(`[v0] Número incorreto de dias! Tentando novamente... (${attempt}/${maxAttempts})`)
        return generatePlansWithValidation(attempt + 1)
      }

      console.log(`[v0] Plano final gerado:`, {
        diasTreino: actualDays,
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
