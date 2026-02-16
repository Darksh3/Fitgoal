'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { QuizNode, QuizRun } from '@/lib/schemas/quiz'
import { AlertTriangle, TrendingDown } from 'lucide-react'

interface DropOffAnalysisProps {
  nodes: QuizNode[]
  runs: QuizRun[]
}

export function DropOffAnalysis({ nodes, runs }: DropOffAnalysisProps) {
  // Calculate drop-off for each question
  const questionDropoffs = nodes.map((node) => {
    const usersReachedThisQuestion = runs.filter(
      (run) => run.responses && node.key in run.responses
    ).length

    const usersCompletedThisQuestion = runs.filter((run) => {
      if (!run.responses || !(node.key in run.responses)) return false
      
      // Check if they moved past this question
      const nodeKeys = Object.keys(run.responses)
      const thisQuestionIndex = nodeKeys.indexOf(node.key)
      return thisQuestionIndex < nodeKeys.length - 1
    }).length

    const dropOffCount = usersReachedThisQuestion - usersCompletedThisQuestion
    const dropOffRate =
      usersReachedThisQuestion > 0
        ? (dropOffCount / usersReachedThisQuestion) * 100
        : 0

    return {
      nodeId: node.id,
      nodeTitle: node.title,
      usersReached: usersReachedThisQuestion,
      usersCompleted: usersCompletedThisQuestion,
      dropOffCount,
      dropOffRate,
    }
  })

  // Sort by drop-off rate
  const sortedByDropOff = [...questionDropoffs].sort((a, b) => b.dropOffRate - a.dropOffRate)

  // Identify critical questions (>30% drop-off)
  const criticalQuestions = sortedByDropOff.filter((q) => q.dropOffRate > 30)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Questions Alert */}
        {criticalQuestions.length > 0 && (
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-400 mb-1">
                  {criticalQuestions.length} Pergunta(s) Crítica(s)
                </h4>
                <p className="text-sm text-red-300">
                  Essas perguntas têm taxa de abandono acima de 30%
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Summary Stats */}
        <Card className="p-4 bg-slate-800 border-slate-700">
          <h4 className="font-semibold text-white mb-3">Resumo</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total de Perguntas</span>
              <span className="text-white font-semibold">{nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Drop-off Médio</span>
              <span className="text-white font-semibold">
                {(
                  questionDropoffs.reduce((sum, q) => sum + q.dropOffRate, 0) /
                  Math.max(questionDropoffs.length, 1)
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Perguntas Críticas</span>
              <span className="text-red-400 font-semibold">{criticalQuestions.length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Drop-off Table */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Análise Detalhada por Pergunta</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-left text-slate-400">
                <th className="pb-3 px-3">Pergunta</th>
                <th className="pb-3 px-3 text-right">Usuários</th>
                <th className="pb-3 px-3 text-right">Completaram</th>
                <th className="pb-3 px-3 text-right">Abandonaram</th>
                <th className="pb-3 px-3 text-right">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {sortedByDropOff.map((question) => (
                <tr
                  key={question.nodeId}
                  className={`border-b border-slate-800 hover:bg-slate-800/50 transition ${
                    question.dropOffRate > 30 ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <div>
                      <p className="text-white font-medium">{question.nodeTitle}</p>
                      <p className="text-xs text-slate-500">{question.nodeId}</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {question.usersReached}
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {question.usersCompleted}
                  </td>
                  <td className="py-3 px-3 text-right text-red-400 font-semibold">
                    {question.dropOffCount}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition ${
                            question.dropOffRate > 30
                              ? 'bg-red-500'
                              : question.dropOffRate > 15
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${question.dropOffRate}%` }}
                        />
                      </div>
                      <span className="text-white font-semibold w-12 text-right">
                        {question.dropOffRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommendations */}
      {criticalQuestions.length > 0 && (
        <Card className="p-6 bg-slate-900 border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Recomendações</h3>
          <div className="space-y-3">
            {criticalQuestions.slice(0, 3).map((question) => (
              <div key={question.nodeId} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                <p className="text-sm font-semibold text-white mb-1">{question.nodeTitle}</p>
                <p className="text-xs text-slate-400">
                  {question.dropOffRate.toFixed(1)}% de abandono. Considere:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc list-inside">
                  <li>Simplificar a pergunta ou tornar a linguagem mais clara</li>
                  <li>Adicionar uma dica ou explicação (hint)</li>
                  <li>Verificar se há uma ramificação condicional problemática</li>
                  <li>A/B testar uma versão alternativa da pergunta</li>
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
