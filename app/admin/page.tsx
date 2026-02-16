"use client"

import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Users, Wallet, AlertCircle, ArrowUp, ArrowDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"

interface KPIMetric {
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
  trend?: "up" | "down"
}

function DashboardContent() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<KPIMetric[]>([])
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; type: "warning" | "error" }>>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch data from multiple endpoints
      const [leadsRes, paymentsRes, usersRes] = await Promise.all([
        fetch("/api/admin/leads?limit=1000"),
        fetch("/api/admin/payments"),
        fetch("/api/admin/users"),
      ])

      const leadsData = await leadsRes.json()
      const paymentsData = await paymentsRes.json()
      const usersData = await usersRes.json()

      const leads = leadsData.leads || []
      const payments = paymentsData.payments || []
      const users = usersData.users || []

      // Calculate metrics
      const totalLeads = leads.length
      const activeUsers = users.filter((u: any) => u.subscriptionStatus === "active").length
      const paidLeads = leads.filter((l: any) => l.hasPaid).length
      const conversionRate = totalLeads > 0 ? ((paidLeads / totalLeads) * 100).toFixed(1) : "0"

      // Calculate revenue (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentPayments = payments.filter((p: any) => {
        const paymentDate = new Date(p.confirmedDate || p.createdAt)
        return paymentDate > sevenDaysAgo && p.status === "CONFIRMED"
      })
      const totalRevenue = recentPayments.reduce((sum: number, p: any) => sum + (p.value || 0), 0)

      // Failed payments
      const failedPayments = payments.filter((p: any) => p.status === "OVERDUE" || p.status === "FAILED").length

      const newMetrics: KPIMetric[] = [
        {
          label: `Receita (7d)`,
          value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          trend: "up",
          icon: <Wallet className="w-5 h-5" />,
        },
        {
          label: "Taxa de Conversão",
          value: `${conversionRate}%`,
          trend: paidLeads > 0 ? "up" : "down",
          icon: <TrendingUp className="w-5 h-5" />,
        },
        {
          label: "Leads Ativos",
          value: totalLeads,
          trend: "up",
          icon: <Users className="w-5 h-5" />,
        },
        {
          label: "Usuários Ativos",
          value: activeUsers,
          trend: "up",
          icon: <BarChart3 className="w-5 h-5" />,
        },
        {
          label: "Pagamentos Falhos",
          value: failedPayments,
          trend: failedPayments > 0 ? "down" : "up",
          icon: <AlertCircle className="w-5 h-5" />,
        },
      ]

      // Generate alerts
      const newAlerts = []
      if (failedPayments > 0) {
        newAlerts.push({
          id: "failed-payments",
          message: `${failedPayments} pagamento(s) com falha. Verifique e tente recuperar.`,
          type: "warning" as const,
        })
      }
      if (conversionRate === "0") {
        newAlerts.push({
          id: "no-conversions",
          message: "Nenhuma conversão nos últimos 7 dias.",
          type: "warning" as const,
        })
      }

      setMetrics(newMetrics)
      setAlerts(newAlerts)
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
      setAlerts([
        {
          id: "load-error",
          message: "Erro ao carregar dados. Tente recarregar a página.",
          type: "error",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Visão geral de métricas e performance</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`px-4 py-3 border-l-4 ${
                alert.type === "error"
                  ? "bg-red-500/10 border-red-500 text-red-400"
                  : "bg-yellow-500/10 border-yellow-500 text-yellow-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">{alert.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            Carregando métricas...
          </div>
        ) : (
          metrics.map((metric, idx) => (
            <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-slate-800 rounded-lg text-lime-400">
                  {metric.icon}
                </div>
                {metric.trend && (
                  <div className={`flex items-center gap-1 ${metric.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                    {metric.trend === "up" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-3">Ações Rápidas</h3>
          <div className="space-y-2">
            <a
              href="/admin/leads"
              className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              → Gerenciar Leads
            </a>
            <a
              href="/admin/payments"
              className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              → Ver Pagamentos
            </a>
            <a
              href="/admin/users"
              className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              → Gerenciar Usuários
            </a>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-3">Status do Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">API Admin</span>
              <span className="text-green-400">● Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Firebase</span>
              <span className="text-green-400">● Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Asaas Webhook</span>
              <span className="text-green-400">● Ativo</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <ProtectedAdminRoute>
      <DashboardContent />
    </ProtectedAdminRoute>
  )
}

  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<KPIMetric[]>([])
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; type: "warning" | "error" }>>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch data from multiple endpoints
      const [leadsRes, paymentsRes, usersRes] = await Promise.all([
        fetch("/api/admin/leads?limit=1000"),
        fetch("/api/admin/payments"),
        fetch("/api/admin/users"),
      ])

      const leadsData = await leadsRes.json()
      const paymentsData = await paymentsRes.json()
      const usersData = await usersRes.json()

      const leads = leadsData.leads || []
      const payments = paymentsData.payments || []
      const users = usersData.users || []

      // Calculate metrics
      const totalLeads = leads.length
      const activeUsers = users.filter((u: any) => u.subscriptionStatus === "active").length
      const paidLeads = leads.filter((l: any) => l.hasPaid).length
      const conversionRate = totalLeads > 0 ? ((paidLeads / totalLeads) * 100).toFixed(1) : "0"

      // Calculate revenue (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentPayments = payments.filter((p: any) => {
        const paymentDate = new Date(p.confirmedDate || p.createdAt)
        return paymentDate > sevenDaysAgo && p.status === "CONFIRMED"
      })
      const totalRevenue = recentPayments.reduce((sum: number, p: any) => sum + (p.value || 0), 0)

      // Failed payments
      const failedPayments = payments.filter((p: any) => p.status === "OVERDUE" || p.status === "FAILED").length

      const newMetrics: KPIMetric[] = [
        {
          label: `Receita (7d)`,
          value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          trend: "up",
          icon: <Wallet className="w-5 h-5" />,
        },
        {
          label: "Taxa de Conversão",
          value: `${conversionRate}%`,
          trend: paidLeads > 0 ? "up" : "down",
          icon: <TrendingUp className="w-5 h-5" />,
        },
        {
          label: "Leads Ativos",
          value: totalLeads,
          trend: "up",
          icon: <Users className="w-5 h-5" />,
        },
        {
          label: "Usuários Ativos",
          value: activeUsers,
          trend: "up",
          icon: <BarChart3 className="w-5 h-5" />,
        },
        {
          label: "Pagamentos Falhos",
          value: failedPayments,
          trend: failedPayments > 0 ? "down" : "up",
          icon: <AlertCircle className="w-5 h-5" />,
        },
      ]

      // Generate alerts
      const newAlerts = []
      if (failedPayments > 0) {
        newAlerts.push({
          id: "failed-payments",
          message: `${failedPayments} pagamento(s) com falha. Verifique e tente recuperar.`,
          type: "warning" as const,
        })
      }
      if (conversionRate === "0") {
        newAlerts.push({
          id: "no-conversions",
          message: "Nenhuma conversão nos últimos 7 dias.",
          type: "warning" as const,
        })
      }

      setMetrics(newMetrics)
      setAlerts(newAlerts)
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
      setAlerts([
        {
          id: "load-error",
          message: "Erro ao carregar dados. Tente recarregar a página.",
          type: "error",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Visão geral de métricas e performance</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`px-4 py-3 border-l-4 ${
                alert.type === "error"
                  ? "bg-red-500/10 border-red-500 text-red-400"
                  : "bg-yellow-500/10 border-yellow-500 text-yellow-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">{alert.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            Carregando métricas...
          </div>
        ) : (
          metrics.map((metric, idx) => (
            <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-slate-800 rounded-lg text-lime-400">
                  {metric.icon}
                </div>
                {metric.trend && (
                  <div className={`flex items-center gap-1 ${metric.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                    {metric.trend === "up" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-3">Ações Rápidas</h3>
          <div className="space-y-2">
            <a
              href="/admin/leads"
              className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              → Gerenciar Leads
            </a>
            <a
              href="/admin/payments"
              className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              → Ver Pagamentos
            </a>
            <a
              href="/admin/users"
              className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
            >
              → Gerenciar Usuários
            </a>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-3">Status do Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">API Admin</span>
              <span className="text-green-400">● Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Firebase</span>
              <span className="text-green-400">● Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Asaas Webhook</span>
              <span className="text-green-400">● Ativo</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
