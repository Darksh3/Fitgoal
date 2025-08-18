"use client"

import type { ReactNode } from "react"
import { useIsMobile, useDeviceType, useTouchDevice } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface MobileOptimizedLayoutProps {
  children: ReactNode
  className?: string
  enableSwipeGestures?: boolean
  touchOptimized?: boolean
}

export function MobileOptimizedLayout({
  children,
  className,
  enableSwipeGestures = false,
  touchOptimized = true,
}: MobileOptimizedLayoutProps) {
  const isMobile = useIsMobile()
  const deviceType = useDeviceType()
  const isTouch = useTouchDevice()

  return (
    <div
      className={cn(
        "w-full min-h-screen",
        // Mobile-first responsive spacing
        "px-4 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-6",
        // Touch-optimized spacing
        touchOptimized && isTouch && "touch-manipulation",
        // Device-specific optimizations
        isMobile && "mobile-optimized",
        deviceType === "tablet" && "tablet-optimized",
        className,
      )}
      style={{
        // Prevent zoom on double tap for iOS
        touchAction: enableSwipeGestures ? "pan-x pan-y" : "manipulation",
        // Improve scrolling performance on mobile
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  mobileColumns?: number
  tabletColumns?: number
  desktopColumns?: number
  gap?: string
}

export function ResponsiveGrid({
  children,
  className,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = "gap-4",
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid w-full",
    gap,
    `grid-cols-${mobileColumns}`,
    `md:grid-cols-${tabletColumns}`,
    `lg:grid-cols-${desktopColumns}`,
    className,
  )

  return <div className={gridClasses}>{children}</div>
}

interface TouchOptimizedButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function TouchOptimizedButton({
  children,
  onClick,
  className,
  variant = "primary",
  size = "md",
  disabled = false,
}: TouchOptimizedButtonProps) {
  const isTouch = useTouchDevice()
  const isMobile = useIsMobile()

  const baseClasses = cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    // Touch-optimized minimum hit area (44px minimum)
    isTouch && "min-h-[44px] min-w-[44px]",
    // Mobile-specific optimizations
    isMobile && "active:scale-95 transition-transform",
  )

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  }

  const sizeClasses = {
    sm: cn(
      "h-9 px-3 text-sm",
      // Larger on mobile for better touch targets
      isMobile && "h-11 px-4",
    ),
    md: cn(
      "h-10 px-4 py-2",
      // Larger on mobile
      isMobile && "h-12 px-6 py-3",
    ),
    lg: cn(
      "h-11 px-8",
      // Even larger on mobile
      isMobile && "h-14 px-10",
    ),
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      // Improve touch responsiveness
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  )
}
