"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CheckCircle, TrendingDown, Clock } from "lucide-react"

interface StepData {
  step: number
  reached: number
  dropped: number
  dropRate: number
  avgTimeMs: number
  avgTimeSec: number
}

interface AnalyticsData {
  summary: {
    totalStarted: number
    totalCompleted: number
    completionRate: number
    avgDropRate: number
    daysAgo: number
  }
  steps: StepData[]
  timestamp: string
}

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "365 dias", value: 365 },
]

export default function QuizAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysAgo, setDaysAgo] = useState(30)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/quiz-analytics?daysAgo=${daysAgo}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("Erro ao buscar quiz analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [daysAgo])

  const maxReached = data?.steps?.[0]?.reached ?? 1

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Quiz Analytics</h1>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDaysAgo(opt.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                daysAgo === opt.value
                  ? "bg-lime-500 text-slate-900"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20">Carregando...</div>
      ) : !data ? (
        <div className="text-slate-400 text-center py-20">Erro ao carregar dados.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Sessoes Iniciadas</CardTitle>
                <Users className="h-4 w-4 text-lime-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.totalStarted}</div>
                <p className="text-xs text-slate-500 mt-1">ultimos {data.summary.daysAgo} dias</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Quizzes Completos</CardTitle>
                <CheckCircle className="h-4 w-4 text-lime-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.totalCompleted}</div>
                <p className="text-xs text-slate-500 mt-1">sessoes finalizadas</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Taxa de Conclusao</CardTitle>
                <TrendingDown className="h-4 w-4 text-lime-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.completionRate}%</div>
                <p className="text-xs text-slate-500 mt-1">do total de sessoes</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Abandono Medio/Passo</CardTitle>
                <Clock className="h-4 w-4 text-lime-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.avgDropRate}%</div>
                <p className="text-xs text-slate-500 mt-1">media por passo</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Funil por Passo</CardTitle>
              <p className="text-slate-400 text-sm">
                Passos em laranja possuem abandono acima da media ({data.summary.avgDropRate}%)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.steps.map((step) => {
                  const barWidth = maxReached > 0 ? (step.reached / maxReached) * 100 : 0
                  const isAboveAvg = step.dropRate > data.summary.avgDropRate
                  return (
                    <div
                      key={step.step}
                      className={`rounded-lg p-3 ${isAboveAvg ? "border border-orange-500 bg-slate-900" : "bg-slate-900"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs w-14 shrink-0">Passo {step.step}</span>
                        <div className="flex-1 h-5 bg-slate-700 rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-lime-500 to-lime-400 rounded transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-white text-xs w-10 text-right shrink-0">{step.reached}</span>
                        <span
                          className={`text-xs w-16 text-right shrink-0 font-medium ${
                            isAboveAvg ? "text-orange-400" : "text-slate-400"
                          }`}
                        >
                          -{step.dropRate}%
                        </span>
                        <span className="text-slate-500 text-xs w-16 text-right shrink-0">
                          {step.avgTimeSec > 0 ? `${step.avgTimeSec}s` : "-"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end mt-4 text-xs text-slate-500">
                <span>Usuarios &nbsp; Abandono &nbsp; Tempo medio</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
