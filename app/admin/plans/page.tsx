"use client"

import { Card } from "@/components/ui/card"

export default function PlansPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Planos</h1>
        <p className="text-slate-400">Gerenciar planos de treino e dieta</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Dietas", "Treinos", "Metas"].map((type, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <p className="text-slate-400 text-sm mb-2">{type}</p>
            <p className="text-3xl font-bold text-white">0</p>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Gerenciar Planos</h2>
        <div className="space-y-3 text-slate-400">
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-sm font-medium text-white mb-1">Importar Dieta</p>
            <p className="text-xs">Carregar plano de dieta em CSV</p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-sm font-medium text-white mb-1">Importar Treino</p>
            <p className="text-xs">Carregar plano de treino em CSV</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
