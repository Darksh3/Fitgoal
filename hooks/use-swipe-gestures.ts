"use client"

import { useEffect, useRef, useState } from "react"

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventScroll?: boolean
}

export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  preventScroll = false,
}: SwipeGestureOptions) {
  const elementRef = useRef<HTMLElement>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault()
      }
      setTouchEnd(null)
      setTouchStart({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault()
      }
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      })
    }

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return

      const distanceX = touchStart.x - touchEnd.x
      const distanceY = touchStart.y - touchEnd.y
      const isLeftSwipe = distanceX > threshold
      const isRightSwipe = distanceX < -threshold
      const isUpSwipe = distanceY > threshold
      const isDownSwipe = distanceY < -threshold

      // Determine if horizontal or vertical swipe is more significant
      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        // Horizontal swipe
        if (isLeftSwipe && onSwipeLeft) {
          onSwipeLeft()
        } else if (isRightSwipe && onSwipeRight) {
          onSwipeRight()
        }
      } else {
        // Vertical swipe
        if (isUpSwipe && onSwipeUp) {
          onSwipeUp()
        } else if (isDownSwipe && onSwipeDown) {
          onSwipeDown()
        }
      }
    }

    element.addEventListener("touchstart", handleTouchStart, { passive: !preventScroll })
    element.addEventListener("touchmove", handleTouchMove, { passive: !preventScroll })
    element.addEventListener("touchend", handleTouchEnd)

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
      element.removeEventListener("touchend", handleTouchEnd)
    }
  }, [touchStart, touchEnd, threshold, preventScroll, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return elementRef
}

export function usePullToRefresh(onRefresh: () => void | Promise<void>, threshold = 100) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const swipeRef = useSwipeGestures({
    onSwipeDown: async () => {
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
          setIsPulling(false)
        }
      }
    },
    threshold: threshold / 2,
  })

  useEffect(() => {
    const element = swipeRef.current
    if (!element) return

    let startY = 0
    let currentY = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return

      currentY = e.touches[0].clientY
      const distance = Math.max(0, currentY - startY)

      if (distance > 0) {
        e.preventDefault()
        setPullDistance(Math.min(distance, threshold * 1.5))
      }
    }

    const handleTouchEnd = () => {
      setIsPulling(false)
      if (pullDistance < threshold) {
        setPullDistance(0)
      }
    }

    element.addEventListener("touchstart", handleTouchStart, { passive: false })
    element.addEventListener("touchmove", handleTouchMove, { passive: false })
    element.addEventListener("touchend", handleTouchEnd)

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
      element.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isPulling, pullDistance, threshold])

  return {
    swipeRef,
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1),
  }
}
