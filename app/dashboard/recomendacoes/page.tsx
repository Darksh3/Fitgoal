"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Send, CheckCircle, AlertCircle } from "lucide-react"

export default function RecomendacoesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setLoading(false)
      } else {
        setLoading(false)
        router.push("/auth")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) {
      setError("Por favor, escreva sua sugestão antes de enviar")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          feedbackText: feedback,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao enviar sugestão")
      }

      setSubmitted(true)
      setFeedback("")
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    } catch (error: any) {
      setError(error.message || "Erro ao enviar sugestão")
      console.error("[v0] RECOMENDACOES - Erro:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Recomendações e Sugestões</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sua opinião é muito importante! Nos ajude a melhorar o FitGoal com suas sugestões
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Sua Sugestão ou Recomendação
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Conte-nos o que você gostaria de melhorar ou qual nova funcionalidade gostaria de ver no FitGoal..."
              className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {feedback.length}/1000 caracteres
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {submitted && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">Obrigado! Sua sugestão foi enviada com sucesso.</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !feedback.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Enviar Sugestão
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Como suas sugestões nos ajudam</h3>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>✓ Todas as sugestões são lidas pela nossa equipe de desenvolvimento</li>
          <li>✓ Você pode compartilhar ideias de novas funcionalidades</li>
          <li>✓ Reportar problemas ou melhorias de usabilidade</li>
          <li>✓ Sugerir conteúdo ou recursos que gostaria de ver</li>
          <li>✓ Suas sugestões podem influenciar o futuro do FitGoal!</li>
        </ul>
      </div>
    </div>
  )
}
