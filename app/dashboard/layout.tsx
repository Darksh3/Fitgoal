import type React from "react"

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {/* Header component */}
      <header>
        <h1>Dashboard</h1>
      </header>
      {/* Main content area */}
      <main>{children}</main>
      {/* Footer component */}
      <footer>
        <p>© 2023 My Company</p>
      </footer>
    </div>
  )
}

export default DashboardLayout
