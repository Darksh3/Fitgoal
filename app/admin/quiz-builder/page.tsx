"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { QuizVersion, QuizNode, QuizEdge } from "@/lib/schemas/quiz"
import { getQuizForEditing, addNodeToQuiz, updateNodeInQuiz, publishQuiz, createQuiz } from "@/app/actions/quiz"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NodesList } from "@/components/quiz-builder/nodes-list"
import { NodeEditor } from "@/components/quiz-builder/node-editor"
import { AlertCircle, Plus, Zap } from "lucide-react"

function QuizBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const versionId = searchParams.get("version")

  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState<QuizVersion | null>(null)
  const [nodes, setNodes] = useState<QuizNode[]>([])
  const [edges, setEdges] = useState<QuizEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<QuizNode | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newQuizName, setNewQuizName] = useState("")

  // Load quiz version
  useEffect(() => {
    if (!versionId) {
      // Se não tem versionId, mostra opção de criar novo
      setLoading(false)
      return
    }

    loadQuiz()
  }, [versionId])

  const loadQuiz = async () => {
    try {
      setLoading(true)
      const result = await getQuizForEditing(versionId!)

      if (!result.success) {
        setError(result.error)
        return
      }

      setVersion(result.data.version)
      setNodes(result.data.nodes)
      setEdges(result.data.edges)
    } catch (err) {
      console.error("[v0] Error loading quiz:", err)
      setError("Erro ao carregar quiz")
    } finally {
      setLoading(false)
    }
  }

  const handleAddNode = async (type: "question" | "page" | "result") => {
    const newNode: Omit<QuizNode, "id"> = {
      type,
      title: `Novo ${type === "question" ? "pergunta" : type === "page" ? "página" : "resultado"}`,
      key: `${type}_${Date.now()}`,
      description: "",
      orderIndex: nodes.length,
      isActive: true,
      configJson: type === "question" ? { options: [] } : {},
    }

    const result = await addNodeToQuiz(versionId!, newNode)

    if (result.success) {
      setNodes([...nodes, result.data])
      setSelectedNode(result.data)
    } else {
      setError(result.error)
    }
  }

  const handleUpdateNode = async (updates: Partial<QuizNode>) => {
    if (!selectedNode) return

    const result = await updateNodeInQuiz(versionId!, selectedNode.id, updates)

    if (result.success) {
      const updatedNodes = nodes.map((n) => (n.id === selectedNode.id ? { ...n, ...updates } : n))
      setNodes(updatedNodes)
      setSelectedNode({ ...selectedNode, ...updates })
    } else {
      setError(result.error)
    }
  }

  const handleReorderNodes = (reorderedNodes: QuizNode[]) => {
    setNodes(reorderedNodes)
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }

  const handleDuplicateNode = (nodeId: string) => {
    const nodeToDuplicate = nodes.find((n) => n.id === nodeId)
    if (!nodeToDuplicate) return

    const duplicate: Omit<QuizNode, "id"> = {
      ...nodeToDuplicate,
      key: `${nodeToDuplicate.key}_copy_${Date.now()}`,
      title: `${nodeToDuplicate.title} (cópia)`,
    }

    addNodeToQuiz(versionId!, duplicate)
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)
      const result = await publishQuiz(versionId!)

      if (result.success) {
        alert("Quiz publicado com sucesso!")
        router.push("/admin/quiz-builder")
      } else {
        setError(result.error)
      }
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400">
        Carregando quiz...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{version?.name}</h1>
          <p className="text-slate-400">Editando versão {versionId?.slice(0, 8)}...</p>
        </div>
        <Button
          onClick={handlePublish}
          disabled={publishing}
          className="bg-lime-600 hover:bg-lime-700 text-white flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {publishing ? "Publicando..." : "Publicar"}
        </Button>
      </div>

      {/* Errors */}
      {error && (
        <Card className="bg-red-500/10 border-red-500 text-red-400 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </Card>
      )}

      {/* Create New Quiz Form */}
      {!versionId && !version && (
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h2 className="text-white font-semibold mb-4">Criar Novo Quiz</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do quiz (ex: Quiz Principal)"
              value={newQuizName}
              onChange={(e) => setNewQuizName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500"
            />
            <Button
              onClick={async () => {
                if (!newQuizName.trim()) return
                const result = await createQuiz(newQuizName)
                if (result.success) {
                  router.push(`/admin/quiz-builder?version=${result.data.id}`)
                  setNewQuizName("")
                } else {
                  setError(result.error || "Erro ao criar quiz")
                }
              }}
              className="bg-lime-600 hover:bg-lime-700"
            >
              Criar
            </Button>
          </div>
        </Card>
      )}

      {/* Errors */}
      {error && (
        <Card className="bg-red-500/10 border-red-500 text-red-400 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </Card>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Nodes list */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex gap-2">
            <Button onClick={() => handleAddNode("question")} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pergunta
            </Button>
            <Button onClick={() => handleAddNode("page")} className="flex-1 bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Página Extra
            </Button>
            <Button onClick={() => handleAddNode("result")} className="flex-1 bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Resultado
            </Button>
          </div>

          <NodesList
            nodes={nodes}
            onReorder={handleReorderNodes}
            onSelect={setSelectedNode}
            onDelete={handleDeleteNode}
            onDuplicate={handleDuplicateNode}
            selectedNodeId={selectedNode?.id}
          />
        </div>

        {/* Right: Node editor */}
        <div>
          <NodeEditor node={selectedNode} onSave={handleUpdateNode} onClose={() => setSelectedNode(null)} />
        </div>
      </div>

      {/* Stats */}
      <Card className="bg-slate-900 border-slate-800 p-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-slate-400 text-sm">Total de Nós</p>
          <p className="text-2xl font-bold text-white">{nodes.length}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Perguntas</p>
          <p className="text-2xl font-bold text-white">{nodes.filter((n) => n.type === "question").length}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Status</p>
          <p className="text-lg font-bold text-yellow-400 capitalize">{version?.status}</p>
        </div>
      </Card>
    </div>
  )
}

export default function QuizBuilderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Carregando Quiz Builder...</div>}>
      <QuizBuilderContent />
    </Suspense>
  )
}
