"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Check, Archive, Mail, User, Calendar } from "lucide-react"

interface Feedback {
  id: string
  userId: string
  email: string
  userName: string
  feedbackText: string
  status: "new" | "read" | "archived"
  createdAt: any
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [filter, setFilter] = useState<"all" | "new" | "read" | "archived">("all")
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Check if admin
        setUser(currentUser)
        fetchFeedbacks()
      } else {
        router.push("/auth")
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchFeedbacks = async () => {
    try {
      console.log("[v0] ADMIN_FEEDBACK - Buscando feedback")
      const response = await fetch("/api/admin/get-feedback")
      if (response.ok) {
        const data = await response.json()
        setFeedbacks(data)
      }
    } catch (error) {
      console.error("[v0] ADMIN_FEEDBACK - Erro ao buscar:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/admin/update-feedback-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, status: newStatus }),
      })

      if (response.ok) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === feedbackId ? { ...f, status: newStatus as any } : f))
        )
      }
    } catch (error) {
      console.error("[v0] ADMIN_FEEDBACK - Erro ao atualizar:", error)
    }
  }

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm("Tem certeza que deseja deletar este feedback?")) return

    setDeleting(feedbackId)
    try {
      const response = await fetch("/api/admin/delete-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId }),
      })

      if (response.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId))
      }
    } catch (error) {
      console.error("[v0] ADMIN_FEEDBACK - Erro ao deletar:", error)
    } finally {
      setDeleting(null)
    }
  }

  const filteredFeedbacks =
    filter === "all" ? feedbacks : feedbacks.filter((f) => f.status === filter)

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    read: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando feedback...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Feedback dos Usuários</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gerenciar sugestões e recomendações dos clientes
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "new", "read", "archived"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === status
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {status === "all" && `Todos (${feedbacks.length})`}
            {status === "new" && `Novos (${feedbacks.filter((f) => f.status === "new").length})`}
            {status === "read" && `Lidos (${feedbacks.filter((f) => f.status === "read").length})`}
            {status === "archived" && `Arquivados (${feedbacks.filter((f) => f.status === "archived").length})`}
          </button>
        ))}
      </div>

      {/* Feedbacks List */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Nenhum feedback encontrado</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{feedback.userName}</h3>
                    <Badge className={statusColors[feedback.status]}>
                      {feedback.status === "new" && "Novo"}
                      {feedback.status === "read" && "Lido"}
                      {feedback.status === "archived" && "Arquivado"}
                    </Badge>
                  </div>

                  {/* User Info */}
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${feedback.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                        {feedback.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>ID: {feedback.userId}</span>
                    </div>
                    {feedback.createdAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(feedback.createdAt.seconds * 1000).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback Text */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{feedback.feedbackText}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {feedback.status !== "read" && (
                  <button
                    onClick={() => updateStatus(feedback.id, "read")}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Marcar como Lido
                  </button>
                )}
                {feedback.status !== "archived" && (
                  <button
                    onClick={() => updateStatus(feedback.id, "archived")}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Archive className="h-4 w-4" />
                    Arquivar
                  </button>
                )}
                <button
                  onClick={() => deleteFeedback(feedback.id)}
                  disabled={deleting === feedback.id}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting === feedback.id ? "Deletando..." : "Deletar"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
