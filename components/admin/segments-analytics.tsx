"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Card } from "@/components/ui/card"

const COLORS = ["#84cc16", "#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"]

interface SegmentsAnalyticsProps {
  analytics: any
}

export function SegmentsAnalytics({ analytics }: SegmentsAnalyticsProps) {
  // Convert age distribution to chart format
  const ageData = Object.entries(analytics.ageStats?.distribution || {}).map(([label, value]) => ({
    name: label,
    count: value,
  }))

  // Convert gender distribution to chart format
  const genderData = Object.entries(analytics.genderDistribution || {}).map(([label, value]) => ({
    name: label,
    value,
  }))

  // Convert weight distribution to chart format
  const weightData = Object.entries(analytics.weightStats?.distribution || {}).map(([label, value]) => ({
    name: label,
    count: value,
  }))

  // Convert body type distribution to chart format
  const bodyTypeData = Object.entries(analytics.bodyTypeDistribution || {}).map(([label, value]) => ({
    name: label,
    count: value,
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Total de Leads</p>
          <p className="text-3xl font-bold text-lime-400">{analytics.totalLeads}</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Idade Média</p>
          <p className="text-3xl font-bold text-blue-400">{analytics.ageStats?.average} anos</p>
          <p className="text-xs text-slate-500 mt-2">
            {analytics.ageStats?.min} - {analytics.ageStats?.max} anos
          </p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Peso Médio</p>
          <p className="text-3xl font-bold text-cyan-400">{analytics.weightStats?.average} kg</p>
          <p className="text-xs text-slate-500 mt-2">
            {analytics.weightStats?.min} - {analytics.weightStats?.max} kg
          </p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Distribuição</p>
          <div className="text-sm text-slate-300 space-y-1">
            {Object.entries(analytics.genderDistribution || {})
              .slice(0, 3)
              .map(([gender, count]: any[]) => (
                <p key={gender}>
                  {gender}: <span className="font-semibold text-white">{count}</span>
                </p>
              ))}
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Idade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
              <Bar dataKey="count" fill="#84cc16" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Gender Distribution */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Gênero</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color) => (
                  <Cell key={`cell-${color}`} fill={color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Weight Distribution */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Peso</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Body Type Distribution */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tipo de Corpo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bodyTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Objectives and Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objectives */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Objetivos Principais</h3>
          <div className="space-y-3">
            {Object.entries(analytics.objectivesDistribution || {})
              .sort(([, a]: any[], [, b]: any[]) => b - a)
              .slice(0, 5)
              .map(([objective, count]: [string, any]) => (
                <div key={objective} className="flex items-center justify-between">
                  <span className="text-slate-300">{objective}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-500 rounded-full"
                        style={{
                          width: `${(count / analytics.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold min-w-12">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Experience */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Experiência de Treino</h3>
          <div className="space-y-3">
            {Object.entries(analytics.experienceDistribution || {})
              .sort(([, a]: any[], [, b]: any[]) => b - a)
              .map(([experience, count]: [string, any]) => (
                <div key={experience} className="flex items-center justify-between">
                  <span className="text-slate-300">{experience}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(count / analytics.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold min-w-12">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
