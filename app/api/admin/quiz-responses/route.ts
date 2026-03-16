import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

// Labels for quiz steps (order corrected to match current quiz flow)
const STEP_LABELS: Record<number, string> = {
        1: "Qual é o seu gênero?",
        2: "Qual é o seu tipo de corpo?",
        3: "Quais são os seus objetivos?",
        4: "Como o seu peso costuma mudar?",
        5: "Qual é o seu nível de gordura corporal?",
        6: "Qual área você quer focar mais?",
        7: "Você segue alguma dessas dietas?",
        8: "Com que frequência você consome doces?",
        9: "Com que frequência você consome álcool?",
        10: "Quantidade diária de água",
        11: "Qual é a sua idade?",
        12: "Qual é a sua altura?",
        13: "Qual é o seu peso atual?",
        14: "Qual é o seu objetivo de peso?",
        15: "Qual é o seu nível de experiência com treinos?",
        16: "Como você se sente com cardio?",
        17: "Como você se sente com flexões?",
        18: "Como você se sente com alongamentos?",
        20: "Objetivos adicionais",
        21: "Que equipamentos você tem acesso?",
        22: "Qual é o seu tempo disponível para treino?",
        23: "Quantos dias você irá treinar por semana?",
        24: "Escolha os produtos que você gosta",
        25: "Você possui alergias ou restrições alimentares?",
        26: "Quais são suas alergias ou restrições alimentares?",
        28: "Como podemos te chamar?",
        29: "Qual é o seu e-mail?",
}

export async function GET(request: NextRequest) {
    try {
          const isAdmin = await isAdminRequest()
          if (!isAdmin) {
                  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
          }

      const { searchParams } = new URL(request.url)
          const daysAgo = parseInt(searchParams.get("daysAgo") || "30")

      // Date filter
      const dateFilter = new Date()
          dateFilter.setDate(dateFilter.getDate() - daysAgo)
          const dateFilterISO = dateFilter.toISOString()

      // Fetch quiz sessions with answers
      const snapshot = await adminDb
            .collection("quiz_sessions")
            .where("createdAt", ">=", dateFilterISO)
            .get()

      const sessions = snapshot.docs.map((doc) => doc.data())
          const totalSessions = sessions.length

      // Aggregate answers by step
      const stepAnswers: Record<number, Record<string, number>> = {}

            for (const session of sessions) {
                    const answers = session.answers || session.responses || {}
                            if (typeof answers === "object" && answers !== null) {
                                      for (const [key, value] of Object.entries(answers)) {
                                                  const stepNum = parseInt(key)
                                                  if (!isNaN(stepNum) && value !== undefined && value !== null) {
                                                                if (!stepAnswers[stepNum]) {
                                                                                stepAnswers[stepNum] = {}
                                                                }
                                                                const answerStr = String(value).trim()
                                                                if (answerStr) {
                                                                                stepAnswers[stepNum][answerStr] = (stepAnswers[stepNum][answerStr] || 0) + 1
                                                                }
                                                  }
                                      }
                            }
            }

      // Also check quiz-runs collection for richer response data
      const runsSnapshot = await adminDb
            .collection("quiz-runs")
            .where("startedAt", ">=", dateFilterISO)
            .get()

      const runs = runsSnapshot.docs.map((doc) => doc.data())

      // Merge answers from quiz-runs (responses field is keyed by nodeId)
      const nodeAnswers: Record<string, Record<string, number>> = {}
            for (const run of runs) {
                    const responses = run.responses || {}
                            for (const [nodeId, response] of Object.entries(responses)) {
                                      if (!nodeAnswers[nodeId]) nodeAnswers[nodeId] = {}
                                                const val = (response as any)?.value ?? (response as any)?.answer ?? String(response)
                                      if (val) {
                                                  const valStr = String(val).trim()
                                                  if (valStr) {
                                                                nodeAnswers[nodeId][valStr] = (nodeAnswers[nodeId][valStr] || 0) + 1
                                                  }
                                      }
                            }
            }

      // Build the result - per step breakdown with top answers
      const stepBreakdowns = Object.entries(stepAnswers)
            .map(([stepStr, answers]) => {
                      const step = parseInt(stepStr)
                      const total = Object.values(answers).reduce((a, b) => a + b, 0)
                      const sortedAnswers = Object.entries(answers)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([answer, count]) => ({
                                      answer,
                                      count,
                                      percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
                        }))
                      return {
                                  step,
                                  label: STEP_LABELS[step] || `Pergunta ${step}`,
                                  totalResponses: total,
                                  answers: sortedAnswers,
                      }
            })
            .sort((a, b) => a.step - b.step)

      // Avatar summary: most common profile
      const avatarSummary = buildAvatarSummary(stepAnswers)

      return NextResponse.json({
              totalSessions,
              totalRuns: runs.length,
              stepBreakdowns,
              nodeBreakdowns: Object.entries(nodeAnswers).map(([nodeId, answers]) => {
                        const total = Object.values(answers).reduce((a, b) => a + b, 0)
                        return {
                                    nodeId,
                                    totalResponses: total,
                                    answers: Object.entries(answers)
                                      .sort(([, a], [, b]) => b - a)
                                      .slice(0, 10)
                                      .map(([answer, count]) => ({
                                                      answer,
                                                      count,
                                                      percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
                                      })),
                        }
              }),
              avatarSummary,
              daysAgo,
              timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
          console.error("[v0] QUIZ_RESPONSES - Erro:", error?.message)
          return NextResponse.json({ error: "Erro ao calcular respostas do quiz" }, { status: 500 })
    }
}

function buildAvatarSummary(stepAnswers: Record<number, Record<string, number>>) {
    const getMostCommon = (step: number): string | null => {
          const answers = stepAnswers[step]
          if (!answers) return null
          return Object.entries(answers).sort(([, a], [, b]) => b - a)[0]?.[0] || null
    }

  return {
                objetivo: getMostCommon(3),
              genero: getMostCommon(1),
              faixaEtaria: getMostCommon(11),
              experiencia: getMostCommon(15),
              diasTreino: getMostCommon(23),
              tempoPorTreino: getMostCommon(22),
              tipoCorporal: getMostCommon(2),
  }
}
