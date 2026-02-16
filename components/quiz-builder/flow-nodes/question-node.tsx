'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { HelpCircle } from 'lucide-react'

export function QuestionNodeComponent({ data }: any) {
  return (
    <div className="px-4 py-2 shadow-md rounded-lg bg-blue-500 border-2 border-blue-600 text-white w-48">
      <div className="flex items-center gap-2 font-semibold text-sm mb-1">
        <HelpCircle className="w-4 h-4" />
        <span>{data.label || 'Question'}</span>
      </div>
      <p className="text-xs opacity-75">Pergunta</p>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
