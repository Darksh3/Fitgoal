"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AdminPlanManager } from "@/components/admin/plan-manager"
import { AdminDietManager } from "@/components/admin/diet-manager"
import { AdminWorkoutManager } from "@/components/admin/workout-manager"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [activeTab, setActiveTab] = useState("info")

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
                </Button>
                <h1 className="text-xl font-bold text-white">Detalhes do Usuário</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-4 mb-6 border-b border-slate-700">
            {["info", "plano", "dieta", "treino"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab ? "text-green-500 border-b-2 border-green-500" : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab === "info" && "Informações"}
                {tab === "plano" && "Plano"}
                {tab === "dieta" && "Dieta"}
                {tab === "treino" && "Treino"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === "info" && (
              <Card className="bg-slate-700 border-slate-600 p-6">
                <h2 className="text-white text-lg font-semibold mb-4">ID do Usuário</h2>
                <p className="text-slate-300 font-mono">{userId}</p>
              </Card>
            )}

            {activeTab === "plano" && <AdminPlanManager userId={userId} />}
            {activeTab === "dieta" && <AdminDietManager userId={userId} />}
            {activeTab === "treino" && <AdminWorkoutManager userId={userId} />}
          </div>
        </div>
      </div>
    </ProtectedAdminRoute>
  )
}
