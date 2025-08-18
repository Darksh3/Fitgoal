"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Lead {
  id: string
  email: string
  name: string
  status: string
  hasPaid: boolean
  createdAt: string
  quizData: any
  imc: number
  imcClassification: string
  primaryGoals: string[]
  bodyType: string
  experience: string
  gender: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: "quiz_completed",
    daysAgo: "30",
    limit: "100",
  })

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filter)
      const response = await fetch(`/api/get-leads?${params}`)
      const data = await response.json()

      if (data.success) {
        setLeads(data.leads)
      } else {
        console.error("Erro ao buscar leads:", data.error)
      }
    } catch (error) {
      console.error("Erro ao buscar leads:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [filter])

  const getStatusColor = (status: string, hasPaid: boolean) => {
    if (hasPaid) return "bg-green-500"
    if (status === "quiz_completed") return "bg-yellow-500"
    return "bg-gray-500"
  }

  const getStatusText = (status: string, hasPaid: boolean) => {
    if (hasPaid) return "Pagou"
    if (status === "quiz_completed") return "Quiz Completo"
    return status
  }

  const exportToCSV = () => {
    const csvContent = [
      // Header
      "Nome,Email,Status,Pagou,Data,IMC,Classificação IMC,Objetivos,Tipo Corpo,Experiência,Gênero",
      // Data
      ...leads.map((lead) =>
        [
          lead.name,
          lead.email,
          lead.status,
          lead.hasPaid ? "Sim" : "Não",
          new Date(lead.createdAt).toLocaleDateString("pt-BR"),
          lead.imc,
          lead.imcClassification,
          lead.primaryGoals?.join("; ") || "",
          lead.bodyType,
          lead.experience,
          lead.gender,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `leads_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leads para Remarketing</h1>
          <Button onClick={exportToCSV} disabled={leads.length === 0}>
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz_completed">Quiz Completo</SelectItem>
                    <SelectItem value="payment_completed">Pagamento Completo</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Últimos dias</label>
                <Select value={filter.daysAgo} onValueChange={(value) => setFilter({ ...filter, daysAgo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Limite</label>
                <Select value={filter.limit} onValueChange={(value) => setFilter({ ...filter, limit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{leads.length}</div>
              <p className="text-gray-600">Total de Leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{leads.filter((lead) => lead.hasPaid).length}</div>
              <p className="text-gray-600">Converteram</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">{leads.filter((lead) => !lead.hasPaid).length}</div>
              <p className="text-gray-600">Não Converteram</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {leads.length > 0 ? Math.round((leads.filter((lead) => lead.hasPaid).length / leads.length) * 100) : 0}%
              </div>
              <p className="text-gray-600">Taxa de Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum lead encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">IMC</th>
                      <th className="text-left p-2">Objetivos</th>
                      <th className="text-left p-2">Tipo Corpo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{lead.name}</td>
                        <td className="p-2">{lead.email}</td>
                        <td className="p-2">
                          <Badge className={getStatusColor(lead.status, lead.hasPaid)}>
                            {getStatusText(lead.status, lead.hasPaid)}
                          </Badge>
                        </td>
                        <td className="p-2">{new Date(lead.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td className="p-2">
                          {lead.imc} ({lead.imcClassification})
                        </td>
                        <td className="p-2">
                          {lead.primaryGoals?.slice(0, 2).join(", ")}
                          {lead.primaryGoals?.length > 2 && "..."}
                        </td>
                        <td className="p-2 capitalize">{lead.bodyType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
