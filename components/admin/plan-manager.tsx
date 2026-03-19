"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface PlanManagerProps {
    userId: string
}

export function AdminPlanManager({ userId }: PlanManagerProps) {
    const [plan, setPlan] = useState(null)
    const [daysToAdd, setDaysToAdd] = useState("")
    const [loading, setLoading] = useState(true)

  // Corrigido: useEffect ausente causava loading infinito e nunca carregava dados
  useEffect(() => {
        if (userId) {
                fetchPlan()
        }
  }, [userId])

  const fetchPlan = async () => {
        try {
                const res = await fetch(`/api/admin/user-plan?userId=${userId}`)
                const data = await res.json()
                setPlan(data)
        } catch (error) {
                console.error("[v0] Error fetching plan:", error)
        } finally {
                setLoading(false)
        }
  }

  const addDays = async () => {
        try {
                const res = await fetch("/api/admin/user-plan", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId, action: "add-days", daysToAdd: parseInt(daysToAdd) })
                })
                if (res.ok) {
                          fetchPlan()
                          setDaysToAdd("")
                }
        } catch (error) {
                console.error("[v0] Error adding days:", error)
        }
  }

  if (loading) return <div className="text-slate-300">Carregando plano...</div>div>
    
      return (
        <Card className="bg-slate-700 border-slate-600 p-6">
              <h3 className="text-white text-lg font-semibold mb-4">Gerenciar Plano</h3>h3>
              <div className="space-y-4">
                      <div>
                                <p className="text-slate-300">Tipo: {plan?.subscription || "Sem plano"}</p>p>
                                <p className="text-slate-300">Expira em: {plan?.expirationDate ? new Date(plan.expirationDate).toLocaleDateString("pt-BR") : "Sem data"}</p>p>
                                <p className={plan?.blocked ? "text-red-400" : "text-green-400"}>
                                            Status: {plan?.blocked ? "Bloqueado" : "Ativo"}
                                </p>p>
                      </div>div>
                      <div className="border-t border-slate-600 pt-4">
                                <label className="block text-sm text-slate-300 mb-2">Adicionar dias extras</label>label>
                                <div className="flex gap-2">
                                            <Input
                                                            type="number"
                                                            value={daysToAdd}
                                                            onChange={(e) => setDaysToAdd(e.target.value)}
                                                            placeholder="Número de dias"
                                                            className="bg-slate-800 border-slate-600 text-white"
                                                          />
                                            <Button
                                                            onClick={addDays}
                                                            className="bg-green-600 hover:bg-green-700"
                                                            disabled={!daysToAdd}
                                                          >
                                                          Adicionar
                                            </Button>Button>
                                </div>div>
                      </div>div>
              </div>div>
        </Card>Card>
      )
}</div>
