import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../styles/buttons.css"
import "../styles/neon-buttons.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import FloatingChat from "@/components/floating-chat"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Fitness Website",
  description: "Seu parceiro para uma vida mais saudável",
    generator: 'v0.app'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.8,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <FloatingChat />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
