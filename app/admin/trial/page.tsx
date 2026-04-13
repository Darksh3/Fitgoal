"use client"

import { useState } from "react"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface LeadInfo {
  leadId: string | null
  userId?: string | null
  email: string
  name: string | null
  hasPaid: boolean
  hasTrialActivated: boolean
  expirationDate?: string | null
  quizData: Record<string, any>
}

interface ActivationResult {
  userId: string
  email: string
  name: string | null
  isNewUser: boolean
  tempPassword: string | null
  expirationDate: string
  plansGenerated: boolean
  plansError: string | null
}

export default function TrialPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [trialDays, setTrialDays] = useState("15")
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!email.trim()) return
    setLookupLoading(true)
    setLookupError(null)
    setLeadInfo(null)
    setActivationResult(null)
    setActivationError(null)
    try {
      const res = await fetch("/api/admin/activate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), action: "lookup" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLookupError(data.error || "Erro ao buscar lead")
      } else {
        setLeadInfo(data)
      }
    } catch {
      setLookupError("Erro de conexao")
    } finally {
      setLookupLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!leadInfo) return
    setLoading(true)
    setActivationError(null)
    setActivationResult(null)
    try {
      const safeDays = Number.isInteger(Number(trialDays)) && Number(trialDays) > 0 ? Number(trialDays) : 15
      const action = leadInfo.hasPaid || leadInfo.hasTrialActivated ? "extend" : "activate"
      const res = await fetch("/api/admin/activate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadInfo.email,
          action,
          userId: leadInfo.userId,
          days: safeDays,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActivationError(data.error || "Erro ao ativar trial")
      } else {
        setActivationResult(data)
      }
    } catch {
      setActivationError("Erro de conexao")
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!activationResult) return
    setEmailSending(true)
    setEmailError(null)
    try {
      const res = await fetch("/api/admin/activate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: activationResult.email,
          action: "send-email",
          userId: activationResult.userId,
          userName: activationResult.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error || "Erro ao enviar email")
      } else {
        setEmailSent(true)
      }
    } catch {
      setEmailError("Erro de conexao")
    } finally {
      setEmailSending(false)
    }
  }

  const quizLabels: Record<string, string> = {
    goal: "Objetivo",
    weight: "Peso atual (kg)",
    targetWeight: "Peso alvo (kg)",
    height: "Altura (cm)",
    age: "Idade",
    gender: "Genero",
    activityLevel: "Nivel de atividade",
    workoutTime: "Tempo de treino",
    workoutDays: "Dias de treino/semana",
    workoutLocation: "Local de treino",
    fitnessLevel: "Nivel fitness",
    dietaryRestrictions: "Restricoes alimentares",
  }

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button onClick={() => router.back()} className="bg-slate-700 hover:bg-slate-600 text-white">Voltar</Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Trial Gratuito</h1>
              <p className="text-slate-400 text-sm">Ative 15 dias de acesso para qualquer cliente</p>
            </div>
          </div>

          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-white font-semibold mb-4">Buscar Lead pelo Email</h2>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="email@exemplo.com"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
              <Button onClick={handleLookup} disabled={lookupLoading || !email.trim()} className="bg-lime-600 hover:bg-lime-500 text-white">
                {lookupLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {lookupError && <p className="mt-3 text-red-400 text-sm">{lookupError}</p>}
          </Card>

          {leadInfo && !activationResult && (
            <Card className="bg-slate-800 border-slate-700 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white font-semibold text-lg">{leadInfo.name || "Sem nome"}</h2>
                  <p className="text-slate-400 text-sm">{leadInfo.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {leadInfo.hasPaid && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Ja pagou</span>}
                  {leadInfo.hasTrialActivated && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Trial ja ativado</span>}
                </div>
              </div>

              {Object.keys(leadInfo.quizData).length > 0 && (
                <div>
                  <h3 className="text-slate-300 font-medium mb-3 text-sm uppercase tracking-wider">Dados do Quiz</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(leadInfo.quizData).map(([key, value]) => {
                      if (value === undefined || value === null) return null
                      return (
                        <div key={key} className="bg-slate-900 rounded-lg p-3">
                          <p className="text-slate-400 text-xs mb-1">{quizLabels[key] || key}</p>
                          <p className="text-white text-sm font-medium">{Array.isArray(value) ? value.join(", ") || "Nenhuma" : String(value)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {leadInfo.expirationDate && (
                <div className="bg-slate-900 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Expiração atual do usuário:</p>
                  <p className="text-white text-sm font-medium">{new Date(leadInfo.expirationDate).toLocaleDateString("pt-BR")}</p>
                </div>
              )}

              {(leadInfo.hasPaid || leadInfo.hasTrialActivated) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    {leadInfo.hasPaid ? "Este lead ja realizou um pagamento." : "Este lead ja teve um trial ativado anteriormente."}
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <input
                  type="number"
                  min={1}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
                  placeholder="Dias de acesso"
                />
                <Button onClick={handleActivate} disabled={loading} className="w-full bg-lime-600 hover:bg-lime-500 text-white font-semibold py-3">
                  {loading
                    ? "Processando..."
                    : leadInfo.hasPaid
                      ? `Conceder ${trialDays || 15} dias`
                      : leadInfo.hasTrialActivated
                        ? `Estender ${trialDays || 15} dias`
                        : `Ativar Trial de ${trialDays || 15} dias`}
                </Button>
              </div>

              {activationError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">Erro: {activationError}</p>
                </div>
              )}
            </Card>
          )}

          {activationResult && (
            <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
              <h2 className="text-green-400 font-semibold text-lg">Trial Ativado com Sucesso!</h2>

              <div className="bg-slate-900 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Email</span><span className="text-white text-sm">{activationResult.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">User ID</span><span className="text-white text-xs font-mono">{activationResult.userId}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Expira em</span><span className="text-white text-sm">{new Date(activationResult.expirationDate).toLocaleDateString("pt-BR")}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 text-sm">Planos gerados</span><span className={activationResult.plansGenerated ? "text-green-400 text-sm" : "text-yellow-400 text-sm"}>{activationResult.plansGenerated ? "Sim" : "Pendente"}</span></div>
              </div>

              <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-4">
                <p className="text-lime-400 text-sm font-semibold mb-1">Senha de acesso (padrão):</p>
                <div className="flex items-center justify-between bg-slate-900 rounded p-3">
                  <code className="text-white font-mono text-lg tracking-wider">{activationResult.tempPassword}</code>
                  <button onClick={() => navigator.clipboard.writeText(activationResult.tempPassword!)} className="text-slate-400 hover:text-white text-xs ml-4">Copiar</button>
                </div>
                <p className="text-slate-400 text-xs mt-2">Acesse a conta do cliente antes de enviar o email para verificar se está tudo certo.</p>
              </div>

              {activationResult.plansError && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">Planos não gerados automaticamente — gere manualmente na página do usuário.</p>
                </div>
              )}

              {/* Envio de email */}
              <div className="border border-slate-600 rounded-lg p-4 space-y-3">
                <p className="text-slate-300 text-sm font-medium">Depois de verificar a conta, envie o acesso para o cliente:</p>
                {emailSent ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-400 text-sm">✓ Email de acesso enviado com sucesso!</p>
                  </div>
                ) : (
                  <Button
                    onClick={handleSendEmail}
                    disabled={emailSending}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                  >
                    {emailSending ? "Enviando..." : "Enviar Email de Acesso"}
                  </Button>
                )}
                {emailError && <p className="text-red-400 text-sm">Erro: {emailError}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => router.push("/admin/users/" + activationResult.userId)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white">Ver Conta do Usuario</Button>
                <Button onClick={() => { setEmail(""); setLeadInfo(null); setActivationResult(null); setActivationError(null); setEmailSent(false); setEmailError(null) }} className="flex-1 bg-lime-600 hover:bg-lime-500 text-white">Ativar Outro</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </ProtectedAdminRoute>
  )
}
