"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function AdminUsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editing, setEditing] = useState(null)

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

  const updateUserEmail = async (userId, newEmail) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "update-email", email: newEmail })
      })
      if (res.ok) {
        fetchUsers()
        setEditing(null)
      }
    } catch (error) {
      console.error("[v0] Error updating email:", error)
    }
  }

  const updateUserPassword = async (userId, newPassword) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "update-password", password: newPassword })
      })
      if (res.ok) {
        alert("Senha atualizada com sucesso")
        setEditing(null)
      }
    } catch (error) {
      console.error("[v0] Error updating password:", error)
    }
  }

  const toggleBlockUser = async (userId, shouldBlock) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "toggle-block", blocked: shouldBlock })
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("[v0] Error toggling block:", error)
    }
  }

  if (loading) return <div className="text-slate-300">Carregando usuários...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <Card key={user.id} className="bg-slate-700 border-slate-600 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{user.email || "Sem email"}</p>
                <p className="text-xs text-slate-400">ID: {user.id}</p>
                <p className="text-xs text-slate-400">Status: {user.blocked ? "Bloqueado" : "Ativo"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedUser(user)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => toggleBlockUser(user.id, !user.blocked)}
                  className={user.blocked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {user.blocked ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedUser && (
        <Card className="bg-slate-700 border-slate-600 p-6 mt-6">
          <h3 className="text-white text-lg font-semibold mb-4">Editar Usuário</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Email</label>
              <Input
                type="email"
                defaultValue={selectedUser.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Button
                className="mt-2 bg-green-600 hover:bg-green-700"
                onClick={() => updateUserEmail(selectedUser.id, editing?.email || selectedUser.email)}
              >
                Atualizar Email
              </Button>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Nova Senha</label>
              <Input
                type="password"
                placeholder="Digite a nova senha"
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Button
                className="mt-2 bg-green-600 hover:bg-green-700"
                onClick={() => updateUserPassword(selectedUser.id, editing?.password)}
              >
                Atualizar Senha
              </Button>
            </div>

            <Button
              className="w-full bg-slate-600 hover:bg-slate-700"
              onClick={() => setSelectedUser(null)}
            >
              Fechar
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
