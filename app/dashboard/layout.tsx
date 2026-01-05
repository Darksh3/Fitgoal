import type React from "react"

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {/* Main content area */}
      <main>{children}</main>
    </div>
  )
}

export default DashboardLayout
