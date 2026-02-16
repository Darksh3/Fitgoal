'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { FileText } from 'lucide-react'

export function PageNodeComponent({ data }: any) {
  return (
    <div className="px-4 py-2 shadow-md rounded-lg bg-purple-500 border-2 border-purple-600 text-white w-48">
      <div className="flex items-center gap-2 font-semibold text-sm mb-1">
        <FileText className="w-4 h-4" />
        <span>{data.label || 'Page'}</span>
      </div>
      <p className="text-xs opacity-75">Página</p>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
