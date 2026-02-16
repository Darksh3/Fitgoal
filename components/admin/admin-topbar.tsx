"use client"

import { useRouter } from "next/navigation"
import { LogOut, Bell, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { clearAdminToken } from "@/lib/adminAuth"

interface AdminTopbarProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function AdminTopbar({ onToggleSidebar, sidebarOpen }: AdminTopbarProps) {
  const router = useRouter()

  const handleLogout = () => {
    clearAdminToken()
    router.push("/admin/login")
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Side - Toggle Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm text-slate-500">Dashboard</p>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="text-right">
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-slate-500">Administrador</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-slate-900" />
            </div>
          </div>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="ml-4 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
