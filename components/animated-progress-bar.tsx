"use client"

import { useEffect, useState } from "react"

interface AnimatedProgressBarProps {
  percentage: number
  color?: string
  delay?: number
}

export function AnimatedProgressBar({ percentage, color = "bg-lime-500", delay = 0 }: AnimatedProgressBarProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setHasStarted(true)
    }, delay)

    return () => clearTimeout(delayTimer)
  }, [delay])

  useEffect(() => {
    if (!hasStarted) return

    let animationFrameId: number
    const startTime = Date.now()
    const duration = 1500 // 1.5 seconds
    const startValue = 0

    const easeOutCubic = (t: number) => {
      return 1 - Math.pow(1 - t, 3)
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const currentValue = startValue + (percentage - startValue) * easedProgress

      setDisplayPercentage(Math.round(currentValue))

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setDisplayPercentage(percentage)
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [hasStarted, percentage])

  return (
    <div className="w-full bg-gray-700 rounded-full overflow-hidden h-3">
      <div
        className={`h-full ${color} transition-all duration-300 rounded-full`}
        style={{ width: `${displayPercentage}%` }}
      />
    </div>
  )
}
