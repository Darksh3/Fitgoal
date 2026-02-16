"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function FunnelPage() {
  const funnelStages = [
    { stage: "Leads", count: 0, conversion: "100%" },
    { stage: "Quiz Iniciado", count: 0, conversion: "0%" },
    { stage: "Quiz Completo", count: 0, conversion: "0%" },
    { stage: "Checkout", count: 0, conversion: "0%" },
    { stage: "Pagamento Confirmado", count: 0, conversion: "0%" },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Funil de Vendas</h1>
        <p className="text-slate-400">Análise do funil de conversão por campanha</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Etapas do Funil
        </h2>

        <div className="space-y-3">
          {funnelStages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-white font-medium">{stage.stage}</p>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                  <div
                    className="bg-lime-500 h-2 rounded-full"
                    style={{ width: `${Math.max(10, 100 - idx * 20)}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">{stage.count}</p>
                <p className="text-slate-400 text-xs">{stage.conversion}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Filtros</h2>
        <div className="space-y-3">
          <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm">
            <option>Todas as campanhas</option>
          </select>
          <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm">
            <option>Últimos 30 dias</option>
          </select>
        </div>
      </Card>
    </div>
  )
}
