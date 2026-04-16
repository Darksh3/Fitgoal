import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalInput {
  userId: string
  currentWeight: number       // kg
  targetWeight: number        // kg
  gender: "masculino" | "feminino"
  bodyType: "ectomorfo" | "mesomorfo" | "endomorfo"
  trainingDays: number        // per week
  phase: "cutting" | "bulking"
  age?: number
  height?: number             // cm
  currentBF?: number          // % body fat atual (0-60)
  targetBF?: number           // % body fat alvo (0-60)
}

interface ScientificResult {
  dailyCalories: number
  protein: number             // g
  carbs: number               // g
  fat: number                 // g
  weeklyRate: number          // kg/week
  weeksToGoal: number
  deadlineDate: string        // ISO
  surplusDeficit: number      // kcal/day
  bmr: number
  tdee: number
  phase: "cutting" | "bulking"
  leanMass?: number           // kg massa magra atual
  targetLeanMass?: number     // kg massa magra alvo
  fatMassToChange?: number    // kg gordura a perder/ganhar
  usedBFCalc: boolean         // se usou BF ou fallback por peso
}

// ─── Core Scientific Engine ───────────────────────────────────────────────────

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
    currentBF,
    targetBF,
  } = input

  // Normalise BF values (accept both 15 and 0.15)
  const currentBFpct = currentBF != null
    ? (currentBF > 1 ? currentBF : currentBF * 100)   // e.g. 18 or 0.18 → 18
    : undefined
  const targetBFpct = targetBF != null
    ? (targetBF > 1 ? targetBF : targetBF * 100)
    : undefined

  const hasBF = currentBFpct != null && targetBFpct != null
    && currentBFpct > 3 && currentBFpct < 60
    && targetBFpct > 3 && targetBFpct < 60

  // ── 1. Lean mass & fat mass derivation ───────────────────────────────────
  let leanMass: number | undefined
  let targetLeanMass: number | undefined
  let fatMassToChange: number | undefined
  let weightDiff: number

  if (hasBF) {
    // Com BF: trabalhamos com composição corporal real
    const currentFatMass  = currentWeight * (currentBFpct! / 100)
    leanMass              = currentWeight - currentFatMass

    // Peso alvo no BF alvo preservando a massa magra atual
    // targetWeight at targetBF = leanMass / (1 - targetBFpct/100)
    const impliedTargetWeight = leanMass / (1 - targetBFpct! / 100)

    if (phase === "cutting") {
      // Quanto de gordura precisa perder
      const targetFatMass = impliedTargetWeight * (targetBFpct! / 100)
      fatMassToChange     = Math.max(0, currentFatMass - targetFatMass)
      targetLeanMass      = leanMass // preservar
      weightDiff          = fatMassToChange
    } else {
      // Bulking: ganhar massa magra mantendo BF alvo
      // Quanto de lean mass adicionar para que o peso novo tenha targetBF
      const targetFatMass     = impliedTargetWeight * (targetBFpct! / 100)
      const targetLeanMassVal = impliedTargetWeight - targetFatMass
      targetLeanMass          = targetLeanMassVal
      fatMassToChange         = Math.abs(targetLeanMassVal - leanMass)
      weightDiff              = Math.abs(impliedTargetWeight - currentWeight)
    }
  } else {
    // Fallback: peso meta como referência
    leanMass       = undefined
    weightDiff     = Math.abs(targetWeight - currentWeight)
  }

  // ── 2. BMR via Mifflin-St Jeor ────────────────────────────────────────────
  // Se temos lean mass, usar Katch-McArdle (mais preciso): BMR = 370 + 21.6 × LBM
  let bmr: number
  if (leanMass != null) {
    bmr = 370 + 21.6 * leanMass        // Katch-McArdle
  } else if (gender === "masculino") {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5   // Mifflin
  } else {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161
  }

  // ── 3. Activity multiplier ────────────────────────────────────────────────
  const activityMap: Record<number, number> = {
    0: 1.2, 1: 1.375, 2: 1.375, 3: 1.55,
    4: 1.55, 5: 1.725, 6: 1.725, 7: 1.9,
  }
  const tdee = bmr * (activityMap[Math.min(7, Math.max(0, trainingDays))] ?? 1.55)

  // ── 4. Somatotype calorie adjustment ─────────────────────────────────────
  const somatoAdj: Record<string, number> = {
    ectomorfo: 1.05,
    mesomorfo: 1.0,
    endomorfo: 0.95,
  }
  const tdeeAdjusted = tdee * (somatoAdj[bodyType] ?? 1.0)

  // ── 5. Weekly rate — using BF context when available ─────────────────────
  // With BF we can be more precise:
  //   Cutting: lose fat only, not lean → conservative rate for ecto
  //   Bulking: gain lean mass → limit to avoid fat gain
  let weeklyRate: number

  if (hasBF) {
    if (phase === "cutting") {
      // Max safe fat loss: ~0.5-1% BF/week; cap by somatotype
      const bfGap = currentBFpct! - targetBFpct!
      if (bodyType === "ectomorfo") {
        // Ectomorfo perde gordura lentamente, risco de catabolismo
        weeklyRate = Math.min(0.35, bfGap * 0.04)
      } else if (bodyType === "mesomorfo") {
        weeklyRate = Math.min(0.55, bfGap * 0.055)
      } else {
        // Endomorfo tolera déficit maior
        weeklyRate = Math.min(0.75, bfGap * 0.07)
      }
      weeklyRate = Math.max(0.2, weeklyRate) // floor 200g/week
    } else {
      // Bulking: ganhar lean mass com mínimo de gordura
      if (bodyType === "ectomorfo") {
        weeklyRate = 0.4   // metabolismo acelerado, precisa comer mais
      } else if (bodyType === "mesomorfo") {
        weeklyRate = 0.3
      } else {
        weeklyRate = 0.15  // endomorfo acumula gordura facilmente
      }
    }
  } else {
    // Fallback sem BF
    const rateMap: Record<string, Record<string, number>> = {
      cutting: { ectomorfo: 0.3, mesomorfo: 0.5, endomorfo: 0.7 },
      bulking:  { ectomorfo: 0.4, mesomorfo: 0.3, endomorfo: 0.2 },
    }
    weeklyRate = rateMap[phase]?.[bodyType] ?? 0.5
  }

  // ── 6. Calorie surplus/deficit ────────────────────────────────────────────
  // 1 kg gordura ≈ 7700 kcal; 1 kg lean mass ≈ 4500 kcal (water + protein)
  const kcalPerKg = phase === "cutting" ? 7700 : 4500
  const surplusDeficit = phase === "cutting"
    ? -(weeklyRate * kcalPerKg) / 7
    :  (weeklyRate * kcalPerKg) / 7

  const dailyCalories = Math.round(tdeeAdjusted + surplusDeficit)

  // ── 7. Protein — baseado em lean mass quando disponível ──────────────────
  // Sem BF: g/kg peso total (conservador)
  // Com BF: g/kg lean mass (mais preciso — até 3.1g/kg LBM em cutting agressivo)
  let protein: number
  const referenceWeight = leanMass ?? currentWeight

  if (phase === "cutting") {
    // Cutting: alto proteína para preservar músculo
    const protMult = gender === "masculino" ? 2.5 : 2.2
    const endoBonus = bodyType === "endomorfo" ? 0.2 : 0
    protein = Math.round(referenceWeight * (protMult + endoBonus))
  } else {
    // Bulking: proteína suficiente para síntese proteica
    const protMult = gender === "masculino" ? 2.0 : 1.8
    protein = Math.round(referenceWeight * protMult)
  }

  // ── 8. Fat ────────────────────────────────────────────────────────────────
  const fatPerKg: Record<string, number> = {
    ectomorfo: 1.0,
    mesomorfo: 0.9,
    endomorfo: 0.8,
  }
  // Se com BF e cutting em endomorfo, reduzir gordura da dieta um pouco mais
  const fatMult = (hasBF && phase === "cutting" && bodyType === "endomorfo")
    ? 0.7
    : (fatPerKg[bodyType] ?? 0.9)
  const fat = Math.round(currentWeight * fatMult)

  // ── 9. Carbs ──────────────────────────────────────────────────────────────
  const proteinCals = protein * 4
  const fatCals     = fat * 9
  const carbCals    = dailyCalories - proteinCals - fatCals
  const carbs       = Math.max(50, Math.round(carbCals / 4))

  // ── 10. Timeline ──────────────────────────────────────────────────────────
  const weeksToGoal = Math.max(1, Math.ceil(weightDiff / weeklyRate))
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
    leanMass: leanMass != null ? Math.round(leanMass * 10) / 10 : undefined,
    targetLeanMass: targetLeanMass != null ? Math.round(targetLeanMass * 10) / 10 : undefined,
    fatMassToChange: fatMassToChange != null ? Math.round(fatMassToChange * 10) / 10 : undefined,
    usedBFCalc: hasBF,
  }
}

// ─── Diet Generation ─────────────────────────────────────────────────────────

async function generateNewDiet(
  macros: ScientificResult,
  userProfile: {
    gender: string
    bodyType: string
    phase: string
    currentWeight: number
    targetWeight: number
    trainingDays: number
    currentBF?: number
    targetBF?: number
    foodRestrictions?: string[]
    supplementType?: string
  }
): Promise<string> {
  const phaseLabel = macros.phase === "cutting"
    ? "CUTTING (perda de gordura / recomposição corporal)"
    : "BULKING (ganho de massa magra)"

  const bodyTypeLabel = {
    ectomorfo: "Ectomorfo (metabolismo acelerado, dificuldade em ganhar massa)",
    mesomorfo: "Mesomorfo (genética favorável, responde bem a qualquer estímulo)",
    endomorfo: "Endomorfo (metabolismo lento, tendência a acumular gordura)",
  }[userProfile.bodyType] ?? userProfile.bodyType

  const bfContext = macros.usedBFCalc
    ? `- BF atual: ${userProfile.currentBF}% → BF alvo: ${userProfile.targetBF}%
- Massa magra atual: ${macros.leanMass}kg
- ${macros.phase === "cutting" ? `Gordura a perder: ${macros.fatMassToChange}kg` : `Massa magra a ganhar: ${macros.fatMassToChange}kg`}`
    : `- Peso atual: ${userProfile.currentWeight}kg → Peso alvo: ${userProfile.targetWeight}kg`

  const restrictions = userProfile.foodRestrictions?.length
    ? `Restrições: ${userProfile.foodRestrictions.join(", ")}`
    : "Sem restrições alimentares"

  const prompt = `Você é um nutricionista esportivo especializado em composição corporal. Crie um plano alimentar preciso e completo:

PERFIL:
- Sexo: ${userProfile.gender}
- Biotipo: ${bodyTypeLabel}
- Fase: ${phaseLabel}
${bfContext}
- Treinos/semana: ${userProfile.trainingDays}x
- ${restrictions}

METAS NUTRICIONAIS (calculadas com ${macros.usedBFCalc ? "dados de body fat — Katch-McArdle" : "peso corporal — Mifflin-St Jeor"}):
- Calorias: ${macros.dailyCalories} kcal/dia
- Proteínas: ${macros.protein}g (${Math.round((macros.protein * 4 / macros.dailyCalories) * 100)}% das cals)
- Carboidratos: ${macros.carbs}g (${Math.round((macros.carbs * 4 / macros.dailyCalories) * 100)}% das cals)
- Gorduras: ${macros.fat}g (${Math.round((macros.fat * 9 / macros.dailyCalories) * 100)}% das cals)
- ${macros.phase === "cutting" ? `Déficit: ${Math.abs(macros.surplusDeficit)} kcal/dia` : `Superávit: ${macros.surplusDeficit} kcal/dia`}
- Ritmo: ${macros.weeklyRate}kg/semana | Prazo: ${macros.weeksToGoal} semanas
- BMR: ${macros.bmr} kcal | TDEE: ${macros.tdee} kcal

DIRETRIZES OBRIGATÓRIAS:
1. 5-6 refeições distribuindo proteína uniformemente (min 30g/refeição principal)
2. Carboidratos maiores nas refeições pré e pós-treino
3. Alimentos práticos e acessíveis no Brasil
4. Para CUTTING: alto volume, baixa caloria, priorizar fibras e saciedade
5. Para BULKING: densidade calórica, carboidratos complexos em abundância
6. ENDOMORFO: reduzir carboidratos simples, priorizar fibras e proteínas
7. ECTOMORFO: aumentar densidade calórica, adicionar lanches extras
8. Inclua 2 alternativas por refeição

RESPONDA APENAS COM JSON válido neste formato:
{
  "meals": [
    {
      "name": "string",
      "time": "string",
      "foods": [{"name":"string","quantity":"string","calories":0,"protein":0,"carbs":0,"fat":0}],
      "totalCalories": 0,
      "totalProtein": 0,
      "totalCarbs": 0,
      "totalFat": 0,
      "notes": "string",
      "alternatives": ["string","string"]
    }
  ],
  "dailyTotals": {"calories":0,"protein":0,"carbs":0,"fat":0},
  "generalNotes": "string",
  "hydration": "string",
  "supplementation": "string"
}`

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  })

  return resp.choices[0]?.message?.content ?? "{}"
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

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
      currentBF,
      targetBF,
      foodRestrictions,
      supplementType,
    } = body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!userId || !currentWeight || !targetWeight || !gender || !bodyType || !phase) {
      return NextResponse.json(
        { error: "Campos obrigatórios: userId, currentWeight, targetWeight, gender, bodyType, phase" },
        { status: 400 }
      )
    }
    if (!["cutting", "bulking"].includes(phase)) {
      return NextResponse.json({ error: "phase deve ser 'cutting' ou 'bulking'" }, { status: 400 })
    }
    if (!["ectomorfo", "mesomorfo", "endomorfo"].includes(bodyType)) {
      return NextResponse.json({ error: "bodyType inválido" }, { status: 400 })
    }

    // ── Fetch user ───────────────────────────────────────────────────────────
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc    = await userDocRef.get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const existingData  = userDoc.data() ?? {}
    const existingVersion = existingData.goalPlanVersion ?? 0

    // ── Parse BF values (accept string "18" or number 18 or 0.18) ──────────
    const parseBF = (v: unknown): number | undefined => {
      if (v == null || v === "" || v === "undefined") return undefined
      const n = typeof v === "string" ? parseFloat(v) : Number(v)
      if (isNaN(n) || n <= 0) return undefined
      return n
    }
    const currentBFparsed = parseBF(currentBF)
    const targetBFparsed  = parseBF(targetBF)

    // ── Calculate ────────────────────────────────────────────────────────────
    const macros = calculateScientificMacros({
      userId,
      currentWeight: Number(currentWeight),
      targetWeight:  Number(targetWeight),
      gender:        gender as "masculino" | "feminino",
      bodyType:      bodyType as "ectomorfo" | "mesomorfo" | "endomorfo",
      trainingDays:  Number(trainingDays) || 3,
      phase:         phase as "cutting" | "bulking",
      age:           age    ? Number(age)    : undefined,
      height:        height ? Number(height) : undefined,
      currentBF:     currentBFparsed,
      targetBF:      targetBFparsed,
    })

    console.log(`🔬 [update-goal-plan] BF calc: ${macros.usedBFCalc} | lean: ${macros.leanMass}kg | cals: ${macros.dailyCalories}`)

    // ── Generate diet ────────────────────────────────────────────────────────
    let dietPlanJson: Record<string, unknown> = {}
    try {
      const raw = await generateNewDiet(macros, {
        gender,
        bodyType,
        phase,
        currentWeight: Number(currentWeight),
        targetWeight:  Number(targetWeight),
        trainingDays:  Number(trainingDays) || 3,
        currentBF:     currentBFparsed,
        targetBF:      targetBFparsed,
        foodRestrictions,
        supplementType,
      })
      dietPlanJson = JSON.parse(raw)
    } catch (err) {
      console.error("[update-goal-plan] Diet generation error:", err)
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    const newVersion = existingVersion + 1
    const now        = new Date().toISOString()

    const updatePayload: Record<string, unknown> = {
      goalPlanVersion:   newVersion,
      goalPlanUpdatedAt: now,
      currentGoalPhase:  phase,

      scientificCalculations: {
        dailyCalories:    macros.dailyCalories,
        protein:          macros.protein,
        carbs:            macros.carbs,
        fat:              macros.fat,
        weeklyRate:       macros.weeklyRate,
        weeksToGoal:      macros.weeksToGoal,
        deadlineDate:     macros.deadlineDate,
        surplusDeficit:   macros.surplusDeficit,
        bmr:              macros.bmr,
        tdee:             macros.tdee,
        phase:            macros.phase,
        calculatedAt:     now,
        bodyType,
        gender,
        usedBFCalc:       macros.usedBFCalc,
        // BF-derived values (undefined if fallback)
        ...(macros.leanMass          != null && { leanMass:          macros.leanMass }),
        ...(macros.targetLeanMass    != null && { targetLeanMass:    macros.targetLeanMass }),
        ...(macros.fatMassToChange   != null && { fatMassToChange:   macros.fatMassToChange }),
        ...(currentBFparsed          != null && { currentBF:         currentBFparsed }),
        ...(targetBFparsed           != null && { targetBF:          targetBFparsed }),
      },

      "quizData.phase":              phase,
      "quizData.currentWeight":      String(currentWeight),
      "quizData.targetWeight":       String(targetWeight),
      "quizData.trainingDays":       String(trainingDays),
      "quizData.trainingDaysPerWeek":String(trainingDays),
      "quizData.goal":               [phase === "cutting" ? "perder-peso" : "ganhar-massa"],
      "quizData.timeToGoal":         macros.deadlineDate,

      dietPlan:              dietPlanJson,
      dietPlanGeneratedAt:   now,
      dietPlanSource:        "update-goal-plan",
    }

    // Persist BF in quizData too if available
    if (currentBFparsed != null) updatePayload["quizData.currentBF"] = String(currentBFparsed)
    if (targetBFparsed  != null) updatePayload["quizData.targetBF"]  = String(targetBFparsed)

    await userDocRef.update(updatePayload)

    console.log(`✅ [update-goal-plan] v${newVersion} | user: ${userId} | phase: ${phase} | ${macros.dailyCalories} kcal | BF: ${macros.usedBFCalc ? `${currentBFparsed}%→${targetBFparsed}%` : "fallback"}`)

    return NextResponse.json({
      success:         true,
      goalPlanVersion: newVersion,
      usedBFCalc:      macros.usedBFCalc,
      macros: {
        dailyCalories:  macros.dailyCalories,
        protein:        macros.protein,
        carbs:          macros.carbs,
        fat:            macros.fat,
        weeklyRate:     macros.weeklyRate,
        weeksToGoal:    macros.weeksToGoal,
        deadlineDate:   macros.deadlineDate,
        surplusDeficit: macros.surplusDeficit,
        bmr:            macros.bmr,
        tdee:           macros.tdee,
        leanMass:       macros.leanMass,
        targetLeanMass: macros.targetLeanMass,
        fatMassToChange:macros.fatMassToChange,
      },
      dietPlan: dietPlanJson,
    })
  } catch (error) {
    console.error("❌ [update-goal-plan]", error)
    return NextResponse.json({ error: "Erro interno ao atualizar objetivo" }, { status: 500 })
  }
}
