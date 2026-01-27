"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Download, Search } from "lucide-react"

interface UserExportData {
  uid: string
  email: string
  name: string
  age: string
  gender: string
  currentWeight: string
  targetWeight: string
  goal: string
  createdAt: string
  planExpiresAt: string
  planDaysRemaining: number
  isBlocked: boolean
  daysInApp: number
}

export function AdminDataExport() {
  const [users, setUsers] = useState<UserExportData[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"users" | "leads">("users")
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredData, setFilteredData] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const data = activeTab === "users" ? users : leads
    const filtered = data.filter(item =>
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredData(filtered)
  }, [searchTerm, activeTab, users, leads])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      
      const [usersRes, leadsRes] = await Promise.all([
        fetch("/api/admin/export-users", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("/api/admin/export-leads", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (usersRes.ok) setUsers(await usersRes.json())
      if (leadsRes.ok) setLeads(await leadsRes.json())
    } catch (error) {
      console.error("[v0] Error fetching export data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const data = activeTab === "users" ? filteredData : filteredData
    if (!data.length) return

    const headers = Object.keys(data[0])
    const csv = [
      headers.join(","),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          return typeof value === "string" && value.includes(",") 
            ? `"${value}"` 
            : value
        }).join(",")
      )
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeTab}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "users" 
              ? "text-green-500 border-b-2 border-green-500" 
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Usuários ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "leads" 
              ? "text-green-500 border-b-2 border-green-500" 
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Leads ({leads.length})
        </button>
      </div>

      {/* Search and Export */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Button
          onClick={exportToCSV}
          disabled={filteredData.length === 0}
          className="bg-green-600 hover:bg-green-700 flex gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
        <Button
          onClick={fetchData}
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-600"
        >
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {activeTab === "users" ? (
                <>
                  <th className="px-4 py-3 text-left text-slate-300">Email</th>
                  <th className="px-4 py-3 text-left text-slate-300">Nome</th>
                  <th className="px-4 py-3 text-left text-slate-300">Idade</th>
                  <th className="px-4 py-3 text-left text-slate-300">Gênero</th>
                  <th className="px-4 py-3 text-left text-slate-300">Peso Atual</th>
                  <th className="px-4 py-3 text-left text-slate-300">Meta</th>
                  <th className="px-4 py-3 text-left text-slate-300">Dias no App</th>
                  <th className="px-4 py-3 text-left text-slate-300">Plano Expira</th>
                  <th className="px-4 py-3 text-left text-slate-300">Status</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-left text-slate-300">Email</th>
                  <th className="px-4 py-3 text-left text-slate-300">Nome</th>
                  <th className="px-4 py-3 text-left text-slate-300">Idade</th>
                  <th className="px-4 py-3 text-left text-slate-300">Gênero</th>
                  <th className="px-4 py-3 text-left text-slate-300">Peso</th>
                  <th className="px-4 py-3 text-left text-slate-300">Meta</th>
                  <th className="px-4 py-3 text-left text-slate-300">Objetivo</th>
                  <th className="px-4 py-3 text-left text-slate-300">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr key={item.uid} className="hover:bg-slate-700/50 transition-colors">
                  {activeTab === "users" ? (
                    <>
                      <td className="px-4 py-3 text-slate-200">{item.email}</td>
                      <td className="px-4 py-3 text-slate-200">{item.name}</td>
                      <td className="px-4 py-3 text-slate-200">{item.age || "-"}</td>
                      <td className="px-4 py-3 text-slate-200">{item.gender || "-"}</td>
                      <td className="px-4 py-3 text-slate-200">{item.currentWeight || "-"} kg</td>
                      <td className="px-4 py-3 text-slate-200">{item.targetWeight || "-"} kg</td>
                      <td className="px-4 py-3 text-slate-200">{item.daysInApp} dias</td>
                      <td className="px-4 py-3 text-slate-200">
                        {item.planExpiresAt ? new Date(item.planExpiresAt).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.isBlocked 
                            ? "bg-red-900/50 text-red-400" 
                            : "bg-green-900/50 text-green-400"
                        }`}>
                          {item.isBlocked ? "Bloqueado" : "Ativo"}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-200">{item.email}</td>
                      <td className="px-4 py-3 text-slate-200">{item.name}</td>
                      <td className="px-4 py-3 text-slate-200">{item.age || "-"}</td>
                      <td className="px-4 py-3 text-slate-200">{item.gender || "-"}</td>
                      <td className="px-4 py-3 text-slate-200">{item.currentWeight || "-"} kg</td>
                      <td className="px-4 py-3 text-slate-200">{item.targetWeight || "-"} kg</td>
                      <td className="px-4 py-3 text-slate-200">{item.goal || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-400">
                          {item.status}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={activeTab === "users" ? 9 : 8} className="px-4 py-8 text-center text-slate-400">
                  Nenhum resultado encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Total {activeTab === "users" ? "Usuários" : "Leads"}</p>
          <p className="text-2xl font-bold text-green-500 mt-2">
            {activeTab === "users" ? users.length : leads.length}
          </p>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Resultados da Busca</p>
          <p className="text-2xl font-bold text-blue-500 mt-2">{filteredData.length}</p>
        </Card>
        {activeTab === "users" && (
          <Card className="bg-slate-800 border-slate-700 p-4">
            <p className="text-slate-400 text-sm">Usuários Bloqueados</p>
            <p className="text-2xl font-bold text-red-500 mt-2">
              {users.filter(u => u.isBlocked).length}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
