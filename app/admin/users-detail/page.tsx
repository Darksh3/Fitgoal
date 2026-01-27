"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"
import { ChevronLeft, Calendar, Target, Weight, TrendingUp } from "lucide-react"

interface UserDetailData {
  uid: string
  email: string
  name: string
  age: number
  gender: string
  currentWeight: number
  targetWeight: number
  goal: string
  createdAt: string
  planExpiresAt: string
  isBlocked: boolean
  daysInApp: number
  dietPlan?: any
  workoutPlan?: any
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = params.id as string

  useEffect(() => {
    fetchUserDetail()
  }, [userId])

  const fetchUserDetail = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      const res = await fetch(`/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error("Failed to fetch user")
      
      const users = await res.json()
      const foundUser = users.find((u: any) => u.uid === userId)
      setUser(foundUser || null)
    } catch (error) {
      console.error("[v0] Error fetching user detail:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedAdminRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-slate-400">Carregando...</p>
        </div>
      </ProtectedAdminRoute>
    )
  }

  if (!user) {
    return (
      <ProtectedAdminRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-slate-400">Usuário não encontrado</p>
        </div>
      </ProtectedAdminRoute>
    )
  }

  const daysInApp = user.daysInApp || 0
  const currentWeight = user.currentWeight || 0
  const targetWeight = user.targetWeight || 0
  const weightLost = currentWeight - targetWeight
  const progressPercent = Math.max(0, Math.min(100, ((currentWeight - targetWeight) / Math.abs(currentWeight - targetWeight || 1)) * 100))

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.back()}
                className="bg-slate-700 hover:bg-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-white text-2xl font-bold">{user.name}</h1>
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Dias no App</p>
                  <p className="text-3xl font-bold text-green-400 mt-2">{daysInApp}</p>
                </div>
                <Calendar className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Peso Atual</p>
                  <p className="text-3xl font-bold text-blue-400 mt-2">{currentWeight} kg</p>
                </div>
                <Weight className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Meta</p>
                  <p className="text-3xl font-bold text-purple-400 mt-2">{targetWeight} kg</p>
                </div>
                <Target className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Progresso</p>
                  <p className={`text-3xl font-bold mt-2 ${
                    weightLost < 0 ? "text-green-400" : "text-orange-400"
                  }`}>
                    {Math.abs(weightLost).toFixed(1)} kg
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 opacity-20" style={{
                  color: weightLost < 0 ? "#4ade80" : "#fb923c"
                }} />
              </div>
            </Card>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
              <h2 className="text-white font-bold text-lg">Informações Pessoais</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Idade:</span>
                  <span className="text-white">{user.age || "-"} anos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gênero:</span>
                  <span className="text-white">{user.gender || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Objetivo:</span>
                  <span className="text-white">{user.goal || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.isBlocked 
                      ? "bg-red-900/50 text-red-400" 
                      : "bg-green-900/50 text-green-400"
                  }`}>
                    {user.isBlocked ? "Bloqueado" : "Ativo"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Plan Info */}
            <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
              <h2 className="text-white font-bold text-lg">Informações do Plano</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Entrada:</span>
                  <span className="text-white">
                    {user.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                      : "-"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plano Expira:</span>
                  <span className="text-white">
                    {user.planExpiresAt 
                      ? new Date(user.planExpiresAt).toLocaleDateString("pt-BR")
                      : "-"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white text-xs">{user.email}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/admin/users/${userId}`)}
              className="bg-green-600 hover:bg-green-700"
            >
              Editar Usuário
            </Button>
            <Button
              className="bg-slate-700 hover:bg-slate-600"
            >
              Gerar Novo Plano
            </Button>
          </div>
        </div>
      </div>
    </ProtectedAdminRoute>
  )
}
