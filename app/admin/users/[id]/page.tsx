"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AdminPlanManager } from "@/components/admin/plan-manager"
import { AdminDietManager } from "@/components/admin/diet-manager"
import { AdminWorkoutManager } from "@/components/admin/workout-manager"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"

interface UserInfo {
    id: string
    email?: string
    name?: string
    plan?: string
    subscriptionStatus?: string
    createdAt?: string
}

export default function UserDetailPage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string

  const [activeTab, setActiveTab] = useState("info")
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
        if (userId) {
                fetchUserInfo()
        }
  }, [userId])

  const fetchUserInfo = async () => {
        try {
                setLoadingUser(true)
                // Buscar apenas o usuário específico usando o parâmetro userId
          const response = await fetch(`/api/admin/users?userId=${userId}`)
                const data = await response.json()
                const user = (data.users || [])[0]
                setUserInfo(user || { id: userId })
        } catch (error) {
                console.error("[v0] Error fetching user info:", error)
                setUserInfo({ id: userId })
        } finally {
                setLoadingUser(false)
        }
  }

  return (
        <ProtectedAdminRoute>
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                {/* Header */}
                      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
                                <div className="max-w-7xl mx-auto px-4 py-4">
                                            <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-3">
                                                                          <Button
                                                                                              onClick={() => router.back()}
                                                                                              className="bg-slate-700 hover:bg-slate-600"
                                                                                            >
                                                                                            Voltar
                                                                          </Button>Button>
                                                                          <div>
                                                                                            <h1 className="text-xl font-bold text-white">Detalhes do Usuário</h1>h1>
                                                                            {userInfo?.email && (
                              <p className="text-sm text-slate-400">{userInfo.email}</p>p>
                                                                                            )}
                                                                          </div>div>
                                                          </div>div>
                                            </div>div>
                                </div>div>
                      </div>div>
              
                {/* Tabs */}
                      <div className="max-w-7xl mx-auto px-4 py-6">
                                <div className="flex gap-4 mb-6 border-b border-slate-700">
                                  {["info", "plano", "dieta", "treino"].map((tab) => (
                        <button
                                          key={tab}
                                          onClick={() => setActiveTab(tab)}
                                          className={`px-4 py-2 font-medium transition-colors ${
                                                              activeTab === tab
                                                                ? "text-green-500 border-b-2 border-green-500"
                                                                : "text-slate-400 hover:text-slate-300"
                                          }`}
                                        >
                          {tab === "info" && "Informações"}
                          {tab === "plano" && "Plano"}
                          {tab === "dieta" && "Dieta"}
                          {tab === "treino" && "Treino"}
                        </button>button>
                      ))}
                                </div>div>
                      
                        {/* Content */}
                                <div className="space-y-6">
                                  {activeTab === "info" && (
                        <Card className="bg-slate-800 border-slate-700 p-6">
                          {loadingUser ? (
                                            <p className="text-slate-400">Carregando informações...</p>p>
                                          ) : (
                                            <div className="space-y-4">
                                                                <h2 className="text-white text-lg font-semibold mb-4">Informações do Usuário</h2>h2>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                      <div className="bg-slate-900 rounded-lg p-4">
                                                                                                              <p className="text-slate-400 text-xs uppercase mb-1">ID</p>p>
                                                                                                              <p className="text-slate-300 font-mono text-sm break-all">{userInfo?.id}</p>p>
                                                                                        </div>div>
                                                                                      <div className="bg-slate-900 rounded-lg p-4">
                                                                                                              <p className="text-slate-400 text-xs uppercase mb-1">Email</p>p>
                                                                                                              <p className="text-white font-medium">{userInfo?.email || "-"}</p>p>
                                                                                        </div>div>
                                                                                      <div className="bg-slate-900 rounded-lg p-4">
                                                                                                              <p className="text-slate-400 text-xs uppercase mb-1">Nome</p>p>
                                                                                                              <p className="text-white">{userInfo?.name || "-"}</p>p>
                                                                                        </div>div>
                                                                                      <div className="bg-slate-900 rounded-lg p-4">
                                                                                                              <p className="text-slate-400 text-xs uppercase mb-1">Plano</p>p>
                                                                                                              <p className="text-white">{userInfo?.plan || "-"}</p>p>
                                                                                        </div>div>
                                                                                      <div className="bg-slate-900 rounded-lg p-4">
                                                                                                              <p className="text-slate-400 text-xs uppercase mb-1">Status</p>p>
                                                                                                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                                                        userInfo?.subscriptionStatus === "active"
                                                                          ? "bg-green-500/10 text-green-400"
                                                                          : "bg-slate-700/50 text-slate-400"
                                            }`}>
                                                                                                                {userInfo?.subscriptionStatus === "active" ? "Ativo" : "Inativo"}
                                                                                                                </span>span>
                                                                                        </div>div>
                                                                                      <div className="bg-slate-900 rounded-lg p-4">
                                                                                                              <p className="text-slate-400 text-xs uppercase mb-1">Membro desde</p>p>
                                                                                                              <p className="text-white">
                                                                                                                {userInfo?.createdAt
                                                                                                                                              ? new Date(userInfo.createdAt).toLocaleDateString("pt-BR")
                                                                                                                                              : "-"}
                                                                                                                </p>p>
                                                                                        </div>div>
                                                                </div>div>
                                            </div>div>
                                        )}
                        </Card>Card>
                                            )}
                                  {activeTab === "plano" && <AdminPlanManager userId={userId} />}
                                  {activeTab === "dieta" && <AdminDietManager userId={userId} />}
                                  {activeTab === "treino" && <AdminWorkoutManager userId={userId} />}
                                </div>div>
                      </div>div>
              </div>div>
        </ProtectedAdminRoute>ProtectedAdminRoute>
      )
    }</ProtectedAdminRoute>
