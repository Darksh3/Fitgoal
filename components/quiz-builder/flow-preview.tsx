'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuizNode, QuizEdge } from '@/lib/schemas/quiz'
import { evaluateCondition, getNextNode } from '@/lib/quiz-engine'
import { ChevronRight, RotateCcw, Play } from 'lucide-react'

interface FlowPreviewProps {
  nodes: QuizNode[]
  edges: QuizEdge[]
  onSimulationPath?: (path: string[]) => void
}

export function FlowPreview({ nodes, edges, onSimulationPath }: FlowPreviewProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(nodes[0]?.id || '')
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [path, setPath] = useState<string[]>([nodes[0]?.id || ''])
  const [isComplete, setIsComplete] = useState(false)

  const currentNode = nodes.find((n) => n.id === currentNodeId)

  const handleAnswer = (nodeId: string, answer: any) => {
    const newResponses = {
      ...responses,
      [currentNode?.key || currentNode?.id]: answer,
    }
    setResponses(newResponses)

    // Find next node based on edges
    const applicableEdges = edges.filter((e) => e.fromNodeId === currentNodeId)
    let nextNodeId: string | null = null

    // Check conditional edges
    for (const edge of applicableEdges.sort((a, b) => a.priority - b.priority)) {
      if (edge.isDefault) {
        nextNodeId = edge.toNodeId
      } else if (edge.conditionJson && evaluateCondition(edge.conditionJson, newResponses)) {
        nextNodeId = edge.toNodeId
        break
      }
    }

    if (nextNodeId) {
      setCurrentNodeId(nextNodeId)
      setPath([...path, nextNodeId])

      const nextNode = nodes.find((n) => n.id === nextNodeId)
      if (nextNode?.type === 'result') {
        setIsComplete(true)
        onSimulationPath?.([...path, nextNodeId])
      }
    }
  }

  const handleReset = () => {
    const firstNode = nodes[0]
    if (firstNode) {
      setCurrentNodeId(firstNode.id)
      setResponses({})
      setPath([firstNode.id])
      setIsComplete(false)
    }
  }

  if (!currentNode) {
    return (
      <Card className="p-4 bg-slate-800 border-slate-700 text-center text-slate-400">
        Nenhum nó encontrado
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-slate-800 border-slate-700 space-y-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">Simulador de Fluxo</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reiniciar
          </Button>
        </div>

        {/* Current node display */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Pergunta Atual</p>
            <h4 className="text-lg font-semibold text-white">{currentNode.title}</h4>
            <p className="text-sm text-slate-400 mt-1">{currentNode.description}</p>
          </div>

          {/* Question options for preview */}
          {currentNode.type === 'question' && (
            <div className="space-y-2 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500">Simular resposta:</p>
              <div className="flex flex-wrap gap-2">
                {['Opção A', 'Opção B', 'Opção C'].map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant="outline"
                    onClick={() => handleAnswer(currentNode.id, option)}
                    className="text-xs"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Page continuation */}
          {currentNode.type === 'page' && (
            <Button
              onClick={() => handleAnswer(currentNode.id, true)}
              className="w-full text-sm"
            >
              Continuar
            </Button>
          )}

          {/* Result node */}
          {currentNode.type === 'result' && (
            <div className="p-3 rounded bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-400 font-semibold">Quiz Completo!</p>
              <p className="text-xs text-slate-400 mt-1">
                Caminho: {path.length} etapas
              </p>
            </div>
          )}
        </div>

        {/* Path visualization */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Caminho percorrido:</p>
          <div className="flex flex-wrap gap-2">
            {path.map((nodeId, idx) => {
              const node = nodes.find((n) => n.id === nodeId)
              return (
                <React.Fragment key={nodeId}>
                  <div className="px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">
                    {node?.title || 'Node'}
                  </div>
                  {idx < path.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Responses log */}
        {Object.keys(responses).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Respostas capturadas:</p>
            <div className="bg-slate-900 rounded p-2 text-xs text-slate-300 font-mono space-y-1">
              {Object.entries(responses).map(([key, value]) => (
                <div key={key}>
                  <span className="text-slate-500">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
