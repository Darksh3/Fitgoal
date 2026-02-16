"use client"

import { useState, useEffect } from "react"
import { Search, Eye, AlertCircle, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Plan {
  id: string
  userId: string
  userEmail?: string
  userName?: string
  type: "diet" | "workout" | "complete"
  createdAt: string
  updatedAt?: string
  adminStatus?: "good" | "bad" | "review"
  adminNotes?: string
  weekDays?: number
  calorias?: number
  macros?: {
    proteina: number
    carboidratos: number
    gordura: number
  }
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/plans?limit=500")
      const data = await response.json()
      setPlans(data.plans || [])
    } catch (error) {
      console.error("[v0] Error fetching plans:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      !searchQuery ||
      plan.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.userName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || plan.adminStatus === statusFilter
    const matchesType = typeFilter === "all" || plan.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const stats = [
    {
      label: "Total de Planos",
      value: plans.length,
    },
    {
      label: "Bons",
      value: plans.filter((p) => p.adminStatus === "good").length,
    },
    {
      label: "Para Revisar",
      value: plans.filter((p) => !p.adminStatus || p.adminStatus === "review").length,
    },
    {
      label: "Ruim",
      value: plans.filter((p) => p.adminStatus === "bad").length,
    },
  ]

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "good":
        return "bg-green-500/10 text-green-400 border-green-500"
      case "bad":
        return "bg-red-500/10 text-red-400 border-red-500"
      case "review":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500"
      default:
        return "bg-slate-700/50 text-slate-400 border-slate-600"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Planos</h1>
        <p className="text-slate-400">Gerenciar planos de treino e dieta gerados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
          >
            <option value="all">Todos os Tipos</option>
            <option value="diet">Dieta</option>
            <option value="workout">Treino</option>
            <option value="complete">Completo</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="good">Bom</option>
            <option value="review">Para Revisar</option>
            <option value="bad">Ruim</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Tipo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Dias</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Data</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Carregando planos...
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Nenhum plano encontrado
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{plan.userEmail || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      <span className="capitalize px-2 py-1 rounded bg-slate-800">
                        {plan.type === "diet" ? "Dieta" : plan.type === "workout" ? "Treino" : "Completo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusBadge(plan.adminStatus)}`}>
                        {plan.adminStatus === "good"
                          ? "Bom"
                          : plan.adminStatus === "bad"
                            ? "Ruim"
                            : plan.adminStatus === "review"
                              ? "Revisar"
                              : "Novo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{plan.weekDays || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(plan.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        onClick={() => {
                          setSelectedPlan(plan)
                          setShowDetails(true)
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">{filteredPlans.length} planos exibidos</p>
          <p className="text-sm text-slate-500">Total: {plans.length} planos</p>
        </div>
      </Card>

      {/* Plan Details Modal */}
      {showDetails && selectedPlan && (
        <Card className="bg-slate-900 border-slate-800 p-6 fixed inset-4 z-50 overflow-auto max-h-screen">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Detalhes do Plano</h2>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm">Email do Usuário</p>
              <p className="text-white font-medium">{selectedPlan.userEmail}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Tipo de Plano</p>
              <p className="text-white font-medium capitalize">
                {selectedPlan.type === "diet" ? "Dieta" : selectedPlan.type === "workout" ? "Treino" : "Completo"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Status Atual</p>
              <p className="text-white font-medium">{selectedPlan.adminStatus || "Novo"}</p>
            </div>
            {selectedPlan.calorias && (
              <div>
                <p className="text-slate-400 text-sm">Calorias</p>
                <p className="text-white font-medium">{selectedPlan.calorias} kcal/dia</p>
              </div>
            )}
            {selectedPlan.adminNotes && (
              <div>
                <p className="text-slate-400 text-sm">Notas do Admin</p>
                <p className="text-white font-medium">{selectedPlan.adminNotes}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => setShowDetails(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Fechar
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
