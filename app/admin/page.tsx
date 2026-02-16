"use client"

import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Users, Wallet, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

interface KPIMetric {
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<KPIMetric[]>([])

  useEffect(() => {
    // TODO: Fetch real KPIs from API
    const mockMetrics: KPIMetric[] = [
      {
        label: "Receita (7d)",
        value: "R$ 0",
        change: 0,
        icon: <Wallet className="w-5 h-5" />,
      },
      {
        label: "Conversão Funil",
        value: "0%",
        change: 0,
        icon: <TrendingUp className="w-5 h-5" />,
      },
      {
        label: "Leads Ativos",
        value: "0",
        change: 0,
        icon: <Users className="w-5 h-5" />,
      },
      {
        label: "Pagamentos Falhos",
        value: "0",
        change: 0,
        icon: <AlertCircle className="w-5 h-5" />,
      },
    ]

    setMetrics(mockMetrics)
    setLoading(false)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Visão geral dos KPIs e métricas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-lime-500/10 rounded-lg text-lime-400">
                {metric.icon}
              </div>
              {metric.change !== undefined && (
                <span className={`text-xs font-semibold ${metric.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {metric.change > 0 ? "+" : ""}{metric.change}%
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-white">{metric.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Conversão por Etapa</h2>
          <div className="h-64 flex items-center justify-center text-slate-500">
            Gráfico do funil (em breve)
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Receita por Campanha</h2>
          <div className="h-64 flex items-center justify-center text-slate-500">
            Gráfico de receita (em breve)
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Alertas</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Nenhum alerta crítico</p>
              <p className="text-xs text-slate-400">Seu admin está funcionando normalmente</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
