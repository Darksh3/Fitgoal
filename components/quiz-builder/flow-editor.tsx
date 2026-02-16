'use client'

import React, { useCallback, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { QuizNode, QuizEdge } from '@/lib/schemas/quiz'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { QuestionNodeComponent } from './flow-nodes/question-node'
import { PageNodeComponent } from './flow-nodes/page-node'
import { ResultNodeComponent } from './flow-nodes/result-node'

interface FlowEditorProps {
  nodes: QuizNode[]
  edges: QuizEdge[]
  onNodesChange: (nodes: QuizNode[]) => void
  onEdgesChange: (edges: QuizEdge[]) => void
  onSelectNode: (nodeId: string) => void
}

const nodeTypes: NodeTypes = {
  question: QuestionNodeComponent,
  page: PageNodeComponent,
  result: ResultNodeComponent,
}

export function FlowEditor({
  nodes: quizNodes,
  edges: quizEdges,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
}: FlowEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Convert quiz nodes to React Flow nodes
  const flowNodes: Node[] = quizNodes.map((node, index) => ({
    id: node.id,
    data: {
      label: node.title,
      nodeType: node.type,
      isActive: node.isActive,
      onClick: () => {
        setSelectedNodeId(node.id)
        onSelectNode(node.id)
      },
    },
    position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 250 },
    type: node.type,
  }))

  // Convert quiz edges to React Flow edges
  const flowEdges: Edge[] = quizEdges.map((edge) => ({
    id: edge.id,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    label: edge.isDefault ? 'Default' : edge.conditionJson?.field || 'Conditional',
    data: {
      condition: edge.conditionJson,
      isDefault: edge.isDefault,
    },
  }))

  const [reactFlowNodes, setReactFlowNodes, onNodesChangeReactFlow] = useNodesState(flowNodes)
  const [reactFlowEdges, setReactFlowEdges, onEdgesChangeReactFlow] = useEdgesState(flowEdges)

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: QuizEdge = {
        id: `edge-${connection.source}-${connection.target}`,
        versionId: '', // Will be set by parent
        fromNodeId: connection.source!,
        toNodeId: connection.target!,
        conditionJson: null,
        priority: quizEdges.length,
        isDefault: false,
      }

      onEdgesChange([...quizEdges, newEdge])
      setReactFlowEdges((eds) => addEdge(connection, eds))
    },
    [quizEdges, onEdgesChange, setReactFlowEdges]
  )

  const handleDeleteNode = (nodeId: string) => {
    onNodesChange(quizNodes.filter((n) => n.id !== nodeId))
    // Also remove edges connected to this node
    onEdgesChange(
      quizEdges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId)
    )
  }

  return (
    <div className="w-full h-[600px] border border-slate-700 rounded-lg bg-slate-900 relative">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChangeReactFlow}
        onEdgesChange={onEdgesChangeReactFlow}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Floating toolbar */}
      <div className="absolute bottom-4 left-4 flex gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (selectedNodeId) handleDeleteNode(selectedNodeId)
          }}
          disabled={!selectedNodeId}
          title="Delete selected node"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
