"use client"

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  category: "api" | "render" | "user" | "memory" | "network"
  metadata?: Record<string, any>
}

interface TimerSession {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  type: "workout" | "rest" | "exercise" | "custom"
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, TimerSession> = new Map()
  private observers: PerformanceObserver[] = []
  private isMonitoring = false
  private maxMetrics = 1000

  private constructor() {
    this.initializeObservers()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private initializeObservers() {
    if (typeof window === "undefined") return

    try {
      // Long Task Observer
      if ("PerformanceObserver" in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: "long-task",
              value: entry.duration,
              timestamp: Date.now(),
              category: "render",
              metadata: {
                startTime: entry.startTime,
                name: entry.name,
              },
            })
          }
        })

        try {
          longTaskObserver.observe({ entryTypes: ["longtask"] })
          this.observers.push(longTaskObserver)
        } catch (e) {
          console.warn("Long task observer not supported")
        }

        // Navigation Observer
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordMetric({
              name: "page-load",
              value: navEntry.loadEventEnd - navEntry.navigationStart,
              timestamp: Date.now(),
              category: "network",
              metadata: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
                firstPaint: navEntry.loadEventStart - navEntry.navigationStart,
                type: navEntry.type,
              },
            })
          }
        })

        try {
          navigationObserver.observe({ entryTypes: ["navigation"] })
          this.observers.push(navigationObserver)
        } catch (e) {
          console.warn("Navigation observer not supported")
        }

        // Resource Observer
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resourceEntry = entry as PerformanceResourceTiming
            if (resourceEntry.name.includes("/api/")) {
              this.recordMetric({
                name: "api-request",
                value: resourceEntry.responseEnd - resourceEntry.requestStart,
                timestamp: Date.now(),
                category: "api",
                metadata: {
                  url: resourceEntry.name,
                  size: resourceEntry.transferSize,
                  cached: resourceEntry.transferSize === 0,
                },
              })
            }
          }
        })

        try {
          resourceObserver.observe({ entryTypes: ["resource"] })
          this.observers.push(resourceObserver)
        } catch (e) {
          console.warn("Resource observer not supported")
        }
      }
    } catch (error) {
      console.warn("Performance observers initialization failed:", error)
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true

    // Memory monitoring
    if ("memory" in performance) {
      const memoryInterval = setInterval(() => {
        const memory = (performance as any).memory
        this.recordMetric({
          name: "memory-usage",
          value: memory.usedJSHeapSize,
          timestamp: Date.now(),
          category: "memory",
          metadata: {
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          },
        })
      }, 30000) // Every 30 seconds

      // Store interval for cleanup
      ;(this as any).memoryInterval = memoryInterval
    }

    // FPS monitoring
    let lastTime = performance.now()
    let frameCount = 0

    const measureFPS = () => {
      frameCount++
      const currentTime = performance.now()

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        this.recordMetric({
          name: "fps",
          value: fps,
          timestamp: Date.now(),
          category: "render",
        })

        frameCount = 0
        lastTime = currentTime
      }

      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS)
      }
    }

    requestAnimationFrame(measureFPS)
  }

  stopMonitoring() {
    this.isMonitoring = false

    // Clean up observers
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []

    // Clean up intervals
    if ((this as any).memoryInterval) {
      clearInterval((this as any).memoryInterval)
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log critical performance issues
    if (metric.category === "render" && metric.value > 50) {
      console.warn(`[Performance] Long task detected: ${metric.value}ms`)
    }

    if (metric.category === "api" && metric.value > 5000) {
      console.warn(`[Performance] Slow API request: ${metric.value}ms`)
    }

    if (metric.category === "memory" && metric.metadata?.percentage > 80) {
      console.warn(`[Performance] High memory usage: ${metric.metadata.percentage}%`)
    }
  }

  // Timer functionality
  startTimer(name: string, type: TimerSession["type"] = "custom", metadata?: Record<string, any>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const session: TimerSession = {
      id,
      name,
      startTime: Date.now(),
      type,
      metadata,
    }

    this.timers.set(id, session)

    this.recordMetric({
      name: "timer-start",
      value: 0,
      timestamp: Date.now(),
      category: "user",
      metadata: { timerId: id, timerName: name, timerType: type },
    })

    return id
  }

  stopTimer(id: string): TimerSession | null {
    const session = this.timers.get(id)
    if (!session) return null

    const endTime = Date.now()
    const duration = endTime - session.startTime

    session.endTime = endTime
    session.duration = duration

    this.recordMetric({
      name: "timer-stop",
      value: duration,
      timestamp: Date.now(),
      category: "user",
      metadata: {
        timerId: id,
        timerName: session.name,
        timerType: session.type,
        duration,
      },
    })

    return session
  }

  getTimer(id: string): TimerSession | null {
    return this.timers.get(id) || null
  }

  getAllTimers(): TimerSession[] {
    return Array.from(this.timers.values())
  }

  getActiveTimers(): TimerSession[] {
    return Array.from(this.timers.values()).filter((timer) => !timer.endTime)
  }

  clearTimer(id: string): boolean {
    return this.timers.delete(id)
  }

  clearAllTimers(): void {
    this.timers.clear()
  }

  // Analytics
  getMetrics(
    category?: PerformanceMetric["category"],
    timeRange?: { start: number; end: number },
  ): PerformanceMetric[] {
    let filtered = this.metrics

    if (category) {
      filtered = filtered.filter((metric) => metric.category === category)
    }

    if (timeRange) {
      filtered = filtered.filter((metric) => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end)
    }

    return filtered
  }

  getAverageMetric(name: string, timeRange?: { start: number; end: number }): number {
    const metrics = this.getMetrics(undefined, timeRange).filter((m) => m.name === name)
    if (metrics.length === 0) return 0

    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / metrics.length
  }

  getPerformanceReport(): {
    summary: Record<string, any>
    slowestAPIs: PerformanceMetric[]
    memoryTrend: PerformanceMetric[]
    renderIssues: PerformanceMetric[]
    activeTimers: TimerSession[]
  } {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const recentMetrics = this.getMetrics(undefined, { start: oneHourAgo, end: now })

    return {
      summary: {
        totalMetrics: this.metrics.length,
        avgPageLoad: this.getAverageMetric("page-load", { start: oneHourAgo, end: now }),
        avgAPIResponse: this.getAverageMetric("api-request", { start: oneHourAgo, end: now }),
        avgFPS: this.getAverageMetric("fps", { start: oneHourAgo, end: now }),
        longTasks: recentMetrics.filter((m) => m.name === "long-task").length,
      },
      slowestAPIs: recentMetrics
        .filter((m) => m.name === "api-request")
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      memoryTrend: recentMetrics.filter((m) => m.name === "memory-usage").slice(-20),
      renderIssues: recentMetrics.filter((m) => m.name === "long-task").slice(-10),
      activeTimers: this.getActiveTimers(),
    }
  }

  exportMetrics(): string {
    return JSON.stringify(
      {
        timestamp: Date.now(),
        metrics: this.metrics,
        timers: Array.from(this.timers.values()),
        report: this.getPerformanceReport(),
      },
      null,
      2,
    )
  }

  clearMetrics(): void {
    this.metrics = []
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// React hooks for performance monitoring
export function usePerformanceMonitor() {
  return {
    startMonitoring: () => performanceMonitor.startMonitoring(),
    stopMonitoring: () => performanceMonitor.stopMonitoring(),
    recordMetric: (metric: Omit<PerformanceMetric, "timestamp">) =>
      performanceMonitor.recordMetric({ ...metric, timestamp: Date.now() }),
    getReport: () => performanceMonitor.getPerformanceReport(),
    exportMetrics: () => performanceMonitor.exportMetrics(),
  }
}

export function useTimer() {
  return {
    startTimer: (name: string, type?: TimerSession["type"], metadata?: Record<string, any>) =>
      performanceMonitor.startTimer(name, type, metadata),
    stopTimer: (id: string) => performanceMonitor.stopTimer(id),
    getTimer: (id: string) => performanceMonitor.getTimer(id),
    getAllTimers: () => performanceMonitor.getAllTimers(),
    getActiveTimers: () => performanceMonitor.getActiveTimers(),
    clearTimer: (id: string) => performanceMonitor.clearTimer(id),
    clearAllTimers: () => performanceMonitor.clearAllTimers(),
  }
}
