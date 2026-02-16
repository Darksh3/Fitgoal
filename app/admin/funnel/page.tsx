"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, Users } from "lucide-react"

interface FunnelData {
  funnel: {
    total_leads: number
    quiz_started: number
    quiz_completed: number
    checkout_started: number
    payment_completed: number
  }
  conversions: {
    quiz_start_rate: string
    quiz_completion_rate: string
    checkout_rate: string
    payment_rate: string
  }
  campaigns: Array<{
    name: string
    total: number
    paid: number
    rate: string
  }>
}

export default function FunnelPage() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState("all")
  const [daysAgo, setDaysAgo] = useState("30")

  useEffect(() => {
    fetchFunnelData()
  }, [selectedCampaign, daysAgo])

  const fetchFunnelData = async () => {
    try {
      setLoading(true)
      const campaignParam = selectedCampaign === "all" ? "" : `campaign=${selectedCampaign}`
      const url = `/api/admin/funnel?daysAgo=${daysAgo}${campaignParam ? "&" + campaignParam : ""}`
      const response = await fetch(url)
      const data = await response.json()
      setFunnelData(data)
    } catch (error) {
      console.error("[v0] Error fetching funnel data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !funnelData) {
    return (
      <div className="p-6 text-center text-slate-400">
        Carregando dados do funil...
      </div>
    )
  }

  const funnelStages = [
    {
      label: "Leads Totais",
      count: funnelData.funnel.total_leads,
      conversion: "100%",
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: "Quiz Iniciado",
      count: funnelData.funnel.quiz_started,
      conversion: funnelData.conversions.quiz_start_rate + "%",
    },
    {
      label: "Quiz Completo",
      count: funnelData.funnel.quiz_completed,
      conversion: funnelData.conversions.quiz_completion_rate + "%",
    },
    {
      label: "Checkout Iniciado",
      count: funnelData.funnel.checkout_started,
      conversion: funnelData.conversions.checkout_rate + "%",
    },
    {
      label: "Pagamento Confirmado",
      count: funnelData.funnel.payment_completed,
      conversion: funnelData.conversions.payment_rate + "%",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Funil de Vendas</h1>
        <p className="text-slate-400">Análise de conversão por etapa</p>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Campanha</label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
            >
              <option value="all">Todas as campanhas</option>
              {funnelData.campaigns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name || "Direto"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Período</label>
            <select
              value={daysAgo}
              onChange={(e) => setDaysAgo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Funnel Visualization */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-lime-400" />
          Etapas do Funil
        </h2>

        <div className="space-y-4">
          {funnelStages.map((stage, idx) => {
            const maxCount = funnelStages[0].count || 1
            const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">{stage.label}</p>
                    <p className="text-sm text-slate-400">{stage.count} leads</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lime-400 font-bold text-lg">{stage.conversion}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-lime-500 to-lime-400 h-3 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Campaign Performance */}
      {funnelData.campaigns.length > 0 && (
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Performance por Campanha</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Campanha
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Leads</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Conversões</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Taxa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {funnelData.campaigns.map((campaign) => (
                  <tr key={campaign.name} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {campaign.name || "Direto"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{campaign.total}</td>
                    <td className="px-4 py-3 text-sm text-lime-400 font-semibold">{campaign.paid}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{campaign.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
