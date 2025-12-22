"use client"

import { useEffect, useState } from "react"

interface GaugeProps {
  value: number
  max: number
  size?: number
  label?: string
  unit?: string
  color?: string
}

export function Gauge({ value, max, size = 200, label, unit, color }: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  const percentage = Math.min((animatedValue / max) * 100, 100)
  const angle = (percentage / 100) * 180

  // Determine color based on percentage if not provided
  const getColor = () => {
    if (color) return color
    if (percentage < 33) return "#ef4444" // red
    if (percentage < 66) return "#eab308" // yellow
    return "#84cc16" // lime
  }

  const gaugeColor = getColor()

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size / 2 + 40 }}>
      <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${size * 0.1} ${size / 2} A ${size * 0.4} ${size * 0.4} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
        />

        {/* Colored arc with glow */}
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={`M ${size * 0.1} ${size / 2} A ${size * 0.4} ${size * 0.4} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * (size * 1.256)} ${size * 1.256}`}
          style={{
            transition: "stroke-dasharray 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `url(#glow-${label})`,
          }}
        />
      </svg>

      {/* Value display */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-3xl font-bold text-white">
          {animatedValue.toFixed(1)}
          {unit && <span className="text-xl ml-1">{unit}</span>}
        </div>
        {label && <div className="text-sm text-gray-400 mt-1">{label}</div>}
      </div>
    </div>
  )
}
