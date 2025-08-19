import { type NextRequest, NextResponse } from "next/server"
import { adminDb, admin } from "@/lib/firebaseAdmin"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Função auxiliar para extrair JSON de uma string, mesmo que contenha texto extra
function extractJson(text: string): any | null {
  try {
    // Tenta encontrar o primeiro e último { } para extrair o JSON
    const startIndex = text.indexOf("{")
    const endIndex = text.lastIndexOf("}")

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonString = text.substring(startIndex, endIndex + 1)
      return JSON.parse(jsonString)
    }
    // Se não encontrar { } ou se a estrutura for inválida, tenta parsear diretamente
    return JSON.parse(text)
  } catch (e) {
    console.error("Failed to extract and parse JSON:", e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, quizData } = body

    if (!userId || !quizData) {
      return NextResponse.json({ error: "Missing userId or quizData" }, { status: 400 })
    }

    console.log("API /api/generate-plan: Recebido quizData para userID:", userId)
    console.log(`[v0] Diet generation - User data:`, {
      gender: quizData.gender,
      age: quizData.age,
      weight: quizData.currentWeight || quizData.weight,
      height: quizData.height,
      goal: quizData.goal,
      activityLevel: quizData.activityLevel,
    })

    const dietPrompt = `
    Você é um nutricionista esportivo profissional. Crie um plano de dieta personalizado em português brasileiro.
    
    Dados do usuário:
    - Gênero: ${quizData.gender}
    - Idade: ${quizData.age}
    - Peso atual: ${quizData.currentWeight || quizData.weight}kg
    - Altura: ${quizData.height}cm
    - Nível de atividade: ${quizData.activityLevel}
    - Objetivo: ${Array.isArray(quizData.goal) ? quizData.goal.join(", ") : quizData.goal}
    - Tipo corporal: ${quizData.bodyType}
    - Restrições alimentares: ${quizData.dietaryRestrictions || "Nenhuma"}
    - Preferências alimentares: ${quizData.foodPreferences || "Nenhuma"}

    INSTRUÇÕES OBRIGATÓRIAS:
    1. Calcule TMB usando Mifflin-St Jeor: Homens = (10×peso) + (6.25×altura) - (5×idade) + 5 | Mulheres = (10×peso) + (6.25×altura) - (5×idade) - 161
    2. Calcule GET baseado no nível de atividade: Sedentário×1.2, Leve×1.375, Moderado×1.55, Intenso×1.725
    3. Defina meta calórica: Perda (GET-400), Manutenção (GET), Ganho (GET+400)
    4. Distribua macros: Proteína 1.8-2.2g/kg, Gorduras 25-30% calorias, Carboidratos restante
    5. Crie OBRIGATORIAMENTE 5-6 refeições detalhadas com alimentos específicos, quantidades exatas e macros
    6. TODOS os alimentos devem ter quantidades específicas (ex: "100g peito de frango", "1 banana média (120g)")

    Responda APENAS com um JSON válido no seguinte formato:
    {
      "totalDailyCalories": 2500,
      "macros": {
        "protein": "150g",
        "carbs": "300g", 
        "fat": "85g"
      },
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "07:00",
          "foods": [
            {
              "name": "100g aveia em flocos",
              "quantity": "100g",
              "calories": 380,
              "protein": 13,
              "carbs": 67,
              "fats": 7
            },
            {
              "name": "1 banana média",
              "quantity": "120g",
              "calories": 100,
              "protein": 1,
              "carbs": 27,
              "fats": 0
            }
          ],
          "totalCalories": 480,
          "macros": {
            "protein": "14g",
            "carbs": "94g",
            "fats": "7g"
          }
        }
      ],
      "tips": [
        "Beba pelo menos 2.5L de água por dia",
        "Consuma proteína em todas as refeições",
        "Prefira carboidratos complexos"
      ]
    }

    IMPORTANTE: Crie um plano profissional com pelo menos 5 refeições completas, cada uma com 2-4 alimentos específicos e macros detalhados.
    `

    const dietResult = await generateText({
      model: openai("gpt-4o"),
      prompt: dietPrompt,
      maxTokens: 3000, // Increased token limit for more detailed diet plans
      response_format: { type: "json_object" },
    })

    // Gerar plano de treino
    const workoutPrompt = `
    Com base nas seguintes informações do usuário, crie um plano de treino personalizado em português brasileiro.
    
    Dados do usuário:
    - Gênero: ${quizData.gender}
    - Idade: ${quizData.age}
    - Peso: ${quizData.currentWeight || quizData.weight}kg
    - Altura: ${quizData.height}cm
    - Nível de atividade: ${quizData.activityLevel}
    - Objetivo: ${Array.isArray(quizData.goal) ? quizData.goal.join(", ") : quizData.goal}
    - Tipo corporal: ${quizData.bodyType}
    - Experiência com exercícios: ${quizData.exerciseExperience || "Iniciante"}
    - Tempo disponível: ${quizData.timeAvailable || "1 hora"}
    - Dias de treino por semana: ${quizData.trainingDaysPerWeek || 5}

    Responda APENAS com um JSON válido no seguinte formato. Não inclua nenhum texto adicional ou markdown (como \`\`\`json):
    {
      "days": [
        {
          "day": "Segunda-feira",
          "focus": "Foco do treino (e.g., Peito e Tríceps)",
          "exercises": [
            {
              "name": "Supino Reto com Barra",
              "sets": "3",
              "reps": "8-12",
              "rest": "60-90 segundos",
              "instructions": "Deite-se no banco, segure a barra com as mãos um pouco mais afastadas que a largura dos ombros, desça até tocar o peito e empurre para cima."
            }
          ],
          "duration": "60 minutos"
        }
      ],
      "weeklySchedule": "Treino ${quizData.trainingDaysPerWeek || 5}x por semana",
      "tips": ["Aqueça antes de cada treino.", "Mantenha a forma correta."]
    }

    // IMPORTANTE: 
    // - Crie um plano para EXATAMENTE ${quizData.trainingDaysPerWeek || 5} dias da semana.
    // - CADA dia deve ter OBRIGATORIAMENTE 7-9 exercícios completos com séries, repetições, descanso e instruções detalhadas.
    // - NUNCA crie dias com menos de 7 exercícios - isso é inaceitável para um treino profissional.
    `

    const workoutResult = await generateText({
      model: openai("gpt-4o"),
      prompt: workoutPrompt,
      maxTokens: 3000, // Increased token limit for detailed workout plans
      response_format: { type: "json_object" },
    })

    // Parse dos resultados JSON usando a função auxiliar
    let dietPlan, workoutPlan
    try {
      dietPlan = extractJson(dietResult.text)
      if (!dietPlan) throw new Error("Diet plan JSON extraction failed.")

      console.log(`[v0] Diet plan generated:`, {
        totalCalories: dietPlan.totalDailyCalories,
        mealsCount: dietPlan.meals?.length || 0,
        hasProperMacros: !!(dietPlan.macros?.protein && dietPlan.macros?.carbs && dietPlan.macros?.fat),
      })

      // Validate diet plan quality
      if (!dietPlan.meals || dietPlan.meals.length < 5) {
        console.warn(`[v0] Diet plan has insufficient meals: ${dietPlan.meals?.length || 0}`)
      }
    } catch (error) {
      console.error("Erro ao parsear plano de dieta:", error)
      dietPlan = {
        totalDailyCalories: 2500,
        macros: { protein: "150g", carbs: "300g", fat: "85g" },
        meals: [
          {
            name: "Café da Manhã",
            time: "07:00",
            foods: [
              { name: "100g aveia em flocos", quantity: "100g", calories: 380, protein: 13, carbs: 67, fats: 7 },
              { name: "1 banana média", quantity: "120g", calories: 100, protein: 1, carbs: 27, fats: 0 },
            ],
            totalCalories: 480,
            macros: { protein: "14g", carbs: "94g", fats: "7g" },
          },
          {
            name: "Almoço",
            time: "12:00",
            foods: [
              {
                name: "150g peito de frango grelhado",
                quantity: "150g",
                calories: 250,
                protein: 47,
                carbs: 0,
                fats: 5,
              },
              { name: "100g arroz integral cozido", quantity: "100g", calories: 110, protein: 3, carbs: 23, fats: 1 },
            ],
            totalCalories: 360,
            macros: { protein: "50g", carbs: "23g", fats: "6g" },
          },
        ],
        tips: ["Beba pelo menos 2.5L de água por dia", "Consuma proteína em todas as refeições"],
      }
    }

    try {
      workoutPlan = extractJson(workoutResult.text)
      if (!workoutPlan) throw new Error("Workout plan JSON extraction failed.")
    } catch (error) {
      console.error("Erro ao parsear plano de treino:", error)
      workoutPlan = {
        days: [],
        weeklySchedule: "",
        tips: [],
      }
    }

    // Salvar no Firestore usando a sintaxe correta do Admin SDK
    const userDocRef = adminDb.collection("users").doc(userId)
    await userDocRef.set(
      {
        quizData,
        dietPlan,
        workoutPlan,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    console.log("Planos salvos com sucesso para o usuário:", userId)

    return NextResponse.json({
      success: true,
      dietPlan,
      workoutPlan,
    })
  } catch (error) {
    console.error("Erro ao gerar plano:", error)
    return NextResponse.json({ error: "Erro interno do servidor", details: (error as Error).message }, { status: 500 })
  }
}
