"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface GaugeProps {
  value: number
  maxValue?: number
  label?: string
  unit?: string
  showPercentage?: boolean
  className?: string
}

export function Gauge({ value, maxValue = 100, label, unit = "", showPercentage = false, className }: GaugeProps) {
  const [progress, setProgress] = useState(0)

  // Calculate percentage
  const percentage = Math.min((value / maxValue) * 100, 100)

  useEffect(() => {
    const timeout = setTimeout(() => setProgress(percentage), 300)
    return () => clearTimeout(timeout)
  }, [percentage])

  // Determine color based on progress
  const getColor = () => {
    if (progress < 40) return "text-lime-500"
    if (progress < 70) return "text-yellow-400"
    return "text-red-400"
  }

  const getStrokeColor = () => {
    if (progress < 40) return "#84cc16"
    if (progress < 70) return "#facc15"
    return "#f87171"
  }

  // SVG arc calculations for semicircle
  const size = 200
  const strokeWidth = 12
  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = Math.PI * radius

  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-52 h-28">
        {/* Background glow effect */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-lime-400 via-yellow-400 to-red-500 rounded-full blur-xl" />

        {/* SVG Gauge */}
        <svg width={size} height={size / 2 + 20} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease",
            }}
          />

          {/* Center value text */}
          <text
            x={center}
            y={center - 10}
            textAnchor="middle"
            className={cn("text-4xl font-bold fill-current", getColor())}
          >
            {showPercentage ? Math.round(progress) : value}
          </text>
          <text x={center} y={center + 15} textAnchor="middle" className="text-lg fill-gray-400">
            {showPercentage ? "%" : unit}
          </text>
        </svg>
      </div>

      {label && <p className="text-white text-sm mt-4 opacity-80 text-center max-w-xs">{label}</p>}
    </div>
  )
}
