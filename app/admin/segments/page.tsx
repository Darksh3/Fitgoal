"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

interface Segment {
  id: string
  name: string
  count: number
  filters: string[]
}

export default function SegmentsPage() {
  const segments: Segment[] = [
    {
      id: "1",
      name: "Convertidos",
      count: 0,
      filters: ["status = pagou"],
    },
    {
      id: "2",
      name: "Em Progresso",
      count: 0,
      filters: ["status = qualified", "stage != cliente"],
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Segmentos</h1>
          <p className="text-slate-400">Criar e gerenciar segmentos de audiência</p>
        </div>
        <Button className="bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Novo Segmento
        </Button>
      </div>

      <div className="space-y-4">
        {segments.map((segment) => (
          <Card key={segment.id} className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{segment.name}</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-lime-400">{segment.count}</p>
                    <p className="text-xs text-slate-400">usuários</p>
                  </div>
                  <div className="flex gap-2">
                    {segment.filters.map((filter, idx) => (
                      <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                        {filter}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                  Editar
                </Button>
                <Button variant="outline" className="border-red-700 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Criar Novo Segmento</h2>
        <p className="text-slate-400 text-sm">
          Use o construtor de filtros para criar segmentos personalizados baseados em dados de leads e usuários.
        </p>
      </Card>
    </div>
  )
}
