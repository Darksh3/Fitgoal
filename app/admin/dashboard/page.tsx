"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"
import { LeadsAnalytics } from "@/components/admin/leads-analytics"
import { Button } from "@/components/ui/button"
import { clearAdminToken } from "@/lib/adminAuth"

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("analytics")

  const handleLogout = () => {
    clearAdminToken()
    router.push("/admin/login")
  }

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">F</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fitgoal Admin</h1>
                <p className="text-xs text-slate-400">Dashboard de Analytics</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white border-red-700">
              Sair
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "analytics" ? "text-green-500 border-b-2 border-green-500" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab("usuarios")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "usuarios" ? "text-green-500 border-b-2 border-green-500" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Usuários
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "settings" ? "text-green-500 border-b-2 border-green-500" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Configurações
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "analytics" && <LeadsAnalytics />}

          {activeTab === "usuarios" && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-white text-lg font-semibold mb-4">Gerenciar Usuários</h2>
              <p className="text-slate-300 mb-4">Aqui você pode gerenciar todos os usuários, editar emails, senhas, bloquear acesso, modificar planos e editar dietas/treinos.</p>
              <Button
                onClick={() => router.push("/admin/users")}
                className="bg-green-600 hover:bg-green-700"
              >
                Ir para Gerenciamento de Usuários
              </Button>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-white text-lg font-semibold mb-4">Configurações</h2>
              <div className="space-y-4 text-slate-300">
                <div>
                  <p className="text-sm font-medium">Domínio:</p>
                  <p className="text-slate-400">fitgoal.com.br</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email Admin:</p>
                  <p className="text-slate-400">fitgoalcontato@gmail.com</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status:</p>
                  <p className="text-green-400">Online</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedAdminRoute>
  )
}
