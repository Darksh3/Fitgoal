'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuizNode, QuizEdge } from '@/lib/schemas/quiz'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

interface RuleBuilderProps {
  edge: QuizEdge
  nodes: QuizNode[]
  onSave: (condition: any) => void
  onCancel: () => void
}

export function RuleBuilder({ edge, nodes, onSave, onCancel }: RuleBuilderProps) {
  const [condition, setCondition] = useState<any>(edge.conditionJson || {})
  const [operator, setOperator] = useState(condition.operator || 'equals')
  const [field, setField] = useState(condition.field || '')
  const [value, setValue] = useState(condition.value || '')

  // Get available fields from source node
  const sourceNode = nodes.find((n) => n.id === edge.fromNodeId)
  const availableFields = sourceNode ? getFieldsFromNode(sourceNode) : []

  function getFieldsFromNode(node: QuizNode): string[] {
    if (node.type === 'question') {
      return [node.key]
    }
    return []
  }

  const handleSave = () => {
    const newCondition = {
      field,
      operator,
      value,
    }
    onSave(newCondition)
  }

  return (
    <Card className="p-4 bg-slate-800 border-slate-700 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Editar Condição</h3>
        
        {/* Field selector */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 mb-1 block">Campo</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="w-full px-2 py-1 rounded text-sm bg-slate-700 text-white border border-slate-600"
          >
            <option value="">Selecione um campo</option>
            {availableFields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Operator selector */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 mb-1 block">Operador</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-full px-2 py-1 rounded text-sm bg-slate-700 text-white border border-slate-600"
          >
            <option value="equals">Equals</option>
            <option value="not_equals">Not Equals</option>
            <option value="contains">Contains</option>
            <option value="greater_than">Greater Than</option>
            <option value="less_than">Less Than</option>
            <option value="in_list">In List</option>
            <option value="includes">Includes</option>
          </select>
        </div>

        {/* Value input */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1 block">Valor</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite o valor"
            className="w-full px-2 py-1 rounded text-sm bg-slate-700 text-white border border-slate-600 placeholder-slate-500"
          />
        </div>

        {/* Preview */}
        <div className="p-2 bg-slate-900 rounded text-xs text-slate-400 mb-4 border border-slate-700">
          <p>if {field} {operator} {value}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          className="flex-1"
        >
          Salvar Condição
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </Card>
  )
}
