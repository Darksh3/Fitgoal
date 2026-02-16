"use client"

import { useState } from "react"
import { QuizNode } from "@/lib/schemas/quiz"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface NodeEditorProps {
  node: QuizNode | null
  onSave: (updates: Partial<QuizNode>) => void
  onClose: () => void
}

/**
 * Edit individual node properties
 */
export function NodeEditor({ node, onSave, onClose }: NodeEditorProps) {
  const [formData, setFormData] = useState<Partial<QuizNode>>(
    node || {
      type: "question",
      title: "",
      key: "",
      orderIndex: 0,
      isActive: true,
    }
  )

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  if (!node) {
    return (
      <Card className="bg-slate-900 border-slate-800 p-6 text-center text-slate-400">
        Selecione um nó para editar
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Editar Nó</h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Node Type (read-only) */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Tipo</label>
        <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white capitalize">
          {node.type}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Título</label>
        <Input
          value={formData.title || ""}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Qual é seu objetivo?"
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Key (unique identifier) */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Chave (identificador único)</label>
        <Input
          value={formData.key || ""}
          onChange={(e) => setFormData({ ...formData, key: e.target.value })}
          placeholder="Ex: goal, gender, experience"
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Descrição</label>
        <textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do nó..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isActive ?? true}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm text-slate-400">Ativo</label>
      </div>

      {/* Save button */}
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white">
          Salvar
        </Button>
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancelar
        </Button>
      </div>
    </Card>
  )
}
