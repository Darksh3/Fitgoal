"use client"

import { useEffect, useCallback } from "react"
import { usePerformanceMonitor } from "@/lib/performance-monitor"

export function usePerformanceTracking(componentName: string) {
  const { recordMetric } = usePerformanceMonitor()

  // Track component mount/unmount
  useEffect(() => {
    const mountTime = Date.now()

    recordMetric({
      name: "component-mount",
      value: 0,
      category: "render",
      metadata: { component: componentName },
    })

    return () => {
      recordMetric({
        name: "component-unmount",
        value: Date.now() - mountTime,
        category: "render",
        metadata: { component: componentName },
      })
    }
  }, [componentName, recordMetric])

  // Track user interactions
  const trackInteraction = useCallback(
    (action: string, metadata?: Record<string, any>) => {
      recordMetric({
        name: "user-interaction",
        value: Date.now(),
        category: "user",
        metadata: {
          component: componentName,
          action,
          ...metadata,
        },
      })
    },
    [componentName, recordMetric],
  )

  // Track API calls
  const trackApiCall = useCallback(
    async (apiCall: () => Promise<any>, apiName: string): Promise<any> => {
      const startTime = Date.now()

      try {
        const result = await apiCall()
        const duration = Date.now() - startTime

        recordMetric({
          name: "api-call-success",
          value: duration,
          category: "api",
          metadata: {
            component: componentName,
            api: apiName,
            success: true,
          },
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime

        recordMetric({
          name: "api-call-error",
          value: duration,
          category: "api",
          metadata: {
            component: componentName,
            api: apiName,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })

        throw error
      }
    },
    [componentName, recordMetric],
  )

  return {
    trackInteraction,
    trackApiCall,
  }
}

export function useRenderTracking(componentName: string) {
  const { recordMetric } = usePerformanceMonitor()

  useEffect(() => {
    const startTime = performance.now()

    // Track render time
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "measure") {
          recordMetric({
            name: "component-render",
            value: entry.duration,
            category: "render",
            metadata: { component: componentName },
          })
        }
      }
    })

    try {
      observer.observe({ entryTypes: ["measure"] })
      performance.mark(`${componentName}-render-start`)

      return () => {
        performance.mark(`${componentName}-render-end`)
        performance.measure("measure", `${componentName}-render-start`, `${componentName}-render-end`)
        observer.disconnect()
      }
    } catch (error) {
      console.warn("Performance measurement not supported")
      observer.disconnect()
    }
  }, [componentName, recordMetric])
}
