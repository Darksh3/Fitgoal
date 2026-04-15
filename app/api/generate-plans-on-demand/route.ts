import OpenAI from "openai"
import { adminDb, admin } from "@/lib/firebaseAdmin"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function getExerciseCountRange(workoutTime: string) {
  switch (workoutTime) {
    case "30min": return { min: 4, max: 4, description: "4 exercícios (treino rápido)" }
    case "45min": return { min: 5, max: 5, description: "5 exercícios (treino moderado)" }
    case "1h": return { min: 6, max: 7, description: "6-7 exercícios (treino completo)" }
    case "mais-1h": return { min: 7, max: 8, description: "7-8 exercícios (treino longo)" }
    case "30-45min": return { min: 4, max: 5, description: "4-5 exercícios (treino rápido)" }
    case "45-60min": return { min: 6, max: 7, description: "6-7 exercícios (treino moderado)" }
    default: return { min: 6, max: 7, description: "6-7 exercícios (padrão)" }
  }
}

/**
 * Calcula o prazo ótimo em semanas com base em peso, somatótipo e gênero.
 * Usado como fallback quando timeToGoal não é uma data válida.
 */
function calculateOptimalWeeks(data: any): number {
  const weight = parseFloat(data.currentWeight) || 70
  const targetWeight = parseFloat(data.targetWeight) || weight
  const diff = targetWeight - weight
  const absKg = Math.abs(diff)
  const bodyType = (data.bodyType || "").toLowerCase()
  const isFemale = (data.gender || "").toLowerCase().includes("fem") || (data.gender || "").toLowerCase().includes("mulher")

  if (absKg <= 1) return 8

  const isLoss = diff < 0
  let weeklyRate: number
  if (isLoss) {
    if (bodyType === "ectomorfo") weeklyRate = 0.4
    else if (bodyType === "endomorfo") weeklyRate = isFemale ? 0.7 : 0.85
    else weeklyRate = isFemale ? 0.55 : 0.65
  } else {
    if (bodyType === "ectomorfo") weeklyRate = isFemale ? 0.35 : 0.45
    else if (bodyType === "endomorfo") weeklyRate = isFemale ? 0.2 : 0.25
    else weeklyRate = isFemale ? 0.28 : 0.35
  }

  return Math.max(4, Math.min(Math.ceil(absKg / weeklyRate), 104))
}

function calculateWeeksToGoal(timeToGoal: string, data?: any): number {
  try {
    let goalDate: Date | null = null

    if (timeToGoal && timeToGoal.includes(" de ")) {
      const monthMap: { [key: string]: number } = {
        jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
        jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
      }
      const parts = timeToGoal.split(" de ")
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const monthStr = parts[1].toLowerCase().replace(".", "").substring(0, 3)
        const year = parseInt(parts[2])
        const month = monthMap[monthStr]
        if (!isNaN(day) && !isNaN(year) && month !== undefined) {
          goalDate = new Date(year, month, day)
        }
      }
    } else if (timeToGoal) {
      const parsed = new Date(timeToGoal)
      if (!isNaN(parsed.getTime())) goalDate = parsed
    }

    if (goalDate) {
      const timeDifferenceMs = goalDate.getTime() - new Date().getTime()
      if (timeDifferenceMs > 0) {
        return Math.max(1, Math.round(timeDifferenceMs / (1000 * 60 * 60 * 24 * 7)))
      }
    }

    // Fallback: calcular automaticamente com base no perfil
    if (data) return calculateOptimalWeeks(data)
    return 12
  } catch (error) {
    if (data) return calculateOptimalWeeks(data)
    return 12
  }
}

function generateFallbackWorkoutDays(trainingDays: number, quizData: any) {
  const exerciseRange = getExerciseCountRange(quizData.workoutTime || "45-60min")
  const days = []
  const exerciseDatabase: Record<string, Array<{ name: string; description: string; type: string }>> = {
    peito: [
      { name: "Supino reto", description: "Deite-se em um banco reto e empurre a barra para cima.", type: "compound" },
      { name: "Supino inclinado com halteres", description: "Deite-se em banco inclinado e levante os halteres.", type: "compound" },
      { name: "Mergulho entre bancos", description: "Mãos no banco, pés em outro, abaixe e empurre.", type: "compound" },
      { name: "Peck Deck", description: "Sente-se na máquina e pressione as alças para frente.", type: "isolation" },
      { name: "Crucifixo com halteres", description: "Deitado, abra os braços e una-os sobre o peito.", type: "isolation" },
      { name: "Supino declinado", description: "Em banco declinado, empurre a barra para cima.", type: "compound" },
      { name: "Cross over", description: "Na polia, cruze os cabos na frente do peito.", type: "isolation" },
    ],
    costas: [
      { name: "Puxada na frente", description: "Puxe a barra em direção ao peito.", type: "compound" },
      { name: "Remada curvada", description: "Tronco inclinado, puxe halteres ao abdômen.", type: "compound" },
      { name: "Levantamento terra", description: "Levante a barra do chão com costas retas.", type: "compound" },
      { name: "Puxada na barra fixa", description: "Pendure-se na barra e puxe o corpo.", type: "compound" },
      { name: "Remada unilateral", description: "Joelho e mão no banco, puxe o halter.", type: "compound" },
      { name: "Remada baixa", description: "Puxe o cabo ao abdômen.", type: "compound" },
      { name: "Shrug", description: "Eleve os ombros contraindo o trapézio.", type: "isolation" },
    ],
    triceps: [
      { name: "Tríceps na polia alta", description: "Puxe a barra para baixo, estendendo os braços.", type: "isolation" },
      { name: "Tríceps francês", description: "Segure halter acima da cabeça e abaixe atrás.", type: "isolation" },
      { name: "Mergulho no banco", description: "Mãos no banco, abaixe e levante o corpo.", type: "compound" },
      { name: "Tríceps testa", description: "Deitado, abaixe halteres à testa e estenda.", type: "isolation" },
    ],
    biceps: [
      { name: "Rosca direta", description: "Levante a barra em direção aos ombros.", type: "isolation" },
      { name: "Rosca alternada", description: "Levante um halter de cada vez.", type: "isolation" },
      { name: "Rosca martelo", description: "Levante halteres com pegada neutra.", type: "isolation" },
      { name: "Rosca concentrada", description: "Cotovelo na coxa, levante o halter.", type: "isolation" },
    ],
    pernas: [
      { name: "Agachamento", description: "Abaixe flexionando joelhos e quadris.", type: "compound" },
      { name: "Leg Press", description: "Na máquina, empurre a plataforma com os pés.", type: "compound" },
      { name: "Extensão de pernas", description: "Sentado, estenda as pernas à frente.", type: "isolation" },
      { name: "Flexão de pernas", description: "Deitado, flexione as pernas aos glúteos.", type: "isolation" },
      { name: "Panturrilha em pé", description: "Levante-se na ponta dos pés.", type: "isolation" },
      { name: "Stiff", description: "Pernas retas, abaixe a barra com costas retas.", type: "compound" },
      { name: "Afundo", description: "Passo à frente, flexione ambos os joelhos.", type: "compound" },
      { name: "Agachamento búlgaro", description: "Pé elevado atrás, agache com a perna da frente.", type: "compound" },
    ],
    ombros: [
      { name: "Desenvolvimento com halteres", description: "Sentado, levante halteres acima da cabeça.", type: "compound" },
      { name: "Elevação lateral", description: "Levante halteres lateralmente à altura dos ombros.", type: "isolation" },
      { name: "Elevação frontal", description: "Levante halteres à frente à altura dos ombros.", type: "isolation" },
      { name: "Remada alta", description: "Puxe a barra ao queixo com cotovelos altos.", type: "compound" },
      { name: "Arnold press", description: "Rotacione os halteres enquanto empurra.", type: "compound" },
    ],
  }
  const focusRotations: Record<number, Array<{ title: string; focus: string; exercises: string[] }>> = {
    3: [
      { title: "Full Body A", focus: "Empurrar", exercises: ["peito", "triceps", "pernas"] },
      { title: "Full Body B", focus: "Puxar", exercises: ["costas", "biceps", "pernas"] },
      { title: "Full Body C", focus: "Pernas", exercises: ["pernas", "ombros"] },
    ],
    4: [
      { title: "Superior A", focus: "Peito e Tríceps", exercises: ["peito", "triceps"] },
      { title: "Inferior A", focus: "Quadríceps e Glúteos", exercises: ["pernas"] },
      { title: "Superior B", focus: "Costas e Bíceps", exercises: ["costas", "biceps"] },
      { title: "Inferior B", focus: "Posteriores", exercises: ["pernas"] },
    ],
    5: [
      { title: "Peito e Tríceps", focus: "Empurrar", exercises: ["peito", "triceps"] },
      { title: "Costas e Bíceps", focus: "Puxar", exercises: ["costas", "biceps"] },
      { title: "Pernas", focus: "Membros inferiores", exercises: ["pernas"] },
      { title: "Ombros e Abdômen", focus: "Deltoides", exercises: ["ombros"] },
      { title: "Full Body", focus: "Treino completo", exercises: ["peito", "costas", "pernas"] },
    ],
    6: [
      { title: "Peito", focus: "Peitoral completo", exercises: ["peito"] },
      { title: "Costas", focus: "Dorsais", exercises: ["costas"] },
      { title: "Pernas", focus: "Quadríceps e glúteos", exercises: ["pernas"] },
      { title: "Ombros", focus: "Deltoides", exercises: ["ombros"] },
      { title: "Braços", focus: "Bíceps e tríceps", exercises: ["biceps", "triceps"] },
      { title: "Core e Cardio", focus: "Condicionamento", exercises: ["peito", "costas"] },
    ],
    7: [
      { title: "Peito", focus: "Peitoral completo", exercises: ["peito"] },
      { title: "Costas", focus: "Dorsais", exercises: ["costas"] },
      { title: "Pernas A", focus: "Quadríceps", exercises: ["pernas"] },
      { title: "Ombros", focus: "Deltoides", exercises: ["ombros"] },
      { title: "Braços", focus: "Bíceps e tríceps", exercises: ["biceps", "triceps"] },
      { title: "Pernas B", focus: "Posteriores", exercises: ["pernas"] },
      { title: "Core e Recuperação", focus: "Abdômen", exercises: ["peito", "costas"] },
    ],
  }
  const rotation = focusRotations[trainingDays] || focusRotations[5]
  const goals = Array.isArray(quizData.goal) ? quizData.goal : [quizData.goal].filter(Boolean)
  const isCutting = goals.includes("perder-peso") || goals.includes("emagrecer") || quizData.phase === "cutting"
  const isBulking = goals.includes("ganhar-massa") || goals.includes("ganhar-peso") || quizData.phase === "bulking"

  for (let i = 0; i < trainingDays; i++) {
    const dayFocus = rotation[i % rotation.length]
    let exercisePool: Array<{ name: string; description: string; type: string }> = []
    dayFocus.exercises.forEach((mg) => { if (exerciseDatabase[mg]) exercisePool = [...exercisePool, ...exerciseDatabase[mg]] })
    const shuffled = exercisePool.sort(() => 0.5 - Math.random())
    const finalCount = Math.min(exerciseRange.max, shuffled.length)
    const exercises = shuffled.slice(0, finalCount).map((ex) => ({
      name: ex.name,
      sets: getSmartSets(ex.type as "compound" | "isolation", quizData.experience || "intermediario", quizData.workoutTime || "45-60min", false),
      reps: getRepRange(isBulking, isCutting, ex.type as "compound" | "isolation"),
      rest: getRest(quizData.experience || "intermediario", ex.type as "compound" | "isolation"),
      description: ex.description,
    }))
    days.push({ day: `Dia ${i + 1}`, title: dayFocus.title, focus: dayFocus.focus, duration: quizData.workoutTime || "45min", exercises })
  }
  return days
}

function getSmartSets(type: "compound" | "isolation", experience: string, workoutTime: string, isProblemArea: boolean) {
  let sets = type === "compound" ? 4 : 3
  if (experience === "iniciante") sets -= 1
  if (experience === "avancado" && type === "compound") sets += 1
  if (workoutTime === "30min") sets -= 1
  if (workoutTime === "mais-1h" && type === "compound") sets += 1
  if (isProblemArea && type === "compound") sets += 1
  return Math.max(2, Math.min(type === "compound" ? 5 : 4, sets))
}

function getRepRange(isBulking: boolean, isCutting: boolean, type: "compound" | "isolation") {
  if (isBulking) return type === "compound" ? "6-10" : "10-15"
  if (isCutting) return type === "compound" ? "8-12" : "12-20"
  return type === "compound" ? "6-12" : "10-15"
}

function getRest(experience: string, type: "compound" | "isolation") {
  if (experience === "iniciante") return type === "compound" ? "90s" : "60s"
  if (experience === "avancado") return type === "compound" ? "120-180s" : "60-90s"
  return type === "compound" ? "90-120s" : "60-90s"
}

function getMealCountByGoal(goal: string | string[]) {
  const goals = Array.isArray(goal) ? goal : [goal]
  const isBulking = goals.includes("ganhar-massa") || goals.includes("bulking")
  if (isBulking) {
    return { count: 5, distribution: [0.2, 0.1, 0.3, 0.2, 0.2], names: ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar"] }
  }
  return { count: 4, distribution: [0.25, 0.35, 0.15, 0.25], names: ["Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar"] }
}

function safeJsonParseFromModel(content: string) {
  if (!content) throw new Error("Empty AI response")
  let text = content.trim()
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1)
  text = text.replace(/,\s*([}\]])/g, "$1")
  return JSON.parse(text)
}

export async function POST(req: Request) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout after 90 seconds")), 90000)
    })
    const mainLogic = async () => {
      const body = await req.json()
      const userId = body.userId
      const providedQuizData = body.quizData
      const forceRegenerate = body.forceRegenerate
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required." }), { status: 400, headers: { "Content-Type": "application/json" } })
      }
      const userDocRef = adminDb.collection("users").doc(userId)
      const userDoc = await userDocRef.get()
      if (!userDoc.exists) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
      }
      const userData = userDoc.data()
      const existingQuizData = userData?.quizData || {}
      let quizData = providedQuizData ? { ...existingQuizData, ...providedQuizData } : existingQuizData
      if (providedQuizData) {
        await userDocRef.set({ quizData }, { merge: true })
      }
      if (!quizData || Object.keys(quizData).length === 0) {
        return new Response(JSON.stringify({ error: "Quiz data not found." }), { status: 404, headers: { "Content-Type": "application/json" } })
      }

      const requestedDaysRaw = quizData.trainingDays ?? quizData.trainingDaysPerWeek ?? 5
      const requestedDays = parseInt(String(requestedDaysRaw), 10) || 5

      const scientificCalcs = calculateScientificCalories(quizData)
      console.log(`🧮 [SCIENTIFIC CALCULATION] Target: ${scientificCalcs.finalCalories} kcal`)

      await userDocRef.set({
        scientificCalculations: {
          ...scientificCalcs,
          calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
          quizDataSnapshot: JSON.parse(JSON.stringify(quizData)),
        },
      }, { merge: true })

      const updatedDoc = await userDocRef.get()
      const savedCalcs = updatedDoc.data()?.scientificCalculations

      const mealConfig = getMealCountByGoal(quizData.goal)
      const exerciseRange = getExerciseCountRange(quizData.workoutTime || "45-60min")

      const supplementMacros = {
        calories: savedCalcs.supplementCalories || 0,
        protein: savedCalcs.supplementProtein || 0,
        carbs: savedCalcs.supplementCarbs || 0,
        fats: savedCalcs.supplementFats || 0,
      }
      const caloriesForMeals = savedCalcs.finalCalories - supplementMacros.calories
      const proteinForMeals = savedCalcs.protein - supplementMacros.protein
      const carbsForMeals = savedCalcs.carbs - supplementMacros.carbs
      const fatsForMeals = savedCalcs.fats - supplementMacros.fats

      const goalsArray = Array.isArray(quizData.goal) ? quizData.goal : [quizData.goal].filter(Boolean)
      const goalsText = goalsArray.length ? goalsArray.join(", ") : "Não informado"

      if (quizData.phase === "cutting" && !goalsArray.includes("cutting") && !goalsArray.includes("perder-peso")) {
        goalsArray.push("perder-peso")
      }
      if (quizData.phase === "bulking" && !goalsArray.includes("bulking") && !goalsArray.includes("ganhar-massa")) {
        goalsArray.push("ganhar-massa")
      }

      const dietPrompt = `
Você é um nutricionista especializado em criar planos alimentares personalizados.

IMPORTANTE - CÁLCULO DE CALORIAS E MACROS:
${quizData.wantsSupplement === "sim" && quizData.supplementType ? `
⚠️ O CLIENTE ACEITOU SUPLEMENTAÇÃO!
- Valor científico TOTAL: ${savedCalcs.finalCalories} kcal
- Suplemento (${quizData.supplementType}): ${savedCalcs.supplementCalories} kcal
- VOCÊ DEVE CRIAR AS REFEIÇÕES COM: ${caloriesForMeals} kcal
- O suplemento será adicionado DEPOIS, totalizando ${savedCalcs.finalCalories} kcal
NÃO adicione o suplemento nas refeições!
` : `
- Valor científico TOTAL: ${savedCalcs.finalCalories} kcal
- VOCÊ DEVE CRIAR AS REFEIÇÕES COM: ${savedCalcs.finalCalories} kcal
`}

CLIENTE: ${quizData.gender}, ${quizData.age} anos, ${quizData.currentWeight}kg, objetivo: ${goalsArray.join(", ")}, biotipo: ${quizData.bodyType}, prazo: ${scientificCalcs.weeksToGoal} semanas (${(scientificCalcs.weeksToGoal / 4.33).toFixed(1)} meses)

${quizData.phase ? `FASE ATUAL: ${quizData.phase.toUpperCase()} — ${quizData.phase === "cutting" ? "Priorizar déficit calórico, preservar massa magra, mais proteína" : quizData.phase === "bulking" ? "Priorizar superávit calórico, foco em ganho de massa, mais carboidratos" : "Manutenção da composição corporal atual"}` : ""}
${quizData.currentBF ? `BF ATUAL: ${quizData.currentBF}%` : ""} ${quizData.targetBF ? `| BF META: ${quizData.targetBF}%` : ""}
${quizData.allergies !== "nao" ? `ALERGIAS: ${quizData.allergyDetails}` : ""}
${quizData.diet ? `⚠️ PREFERÊNCIA ALIMENTAR CRÍTICA: ${quizData.diet.toUpperCase()}
${quizData.diet === "vegetariano" ? "NÃO INCLUA: Carne, frango, porco, peixe. PERMITIDO: Ovos, laticínios, leguminosas, tofu" : quizData.diet === "vegano" ? "NÃO INCLUA: Qualquer produto animal. USE: Proteínas vegetais, leites vegetais" : quizData.diet === "keto" ? "FOCO: Baixo carboidrato (máx 50g/dia), alto teor de gorduras saudáveis" : quizData.diet === "mediterraneo" ? "FOCO: Azeite, peixes, vegetais, grãos integrais. LIMITE: Carne vermelha" : ""}` : ""}

REFEIÇÕES (${mealConfig.count}): ${mealConfig.names.join(", ")}

MACROS TOTAIS:
- Calorias: ${savedCalcs.finalCalories} kcal
- Proteínas: ${savedCalcs.protein}g
- Carboidratos: ${savedCalcs.carbs}g
- Gorduras: ${savedCalcs.fats}g

🎯 REGRAS OBRIGATÓRIAS:
1. A soma das refeições deve atingir os valores acima (tolerância: ±2% cal, ±5g macros)
2. Priorize alimentos brasileiros comuns: arroz, feijão, frango, ovos, batata, macarrão
3. EVITE alimentos caros: grão-de-bico, quinoa, cogumelos, salmão, aspargos
4. Coloque proteína animal no almoço e jantar (carne, frango, sardinha, ovo)
5. Almoço/janta pode ter salada à vontade (não incluir nos macros)
6. Máx 2 alimentos na ceia, 200-450 kcal, foco em proteína de fácil digestão
7. Pelo menos 2 refeições devem ser rápidas (≤5 min)
8. Forneça valores nutricionais baseados em USDA/TACO

JSON OBRIGATÓRIO:
{
  "totalDailyCalories": "${savedCalcs.finalCalories} kcal",
  "totalProtein": "${savedCalcs.protein}g",
  "totalCarbs": "${savedCalcs.carbs}g",
  "totalFats": "${savedCalcs.fats}g",
  "meals": [${mealConfig.names.map((name, i) => {
    const targetCals = Math.round(caloriesForMeals * mealConfig.distribution[i])
    return `{
      "name": "${name}",
      "time": "${i === 0 ? "07:00" : i === 1 ? "10:00" : i === 2 ? "12:00" : i === 3 ? "15:00" : i === 4 ? "19:00" : "21:00"}",
      "totalCalories": ${targetCals},
      "prepTimeMinutes": ${i === 2 || i === 4 ? 15 : 5},
      "portable": ${i === 2 || i === 4 ? "false" : "true"},
      "foods": [{"name": "[alimento]", "quantity": "[quantidade]", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}],
      "alternatives": [{"swap": "[opção 1]", "notes": "Macros semelhantes"}, {"swap": "[opção 2]", "notes": "Macros semelhantes"}],
      "emergencyOption": {"swap": "[opção rápida]", "notes": "Usar quando não houver tempo"}
    }`
  }).join(",")}],
  "supplements": ${quizData.wantsSupplement === "sim" && quizData.supplementType ? `[{"name": "${quizData.supplementType === "hipercalorico" ? "Hipercalórico Growth" : "Whey Protein Growth"}", "quantity": "${quizData.supplementType === "hipercalorico" ? "170g" : "30g"}", "calories": ${quizData.supplementType === "hipercalorico" ? 615 : 119}, "protein": ${quizData.supplementType === "hipercalorico" ? 37 : 24}, "carbs": ${quizData.supplementType === "hipercalorico" ? 108 : 2.3}, "fats": ${quizData.supplementType === "hipercalorico" ? 3.7 : 1.5}}]` : "[]"}
}`

      const workoutPrompt = `
Crie EXATAMENTE ${requestedDays} dias de treino para ${quizData.gender}, ${quizData.experience}, ${quizData.workoutTime}.

DADOS:
- Experiência: ${quizData.experience}
- Objetivo: ${goalsArray.join(", ")}
- Biotipo: ${quizData.bodyType}
- Fase: ${quizData.phase || "Não definida"} ${quizData.phase === "cutting" ? "(CUTTING: exercícios compostos + cardio, volume moderado, intensidade alta)" : quizData.phase === "bulking" ? "(BULKING: carga progressiva, mais volume, menos cardio)" : ""}
- BF atual: ${quizData.currentBF || "N/A"}% | BF meta: ${quizData.targetBF || "N/A"}%
- Tempo disponível: ${quizData.workoutTime}
- Áreas problemáticas: ${quizData.problemAreas?.join(", ") || "Nenhuma"}

SÉRIES: Compostos=4, Isoladores=3. Iniciante: -1 série. Avançado: +1 em compostos.
Tempo 30min: -1 série. Mais de 1h: +1 em compostos.

REPETIÇÕES baseadas no objetivo:
${goalsArray.includes("ganhar-massa") || quizData.phase === "bulking" ? "- Compostos: 6-10, Isoladores: 10-15 (hipertrofia/força)" : goalsArray.includes("perder-peso") || quizData.phase === "cutting" ? "- Compostos: 8-12, Isoladores: 12-20 (queima de gordura)" : "- Compostos: 6-12, Isoladores: 10-15 (manutenção)"}

JSON OBRIGATÓRIO:
{
  "days": [${Array.from({ length: requestedDays }, (_, i) =>
    `{"day": "Dia ${i + 1}", "title": "[divisão]", "focus": "[grupos musculares]", "duration": "${quizData.workoutTime || "45min"}", "exercises": [{"name": "[exercício]", "sets": "[4 compostos, 3 isoladores]", "reps": "[range baseado no objetivo]", "rest": "[60-120s]", "description": "[descrição]"}]}`
  ).join(",")}],
  "weeklySchedule": "Treino ${requestedDays}x por semana"
}`

      const generateWithTimeout = async (prompt: string, type: string) => {
        const timeout = new Promise((_, reject) => { setTimeout(() => reject(new Error(`${type} generation timeout`)), 120000) })
        const generation = openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Você é um ${type === "diet" ? "nutricionista experiente" : "personal trainer experiente"}. Seja preciso com calorias.` },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 7000,
        })
        return Promise.race([generation, timeout])
      }

      let dietPlan = null
      let workoutPlan = null

      try {
        const [dietResponse, workoutResponse] = await Promise.allSettled([
          generateWithTimeout(dietPrompt, "diet"),
          generateWithTimeout(workoutPrompt, "workout"),
        ])

        if (dietResponse.status === "fulfilled") {
          try {
            const rawContent = (dietResponse.value as any).choices[0].message?.content || ""
            const parsed = safeJsonParseFromModel(rawContent)
            if (parsed.meals && Array.isArray(parsed.meals) && parsed.meals.length === mealConfig.count) {
              const realTotal = parsed.meals.reduce((total: number, meal: any) =>
                total + meal.foods.reduce((mt: number, food: any) => mt + (food.calories || 0), 0), 0)
              const difference = caloriesForMeals - realTotal
              if (Math.abs(difference) > 50) {
                const adjustmentPerMeal = Math.round(difference / parsed.meals.length)
                parsed.meals.forEach((meal: any) => {
                  if (meal.foods?.length > 0) {
                    meal.foods[0].calories = Math.max(50, (meal.foods[0].calories || 0) + adjustmentPerMeal)
                    meal.totalCalories = meal.foods.reduce((s: number, f: any) => s + (f.calories || 0), 0)
                  }
                })
              }
              parsed.totalDailyCalories = `${caloriesForMeals} kcal`
              parsed.totalProtein = `${proteinForMeals}g`
              parsed.totalCarbs = `${carbsForMeals}g`
              parsed.totalFats = `${fatsForMeals}g`
              dietPlan = parsed
            }
          } catch (e) { console.log("⚠️ [DIET] Parse error:", e) }
        }

        if (workoutResponse.status === "fulfilled") {
          try {
            const rawContent = (workoutResponse.value as any).choices[0].message?.content || ""
            const parsed = safeJsonParseFromModel(rawContent)
            if (parsed.days && Array.isArray(parsed.days) && parsed.days.length === requestedDays) {
              workoutPlan = parsed
            }
          } catch (e) { console.log("⚠️ [WORKOUT] Parse error") }
        }
      } catch (error) { console.log("⚠️ [PARALLEL] Generation failed") }

      if (!dietPlan) {
        return new Response(JSON.stringify({ error: "Failed to generate diet plan. Please try again." }), { status: 500, headers: { "Content-Type": "application/json" } })
      }
      if (!workoutPlan) {
        workoutPlan = { days: generateFallbackWorkoutDays(requestedDays, quizData), weeklySchedule: `Treino ${requestedDays}x por semana` }
      }

      try {
        await userDocRef.set({
          plans: { dietPlan: JSON.parse(JSON.stringify(dietPlan)), workoutPlan: JSON.parse(JSON.stringify(workoutPlan)) },
          dietPlan: JSON.parse(JSON.stringify(dietPlan)),
          workoutPlan: JSON.parse(JSON.stringify(workoutPlan)),
          finalResults: {
            scientificTarget: savedCalcs.finalCalories,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })
      } catch (firestoreError) { console.error("⚠️ Firestore error:", firestoreError) }

      return new Response(JSON.stringify({ success: true, plans: { dietPlan, workoutPlan } }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    return await Promise.race([mainLogic(), timeoutPromise])
  } catch (error: any) {
    console.error("❌ Fatal error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}

/**
 * Calcula calorias e macros com base em dados científicos.
 * Mifflin-St Jeor + fator de atividade ajustado por somatótipo + ajuste por objetivo
 */
function calculateScientificCalories(data: any) {
  // Se calorieGoal já foi calculado no quiz, use-o
  if (data.calorieGoal && data.calorieGoal > 0) {
    const dailyCalories = Math.round(data.calorieGoal)
    const weight = parseFloat(data.currentWeight) || 70
    const goals = Array.isArray(data.goal) ? data.goal : [data.goal || "ganhar-massa"]
    const bodyType = (data.bodyType || "").toLowerCase()
    const isFemale = (data.gender || "").toLowerCase().includes("fem") || (data.gender || "").toLowerCase().includes("mulher")
    const targetWeight = parseFloat(data.targetWeight) || weight
    const weightDifference = targetWeight - weight

    let supplementCalories = 0, supplementProtein = 0, supplementCarbs = 0, supplementFats = 0
    if (data.wantsSupplement === "sim" && data.supplementType) {
      if (data.supplementType === "hipercalorico") { supplementCalories = 615; supplementProtein = 37; supplementCarbs = 108; supplementFats = 3.7 }
      else if (data.supplementType === "whey-protein") { supplementCalories = 119; supplementProtein = 24; supplementCarbs = 2.3; supplementFats = 1.5 }
    }
    const caloriesForMeals = dailyCalories - supplementCalories

    // Proteína baseada em objetivo
    let proteinBase = weightDifference < -0.5 ? (isFemale ? 2.2 : 2.4) : weightDifference > 0.5 ? (isFemale ? 2.0 : 2.2) : (isFemale ? 1.8 : 2.0)
    if (bodyType === "endomorfo" && weightDifference < -0.5) proteinBase += isFemale ? 0.2 : 0.1

    // Gordura baseada em somatótipo
    let fatsBase = bodyType === "ectomorfo" ? (isFemale ? 1.3 : 1.2) : bodyType === "endomorfo" ? (isFemale ? 1.0 : 0.9) : (isFemale ? 1.1 : 1.0)
    if (isFemale && fatsBase < 0.8) fatsBase = 0.8

    const protein = Math.max(Math.round(weight * proteinBase), Math.round(weight * (isFemale ? 1.6 : 1.8)))
    const fats = Math.round(weight * fatsBase)
    const carbs = Math.max(50, Math.round((caloriesForMeals - protein * 4 - fats * 9) / 4))

    return {
      tmb: Math.round(data.tmb || 0), tdee: Math.round(data.tdee || 0),
      dailyCalorieGoal: dailyCalories, finalCalories: dailyCalories,
      protein, carbs, fats,
      weeksToGoal: calculateWeeksToGoal(data.timeToGoal || "", data),
      metabolicAdjustment: 100, dailyCalorieAdjustment: 0,
      supplementCalories, supplementProtein, supplementCarbs, supplementFats,
    }
  }

  // Cálculo do zero (fallback para dados antigos sem calorieGoal)
  const weight = parseFloat(data.currentWeight) || 70
  const height = parseFloat(data.height) || 170
  const age = parseFloat(data.age) || 25
  const gender = data.gender || "masculino"
  const isFemale = gender.toLowerCase().includes("fem") || gender.toLowerCase().includes("mulher")
  const bodyType = (data.bodyType || "").toLowerCase()
  const targetWeight = parseFloat(data.targetWeight) || weight
  const weightDifference = targetWeight - weight
  const goals = Array.isArray(data.goal) ? data.goal : [data.goal || "ganhar-massa"]

  // Correção automática de objetivo com base na diferença de peso
  let effectiveGoals = [...goals]
  if (Math.abs(weightDifference) > 2) {
    if (weightDifference < 0 && !effectiveGoals.includes("emagrecer") && !effectiveGoals.includes("perder-peso")) effectiveGoals = ["emagrecer"]
    else if (weightDifference > 0 && !effectiveGoals.includes("ganhar-massa") && !effectiveGoals.includes("ganhar-peso")) effectiveGoals = ["ganhar-massa"]
  }

  // 1. TMB (Mifflin-St Jeor)
  const tmb = isFemale ? (10 * weight + 6.25 * height - 5 * age - 161) : (10 * weight + 6.25 * height - 5 * age + 5)

  // 2. Dias de treino (corrigido: usar safeDays)
  const trainingDaysRaw = data.trainingDays ?? data.trainingDaysPerWeek ?? 5
  const trainingDaysParsed = parseInt(String(trainingDaysRaw), 10)
  const safeDays = (Number.isFinite(trainingDaysParsed) && trainingDaysParsed >= 1 && trainingDaysParsed <= 7) ? trainingDaysParsed : 5

  // 3. Fator de atividade base
  let baseActivityMultiplier = safeDays <= 1 ? 1.2 : safeDays <= 3 ? 1.375 : safeDays <= 5 ? 1.55 : safeDays <= 6 ? 1.725 : 1.9

  // Ajuste por somatótipo no fator de atividade
  let activityMultiplier = baseActivityMultiplier
  if (bodyType === "ectomorfo") activityMultiplier *= 1.05
  else if (bodyType === "endomorfo") activityMultiplier *= 0.95

  // 4. TDEE base
  let tdee = tmb * activityMultiplier

  // 5. Ajuste metabólico por somatótipo
  let metabolicAdjustment = 1.0
  if (bodyType === "ectomorfo") metabolicAdjustment = isFemale ? 1.12 : 1.15
  else if (bodyType === "endomorfo") metabolicAdjustment = isFemale ? 0.92 : 0.95
  tdee *= metabolicAdjustment

  // 6. Calcular semanas para o objetivo (agora com fallback automático)
  const weeksToGoal = calculateWeeksToGoal(data.timeToGoal || "", data)

  // 7. Ajuste calórico pelo objetivo
  let dailyCalorieAdjustment = 0
  if (weightDifference < -0.5) {
    // PERDA DE PESO
    const weightToLose = Math.abs(weightDifference)
    if (weeksToGoal > 0) {
      const weeklyRate = weightToLose / weeksToGoal
      let maxWeeklyLoss = bodyType === "ectomorfo" ? Math.min(weeklyRate, 0.5) : bodyType === "endomorfo" ? Math.min(weeklyRate, 1.0) : Math.min(weeklyRate, 0.75)
      dailyCalorieAdjustment = -Math.round((maxWeeklyLoss * 7700) / 7)
      const maxDeficit = isFemale ? (bodyType === "endomorfo" ? -700 : -600) : (bodyType === "endomorfo" ? -900 : -800)
      dailyCalorieAdjustment = Math.max(dailyCalorieAdjustment, maxDeficit)
    } else {
      dailyCalorieAdjustment = bodyType === "ectomorfo" ? -400 : bodyType === "endomorfo" ? -600 : -500
    }
  } else if (weightDifference > 0.5) {
    // GANHO DE PESO
    const weightToGain = weightDifference
    if (weeksToGoal > 0) {
      const weeklyRate = weightToGain / weeksToGoal
      let maxWeeklyGain = bodyType === "ectomorfo" ? Math.min(weeklyRate, 0.75) : bodyType === "endomorfo" ? Math.min(weeklyRate, 0.4) : Math.min(weeklyRate, 0.5)
      dailyCalorieAdjustment = Math.round((maxWeeklyGain * 7700) / 7)
      const maxSurplus = bodyType === "ectomorfo" ? (isFemale ? 700 : 850) : bodyType === "endomorfo" ? (isFemale ? 400 : 500) : (isFemale ? 500 : 600)
      dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, maxSurplus)
    } else {
      dailyCalorieAdjustment = bodyType === "ectomorfo" ? (isFemale ? 600 : 700) : bodyType === "endomorfo" ? (isFemale ? 300 : 400) : (isFemale ? 400 : 500)
    }
  } else {
    // MANUTENÇÃO
    if (effectiveGoals.includes("perder-peso") || effectiveGoals.includes("emagrecer")) dailyCalorieAdjustment = bodyType === "endomorfo" ? -400 : -300
    else if (effectiveGoals.includes("ganhar-massa") || effectiveGoals.includes("ganhar-peso")) dailyCalorieAdjustment = bodyType === "ectomorfo" ? 400 : bodyType === "endomorfo" ? 200 : 300
  }

  let finalCalories = Math.round(tdee + dailyCalorieAdjustment)

  // 8. Limites de segurança
  const minCalories = isFemale ? (safeDays >= 4 ? 1400 : 1200) : (safeDays >= 4 ? 1600 : 1400)
  if (finalCalories < minCalories) finalCalories = minCalories
  if (finalCalories < tmb * 1.1) finalCalories = Math.round(tmb * 1.1)

  // 9. Suplementação
  let supplementCalories = 0, supplementProtein = 0, supplementCarbs = 0, supplementFats = 0
  if (data.wantsSupplement === "sim" && data.supplementType) {
    if (data.supplementType === "hipercalorico") { supplementCalories = 615; supplementProtein = 37; supplementCarbs = 108; supplementFats = 3.7 }
    else if (data.supplementType === "whey-protein") { supplementCalories = 119; supplementProtein = 24; supplementCarbs = 2.3; supplementFats = 1.5 }
  }
  const caloriesForMeals = finalCalories - supplementCalories

  // 10. Macronutrientes baseados em objetivo + somatótipo + gênero
  let proteinBase: number
  if (weightDifference < -0.5) {
    proteinBase = bodyType === "ectomorfo" ? (isFemale ? 2.0 : 2.2) : bodyType === "mesomorfo" ? (isFemale ? 2.2 : 2.4) : (isFemale ? 2.4 : 2.5)
  } else if (weightDifference > 0.5) {
    proteinBase = bodyType === "ectomorfo" ? 2.3 : bodyType === "mesomorfo" ? (isFemale ? 2.0 : 2.2) : (isFemale ? 1.9 : 2.0)
  } else {
    proteinBase = isFemale ? 1.8 : 2.0
  }

  let fatsBase = bodyType === "ectomorfo" ? (isFemale ? 1.3 : 1.2) : bodyType === "endomorfo" ? (isFemale ? 1.0 : 0.9) : (isFemale ? 1.1 : 1.0)
  if (isFemale && fatsBase < 0.8) fatsBase = 0.8

  const protein = Math.max(Math.round(weight * proteinBase), Math.round(weight * (isFemale ? 1.6 : 1.8)))
  const fats = Math.round(weight * fatsBase)
  const carbs = Math.max(50, Math.round((caloriesForMeals - protein * 4 - fats * 9) / 4))

  console.log(`[CALC] TMB: ${Math.round(tmb)} | TDEE: ${Math.round(tdee)} | Final: ${finalCalories} kcal | Dias: ${safeDays} | Ajuste: ${dailyCalorieAdjustment} | Semanas: ${weeksToGoal}`)

  return {
    tmb: Math.round(tmb), tdee: Math.round(tdee),
    dailyCalorieGoal: finalCalories, finalCalories,
    protein, carbs, fats,
    dailyCalorieAdjustment,
    weeksToGoal,
    metabolicAdjustment: Math.round(metabolicAdjustment * 100),
    supplementCalories, supplementProtein, supplementCarbs, supplementFats,
  }
}
