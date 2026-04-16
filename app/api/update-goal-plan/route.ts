import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Scientific Calculation Engine ──────────────────────────────────────────

interface GoalInput {
  userId: string
  currentWeight: number   // kg
  targetWeight: number    // kg
  gender: "masculino" | "feminino"
  bodyType: "ectomorfo" | "mesomorfo" | "endomorfo"
  trainingDays: number    // per week
  phase: "cutting" | "bulking"
  age?: number
  height?: number         // cm
}

interface ScientificResult {
  dailyCalories: number
  protein: number         // g
  carbs: number           // g
  fat: number             // g
  weeklyRate: number      // kg/week
  weeksToGoal: number
  deadlineDate: string    // ISO string
  surplusDeficit: number  // kcal/day (negative = deficit)
  bmr: number
  tdee: number
  phase: "cutting" | "bulking"
}

function calculateScientificMacros(input: GoalInput): ScientificResult {
  const {
    currentWeight,
    targetWeight,
    gender,
    bodyType,
    trainingDays,
    phase,
    age = 28,
    height = 170,
  } = input

  // ── 1. BMR via Mifflin-St Jeor ───────────────────────────────────────────
  let bmr: number
  if (gender === "masculino") {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5
  } else {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161
  }

  // ── 2. Activity multiplier ────────────────────────────────────────────────
  const activityMap: Record<number, number> = {
    0: 1.2,
    1: 1.375,
    2: 1.375,
    3: 1.55,
    4: 1.55,
    5: 1.725,
    6: 1.725,
    7: 1.9,
  }
  const activityKey = Math.min(7, Math.max(0, trainingDays))
  const activityMultiplier = activityMap[activityKey] ?? 1.55
  const tdee = bmr * activityMultiplier

  // ── 3. Somatotype adjustments ─────────────────────────────────────────────
  // Ectomorph: fast metabolism → higher carbs, moderate protein
  // Mesomorph: balanced → standard ratios
  // Endomorph: slow metabolism → lower carbs, higher protein & fat
  const somatotypeCalorieAdj: Record<string, number> = {
    ectomorfo: 1.05,    // +5% calories
    mesomorfo: 1.0,
    endomorfo: 0.95,    // -5% calories
  }
  const tdeeAdjusted = tdee * (somatotypeCalorieAdj[bodyType] ?? 1.0)

  // ── 4. Ideal weekly rate by somatotype & phase ───────────────────────────
  // Cutting: ectomorfo 0.3kg/week, mesomorfo 0.5kg/week, endomorfo 0.7kg/week
  // Bulking: ectomorfo 0.4kg/week, mesomorfo 0.3kg/week, endomorfo 0.2kg/week
  const weeklyRateMap: Record<string, Record<string, number>> = {
    cutting: { ectomorfo: 0.3, mesomorfo: 0.5, endomorfo: 0.7 },
    bulking:  { ectomorfo: 0.4, mesomorfo: 0.3, endomorfo: 0.2 },
  }
  const weeklyRate = weeklyRateMap[phase]?.[bodyType] ?? 0.5

  // ── 5. Calorie surplus/deficit ────────────────────────────────────────────
  // 1kg fat ≈ 7700 kcal
  const surplusDeficit = phase === "cutting"
    ? -(weeklyRate * 7700) / 7
    :  (weeklyRate * 7700) / 7

  const dailyCalories = Math.round(tdeeAdjusted + surplusDeficit)

  // ── 6. Protein (priority: preserve/build muscle) ─────────────────────────
  // Cutting: 2.2g/kg (preserve muscle), Bulking: 1.8g/kg
  // Gender adj: women slightly lower
  const proteinPerKg: Record<string, Record<string, number>> = {
    cutting: { masculino: 2.2, feminino: 2.0 },
    bulking:  { masculino: 1.8, feminino: 1.6 },
  }
  const proteinMult = proteinPerKg[phase]?.[gender] ?? 2.0
  // Somatotype: endo needs more protein during cutting
  const proteinSomato = bodyType === "endomorfo" && phase === "cutting" ? 0.2 : 0
  const protein = Math.round(currentWeight * (proteinMult + proteinSomato))

  // ── 7. Fat (minimum healthy: 0.8g/kg, optimal: 1.0-1.2g/kg) ────────────
  const fatPerKg: Record<string, number> = {
    ectomorfo: 1.0,
    mesomorfo: 0.9,
    endomorfo: 0.8,
  }
  const fat = Math.round(currentWeight * (fatPerKg[bodyType] ?? 0.9))

  // ── 8. Remaining calories → carbs ────────────────────────────────────────
  const proteinCals = protein * 4
  const fatCals = fat * 9
  const carbCals = dailyCalories - proteinCals - fatCals
  const carbs = Math.max(50, Math.round(carbCals / 4)) // min 50g carbs

  // ── 9. Timeline ───────────────────────────────────────────────────────────
  const weightDiff = Math.abs(targetWeight - currentWeight)
  const weeksToGoal = Math.ceil(weightDiff / weeklyRate)
  const deadlineDate = new Date()
  deadlineDate.setDate(deadlineDate.getDate() + weeksToGoal * 7)

  return {
    dailyCalories,
    protein,
    carbs,
    fat,
    weeklyRate,
    weeksToGoal,
    deadlineDate: deadlineDate.toISOString(),
    surplusDeficit: Math.round(surplusDeficit),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    phase,
  }
}

// ─── Diet Generation via OpenAI ──────────────────────────────────────────────

async function generateNewDiet(
  macros: ScientificResult,
  userProfile: {
    gender: string
    bodyType: string
    phase: string
    currentWeight: number
    targetWeight: number
    trainingDays: number
    foodRestrictions?: string[]
    supplementType?: string
  }
): Promise<string> {
  const phaseLabel = macros.phase === "cutting" ? "CUTTING (perda de gordura)" : "BULKING (ganho de massa)"
  const bodyTypeLabel = userProfile.bodyType === "ectomorfo"
    ? "Ectomorfo (metabolismo acelerado, dificuldade em ganhar massa)"
    : userProfile.bodyType === "mesomorfo"
    ? "Mesomorfo (genética favorável, responde bem a qualquer estímulo)"
    : "Endomorfo (metabolismo lento, tendência a acumular gordura)"

  const restrictions = userProfile.foodRestrictions?.length
    ? `Restrições alimentares: ${userProfile.foodRestrictions.join(", ")}`
    : "Sem restrições alimentares"

  const prompt = `Você é um nutricionista esportivo especializado. Crie um plano alimentar completo e detalhado para o seguinte perfil:

PERFIL DO USUÁRIO:
- Sexo: ${userProfile.gender}
- Biotipo: ${bodyTypeLabel}
- Fase: ${phaseLabel}
- Peso atual: ${userProfile.currentWeight}kg → Meta: ${userProfile.targetWeight}kg
- Treinos por semana: ${userProfile.trainingDays}x
- ${restrictions}

METAS NUTRICIONAIS CALCULADAS CIENTIFICAMENTE:
- Calorias diárias: ${macros.dailyCalories} kcal
- Proteínas: ${macros.protein}g (${Math.round((macros.protein * 4 / macros.dailyCalories) * 100)}% das calorias)
- Carboidratos: ${macros.carbs}g (${Math.round((macros.carbs * 4 / macros.dailyCalories) * 100)}% das calorias)
- Gorduras: ${macros.fat}g (${Math.round((macros.fat * 9 / macros.dailyCalories) * 100)}% das calorias)
- ${macros.phase === "cutting" ? `Déficit calórico: ${Math.abs(macros.surplusDeficit)} kcal/dia` : `Superávit calórico: ${macros.surplusDeficit} kcal/dia`}

INSTRUÇÕES:
1. Crie um plano com 5-6 refeições por dia
2. Distribua os macros de forma inteligente (proteína em todas as refeições, carbs maiores pré-treino)
3. Use alimentos acessíveis e práticos do Brasil
4. Inclua opções de substituição para cada refeição
5. Para fase CUTTING: priorize alimentos com alto volume e baixa caloria, alto teor proteico
6. Para fase BULKING: inclua alimentos calórico-densos mas nutritivos
7. Para biotipo ENDOMORFO: reduza carboidratos simples, priorize fibras
8. Para biotipo ECTOMORFO: aumente densidade calórica, inclua lanches extras
9. Formate como JSON estruturado

RESPONDA APENAS COM O JSON no seguinte formato:
{
  "meals": [
    {
      "name": "Nome da refeição",
      "time": "Horário sugerido",
      "foods": [
        {
          "name": "Nome do alimento",
          "quantity": "Quantidade",
          "calories": número,
          "protein": número,
          "carbs": número,
          "fat": número
        }
      ],
      "totalCalories": número,
      "totalProtein": número,
      "totalCarbs": número,
      "totalFat": número,
      "notes": "Dicas sobre a refeição",
      "alternatives": ["alternativa 1", "alternativa 2"]
    }
  ],
  "dailyTotals": {
    "calories": número,
    "protein": número,
    "carbs": número,
    "fat": número
  },
  "generalNotes": "Dicas gerais sobre o plano",
  "hydration": "Recomendação de hidratação",
  "supplementation": "Sugestão de suplementação se aplicável"
}`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  })

  return response.choices[0]?.message?.content ?? "{}"
}

// ─── Main Route Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      currentWeight,
      targetWeight,
      gender,
      bodyType,
      trainingDays,
      phase,
      age,
      height,
      foodRestrictions,
      supplementType,
    } = body

    // ── Validation ────────────────────────────────────────────────────────
    if (!userId || !currentWeight || !targetWeight || !gender || !bodyType || !phase) {
      return NextResponse.json(
        { error: "Campos obrigatórios: userId, currentWeight, targetWeight, gender, bodyType, phase" },
        { status: 400 }
      )
    }

    if (!["cutting", "bulking"].includes(phase)) {
      return NextResponse.json(
        { error: "phase deve ser 'cutting' ou 'bulking'" },
        { status: 400 }
      )
    }

    if (!["ectomorfo", "mesomorfo", "endomorfo"].includes(bodyType)) {
      return NextResponse.json(
        { error: "bodyType deve ser 'ectomorfo', 'mesomorfo' ou 'endomorfo'" },
        { status: 400 }
      )
    }

    // ── Fetch existing user data ──────────────────────────────────────────
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const existingData = userDoc.data() ?? {}
    const existingVersion = existingData.goalPlanVersion ?? 0

    // ── Scientific Calculation ────────────────────────────────────────────
    const goalInput: GoalInput = {
      userId,
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
      gender: gender as "masculino" | "feminino",
      bodyType: bodyType as "ectomorfo" | "mesomorfo" | "endomorfo",
      trainingDays: Number(trainingDays) || 3,
      phase: phase as "cutting" | "bulking",
      age: age ? Number(age) : undefined,
      height: height ? Number(height) : undefined,
    }

    const macros = calculateScientificMacros(goalInput)

    // ── Generate new diet plan ────────────────────────────────────────────
    let dietPlanRaw: string
    let dietPlanJson: Record<string, unknown> = {}

    try {
      dietPlanRaw = await generateNewDiet(macros, {
        gender,
        bodyType,
        phase,
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        trainingDays: Number(trainingDays) || 3,
        foodRestrictions,
        supplementType,
      })
      dietPlanJson = JSON.parse(dietPlanRaw)
    } catch (err) {
      console.error("Error generating diet:", err)
      dietPlanJson = {}
    }

    // ── Build update payload ──────────────────────────────────────────────
    const newVersion = existingVersion + 1
    const now = new Date().toISOString()

    const updatePayload = {
      // Goal metadata
      goalPlanVersion: newVersion,
      goalPlanUpdatedAt: now,
      currentGoalPhase: phase,

      // Scientific calculations (will be read by diet page)
      scientificCalculations: {
        dailyCalories: macros.dailyCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        weeklyRate: macros.weeklyRate,
        weeksToGoal: macros.weeksToGoal,
        deadlineDate: macros.deadlineDate,
        surplusDeficit: macros.surplusDeficit,
        bmr: macros.bmr,
        tdee: macros.tdee,
        phase: macros.phase,
        calculatedAt: now,
        bodyType,
        gender,
      },

      // Override quizData fields that affect diet/dashboard
      "quizData.phase": phase,
      "quizData.currentWeight": String(currentWeight),
      "quizData.targetWeight": String(targetWeight),
      "quizData.trainingDays": String(trainingDays),
      "quizData.trainingDaysPerWeek": String(trainingDays),
      "quizData.goal": [phase === "cutting" ? "perder-peso" : "ganhar-massa"],
      "quizData.timeToGoal": macros.deadlineDate,

      // New diet plan (overwrites old one)
      dietPlan: dietPlanJson,
      dietPlanGeneratedAt: now,
      dietPlanSource: "update-goal-plan",
    }

    // ── Persist to Firestore ──────────────────────────────────────────────
    await userDocRef.update(updatePayload)

    console.log(`✅ [update-goal-plan] User ${userId} updated to v${newVersion} | phase: ${phase} | calories: ${macros.dailyCalories}`)

    return NextResponse.json({
      success: true,
      goalPlanVersion: newVersion,
      macros: {
        dailyCalories: macros.dailyCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        weeklyRate: macros.weeklyRate,
        weeksToGoal: macros.weeksToGoal,
        deadlineDate: macros.deadlineDate,
        surplusDeficit: macros.surplusDeficit,
        bmr: macros.bmr,
        tdee: macros.tdee,
      },
      dietPlan: dietPlanJson,
    })
  } catch (error) {
    console.error("❌ [update-goal-plan] Error:", error)
    return NextResponse.json(
      { error: "Erro interno ao atualizar objetivo" },
      { status: 500 }
    )
  }
}
