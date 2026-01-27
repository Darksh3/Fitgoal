"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"
import { AdminDataExport } from "@/components/admin/data-export"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => router.push("/admin/dashboard")}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  Voltar
                </Button>
                <h1 className="text-xl font-bold text-white">Gerenciar Usuários</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Buscar por email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-slate-300">Carregando usuários...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-slate-300">Nenhum usuário encontrado</div>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="bg-slate-700 border-slate-600 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{user.email || "Sem email"}</p>
                      <p className="text-xs text-slate-400">ID: {user.id}</p>
                      <div className="flex gap-4 mt-2">
                        <p className={`text-xs ${user.blocked ? "text-red-400" : "text-green-400"}`}>
                          Status: {user.blocked ? "Bloqueado" : "Ativo"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Assinatura: {user.subscription || "Nenhuma"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <Card className="bg-slate-700 border-slate-600 p-4">
              <p className="text-slate-300 text-sm">Total de Usuários</p>
              <p className="text-white text-2xl font-bold">{users.length}</p>
            </Card>
            <Card className="bg-slate-700 border-slate-600 p-4">
              <p className="text-slate-300 text-sm">Usuários Ativos</p>
              <p className="text-green-400 text-2xl font-bold">{users.filter(u => !u.blocked).length}</p>
            </Card>
            <Card className="bg-slate-700 border-slate-600 p-4">
              <p className="text-slate-300 text-sm">Usuários Bloqueados</p>
              <p className="text-red-400 text-2xl font-bold">{users.filter(u => u.blocked).length}</p>
            </Card>
          </div>

          {/* Data Export Section */}
          <div className="mt-8">
            <h2 className="text-white text-xl font-bold mb-4">Exportar Dados</h2>
            <AdminDataExport />
          </div>
        </div>
      </div>
    </ProtectedAdminRoute>
  )
}
