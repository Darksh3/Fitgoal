"use client"

import { Card } from "@/components/ui/card"
import { Wallet, TrendingUp, AlertCircle } from "lucide-react"

export default function PaymentsPage() {
  const stats = [
    { label: "Receita Total", value: "R$ 0", icon: <Wallet className="w-5 h-5" /> },
    { label: "Transações Pendentes", value: "0", icon: <AlertCircle className="w-5 h-5" /> },
    { label: "Falhas", value: "0", icon: <TrendingUp className="w-5 h-5" /> },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Pagamentos</h1>
        <p className="text-slate-400">Gerenciar transações e assinaturas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-lime-500/10 rounded-lg text-lime-400">{stat.icon}</div>
            </div>
            <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Transações Recentes</h2>
        <div className="text-center py-8 text-slate-400">
          Em breve - integrações de pagamento
        </div>
      </Card>
    </div>
  )
}
