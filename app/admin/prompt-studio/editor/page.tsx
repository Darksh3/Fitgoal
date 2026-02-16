"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getPromptForEditing, savePromptDraft, publishPrompt, createFixture, getPromptUsageMetrics } from "@/app/actions/prompt"
import { PromptEditorWithPreview } from "@/components/prompt-editor/monaco-editor"
import { TestRunner } from "@/components/prompt-editor/test-runner"
import { PublishWorkflow } from "@/components/prompt-editor/publish-workflow"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Save, Eye, Zap } from "lucide-react"

function PromptEditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const promptId = searchParams.get("id")

  const [prompt, setPrompt] = useState<any>(null)
  const [loading, setLoading] = useState(!!promptId)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [key, setKey] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("support")
  const [template, setTemplate] = useState("")
  const [description, setDescription] = useState("")

  const [activeTab, setActiveTab] = useState<"edit" | "test" | "publish">("edit")

  useEffect(() => {
    if (promptId) {
      loadPrompt()
    }
  }, [promptId])

  const loadPrompt = async () => {
    try {
      const result = await getPromptForEditing(promptId!)
      if (result.success) {
        const { template: t } = result.data
        setPrompt(t)
        setKey(t.key)
        setName(t.name)
        setCategory(t.category)
        setTemplate(t.template_text)
        setDescription(t.description || "")
      }
    } catch (error) {
      console.error("[v0] Error loading prompt:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!key || !template) {
      alert("Key e Template são obrigatórios")
      return
    }

    setSaving(true)
    try {
      const result = await savePromptDraft(
        promptId || null,
        {
          key,
          name: name || key,
          category: category as any,
          template_text: template,
          description,
        },
        "user-id" // Replace with actual user ID from auth
      )

      if (result.success) {
        if (!promptId) {
          router.push(`/admin/prompt-studio/editor?id=${result.data.id}`)
        }
        alert("Prompt salvo com sucesso!")
      }
    } catch (error) {
      alert("Erro ao salvar prompt")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!promptId) {
      alert("Salve o prompt antes de publicar")
      return
    }

    setPublishing(true)
    try {
      const result = await publishPrompt(promptId, "user-id")
      if (result.success) {
        alert("Prompt publicado com sucesso!")
        setPrompt(result.data)
      }
    } catch (error) {
      alert("Erro ao publicar prompt")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {promptId ? "Editar Prompt" : "Novo Prompt"}
          </h1>
          <p className="text-slate-400">Editor central de prompts de IA</p>
        </div>
        <Button onClick={() => router.push("/admin/prompt-studio")} variant="outline">
          Voltar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : (
        <>
          {/* Basic Info */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Informações Básicas</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Key (identificador único)</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="ex: plan.workout.generate"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                  disabled={!!promptId}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome descritivo"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-slate-600"
                >
                  <option value="workout">Workout</option>
                  <option value="diet">Diet</option>
                  <option value="funnel">Funnel</option>
                  <option value="support">Support</option>
                  <option value="segmentation">Segmentation</option>
                  <option value="followup">Followup</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste prompt"
                className="w-full h-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 resize-none"
              />
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-800">
            {(["edit", "test", "publish"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? "text-white border-b-2 border-blue-500"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab === "edit" && "Editor"}
                {tab === "test" && "Teste"}
                {tab === "publish" && "Publicar"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            {activeTab === "edit" && (
              <div className="space-y-4">
                <PromptEditorWithPreview value={template} onChange={setTemplate} />
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Salvando..." : "Salvar Rascunho"}
                </Button>
              </div>
            )}

            {activeTab === "test" && promptId && (
              <TestRunner
                promptKey={key}
                fixtures={prompt?.fixtures || []}
                onRunTest={async (fixtureId) => {
                  // Mock test result
                  return {
                    success: true,
                    output: "Generated workout plan for user...",
                    model: "gpt-4-turbo",
                    tokens: 150,
                    latency_ms: 1200,
                    cost: 0.0045,
                  }
                }}
                onCreateFixture={async (fixture) => {
                  const result = await createFixture(key, fixture, "user-id")
                  if (result.success) {
                    loadPrompt()
                  }
                }}
              />
            )}

            {activeTab === "publish" && promptId && (
              <PublishWorkflow
                promptId={promptId}
                promptKey={key}
                currentStatus={prompt?.status || "draft"}
                currentVersion={prompt?.version || 1}
                auditLogs={prompt?.auditLogs || []}
                onPublish={handlePublish}
                onRollback={async () => {
                  alert("Rollback não implementado")
                }}
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default function PromptEditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Carregando editor...</div>}>
      <PromptEditorContent />
    </Suspense>
  )
}
