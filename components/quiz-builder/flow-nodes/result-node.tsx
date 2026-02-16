'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { CheckCircle } from 'lucide-react'

export function ResultNodeComponent({ data }: any) {
  return (
    <div className="px-4 py-2 shadow-md rounded-lg bg-green-500 border-2 border-green-600 text-white w-48">
      <div className="flex items-center gap-2 font-semibold text-sm mb-1">
        <CheckCircle className="w-4 h-4" />
        <span>{data.label || 'Result'}</span>
      </div>
      <p className="text-xs opacity-75">Resultado final</p>
      <Handle type="target" position={Position.Top} />
    </div>
  )
}
