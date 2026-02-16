"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { QuizNode } from "@/lib/schemas/quiz"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GripVertical, Trash2, Copy, Eye } from "lucide-react"

interface NodesListProps {
  nodes: QuizNode[]
  onReorder: (nodes: QuizNode[]) => void
  onSelect: (node: QuizNode) => void
  onDelete: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  selectedNodeId?: string
}

/**
 * Sortable node item component
 */
function SortableNodeItem({
  node,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  node: QuizNode
  isSelected: boolean
  onSelect: (node: QuizNode) => void
  onDelete: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const typeColors: Record<string, string> = {
    question: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    page: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    action: "bg-green-500/10 text-green-400 border-green-500/30",
    result: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`p-4 mb-2 cursor-grab active:cursor-grabbing border transition-all ${
          isSelected ? "border-lime-500 bg-slate-900/80" : "border-slate-700 hover:border-slate-600"
        } ${isDragging ? "opacity-50" : ""}`}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="text-slate-500 hover:text-slate-300">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Node Info */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => onSelect(node)}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded border ${typeColors[node.type] || "bg-slate-700"}`}>
                {node.type}
              </span>
              <span className="font-medium text-white">{node.title}</span>
              {node.key && <span className="text-xs text-slate-500">(key: {node.key})</span>}
            </div>
            {node.description && <p className="text-sm text-slate-400 mt-1">{node.description}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelect(node)}
              className="text-slate-400 hover:text-white"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicate(node.id)}
              className="text-slate-400 hover:text-white"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(node.id)}
              className="text-slate-400 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Reorderable nodes list with drag-and-drop
 */
export function NodesList({
  nodes,
  onReorder,
  onSelect,
  onDelete,
  onDuplicate,
  selectedNodeId,
}: NodesListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = nodes.findIndex((n) => n.id === active.id)
      const newIndex = nodes.findIndex((n) => n.id === over.id)

      const reorderedNodes = arrayMove(nodes, oldIndex, newIndex).map((node, idx) => ({
        ...node,
        orderIndex: idx,
      }))

      onReorder(reorderedNodes)
    }

    setActiveId(null)
  }

  if (nodes.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 p-8 text-center">
        <p className="text-slate-400">Nenhuma pergunta criada ainda. Clique em "Adicionar Pergunta" para começar.</p>
      </Card>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={(event) => setActiveId(event.active.id as string)}
    >
      <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {nodes.map((node) => (
            <SortableNodeItem
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
