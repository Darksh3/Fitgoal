"use client"

import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"
import { DashboardContent } from "./dashboard-content"

export default function AdminDashboard() {
  return (
    <ProtectedAdminRoute>
      <DashboardContent />
    </ProtectedAdminRoute>
  )
}


