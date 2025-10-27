import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, admin, auth } from "@/lib/firebaseAdmin" // Ensure auth is imported from firebaseAdmin
import sgMail from "@sendgrid/mail"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Helper function to extract JSON from a string, even if it contains extra text
function extractJson(text: string): any | null {
  try {
    const startIndex = text.indexOf("{")
    const endIndex = text.lastIndexOf("}")

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonString = text.substring(startIndex, endIndex + 1)
      return JSON.parse(jsonString)
    }
    return JSON.parse(text)
  } catch (e) {
    console.error("Failed to extract and parse JSON from AI response:", e)
    return null
  }
}

// Configura a chave da API do SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
} else {
  console.error("SENDGRID_API_KEY não está definida. O envio de e-mails não funcionará.")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sessionId, subscription_id, customer_id, client_uid } = body

    if (!sessionId && !subscription_id) {
      return NextResponse.json({ error: "sessionId ou subscription_id ausente." }, { status: 400 })
    }

    let userEmail: string | null = null
    let userName: string | null = null
    let quizAnswersFromMetadata: any = {}
    let planType: string | null = null
    let clientUidFromSource: string | null = client_uid || null
    let stripeCustomerId: string | null = customer_id || null

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      })

      if (!session) {
        return NextResponse.json({ error: "Sessão do Stripe não encontrada." }, { status: 404 })
      }

      userEmail = session.customer_details?.email || null
      userName = session.customer_details?.name || null
      quizAnswersFromMetadata = session.metadata?.quizAnswers ? JSON.parse(session.metadata.quizAnswers) : {}
      planType = session.metadata?.planType || null
      clientUidFromSource = session.metadata?.clientUid || null
      stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null
    } else if (subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ["customer"],
      })

      if (!subscription) {
        return NextResponse.json({ error: "Assinatura do Stripe não encontrada." }, { status: 404 })
      }

      const customer = subscription.customer as Stripe.Customer
      userEmail = customer.email
      userName = customer.name
      planType = subscription.items.data[0]?.price.id || null
      clientUidFromSource = subscription.metadata?.clientUid || client_uid
      stripeCustomerId = customer.id

      // For direct subscription, we need to get quiz data from Firestore using clientUid
      if (clientUidFromSource) {
        try {
          const clientDocRef = adminDb.collection("users").doc(clientUidFromSource)
          const clientDocSnap = await clientDocRef.get()
          if (clientDocSnap.exists()) {
            const clientData = clientDocSnap.data()
            quizAnswersFromMetadata = clientData?.quizData || clientData?.quizAnswers || {}
          }
        } catch (error) {
          console.warn("Não foi possível recuperar dados do quiz do Firestore:", error)
        }
      }
    }

    const planNames: { [key: string]: string } = {
      price_1RajatPRgKqdJdqNnb9HQe17: "Plano Premium Mensal",
      price_1RajgKPRgKqdJdqNTnkZb2zD: "Plano Semestral",
      price_1RajgKPRgKqdJdqNnhxim8dd: "Plano Premium Anual",
      price_1RajgKPRgKqdJdqNPqgehqnX: "Plano Trimestral",
      price_1RdpDTPRgKqdJdqNrvZccKxj: "Plano Anual Teste",
    }

    if (!userEmail) {
      console.error("ERRO: E-mail do cliente não encontrado.")
      return NextResponse.json({ error: "E-mail do cliente ausente." }, { status: 400 })
    }

    console.log("DEBUG: Iniciando processo de pós-checkout para:", { userEmail, clientUid: clientUidFromSource })

    let finalUserUid: string
    let isNewUser = false

    if (clientUidFromSource) {
      try {
        // Primeiro, tenta converter o usuário anônimo existente
        console.log(`DEBUG: Tentando converter usuário anônimo ${clientUidFromSource} para autenticado`)

        // Verifica se o usuário anônimo existe
        const anonymousUser = await auth.getUser(clientUidFromSource)

        if (anonymousUser && !anonymousUser.email) {
          // É um usuário anônimo, vamos convertê-lo
          console.log(`DEBUG: Convertendo usuário anônimo ${clientUidFromSource} para ${userEmail}`)

          await auth.updateUser(clientUidFromSource, {
            email: userEmail,
            displayName: userName,
            emailVerified: false,
          })

          finalUserUid = clientUidFromSource
          isNewUser = true // Tratamos como novo usuário para envio de email
          console.log(`DEBUG: Usuário anônimo convertido com sucesso: ${finalUserUid}`)
        } else {
          // Não é anônimo ou não existe, criar novo usuário
          throw new Error("Usuário não é anônimo ou não existe")
        }
      } catch (conversionError: any) {
        console.log(`DEBUG: Conversão falhou, criando novo usuário. Erro: ${conversionError.message}`)

        // Se a conversão falhar, criar novo usuário
        try {
          const existingUser = await auth.getUserByEmail(userEmail)
          finalUserUid = existingUser.uid
          console.log(`DEBUG: Usuário existente encontrado: ${finalUserUid}`)
        } catch (notFoundError: any) {
          if (notFoundError.code === "auth/user-not-found") {
            const temporaryPassword = Math.random().toString(36).slice(-12) + "A1!"
            const newUser = await auth.createUser({
              email: userEmail,
              password: temporaryPassword,
              displayName: userName,
              emailVerified: false,
            })
            finalUserUid = newUser.uid
            isNewUser = true
            console.log(`DEBUG: Novo usuário criado: ${finalUserUid}`)

            // Limpar usuário anônimo se existir
            if (clientUidFromSource && clientUidFromSource !== finalUserUid) {
              try {
                await auth.deleteUser(clientUidFromSource)
                console.log(`DEBUG: Usuário anônimo ${clientUidFromSource} deletado`)
              } catch (deleteError) {
                console.warn(`Falha ao deletar usuário anônimo: ${deleteError}`)
              }
            }
          } else {
            throw notFoundError
          }
        }
      }
    } else {
      // Sem clientUid, criar novo usuário normalmente
      try {
        const existingUser = await auth.getUserByEmail(userEmail)
        finalUserUid = existingUser.uid
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          const temporaryPassword = Math.random().toString(36).slice(-12) + "A1!"
          const newUser = await auth.createUser({
            email: userEmail,
            password: temporaryPassword,
            displayName: userName,
            emailVerified: false,
          })
          finalUserUid = newUser.uid
          isNewUser = true
        } else {
          throw error
        }
      }
    }

    let existingUserData: admin.firestore.DocumentData = {}
    if (clientUidFromSource) {
      try {
        const clientDocRef = adminDb.collection("users").doc(clientUidFromSource)
        const clientDocSnap = await clientDocRef.get()

        if (clientDocSnap && clientDocSnap.exists && clientDocSnap.exists()) {
          existingUserData = clientDocSnap.data() || {}
          console.log(`Dados existentes do UID do cliente (${clientUidFromSource}) recuperados.`)
        } else {
          console.warn(`Nenhum documento encontrado para o clientUid: ${clientUidFromSource}.`)
        }
      } catch (firestoreError: any) {
        console.error(`Erro ao buscar documento do clientUid ${clientUidFromSource}:`, firestoreError.message)
      }
    }

    let dietPlan = existingUserData.dietPlan
    let workoutPlan = existingUserData.workoutPlan

    if (!dietPlan || !workoutPlan) {
      console.log("DEBUG: Gerando novos planos (diet/workout) para o usuário:", finalUserUid)

      const calculateNutrition = (userData: any) => {
        const weight = Number.parseFloat(userData.currentWeight) || 70
        const height = Number.parseFloat(userData.height) || 175
        const age = Number.parseInt(userData.age) || 25
        const gender = userData.gender || "masculino"
        const trainingDays = Number.parseInt(userData.trainingDaysPerWeek) || 5
        const goal = userData.goal || "Ganho de massa muscular"
        const experience = userData.experience || "Iniciante"
        const bodyType = userData.bodyType || "mesomorfo"
        const targetWeight = Number.parseFloat(userData.targetWeight) || weight + 8
        const timeToGoal = userData.timeToGoal || "26 de nov. de 2025"

        // 1. TMB = (10 × peso[kg]) + (6.25 × altura[cm]) - (5 × idade) + 5
        let tmb: number
        if (gender.toLowerCase() === "feminino") {
          tmb = 10 * weight + 6.25 * height - 5 * age - 161
        } else {
          tmb = 10 * weight + 6.25 * height - 5 * age + 5
        }

        // 2. TDEE = TMB × fator_de_atividade (1.2 sedentário, 1.6 regularmente ativo, 2.0 atleta)
        let activityMultiplier: number
        if (trainingDays <= 2 || experience === "Sedentário") {
          activityMultiplier = 1.2 // Sedentário
        } else if (trainingDays >= 6 || experience === "Avançado") {
          activityMultiplier = 2.0 // Atleta
        } else {
          activityMultiplier = 1.6 // Regularmente ativo
        }

        let tdee = tmb * activityMultiplier

        if (bodyType === "ectomorfo") {
          tdee *= 1.1 // +10% para ectomorfos
        } else if (bodyType === "endomorfo") {
          tdee *= 0.95 // -5% para endomorfos
        }

        let calorieAdjustment = 0
        if (goal.toLowerCase().includes("ganho") || goal.toLowerCase().includes("massa")) {
          const weightDifference = targetWeight - weight

          const targetDate = new Date(
            timeToGoal.replace(/(\d+) de (\w+)\. de (\d+)/, (match, day, month, year) => {
              const months: { [key: string]: string } = {
                jan: "01",
                fev: "02",
                mar: "03",
                abr: "04",
                mai: "05",
                jun: "06",
                jul: "07",
                ago: "08",
                set: "09",
                out: "10",
                nov: "11",
                dez: "12",
              }
              return `${year}-${months[month]}-${day.padStart(2, "0")}`
            }),
          )

          const currentDate = new Date()
          const weeksToGoal = Math.max(
            1,
            Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 7)),
          )

          const weeklyGainNeeded = Math.max(0.2, weightDifference / weeksToGoal)
          calorieAdjustment = Math.round((weeklyGainNeeded * 7700) / 7)
        } else if (goal.toLowerCase().includes("perda") || goal.toLowerCase().includes("emagrecer")) {
          const weightDifference = weight - targetWeight // Positive value for weight loss

          const targetDate = new Date(
            timeToGoal.replace(/(\d+) de (\w+)\. de (\d+)/, (match, day, month, year) => {
              const months: { [key: string]: string } = {
                jan: "01",
                fev: "02",
                mar: "03",
                abr: "04",
                mai: "05",
                jun: "06",
                jul: "07",
                ago: "08",
                set: "09",
                out: "10",
                nov: "11",
                dez: "12",
              }
              return `${year}-${months[month]}-${day.padStart(2, "0")}`
            }),
          )

          const currentDate = new Date()
          const weeksToGoal = Math.max(
            4, // Minimum 4 weeks for safe weight loss
            Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 7)),
          )

          // Safe weekly loss: max 1kg/week (0.5-1kg recommended)
          const weeklyLossNeeded = Math.min(1.0, Math.max(0.3, weightDifference / weeksToGoal))

          // Calculate deficit (7700 kcal per kg of fat loss)
          const calculatedDeficit = Math.round((weeklyLossNeeded * 7700) / 7)

          // Safety limits: minimum -200 kcal, maximum -1300 kcal per day
          calorieAdjustment = -Math.min(1300, Math.max(200, calculatedDeficit))
        }

        const targetCalories = Math.round(tdee + calorieAdjustment)

        let proteinPerKg = 1.6
        if (goal.toLowerCase().includes("ganho") || goal.toLowerCase().includes("massa")) {
          switch (bodyType) {
            case "ectomorfo":
              proteinPerKg = 2.5
              break // Mais difícil ganhar massa
            case "mesomorfo":
              proteinPerKg = 2.2
              break // Resposta padrão boa
            case "endomorfo":
              proteinPerKg = 2.0
              break // Ganha massa mais fácil
          }
        } else if (goal.toLowerCase().includes("perda") || goal.toLowerCase().includes("emagrecer")) {
          switch (bodyType) {
            case "ectomorfo":
              proteinPerKg = 1.8
              break // Preserva massa facilmente
            case "mesomorfo":
              proteinPerKg = 2.0
              break // Equilíbrio
            case "endomorfo":
              proteinPerKg = 2.2
              break // Precisa mais para preservar
          }
        }

        let fatsPerKg = 1.0
        switch (bodyType) {
          case "ectomorfo":
            fatsPerKg = 1.2
            break // Tolera mais gorduras
          case "mesomorfo":
            fatsPerKg = 1.0
            break // Padrão equilibrado
          case "endomorfo":
            fatsPerKg = 0.8
            break // Controla mais gorduras
        }

        const proteinGrams = Math.round(weight * proteinPerKg)
        const fatGrams = Math.round(weight * fatsPerKg)

        // Carboidratos: (Calorias_totais - (Proteínas × 4 + Gorduras × 9)) ÷ 4
        const proteinCalories = proteinGrams * 4
        const fatCalories = fatGrams * 9
        const remainingCalories = targetCalories - proteinCalories - fatCalories
        const carbsGrams = Math.round(remainingCalories / 4)

        return {
          tmb: Math.round(tmb),
          tdee: Math.round(tdee),
          targetCalories,
          proteinGrams,
          carbsGrams,
          fatGrams,
          proteinCalories,
          fatCalories,
          carbsCalories: carbsGrams * 4,
        }
      }

      const nutrition = calculateNutrition(quizAnswersFromMetadata)

      const supplementsData = {
        hipercalorico: {
          name: "Hipercalórico Growth",
          portion: "170g (12 dosadores)",
          calories: 615,
          carbs: 108,
          protein: 37,
          fat: 3.7,
          fiber: 1.9,
          sodium: 268,
        },
        "whey-protein": {
          name: "Whey Protein Concentrado 80% Growth",
          portion: "30g (2 dosadores)",
          calories: 119,
          carbs: 2.3,
          protein: 24,
          fat: 1.5, // Calculated from remaining calories
          fiber: 0,
          sodium: 50,
        },
      }

      let supplementName = ""
      let supplementInfo = null
      if (quizAnswersFromMetadata.supplementType === "hipercalorico") {
        supplementName = "Hipercalórico Growth"
        supplementInfo = supplementsData.hipercalorico
      } else if (quizAnswersFromMetadata.supplementType === "whey-protein") {
        supplementName = "Whey Protein Growth"
        supplementInfo = supplementsData["whey-protein"]
      }

      console.log("[v0] Quiz data retrieved:", JSON.stringify(quizAnswersFromMetadata, null, 2))
      console.log("[v0] ===== SUPPLEMENT DEBUG =====")
      console.log("[v0] wantsSupplement value:", quizAnswersFromMetadata.wantsSupplement)
      console.log("[v0] wantsSupplement type:", typeof quizAnswersFromMetadata.wantsSupplement)
      console.log("[v0] supplementType value:", quizAnswersFromMetadata.supplementType)
      console.log("[v0] supplementType type:", typeof quizAnswersFromMetadata.supplementType)
      console.log(
        "[v0] Condition check (wantsSupplement === 'sim'):",
        quizAnswersFromMetadata.wantsSupplement === "sim",
      )
      console.log("[v0] supplementInfo:", supplementInfo)
      console.log(
        "[v0] Will include supplements in prompt:",
        quizAnswersFromMetadata.wantsSupplement === "sim" && supplementInfo,
      )
      console.log("[v0] ===========================")

      const dietPrompt = `
        Crie um plano alimentar personalizado em português brasileiro usando EXATAMENTE estes valores calculados:

        VALORES CALCULADOS (NÃO ALTERE):
        - Calorias diárias: ${nutrition.targetCalories} kcal
        - Proteína: ${nutrition.proteinGrams}g (${nutrition.proteinCalories} kcal)
        - Carboidratos: ${nutrition.carbsGrams}g (${nutrition.carbsCalories} kcal)
        - Gorduras: ${nutrition.fatGrams}g (${nutrition.fatCalories} kcal)

        DADOS DO USUÁRIO:
        - Peso: ${quizAnswersFromMetadata.currentWeight || 70}kg
        - Objetivo: ${quizAnswersFromMetadata.goal || "Ganho de massa muscular"}
        - Restrições: ${quizAnswersFromMetadata.allergyDetails || "Nenhuma"}
        - Preferências: ${quizAnswersFromMetadata.diet || "Sem restrições"}
        ${
          quizAnswersFromMetadata.wantsSupplement === "sim" && supplementInfo
            ? `- Suplementação: O usuário QUER suplementação. Suplemento recomendado: ${supplementInfo.name}
        
        VALORES NUTRICIONAIS OFICIAIS DO ${supplementInfo.name.toUpperCase()} (USE EXATAMENTE ESTES VALORES):
        - Porção: ${supplementInfo.portion}
        - Calorias: ${supplementInfo.calories} kcal
        - Carboidratos: ${supplementInfo.carbs}g
        - Proteínas: ${supplementInfo.protein}g
        - Gorduras: ${supplementInfo.fat}g
        - Fibras: ${supplementInfo.fiber}g
        - Sódio: ${supplementInfo.sodium}mg`
            : ""
        }

        INSTRUÇÕES:
        - Crie 5-6 refeições que SOMEM exatamente os valores calculados
        - Use alimentos brasileiros comuns
        - Respeite todas as restrições alimentares
        - Distribua os macros proporcionalmente entre as refeições
        ${
          quizAnswersFromMetadata.wantsSupplement === "sim" && supplementInfo
            ? `- IMPORTANTE: Inclua uma seção de suplementos recomendados. OBRIGATORIAMENTE inclua o ${supplementInfo.name} com os valores nutricionais EXATOS fornecidos acima (${supplementInfo.portion}: ${supplementInfo.calories} kcal, ${supplementInfo.carbs}g carbs, ${supplementInfo.protein}g proteína, ${supplementInfo.fat}g gordura). Especifique o horário ideal de consumo baseado no objetivo do usuário. Você pode adicionar outros suplementos complementares se achar necessário (como Creatina, BCAA, Ômega 3, etc).`
            : ""
        }

        Responda APENAS com JSON válido:
        {
          "calculations": {
            "tmb": ${nutrition.tmb},
            "tdee": ${nutrition.tdee},
            "targetCalories": ${nutrition.targetCalories},
            "proteinGrams": ${nutrition.proteinGrams},
            "carbsGrams": ${nutrition.carbsGrams},
            "fatGrams": ${nutrition.fatGrams}
          },
          "meals": [
            {
              "name": "Café da Manhã",
              "time": "07:00",
              "foods": [
                {
                  "name": "[nome do alimento]",
                  "quantity": "[quantidade]",
                  "calories": "[calorias]",
                  "protein": "[proteína em gramas]",
                  "carbs": "[carboidratos em gramas]",
                  "fat": "[gordura em gramas]"
                }
              ],
              "totalCalories": 450,
              "totalProtein": 35,
              "totalCarbs": 25,
              "totalFat": 20
            }
          ],
          ${
            quizAnswersFromMetadata.wantsSupplement === "sim" && supplementInfo
              ? `"supplements": [
            {
              "name": "${supplementInfo.name}",
              "portion": "${supplementInfo.portion}",
              "calories": ${supplementInfo.calories},
              "protein": ${supplementInfo.protein},
              "carbs": ${supplementInfo.carbs},
              "fat": ${supplementInfo.fat},
              "fiber": ${supplementInfo.fiber},
              "sodium": ${supplementInfo.sodium},
              "timing": "Horário ideal baseado no objetivo (ex: Pós-treino para ganho de massa, Entre refeições para hipercalórico)",
              "benefits": "Benefícios específicos para o objetivo do usuário"
            }
          ],`
              : ""
          }
          "totalDailyCalories": ${nutrition.targetCalories},
          "macros": {
            "protein": ${nutrition.proteinGrams},
            "carbs": ${nutrition.carbsGrams},
            "fat": ${nutrition.fatGrams}
          },
          "nutritionalGuidelines": [
            "TMB calculado: ${nutrition.tmb} kcal",
            "TDEE calculado: ${nutrition.tdee} kcal",
            "Calorias alvo: ${nutrition.targetCalories} kcal",
            "Proteína: ${nutrition.proteinGrams}g (2g/kg)",
            "Carboidratos: ${nutrition.carbsGrams}g",
            "Gorduras: ${nutrition.fatGrams}g (1g/kg)"
          ],
          "tips": [
            "Consuma ${nutrition.proteinGrams}g de proteína diariamente",
            "Beba pelo menos ${Math.round((Number.parseFloat(quizAnswersFromMetadata.currentWeight) || 70) * 35)}ml de água por dia",
            "Faça refeições a cada 3-4 horas"
            ${quizAnswersFromMetadata.wantsSupplement === "sim" && supplementInfo ? `, "Siga a suplementação recomendada nos horários indicados para melhores resultados"` : ""}
          ]
        }
      `

      const workoutPrompt = `
        Com base nas seguintes informações do usuário, crie um plano de treino personalizado em português brasileiro.
        Dados do usuário:
        - Gênero: ${quizAnswersFromMetadata.gender}
        - Idade: ${quizAnswersFromMetadata.age}
        - Objetivo: ${quizAnswersFromMetadata.goal}
        - Tipo corporal: ${quizAnswersFromMetadata.bodyType}
        - Experiência: ${quizAnswersFromMetadata.experience || "Iniciante"}
        - Tempo disponível: ${quizAnswersFromMetadata.workoutTime || "1 hora"}
        - Dias de treino por semana: ${quizAnswersFromMetadata.trainingDaysPerWeek || 5}
        
        Responda APENAS com um JSON válido.
        {
          "days": [{"day": "Segunda-feira", "focus": "Peito e Tríceps", "exercises": [{"name": "Supino Reto", "sets": "3", "reps": "10", "rest": "60s", "instructions": "..."}], "duration": "60 min"}],
          "weeklySchedule": "Treino ${quizAnswersFromMetadata.trainingDaysPerWeek || 5}x por semana",
          "tips": ["Aqueça por 10 minutos.", "Mantenha a postura correta."]
        }
        
        IMPORTANTE:
        - Crie um plano para EXATAMENTE ${quizAnswersFromMetadata.trainingDaysPerWeek || 5} dias da semana.
        - CADA dia deve ter OBRIGATORIAMENTE 7-9 exercícios completos com séries, repetições, descanso e instruções detalhadas.
        - NUNCA crie dias com menos de 7 exercícios - isso é inaceitável para um treino profissional.
      `

      const [dietResult, workoutResult] = await Promise.all([
        generateText({ model: openai("gpt-4o"), prompt: dietPrompt, response_format: { type: "json_object" } }),
        generateText({ model: openai("gpt-4o"), prompt: workoutPrompt, response_format: { type: "json_object" } }),
      ])

      dietPlan = extractJson(dietResult.text)
      workoutPlan = extractJson(workoutResult.text)

      if (!dietPlan || !workoutPlan) {
        console.error("ERRO: Falha ao gerar ou parsear os planos da IA para o usuário:", finalUserUid)
        dietPlan = {}
        workoutPlan = {}
      }
    } else {
      console.log("DEBUG: Planos (diet/workout) já existiam no documento do cliente, não re-gerando.")
    }

    console.log("DEBUG: Consolidando e salvando dados completos no Firestore para o usuário:", finalUserUid)
    console.log("DEBUG: Dados que serão salvos:", {
      name: userName,
      email: userEmail,
      hasQuizData: !!quizAnswersFromMetadata && Object.keys(quizAnswersFromMetadata).length > 0,
      planType: planType,
      stripeCustomerId: stripeCustomerId,
      isNewUser: isNewUser,
    })

    const userDocRef = adminDb.collection("users").doc(finalUserUid)
    const userData = {
      ...existingUserData,
      name: userName,
      email: userEmail,
      quizData: {
        age: quizAnswersFromMetadata.age,
        bodyType: quizAnswersFromMetadata.bodyType,
        createdAt: quizAnswersFromMetadata.createdAt,
        completedAt: quizAnswersFromMetadata.completedAt,
        dietPreferences: quizAnswersFromMetadata.dietPreferences,
        trainingDaysPerWeek: quizAnswersFromMetadata.trainingDaysPerWeek, // 🔥 Critical field for workout frequency
        gender: quizAnswersFromMetadata.gender,
        currentWeight: quizAnswersFromMetadata.currentWeight,
        height: quizAnswersFromMetadata.height,
        goal: quizAnswersFromMetadata.goal,
        allergyDetails: quizAnswersFromMetadata.allergyDetails,
        diet: quizAnswersFromMetadata.diet,
        experience: quizAnswersFromMetadata.experience,
        workoutTime: quizAnswersFromMetadata.workoutTime,
        waterIntake: quizAnswersFromMetadata.waterIntake,
        targetWeight: quizAnswersFromMetadata.targetWeight,
        timeToGoal: quizAnswersFromMetadata.timeToGoal,
        wantsSupplement: quizAnswersFromMetadata.wantsSupplement,
        supplements: quizAnswersFromMetadata.supplements,
        supplementType: quizAnswersFromMetadata.supplementType,
        // Include any other fields that might exist
        ...quizAnswersFromMetadata,
      },
      dietPlan: dietPlan,
      workoutPlan: workoutPlan,
      planType: planType,
      stripeCustomerId: stripeCustomerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existingUserData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      isSetupComplete: true,
      hasGeneratedPlans: !!(dietPlan && workoutPlan),
      subscriptionStatus: "active",
    }

    try {
      await userDocRef.set(userData, { merge: true })
      console.log(`DEBUG: Dados salvos com sucesso no Firestore para usuário: ${finalUserUid}`)

      const verificationDoc = await userDocRef.get()
      if (!verificationDoc.exists) {
        throw new Error("Documento do usuário não foi criado corretamente no Firestore")
      }
      console.log(`DEBUG: Verificação confirmada - documento existe no Firestore para: ${finalUserUid}`)
    } catch (firestoreError: any) {
      console.error("ERRO FATAL: Falha ao salvar dados no Firestore:", {
        error: firestoreError.message,
        uid: finalUserUid,
        userData: userData,
      })
      return NextResponse.json(
        {
          error: "Falha ao salvar dados do usuário.",
          details: firestoreError.message,
        },
        { status: 500 },
      )
    }

    let passwordResetLink = ""
    if (isNewUser) {
      try {
        passwordResetLink = await auth.generatePasswordResetLink(userEmail, {
          url: `${process.env.NEXT_PUBLIC_URL}/auth`,
          handleCodeInApp: false,
        })
        console.log("DEBUG: Link de redefinição de senha gerado com sucesso")
      } catch (linkError: any) {
        console.error("ERRO: Falha ao gerar link de redefinição de senha:", linkError.message)
        // Continue without the link - user can still use forgot password on login page
      }
    }

    if (sendgridApiKey) {
      const emailSubject = isNewUser
        ? "Bem-vindo(a) ao FitGoal! Crie sua senha."
        : "Sua Assinatura FitGoal foi Confirmada!"
      const displayPlanName = planNames[planType!] || planType

      let emailHtmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #84cc16;">Olá, ${userName || "campeão(ã)"}!</h1>
          <p>Sua assinatura do plano <strong>${displayPlanName}</strong> foi confirmada!</p>
      `

      if (isNewUser) {
        if (passwordResetLink) {
          emailHtmlContent += `
            <p>Para começar, crie sua senha clicando no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${passwordResetLink}" style="background-color: #84cc16; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Criar Minha Senha</a>
            </div>
            <p><small>Se o botão não funcionar, copie e cole este link no seu navegador:<br>${passwordResetLink}</small></p>
          `
        } else {
          emailHtmlContent += `
            <p>Para acessar sua conta, vá para a página de login e use a opção "Esqueceu a senha?" com seu e-mail:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_URL}/auth" style="background-color: #84cc16; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Fazer Login</a>
            </div>
          `
        }
      } else {
        emailHtmlContent += `
          <p>Acesse seu dashboard aqui:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" style="background-color: #84cc16; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Dashboard</a>
          </div>
        `
      }

      emailHtmlContent += `
          <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
          <p>Equipe FitGoal</p>
        </div>
      `

      const msg = {
        to: userEmail,
        from: "contato@fitgoal.com.br",
        subject: emailSubject,
        html: emailHtmlContent,
      }

      try {
        await sgMail.send(msg)
        console.log(`DEBUG: E-mail de confirmação enviado para ${userEmail}`)
      } catch (emailError: any) {
        console.error("ERRO: Falha ao enviar e-mail com SendGrid:", {
          error: emailError.response?.body || emailError.message,
          email: userEmail,
          subject: emailSubject,
        })
        // Don't fail the entire process if email fails
      }
    } else {
      console.warn("AVISO: SENDGRID_API_KEY não configurada - e-mails não serão enviados")
    }

    console.log(`DEBUG: Processo de pós-checkout concluído com sucesso para usuário: ${finalUserUid}`)
    return NextResponse.json({
      received: true,
      message: "Pós-checkout processado com sucesso.",
      userUid: finalUserUid,
      isNewUser: isNewUser,
    })
  } catch (error: any) {
    console.error("ERRO FATAL em handle-post-checkout:", {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
