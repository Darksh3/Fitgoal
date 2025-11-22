import React from "react"
import { cn } from "@/lib/utils"

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

export const StyledButton = React.forwardRef<HTMLButtonElement, StyledButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const baseStyles =
      "rounded-[2rem] font-semibold transition-all duration-200 border-[3px] disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
      primary: "bg-[#3B82F6] hover:bg-[#2563EB] text-white border-[#3B82F6] shadow-lg shadow-blue-500/30",
      secondary: "bg-[#0f121a] hover:bg-[#1a1f2e] text-gray-100 border-gray-600",
      outline: "bg-transparent hover:bg-gray-800/50 text-gray-100 border-gray-600",
    }

    const sizes = {
      sm: "px-6 py-2 text-sm",
      md: "px-8 py-3 text-lg",
      lg: "px-12 py-4 text-xl",
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  },
)

StyledButton.displayName = "StyledButton"
