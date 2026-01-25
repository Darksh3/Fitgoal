"use client"

import { useEffect, useState } from "react"
import { collection, query, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Lead {
  gender?: string
  age?: number
  bodyType?: string
  goal?: string | string[]
  experience?: string
  trainingDaysPerWeek?: number
  [key: string]: any
}

export function LeadsAnalytics() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLeads: 0,
    avgAge: 0,
    genderDistribution: { male: 0, female: 0 },
    bodyTypes: {} as Record<string, number>,
    goals: {} as Record<string, number>,
    experience: {} as Record<string, number>,
  })

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        console.log("[v0] Firebase DB instance:", db)
        
        if (!db) {
          console.error("[v0] Firebase DB not initialized - check environment variables")
          setIsLoading(false)
          return
        }

        const leadsCollection = collection(db, "leads")
        const leadsQuery = query(leadsCollection)
        const snapshot = await getDocs(leadsQuery)

        console.log("[v0] Firestore query result - Total docs:", snapshot.size)

        const leadsData: Lead[] = []
        snapshot.forEach((doc) => {
          console.log("[v0] Lead document:", doc.id, doc.data())
          leadsData.push(doc.data() as Lead)
        })

        console.log("[v0] Processed leads:", leadsData)
        setLeads(leadsData)
        calculateStats(leadsData)
      } catch (error) {
        console.error("[v0] Error fetching leads:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const calculateStats = (leadsData: Lead[]) => {
    const genderDist = { male: 0, female: 0 }
    const bodyTypesDist: Record<string, number> = {}
    const goalsDist: Record<string, number> = {}
    const experienceDist: Record<string, number> = {}
    let totalAge = 0
    let ageCount = 0

    leadsData.forEach((lead) => {
      // Gender
      if (lead.gender === "homem" || lead.gender === "male") genderDist.male++
      if (lead.gender === "mulher" || lead.gender === "female") genderDist.female++

      // Age
      if (lead.age) {
        totalAge += lead.age
        ageCount++
      }

      // Body Type
      if (lead.bodyType) {
        bodyTypesDist[lead.bodyType] = (bodyTypesDist[lead.bodyType] || 0) + 1
      }

      // Goals
      const goals = Array.isArray(lead.goal) ? lead.goal : lead.goals || []
      goals.forEach((goal: string) => {
        goalsDist[goal] = (goalsDist[goal] || 0) + 1
      })

      // Experience
      if (lead.experience) {
        experienceDist[lead.experience] = (experienceDist[lead.experience] || 0) + 1
      }
    })

    setStats({
      totalLeads: leadsData.length,
      avgAge: ageCount > 0 ? Math.round(totalAge / ageCount) : 0,
      genderDistribution: genderDist,
      bodyTypes: bodyTypesDist,
      goals: goalsDist,
      experience: experienceDist,
    })
  }

  const genderData = [
    { name: "Homens", value: stats.genderDistribution.male, color: "#3b82f6" },
    { name: "Mulheres", value: stats.genderDistribution.female, color: "#ec4899" },
  ]

  const bodyTypeData = Object.entries(stats.bodyTypes).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  const goalsData = Object.entries(stats.goals).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  const experienceData = Object.entries(stats.experience).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  if (isLoading) {
    return <div className="text-white">Carregando dados...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-300 text-sm font-medium">Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-300 text-sm font-medium">Média de Idade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.avgAge} anos</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-300 text-sm font-medium">Proporção M/F</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300">
              <div>Homens: {stats.genderDistribution.male}</div>
              <div>Mulheres: {stats.genderDistribution.female}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Distribuição por Gênero</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Body Type Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Distribuição por Biotipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bodyTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goals Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Objetivos Principais</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={goalsData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Experience Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Experiência em Treino</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={experienceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
