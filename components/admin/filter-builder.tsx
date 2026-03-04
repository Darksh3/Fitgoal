"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FilterBuilderProps {
  onClose: () => void
}

export function FilterBuilder({ onClose }: FilterBuilderProps) {
  const [filters, setFilters] = useState({
    ageMin: "",
    ageMax: "",
    gender: [] as string[],
    weightMin: "",
    weightMax: "",
    bodyType: [] as string[],
    objectives: [] as string[],
    trainingExperience: [] as string[],
    imcMin: "",
    imcMax: "",
    paymentStatus: [] as string[],
  })

  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const genderOptions = ["Masculino", "Feminino", "Outro"]
  const bodyTypeOptions = ["Ectomorfo", "Mesomorfo", "Endomorfo"]
  const objectiveOptions = ["Ganhar massa", "Perder peso", "Definição", "Saúde", "Performance"]
  const experienceOptions = ["Nenhuma", "Iniciante", "Intermediário", "Avançado"]
  const paymentStatusOptions = ["pagou", "qualified", "em_progresso", "cancelado"]

  const handleToggle = (field: string, value: string) => {
    setFilters((prev: any) => {
      const array = prev[field]
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter((v: string) => v !== value) }
      } else {
        return { ...prev, [field]: [...array, value] }
      }
    })
  }

  const handleApplyFilters = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/filter-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      })
      const data = await response.json()
      setResults(data)
      console.log("[v0] FILTER_BUILDER - Results:", data)
    } catch (error) {
      console.error("[v0] FILTER_BUILDER - Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Criar Novo Segmento</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Age Range */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Idade</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.ageMin}
              onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })}
              className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.ageMax}
              onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })}
              className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Weight Range */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Peso (kg)</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.weightMin}
              onChange={(e) => setFilters({ ...filters, weightMin: e.target.value })}
              className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.weightMax}
              onChange={(e) => setFilters({ ...filters, weightMax: e.target.value })}
              className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* IMC Range */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">IMC</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              step="0.1"
              value={filters.imcMin}
              onChange={(e) => setFilters({ ...filters, imcMin: e.target.value })}
              className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
            />
            <input
              type="number"
              placeholder="Max"
              step="0.1"
              value={filters.imcMax}
              onChange={(e) => setFilters({ ...filters, imcMax: e.target.value })}
              className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Gênero</label>
          <div className="space-y-2">
            {genderOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.gender.includes(option)}
                  onChange={() => handleToggle("gender", option)}
                  className="w-4 h-4 rounded border-slate-600 text-lime-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Body Type */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Tipo de Corpo</label>
          <div className="space-y-2">
            {bodyTypeOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.bodyType.includes(option)}
                  onChange={() => handleToggle("bodyType", option)}
                  className="w-4 h-4 rounded border-slate-600 text-lime-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Training Experience */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Experiência</label>
          <div className="space-y-2">
            {experienceOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.trainingExperience.includes(option)}
                  onChange={() => handleToggle("trainingExperience", option)}
                  className="w-4 h-4 rounded border-slate-600 text-lime-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Objectives */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-white mb-2">Objetivos</label>
          <div className="space-y-2">
            {objectiveOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.objectives.includes(option)}
                  onChange={() => handleToggle("objectives", option)}
                  className="w-4 h-4 rounded border-slate-600 text-lime-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-white mb-2">Status de Pagamento</label>
          <div className="flex flex-wrap gap-2">
            {paymentStatusOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-2 rounded">
                <input
                  type="checkbox"
                  checked={filters.paymentStatus.includes(option)}
                  onChange={() => handleToggle("paymentStatus", option)}
                  className="w-4 h-4 rounded border-slate-600 text-lime-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleApplyFilters}
          disabled={loading}
          className="bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold"
        >
          {loading ? "Aplicando..." : "Aplicar Filtros"}
        </Button>
        <Button onClick={onClose} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
          Cancelar
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="border-t border-slate-800 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Resultados do Segmento</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded p-4">
              <p className="text-slate-400 text-sm">Total de Leads</p>
              <p className="text-2xl font-bold text-lime-400">{results.totalFiltered}</p>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <p className="text-slate-400 text-sm">Idade Média</p>
              <p className="text-2xl font-bold text-blue-400">{results.stats.avgAge} anos</p>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <p className="text-slate-400 text-sm">Peso Médio</p>
              <p className="text-2xl font-bold text-cyan-400">{results.stats.avgWeight} kg</p>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <p className="text-slate-400 text-sm">Maior Gênero</p>
              <p className="text-2xl font-bold text-purple-400">
                {Object.entries(results.stats.genderDistribution)
                  .sort(([, a]: any[], [, b]: any[]) => b - a)[0]?.[0] || "-"}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
