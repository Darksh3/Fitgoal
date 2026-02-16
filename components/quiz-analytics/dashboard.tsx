'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuizRun } from '@/lib/schemas/quiz'
import { calculateAnalyticsMetrics, AnalyticsMetrics } from '@/lib/quiz-analytics'
import { TrendingDown, Users, CheckCircle, BarChart3, Download } from 'lucide-react'

interface QuizAnalyticsDashboardProps {
  runs: QuizRun[]
  onExport?: (data: any) => void
}

export function QuizAnalyticsDashboard({ runs, onExport }: QuizAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)

  useEffect(() => {
    const calculatedMetrics = calculateAnalyticsMetrics(runs)
    setMetrics(calculatedMetrics)
  }, [runs])

  if (!metrics) {
    return <div className="text-slate-400">Carregando analytics...</div>
  }

  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      runs: runs.map((r) => ({
        id: r.id,
        completedAt: r.completedAt,
        responseCount: Object.keys(r.responses || {}).length,
        responses: r.responses,
      })),
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz-analytics-${Date.now()}.json`
    a.click()

    onExport?.(exportData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">{metrics.totalRuns} respostas coletadas</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total de Respostas</p>
              <p className="text-3xl font-bold text-white mt-2">{metrics.totalRuns}</p>
            </div>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-white mt-2">{metrics.completionRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Média de Perguntas</p>
              <p className="text-3xl font-bold text-white mt-2">
                {metrics.averageQuestionsPerRun.toFixed(1)}
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Respostas Completas</p>
              <p className="text-3xl font-bold text-white mt-2">{metrics.completedRuns}</p>
            </div>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Funnel Chart */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Funil de Conversão</h3>
        <div className="space-y-3">
          {metrics.funnel.map((step) => {
            const width = (step.startCount / metrics.totalRuns) * 100
            return (
              <div key={step.nodeId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{step.nodeTitle}</span>
                  <span className="text-slate-400">
                    {step.startCount} ({step.dropOffRate.toFixed(1)}% drop-off)
                  </span>
                </div>
                <div className="w-full h-8 bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-lime-500 to-lime-400 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Drop-off Analysis */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Perguntas com Maior Drop-off</h3>
        <div className="space-y-2">
          {metrics.mostDroppedQuestions.length > 0 ? (
            metrics.mostDroppedQuestions.map((questionId, idx) => (
              <div
                key={questionId}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700"
              >
                <span className="font-semibold text-white">{idx + 1}.</span>
                <span className="text-slate-300 text-sm">{questionId}</span>
                <span className="ml-auto text-red-400 text-sm font-semibold">⚠ Revisar</span>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">Nenhuma pergunta com drop-off detectada</p>
          )}
        </div>
      </Card>

      {/* Response Distribution */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Respostas</h3>
        <div className="space-y-4">
          {Object.entries(metrics.responseDistribution).slice(0, 5).map(([nodeId, responses]) => (
            <div key={nodeId} className="space-y-2">
              <p className="text-sm font-semibold text-slate-300">{nodeId}</p>
              <div className="space-y-1">
                {Object.entries(responses)
                  .sort(([, a], [, b]) => b - a)
                  .map(([response, count]) => (
                    <div key={response} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{response}</span>
                      <span className="text-slate-300">{count} ({((count / metrics.totalRuns) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
