import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
    try {
          const isAdmin = await isAdminRequest()
          if (!isAdmin) {
                  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
          }

      const { searchParams } = new URL(request.url)
          const daysAgo = parseInt(searchParams.get("daysAgo") || "30")

      // Filtrar por período
      const dateFilter = new Date()
          dateFilter.setDate(dateFilter.getDate() - daysAgo)
          const dateFilterISO = dateFilter.toISOString()

      const snapshot = await adminDb
            .collection("quiz_sessions")
            .where("createdAt", ">=", dateFilterISO)
            .get()

      const sessions = snapshot.docs.map((doc) => doc.data())

      const totalStarted = sessions.length
          const totalCompleted = sessions.filter((s: any) => s.completed === true).length
          const completionRate = totalStarted > 0
            ? parseFloat(((totalCompleted / totalStarted) * 100).toFixed(1))
                  : 0

      // Para cada passo 1..30, calcular reached, dropped, dropRate, avgTimeMs
      const TOTAL_STEPS = 30
          const steps = []

                for (let step = 1; step <= TOTAL_STEPS; step++) {
                        // Sessões que chegaram neste passo
            const reached = sessions.filter((s: any) => {
                      const ts = s.stepTimestamps || {}
                                return ts[String(step)] !== undefined
            })

            // Sessões que chegaram neste passo mas NÃO chegaram no próximo
            const nextStep = step + 1
                        const dropped = reached.filter((s: any) => {
                                  if (step === TOTAL_STEPS) return !s.completed
                                  const ts = s.stepTimestamps || {}
                                            return ts[String(nextStep)] === undefined
                        })

            const reachedCount = reached.length
                        const droppedCount = dropped.length
                        const dropRate = reachedCount > 0
                          ? parseFloat(((droppedCount / reachedCount) * 100).toFixed(1))
                                  : 0

            // Tempo médio no passo = média de (timestamp[step+1] - timestamp[step])
            let avgTimeMs = 0
                        if (step < TOTAL_STEPS) {
                                  const timeDiffs = reached
                                    .filter((s: any) => {
                                                  const ts = s.stepTimestamps || {}
                                                                return ts[String(step)] !== undefined && ts[String(nextStep)] !== undefined
                                    })
                                    .map((s: any) => {
                                                  const ts = s.stepTimestamps || {}
                                                                return Number(ts[String(nextStep)]) - Number(ts[String(step)])
                                    })
                                    .filter((diff: number) => diff > 0 && diff < 300000) // ignorar > 5 min (idle)

                          if (timeDiffs.length > 0) {
                                      avgTimeMs = Math.round(
                                                    timeDiffs.reduce((a: number, b: number) => a + b, 0) / timeDiffs.length
                                                  )
                          }
                        }

            steps.push({
                      step,
                      reached: reachedCount,
                      dropped: droppedCount,
                      dropRate,
                      avgTimeMs,
                      avgTimeSec: Math.round(avgTimeMs / 1000),
            })
                }

      // Média geral de dropRate para destacar passos acima da média
      const avgDropRate = steps.length > 0
            ? parseFloat(
                        (steps.reduce((sum, s) => sum + s.dropRate, 0) / steps.length).toFixed(1)
                      )
              : 0

      return NextResponse.json({
              summary: {
                        totalStarted,
                        totalCompleted,
                        completionRate,
                        avgDropRate,
                        daysAgo,
              },
              steps,
              timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
          console.error("[v0] QUIZ_ANALYTICS - Erro:", error?.message)
          return NextResponse.json({ error: "Erro ao calcular analytics do quiz" }, { status: 500 })
    }
}
