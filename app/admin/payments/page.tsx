"use client"

import { useState, useEffect } from "react"
import { Search, MoreVertical } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Payment {
  id: string
  asaasPaymentId?: string
  leadId?: string
  status: string
  value: number
  billingType?: string
  customerEmail?: string
  customerName?: string
  confirmedDate?: string
  updatedAt?: string
  description?: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    failed: 0,
    totalValue: 0,
  })

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/payments?limit=500")
      const data = await response.json()
      setPayments(data.payments || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error("[v0] Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      !searchQuery ||
      payment.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.asaasPaymentId?.includes(searchQuery)

    const matchesStatus = selectedStatus === "all" || payment.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  const statusColors: Record<string, { badge: string; text: string }> = {
    CONFIRMED: { badge: "bg-green-500/10 border-green-500", text: "text-green-400" },
    PENDING: { badge: "bg-yellow-500/10 border-yellow-500", text: "text-yellow-400" },
    OVERDUE: { badge: "bg-orange-500/10 border-orange-500", text: "text-orange-400" },
    FAILED: { badge: "bg-red-500/10 border-red-500", text: "text-red-400" },
    REFUNDED: { badge: "bg-blue-500/10 border-blue-500", text: "text-blue-400" },
  }

  const getStatusColor = (status: string) => {
    return statusColors[status] || { badge: "bg-slate-700/10 border-slate-600", text: "text-slate-400" }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Pagamentos</h1>
        <p className="text-slate-400">Gerenciar transações do Asaas e assinaturas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Total de Transações</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Confirmadas</p>
          <p className="text-3xl font-bold text-green-400">{stats.confirmed}</p>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Pendentes</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Falhadas</p>
          <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Receita Confirmada</p>
          <p className="text-2xl font-bold text-lime-400">R$ {stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por email, nome ou ID de transação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="PENDING">Pendentes</option>
            <option value="OVERDUE">Vencidas</option>
            <option value="FAILED">Falhadas</option>
            <option value="REFUNDED">Reembolsadas</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Valor</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Tipo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Data</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Carregando pagamentos...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Nenhum pagamento encontrado
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const colors = getStatusColor(payment.status)
                  return (
                    <tr key={payment.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-medium">{payment.customerEmail || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${colors.badge} ${colors.text}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-semibold">
                        R$ {payment.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{payment.billingType || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {payment.confirmedDate ? new Date(payment.confirmedDate).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {filteredPayments.length} pagamentos
          </p>
          <p className="text-sm text-slate-500">
            Total: {payments.length} pagamentos
          </p>
        </div>
      </Card>
    </div>
  )
}
