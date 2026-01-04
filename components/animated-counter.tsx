"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedCounterProps {
  targetValue: number | null
  suffix?: string
  onComplete?: () => void
  delay?: number
}

export function AnimatedCounter({ targetValue, suffix = "", onComplete, delay = 0 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!targetValue) return

    const delayTimer = setTimeout(() => {
      setHasStarted(true)
    }, delay)

    return () => clearTimeout(delayTimer)
  }, [delay, targetValue])

  useEffect(() => {
    if (!hasStarted || !targetValue) return

    let animationFrameId: number
    const startTime = Date.now()
    const duration = 3000 // 3 seconds
    const startValue = 0

    const easeOutCubic = (t: number) => {
      return 1 - Math.pow(1 - t, 3)
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const currentValue = startValue + (targetValue - startValue) * easedProgress

      setDisplayValue(Math.round(currentValue * 10) / 10)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setDisplayValue(targetValue)
        if (onCompleteRef.current) {
          onCompleteRef.current()
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [hasStarted, targetValue])

  return (
    <>
      {displayValue.toFixed(1)}
      {suffix}
    </>
  )
}
