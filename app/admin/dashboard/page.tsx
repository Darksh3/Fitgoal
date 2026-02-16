import { DashboardContent } from "../dashboard-content"
import { ProtectedAdminRoute } from "@/components/admin/protected-admin-route"

export default function AdminDashboard() {
  return (
    <ProtectedAdminRoute>
      <DashboardContent />
    </ProtectedAdminRoute>
  )
}
