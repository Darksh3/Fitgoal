"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CheckCircle, TrendingDown, Clock, BarChart2, Target, ChevronDown, ChevronUp } from "lucide-react"

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

interface AnswerItem {
    answer: string
    count: number
    percentage: number
}

interface StepBreakdown {
    step: number
    label: string
    totalResponses: number
    answers: AnswerItem[]
}

interface AvatarSummary {
    objetivo: string | null
    genero: string | null
    faixaEtaria: string | null
    experiencia: string | null
    diasTreino: string | null
    tempoPorTreino: string | null
    tipoCorporal: string | null
}

interface ResponsesData {
    totalSessions: number
    totalRuns: number
    stepBreakdowns: StepBreakdown[]
    nodeBreakdowns: { nodeId: string; totalResponses: number; answers: AnswerItem[] }[]
    avatarSummary: AvatarSummary
    daysAgo: number
}

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "365 dias", value: 365 },
  ]

export default function QuizAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [responsesData, setResponsesData] = useState<ResponsesData | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingResponses, setLoadingResponses] = useState(true)
    const [daysAgo, setDaysAgo] = useState(30)
    const [activeTab, setActiveTab] = useState<"funil" | "respostas">("funil")
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1, 2, 3]))

  useEffect(() => {
        async function fetchData() {
                setLoading(true)
                setLoadingResponses(true)
                try {
                          const [res, resResponses] = await Promise.all([
                                      fetch(`/api/admin/quiz-analytics?daysAgo=${daysAgo}`),
                                      fetch(`/api/admin/quiz-responses?daysAgo=${daysAgo}`),
                                    ])
                          const json = await res.json()
                          const jsonResponses = await resResponses.json()
                          setData(json)
                          setResponsesData(jsonResponses)
                } catch (err) {
                          console.error("Erro ao buscar quiz analytics:", err)
                } finally {
                          setLoading(false)
                          setLoadingResponses(false)
                }
        }
        fetchData()
  }, [daysAgo])

  const maxReached = data?.steps?.[0]?.reached ?? 1

  const toggleStep = (step: number) => {
        setExpandedSteps((prev) => {
                const next = new Set(prev)
                if (next.has(step)) {
                          next.delete(step)
                } else {
                          next.add(step)
    }
                return next
        })
  }

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
        
          {/* Tab switcher */}
              <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
                      <button
                                  onClick={() => setActiveTab("funil")}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                activeTab === "funil"
                                                  ? "bg-lime-500 text-slate-900"
                                                  : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                <BarChart2 className="h-4 w-4" />
                                Funil de Conversão
                      </button>button>
                      <button
                                  onClick={() => setActiveTab("respostas")}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                activeTab === "respostas"
                                                  ? "bg-lime-500 text-slate-900"
                                                  : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                <Target className="h-4 w-4" />
                                Respostas & Avatar
                      </button>button>
              </div>div>
        
          {loading || loadingResponses ? (
                  <div className="text-slate-400 text-center py-20">Carregando...</div>div>
                ) : activeTab === "funil" ? (
                  /* === FUNIL TAB === */
                  <>
                    {!data ? (
                                <div className="text-slate-400 text-center py-20">Erro ao carregar dados.</div>div>
                              ) : (
                                <>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                              <Card className="bg-slate-800 border-slate-700">
                                                                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                                                    <CardTitle className="text-sm font-medium text-slate-400">Sessoes Iniciadas</CardTitle>CardTitle>
                                                                                                    <Users className="h-4 w-4 text-lime-400" />
                                                                                </CardHeader>CardHeader>
                                                                                <CardContent>
                                                                                                    <div className="text-2xl font-bold text-white">{data.summary.totalStarted}</div>div>
                                                                                                    <p className="text-xs text-slate-500 mt-1">ultimos {data.summary.daysAgo} dias</p>p>
                                                                                </CardContent>CardContent>
                                                              </Card>Card>
                                                              <Card className="bg-slate-800 border-slate-700">
                                                                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                                                    <CardTitle className="text-sm font-medium text-slate-400">Quizzes Completos</CardTitle>CardTitle>
                                                                                                    <CheckCircle className="h-4 w-4 text-lime-400" />
                                                                                </CardHeader>CardHeader>
                                                                                <CardContent>
                                                                                                    <div className="text-2xl font-bold text-white">{data.summary.totalCompleted}</div>div>
                                                                                                    <p className="text-xs text-slate-500 mt-1">sessoes finalizadas</p>p>
                                                                                </CardContent>CardContent>
                                                              </Card>Card>
                                                              <Card className="bg-slate-800 border-slate-700">
                                                                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                                                    <CardTitle className="text-sm font-medium text-slate-400">Taxa de Conclusao</CardTitle>CardTitle>
                                                                                                    <TrendingDown className="h-4 w-4 text-lime-400" />
                                                                                </CardHeader>CardHeader>
                                                                                <CardContent>
                                                                                                    <div className="text-2xl font-bold text-white">{data.summary.completionRate}%</div>div>
                                                                                                    <p className="text-xs text-slate-500 mt-1">do total de sessoes</p>p>
                                                                                </CardContent>CardContent>
                                                              </Card>Card>
                                                              <Card className="bg-slate-800 border-slate-700">
                                                                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                                                                    <CardTitle className="text-sm font-medium text-slate-400">Abandono Medio/Passo</CardTitle>CardTitle>
                                                                                                    <Clock className="h-4 w-4 text-lime-400" />
                                                                                </CardHeader>CardHeader>
                                                                                <CardContent>
                                                                                                    <div className="text-2xl font-bold text-white">{data.summary.avgDropRate}%</div>div>
                                                                                                    <p className="text-xs text-slate-500 mt-1">media por passo</p>p>
                                                                                </CardContent>CardContent>
                                                              </Card>Card>
                                              </div>div>
                                
                                              <Card className="bg-slate-800 border-slate-700">
                                                              <CardHeader>
                                                                                <CardTitle className="text-white text-lg">Funil por Passo</CardTitle>CardTitle>
                                                                                <p className="text-slate-400 text-sm">
                                                                                                    Passos em laranja possuem abandono acima da media ({data.summary.avgDropRate}%)
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
                                                                                <div className="flex justify-end mt-4 text-xs text-slate-500">
                                                                                                    <span>Usuarios &nbsp; Abandono &nbsp; Tempo medio</span>span>
                                                                                </div>div>
                                                              </CardContent>CardContent>
                                              </Card>Card>
                                </>>
                              )}
                  </>>
                ) : (
                  /* === RESPOSTAS & AVATAR TAB === */
                  <>
                    {!responsesData ? (
                                <div className="text-slate-400 text-center py-20">Erro ao carregar respostas.</div>div>
                              ) : (
                                <>
                                  {/* Avatar do Publico */}
                                              <Card className="bg-slate-800 border-slate-700">
                                                              <CardHeader>
                                                                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                                                                                    <Target className="h-5 w-5 text-lime-400" />
                                                                                                    Avatar do seu Publico
                                                                                </CardTitle>CardTitle>
                                                                                <p className="text-slate-400 text-sm">
                                                                                                    Perfil mais comum baseado nas respostas dos ultimos {daysAgo} dias ({responsesData.totalSessions} sessoes)
                                                                                </p>p>
                                                              </CardHeader>CardHeader>
                                                              <CardContent>
                                                                {Object.values(responsesData.avatarSummary).every((v) => v === null) ? (
                                                      <div className="text-slate-500 text-center py-8">
                                                                            Nenhuma resposta registrada ainda. As respostas aparecerão aqui conforme os usuarios completam o quiz.
                                                      </div>div>
                                                    ) : (
                                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {responsesData.avatarSummary.objetivo && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Objetivo Principal</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.objetivo}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                        {responsesData.avatarSummary.genero && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Genero</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.genero}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                        {responsesData.avatarSummary.faixaEtaria && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Faixa Etaria</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.faixaEtaria}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                        {responsesData.avatarSummary.experiencia && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Nivel de Experiencia</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.experiencia}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                        {responsesData.avatarSummary.diasTreino && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Dias de Treino/Semana</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.diasTreino}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                        {responsesData.avatarSummary.tempoPorTreino && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Tempo por Treino</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.tempoPorTreino}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                        {responsesData.avatarSummary.tipoCorporal && (
                                                                                <div className="bg-slate-900 rounded-lg p-3 border border-lime-500/20">
                                                                                                          <p className="text-slate-500 text-xs mb-1">Tipo Corporal Atual</p>p>
                                                                                                          <p className="text-lime-400 font-semibold text-sm">{responsesData.avatarSummary.tipoCorporal}</p>p>
                                                                                  </div>div>
                                                                            )}
                                                      </div>div>
                                                                                )}
                                                              </CardContent>CardContent>
                                              </Card>Card>
                                
                                  {/* Respostas por Questao */}
                                  {responsesData.stepBreakdowns.length === 0 && responsesData.nodeBreakdowns.length === 0 ? (
                                                  <Card className="bg-slate-800 border-slate-700">
                                                                    <CardContent className="py-12 text-center">
                                                                                        <BarChart2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                                                                        <p className="text-slate-400 text-lg font-medium mb-2">Nenhuma resposta registrada</p>p>
                                                                                        <p className="text-slate-500 text-sm">
                                                                                                              As respostas das perguntas do quiz aparecerão aqui automaticamente conforme os usuarios interagem com o quiz.
                                                                                                              Certifique-se de que o campo "answers" esta sendo salvo nas sessoes do Firestore.
                                                                                          </p>p>
                                                                    </CardContent>CardContent>
                                                  </Card>Card>
                                                ) : (
                                                  <div className="space-y-3">
                                                                    <h2 className="text-white font-semibold text-base">Distribuicao de Respostas por Pergunta</h2>h2>
                                                    {responsesData.stepBreakdowns.map((breakdown) => (
                                                                        <Card key={breakdown.step} className="bg-slate-800 border-slate-700">
                                                                                              <CardHeader
                                                                                                                        className="pb-2 cursor-pointer select-none"
                                                                                                                        onClick={() => toggleStep(breakdown.step)}
                                                                                                                      >
                                                                                                                      <div className="flex items-center justify-between">
                                                                                                                                                <div className="flex items-center gap-3">
                                                                                                                                                                            <span className="bg-lime-500/20 text-lime-400 text-xs font-bold px-2 py-1 rounded">
                                                                                                                                                                                                          P{breakdown.step}
                                                                                                                                                                                                        </span>span>
                                                                                                                                                                            <CardTitle className="text-white text-sm font-medium">{breakdown.label}</CardTitle>CardTitle>
                                                                                                                                                  </div>div>
                                                                                                                                                <div className="flex items-center gap-3">
                                                                                                                                                                            <span className="text-slate-500 text-xs">{breakdown.totalResponses} respostas</span>span>
                                                                                                                                                  {expandedSteps.has(breakdown.step) ? (
                                                                                                                                                      <ChevronUp className="h-4 w-4 text-slate-400" />
                                                                                                                                                    ) : (
                                                                                                                                                      <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                                                                                                    )}
                                                                                                                                                  </div>div>
                                                                                                                        </div>div>
                                                                                                </CardHeader>CardHeader>
                                                                          {expandedSteps.has(breakdown.step) && (
                                                                                                  <CardContent className="pt-0">
                                                                                                                            <div className="space-y-2">
                                                                                                                              {breakdown.answers.map((item, idx) => (
                                                                                                                                  <div key={idx} className="flex items-center gap-3">
                                                                                                                                                                  <span className="text-slate-400 text-xs w-4 shrink-0 text-right">{idx + 1}.</span>span>
                                                                                                                                                                  <span className="text-white text-xs w-36 shrink-0 truncate" title={item.answer}>
                                                                                                                                                                    {item.answer}
                                                                                                                                                                    </span>span>
                                                                                                                                                                  <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
                                                                                                                                                                                                    <div
                                                                                                                                                                                                                                          className="h-full bg-gradient-to-r from-lime-600 to-lime-400 rounded transition-all"
                                                                                                                                                                                                                                          style={{ width: `${item.percentage}%` }}
                                                                                                                                                                                                                                        />
                                                                                                                                                                    </div>div>
                                                                                                                                                                  <span className="text-lime-400 text-xs w-10 text-right shrink-0 font-medium">
                                                                                                                                                                    {item.percentage}%
                                                                                                                                                                    </span>span>
                                                                                                                                                                  <span className="text-slate-500 text-xs w-10 text-right shrink-0">
                                                                                                                                                                                                    ({item.count})
                                                                                                                                                                    </span>span>
                                                                                                                                    </div>div>
                                                                                                                                ))}
                                                                                                                              </div>div>
                                                                                                    </CardContent>CardContent>
                                                                                              )}
                                                                        </Card>Card>
                                                                      ))}
                                                  
                                                    {/* Node-based responses (Quiz Builder) */}
                                                    {responsesData.nodeBreakdowns.length > 0 && (
                                                                        <>
                                                                                              <h2 className="text-white font-semibold text-base mt-4">Respostas do Quiz Builder</h2>h2>
                                                                          {responsesData.nodeBreakdowns.map((breakdown) => (
                                                                                                  <Card key={breakdown.nodeId} className="bg-slate-800 border-slate-700">
                                                                                                                            <CardHeader className="pb-2">
                                                                                                                                                        <div className="flex items-center justify-between">
                                                                                                                                                                                      <CardTitle className="text-white text-xs font-mono text-slate-400">
                                                                                                                                                                                                                      Node: {breakdown.nodeId.substring(0, 12)}...
                                                                                                                                                                                                                    </CardTitle>CardTitle>
                                                                                                                                                                                      <span className="text-slate-500 text-xs">{breakdown.totalResponses} respostas</span>span>
                                                                                                                                                          </div>div>
                                                                                                                              </CardHeader>CardHeader>
                                                                                                                            <CardContent className="pt-0">
                                                                                                                                                        <div className="space-y-2">
                                                                                                                                                          {breakdown.answers.map((item, idx) => (
                                                                                                                                    <div key={idx} className="flex items-center gap-3">
                                                                                                                                                                      <span className="text-slate-400 text-xs w-4 shrink-0 text-right">{idx + 1}.</span>span>
                                                                                                                                                                      <span className="text-white text-xs w-36 shrink-0 truncate" title={item.answer}>
                                                                                                                                                                                                          {item.answer}
                                                                                                                                                                                                        </span>span>
                                                                                                                                                                      <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
                                                                                                                                                                                                          <div
                                                                                                                                                                                                                                                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded transition-all"
                                                                                                                                                                                                                                                  style={{ width: `${item.percentage}%` }}
                                                                                                                                                                                                                                                />
                                                                                                                                                                                                        </div>div>
                                                                                                                                                                      <span className="text-blue-400 text-xs w-10 text-right shrink-0 font-medium">
                                                                                                                                                                                                          {item.percentage}%
                                                                                                                                                                                                        </span>span>
                                                                                                                                                                      <span className="text-slate-500 text-xs w-10 text-right shrink-0">
                                                                                                                                                                                                          ({item.count})
                                                                                                                                                                                                        </span>span>
                                                                                                                                      </div>div>
                                                                                                                                  ))}
                                                                                                                                                          </div>div>
                                                                                                                              </CardContent>CardContent>
                                                                                                    </Card>Card>
                                                                                                ))}
                                                                        </>>
                                                                      )}
                                                  </div>div>
                                              )}
                                </>>
                              )}
                  </>>
                )}
        </div>div>
      )
}</></></></></></div>
