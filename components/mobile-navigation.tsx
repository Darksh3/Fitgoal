"use client"

import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, X, Home, User, Activity, Utensils } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface MobileNavigationProps {
  currentPath?: string
}

export function MobileNavigation({ currentPath }: MobileNavigationProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [currentPath])

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/dieta", label: "Dieta", icon: Utensils },
    { href: "/dashboard/treino", label: "Treino", icon: Activity },
    { href: "/dashboard/dados", label: "Perfil", icon: User },
  ]

  if (!isMobile) return null

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Menu</h2>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setIsOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <nav className="flex-1 space-y-2 p-4">
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      const isActive = currentPath === item.href

                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center space-x-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                            "min-h-[44px]", // Touch-friendly height
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </a>
                      )
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">FitGoal</h1>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <nav className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.href

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center space-y-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  "min-h-[44px] min-w-[44px]", // Touch-friendly size
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </>
  )
}
