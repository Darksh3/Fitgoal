"use client"

import { useState, useEffect } from "react"
import { Search, Download, Plus, MoreVertical } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Lead {
  id: string
  email: string
  name?: string
  phone?: string
  stage?: string
  goal?: string
  experience?: string
  trainingDays?: string
  utm_source?: string
  utm_campaign?: string
  createdAt?: string
  tags?: string[]
  notes?: string
  hasPaid?: boolean
  imc?: number
  imcClassification?: string
  primaryGoals?: string[]
  bodyType?: string
  gender?: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState("all")
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/leads")
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error("[v0] Error fetching leads:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery)

    const matchesStage = selectedStage === "all" || lead.stage === selectedStage

    return matchesSearch && matchesStage
  })

  const stageLabels: Record<string, string> = {
    novo: "Novo",
    qualified: "Qualificado",
    contacted: "Contatado",
    proposta: "Proposta",
    cliente: "Cliente",
    perdido: "Perdido",
    quiz_completed: "Quiz Completo",
    payment_completed: "Pagou",
  }

  const stageBadgeColor = (stage?: string) => {
    const colors: Record<string, string> = {
      novo: "bg-blue-500/10 text-blue-400",
      qualified: "bg-purple-500/10 text-purple-400",
      contacted: "bg-yellow-500/10 text-yellow-400",
      proposta: "bg-orange-500/10 text-orange-400",
      cliente: "bg-green-500/10 text-green-400",
      perdido: "bg-red-500/10 text-red-400",
      quiz_completed: "bg-yellow-500/10 text-yellow-400",
      payment_completed: "bg-green-500/10 text-green-400",
    }
    return colors[stage || "novo"] || colors.novo
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)))
    }
  }

  const handleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLeads(newSelected)
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/export-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.size > 0 ? Array.from(selectedLeads) : filteredLeads.map((l) => l.id),
          hashed: false,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("[v0] Error exporting leads:", error)
    }
  }

  const stats = [
    {
      label: "Total de Leads",
      value: leads.length,
      color: "from-blue-600 to-blue-400",
    },
    {
      label: "Convertidos",
      value: leads.filter((l) => l.hasPaid).length,
      color: "from-green-600 to-green-400",
    },
    {
      label: "Em Progresso",
      value: leads.filter((l) => !l.hasPaid && l.stage === "qualified").length,
      color: "from-yellow-600 to-yellow-400",
    },
    {
      label: "Taxa de Conversão",
      value: `${leads.length > 0 ? Math.round((leads.filter((l) => l.hasPaid).length / leads.length) * 100) : 0}%`,
      color: "from-purple-600 to-purple-400",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
          <p className="text-slate-400">Gerenciar e analisar leads da campanha</p>
        </div>
        <Button className="bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
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
              placeholder="Buscar por email, nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
          >
            <option value="all">Todos os Estágios</option>
            {Object.entries(stageLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="border-b border-slate-800 bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-600"
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Estágio</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Objetivo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Campanha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Data</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Carregando leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="rounded border-slate-600"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{lead.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{lead.name || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stageBadgeColor(lead.stage)}`}>
                        {stageLabels[lead.stage as keyof typeof stageLabels] || "Novo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{lead.goal || lead.primaryGoals?.[0] || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{lead.utm_campaign || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {selectedLeads.size > 0 ? `${selectedLeads.size} selecionados` : `${filteredLeads.length} leads`}
          </p>
          <p className="text-sm text-slate-500">
            Total: {leads.length} leads
          </p>
        </div>
      </Card>
    </div>
  )
}
