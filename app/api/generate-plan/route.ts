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

    // Gerar plano de dieta
    const dietPrompt = `
    Com base nas seguintes informações do usuário, crie um plano de dieta personalizado em português brasileiro.
    
    Dados do usuário:
    - Gênero: ${quizData.gender}
    - Idade: ${quizData.age}
    - Peso: ${quizData.weight}kg
    - Altura: ${quizData.height}cm
    - Nível de atividade: ${quizData.activityLevel}
    - Objetivo: ${quizData.goal}
    - Tipo corporal: ${quizData.bodyType}
    - Restrições alimentares: ${quizData.dietaryRestrictions || "Nenhuma"}
    - Preferências alimentares: ${quizData.foodPreferences || "Nenhuma"}

    Responda APENAS com um JSON válido no seguinte formato. Não inclua nenhum texto adicional ou markdown (como \`\`\`json):
    {
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "07:00",
          "foods": [
            {
              "name": "Nome do alimento",
              "quantity": "quantidade",
              "calories": 300
            }
          ],
          "totalCalories": 300
        }
      ],
      "totalDailyCalories": 2000,
      "macros": {
        "protein": 150,
        "carbs": 200,
        "fat": 60
      },
      "tips": ["Beba bastante água.", "Coma vegetais variados."]
    }

    Inclua pelo menos 5 refeições (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar).
    `

    const dietResult = await generateText({
      model: openai("gpt-4o"),
      prompt: dietPrompt,
      maxTokens: 2000,
      response_format: { type: "json_object" }, // Garante que a IA tente retornar JSON
    })

    // Gerar plano de treino
    const workoutPrompt = `
    Com base nas seguintes informações do usuário, crie um plano de treino personalizado em português brasileiro.
    
    Dados do usuário:
    - Gênero: ${quizData.gender}
    - Idade: ${quizData.age}
    - Peso: ${quizData.weight}kg
    - Altura: ${quizData.height}cm
    - Nível de atividade: ${quizData.activityLevel}
    - Objetivo: ${quizData.goal}
    - Tipo corporal: ${quizData.bodyType}
    - Experiência com exercícios: ${quizData.exerciseExperience || "Iniciante"}
    - Tempo disponível: ${quizData.timeAvailable || "1 hora"}

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
        },
        {
          "day": "Terça-feira",
          "focus": "Foco do treino (e.g., Costas e Bíceps)",
          "exercises": [],
          "duration": "60 minutos"
        }
      ],
      "weeklySchedule": "Exemplo: Treino 4x por semana, com 2 dias de descanso ativo.",
      "tips": ["Aqueça antes de cada treino.", "Mantenha a forma correta."]
    }

    Crie um plano para pelo menos 4 dias da semana.
    `

    const workoutResult = await generateText({
      model: openai("gpt-4o"),
      prompt: workoutPrompt,
      maxTokens: 2000,
      response_format: { type: "json_object" }, // Garante que a IA tente retornar JSON
    })

    // Parse dos resultados JSON usando a função auxiliar
    let dietPlan, workoutPlan
    try {
      dietPlan = extractJson(dietResult.text)
      if (!dietPlan) throw new Error("Diet plan JSON extraction failed.")
    } catch (error) {
      console.error("Erro ao parsear plano de dieta:", error)
      dietPlan = {
        meals: [],
        totalDailyCalories: 0,
        macros: { protein: 0, carbs: 0, fat: 0 },
        tips: [],
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
