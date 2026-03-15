"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Download, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  email: string
  name?: string
  subscriptionStatus?: string
  createdAt?: string
  plan?: string
  visitedResults?: boolean
  visitedCheckout?: boolean
}

export default function UsersPage() {
  const router = useRouter()
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
      console.log("[v0] Admin users page received data:", data)
      console.log("[v0] Users list:", data.users)
      if (data.users && data.users.length > 0) {
        console.log("[v0] First user:", {
          id: data.users[0].id,
          email: data.users[0].email,
          visitedResults: data.users[0].visitedResults,
          visitedCheckout: data.users[0].visitedCheckout,
        })
      }
      setUsers(data.users || [])
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportEmails = async (format: "json" | "csv" = "csv") => {
    try {
      const response = await fetch(`/api/admin/export-emails?type=users&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `emails_users_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "json"}`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("[v0] Error exporting emails:", error)
    }
  }

  const handleCopyEmails = async () => {
    try {
      const response = await fetch("/api/admin/export-emails?type=users&format=json")
      const data = await response.json()
      const emailText = data.emails.join("; ")
      await navigator.clipboard.writeText(emailText)
      alert(`${data.total} emails copiados para a área de transferência!`)
    } catch (error) {
      console.error("[v0] Error copying emails:", error)
    }
  }

  const checkoutStatusLabel = (visitedCheckout?: boolean) => {
    if (visitedCheckout) {
      return { label: "Foi para Checkout", color: "bg-orange-500/10 text-orange-400" }
    }
    return { label: "Não foi para Checkout", color: "bg-gray-500/10 text-gray-400" }
  }

  const filteredUsers = users.filter((user) =>
    !searchQuery ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = [
    { label: "Total de Usuários", value: users.length },
    { label: "Ativos", value: users.filter((u) => u.subscriptionStatus === "active").length },
    { label: "Inativos", value: users.filter((u) => u.subscriptionStatus !== "active").length },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Usuários</h1>
        <p className="text-slate-400">Gerenciar usuários e suas assinaturas</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </Card>
        ))}
      </div>
      <div className="space-y-4">
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
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => handleExportEmails("csv")} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Emails CSV
          </Button>
          <Button onClick={handleCopyEmails} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Copiar Emails
          </Button>
        </div>
      </div>
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Plano</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status Results</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status Checkout</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Data</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Carregando usuários...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Nenhum usuário encontrado</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => handleViewUser(user.id)}>
                    <td className="px-6 py-4 text-sm text-green-400 font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.plan || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.visitedResults ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"}`}>
                        {user.visitedResults ? "Visitou Results" : "Não visitou"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${checkoutStatusLabel(user.visitedCheckout).color}`}>
                        {checkoutStatusLabel(user.visitedCheckout).label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.subscriptionStatus === "active" ? "bg-green-500/10 text-green-400" : "bg-slate-700/50 text-slate-400"}`}>
                        {user.subscriptionStatus === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-green-400 transition-colors" onClick={(e) => { e.stopPropagation(); handleViewUser(user.id) }} title="Ver dieta e treino do usuário">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">{filteredUsers.length} usuários</p>
          <p className="text-sm text-slate-500">Total: {users.length} usuários</p>
        </div>
      </Card>
    </div>
  )
}
