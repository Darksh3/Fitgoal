"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getPromptsList, initializeDefaultPrompts } from "@/app/actions/prompt"
import { PromptTemplate } from "@/lib/schemas/prompt"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Code2, AlertCircle } from "lucide-react"

function PromptStudioContent() {
  const router = useRouter()
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPrompts()
  }, [selectedCategory, selectedStatus])

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const result = await getPromptsList(selectedCategory || undefined, selectedStatus || undefined)
      if (result.success) {
        setPrompts(result.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching prompts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitialize = async () => {
    try {
      setInitializing(true)
      setError("")
      const result = await initializeDefaultPrompts()
      if (result.success) {
        await fetchPrompts()
      } else {
        setError(result.error || "Erro ao inicializar prompts")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setInitializing(false)
    }
  }

  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch = p.key.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const categories = ["workout", "diet", "funnel", "support", "segmentation", "followup"]
  const statuses = ["draft", "published", "archived"]

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      workout: "bg-blue-500/10 text-blue-400",
      diet: "bg-green-500/10 text-green-400",
      funnel: "bg-purple-500/10 text-purple-400",
      support: "bg-yellow-500/10 text-yellow-400",
      segmentation: "bg-pink-500/10 text-pink-400",
      followup: "bg-indigo-500/10 text-indigo-400",
    }
    return colors[category] || "bg-slate-700 text-slate-300"
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "text-yellow-400",
      published: "text-green-400",
      archived: "text-slate-500",
    }
    return colors[status] || "text-slate-400"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Prompt Studio</h1>
          <p className="text-slate-400">Central de gerenciamento de prompts de IA</p>
        </div>
        <div className="flex gap-2">
          {prompts.length === 0 && (
            <Button
              onClick={handleInitialize}
              disabled={initializing}
              className="bg-lime-600 hover:bg-lime-700"
            >
              {initializing ? "Inicializando..." : "+ Criar Prompts Padrões"}
            </Button>
          )}
          <Button onClick={() => router.push("/admin/prompt-studio/editor")} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Novo Prompt
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="bg-red-500/10 border-red-500 text-red-400 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por key ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Categoria</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedCategory === null ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedCategory === cat ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatus(null)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedStatus === null ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Todos
              </button>
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedStatus === status ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Prompts List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando prompts...</div>
      ) : filteredPrompts.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <Code2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Nenhum prompt encontrado</p>
          <Button onClick={() => router.push("/admin/prompt-studio/editor")}>Criar primeiro prompt</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrompts.map((prompt) => (
            <Card
              key={prompt.id}
              className="bg-slate-900 border-slate-800 p-4 hover:border-slate-700 cursor-pointer transition-colors"
              onClick={() => router.push(`/admin/prompt-studio/editor?id=${prompt.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{prompt.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(prompt.category)}`}>{prompt.category}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(prompt.status)}`}>{prompt.status}</span>
                  </div>
                  <p className="text-sm text-slate-400 font-mono">{prompt.key}</p>
                  {prompt.description && <p className="text-sm text-slate-300 mt-1">{prompt.description}</p>}
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>v{prompt.version}</p>
                  <p>{new Date(prompt.created_at.toDate()).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PromptStudioPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Carregando Prompt Studio...</div>}>
      <PromptStudioContent />
    </Suspense>
  )
}
