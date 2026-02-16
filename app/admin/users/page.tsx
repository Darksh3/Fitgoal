"use client"

import { useState, useEffect } from "react"
import { Search, MoreVertical } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface User {
  id: string
  email: string
  name?: string
  subscriptionStatus?: string
  createdAt?: string
  plan?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) =>
    !searchQuery ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = [
    {
      label: "Total de Usuários",
      value: users.length,
    },
    {
      label: "Ativos",
      value: users.filter((u) => u.subscriptionStatus === "active").length,
    },
    {
      label: "Inativos",
      value: users.filter((u) => u.subscriptionStatus !== "active").length,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Usuários</h1>
        <p className="text-slate-400">Gerenciar usuários e suas assinaturas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Plano</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Data</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.plan || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        user.subscriptionStatus === "active"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-slate-700/50 text-slate-400"
                      }`}>
                        {user.subscriptionStatus === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {filteredUsers.length} usuários
          </p>
          <p className="text-sm text-slate-500">
            Total: {users.length} usuários
          </p>
        </div>
      </Card>
    </div>
  )
}

