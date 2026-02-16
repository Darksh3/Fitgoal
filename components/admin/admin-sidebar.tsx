"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, Zap, TrendingUp, Settings, Wallet, ListTodo, X } from "lucide-react"

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: BarChart3,
  },
  {
    label: "Leads",
    href: "/admin/leads",
    icon: Zap,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Pagamentos",
    href: "/admin/payments",
    icon: Wallet,
  },
  {
    label: "Planos",
    href: "/admin/plans",
    icon: ListTodo,
  },
  {
    label: "Funil",
    href: "/admin/funnel",
    icon: TrendingUp,
  },
  {
    label: "Segmentos",
    href: "/admin/segments",
    icon: ListTodo,
  },
  {
    label: "Configurações",
    href: "/admin/settings",
    icon: Settings,
  },
]

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={`w-64 bg-slate-900 border-r border-slate-800 fixed left-0 top-0 bottom-0 overflow-y-auto transition-transform duration-300 z-50 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } md:relative md:translate-x-0`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-600 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-bold text-lg">F</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Fitgoal</h1>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </Link>
        
        {/* Close button on mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-lime-500/15 text-lime-400 border-l-2 border-lime-400"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
        <p className="text-xs text-slate-500 text-center">
          v1.0 • Admin Panel
        </p>
      </div>
    </aside>
  )
}
