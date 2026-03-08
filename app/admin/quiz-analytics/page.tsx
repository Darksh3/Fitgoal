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
                      <h1 className="text-2xl font-bold text-white">Quiz Analytics</h1>h1>
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
                      </button>button>
                    ))}
                      </div>div>
              </div>div>
        
          {loading ? (
                  <div className="text-slate-400 text-center py-20">Carregando...</div>div>
                ) : !data ? (
                  <div className="text-slate-400 text-center py-20">Erro ao carregar dados.</div>div>
                ) : (
                  <>
                    {/* KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <Card className="bg-slate-800 border-slate-700">
                                                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                      <CardTitle className="text-sm font-medium text-slate-400">Sessões Iniciadas</CardTitle>CardTitle>
                                                                      <Users className="h-4 w-4 text-lime-400" />
                                                      </CardHeader>CardHeader>
                                                      <CardContent>
                                                                      <div className="text-2xl font-bold text-white">{data.summary.totalStarted}</div>div>
                                                                      <p className="text-xs text-slate-500 mt-1">últimos {data.summary.daysAgo} dias</p>p>
                                                      </CardContent>CardContent>
                                        </Card>Card>
                            
                                        <Card className="bg-slate-800 border-slate-700">
                                                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                      <CardTitle className="text-sm font-medium text-slate-400">Quizzes Completos</CardTitle>CardTitle>
                                                                      <CheckCircle className="h-4 w-4 text-lime-400" />
                                                      </CardHeader>CardHeader>
                                                      <CardContent>
                                                                      <div className="text-2xl font-bold text-white">{data.summary.totalCompleted}</div>div>
                                                                      <p className="text-xs text-slate-500 mt-1">sessões finalizadas</p>p>
                                                      </CardContent>CardContent>
                                        </Card>Card>
                            
                                        <Card className="bg-slate-800 border-slate-700">
                                                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                      <CardTitle className="text-sm font-medium text-slate-400">Taxa de Conclusão</CardTitle>CardTitle>
                                                                      <TrendingDown className="h-4 w-4 text-lime-400" />
                                                      </CardHeader>CardHeader>
                                                      <CardContent>
                                                                      <div className="text-2xl font-bold text-white">{data.summary.completionRate}%</div>div>
                                                                      <p className="text-xs text-slate-500 mt-1">do total de sessões</p>p>
                                                      </CardContent>CardContent>
                                        </Card>Card>
                            
                                        <Card className="bg-slate-800 border-slate-700">
                                                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                      <CardTitle className="text-sm font-medium text-slate-400">Abandono Médio/Passo</CardTitle>CardTitle>
                                                                      <Clock className="h-4 w-4 text-lime-400" />
                                                      </CardHeader>CardHeader>
                                                      <CardContent>
                                                                      <div className="text-2xl font-bold text-white">{data.summary.avgDropRate}%</div>div>
                                                                      <p className="text-xs text-slate-500 mt-1">média por passo</p>p>
                                                      </CardContent>CardContent>
                                        </Card>Card>
                            </div>div>
                  
                    {/* Funnel visual */}
                            <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader>
                                                      <CardTitle className="text-white text-lg">Funil por Passo</CardTitle>CardTitle>
                                                      <p className="text-slate-400 text-sm">
                                                                      Passos destacados em laranja possuem abandono acima da média ({data.summary.avgDropRate}%)
                                                      </p>p>
                                        </CardHeader>CardHeader>
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
                                                                                                                                                  <span className="text-slate-400 text-xs w-14 shrink-0">Passo {step.step}</span>span>
                                                                                                                                                  <div className="flex-1 h-5 bg-slate-700 rounded overflow-hidden">
                                                                                                                                                                            <div
                                                                                                                                                                                                          className="h-full bg-gradient-to-r from-lime-500 to-lime-400 rounded transition-all"
                                                                                                                                                                                                          style={{ width: `${barWidth}%` }}
                                                                                                                                                                                                        />
                                                                                                                                                    </div>div>
                                                                                                                                                  <span className="text-white text-xs w-10 text-right shrink-0">{step.reached}</span>span>
                                                                                                                                                  <span
                                                                                                                                                                              className={`text-xs w-16 text-right shrink-0 font-medium ${
                                                                                                                                                                                                            isAboveAvg ? "text-orange-400" : "text-slate-400"
                                                                                                                                                                                                          }`}
                                                                                                                                                                            >
                                                                                                                                                                            -{step.dropRate}%
                                                                                                                                                    </span>span>
                                                                                                                                                  <span className="text-slate-500 text-xs w-16 text-right shrink-0">
                                                                                                                                                    {step.avgTimeSec > 0 ? `${step.avgTimeSec}s` : "-"}
                                                                                                                                                    </span>span>
                                                                                                                            </div>div>
                                                                                                      </div>div>
                                                                                                  )
                                                        })}
                                                      </div>div>
                                                      <div className="flex justify-end gap-6 mt-4 text-xs text-slate-500">
                                                                      <span>Usuários &nbsp;&nbsp; Abandono &nbsp;&nbsp; Tempo médio</span>span>
                                                      </div>div>
                                        </CardContent>CardContent>
                            </Card>Card>
                  </>>
                )}
        </div>div>
      )
}</></div>
