"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, ChevronDown } from "lucide-react"
import { SegmentsAnalytics } from "@/components/admin/segments-analytics"
import { FilterBuilder } from "@/components/admin/filter-builder"

export default function SegmentsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showFilterBuilder, setShowFilterBuilder] = useState(false)
  const [predefinedSegments] = useState([
    {
      id: "women-25-35",
      name: "Mulheres 25-35",
      description: "Mulheres entre 25 e 35 anos",
      filters: { gender: ["Feminino"], ageMin: 25, ageMax: 35 },
      icon: "👩",
    },
    {
      id: "overweight-men",
      name: "Homens Acima do Peso",
      description: "Homens com sobrepeso ou obesos",
      filters: { gender: ["Masculino"], imcMin: 25 },
      icon: "👨",
    },
    {
      id: "beginners",
      name: "Iniciantes no Treino",
      description: "Pessoas sem experiência de treino",
      filters: { trainingExperience: ["Nenhuma"] },
      icon: "🏋️",
    },
    {
      id: "weight-loss",
      name: "Objetivo: Perder Peso",
      description: "Leads com objetivo de perder peso",
      filters: { objectives: ["Perder peso"] },
      icon: "📉",
    },
  ])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/analytics")
        const data = await response.json()
        setAnalytics(data.stats)
        console.log("[v0] SEGMENTS - Analytics loaded:", data)
      } catch (error) {
        console.error("[v0] SEGMENTS - Error loading analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Segmentos</h1>
          <p className="text-slate-400">Analisar e segmentar seus leads por dados demográficos</p>
        </div>
        <Button
          onClick={() => setShowFilterBuilder(!showFilterBuilder)}
          className="bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Segmento
        </Button>
      </div>

      {/* Analytics Dashboard */}
      {!loading && analytics && <SegmentsAnalytics analytics={analytics} />}

      {/* Filter Builder */}
      {showFilterBuilder && <FilterBuilder onClose={() => setShowFilterBuilder(false)} />}

      {/* Pre-defined Segments */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Segmentos Pré-definidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predefinedSegments.map((segment) => (
            <Card
              key={segment.id}
              className="bg-slate-900 border-slate-800 p-6 hover:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{segment.icon}</span>
                    <h3 className="text-lg font-semibold text-white">{segment.name}</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{segment.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(segment.filters).map(([key, value]: [string, any]) => (
                      <span key={key} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                        {key}: {Array.isArray(value) ? value.join(", ") : value}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Ver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-lg font-bold text-white mb-2">Sobre Segmentos</h2>
        <p className="text-slate-400 text-sm">
          Use os dados analíticos acima para entender sua audiência. Crie novos segmentos usando o construtor de filtros para
          analisar subgrupos específicos baseado em dados demográficos, experiência de treino, objetivos e muito mais.
        </p>
      </Card>
    </div>
  )
}
