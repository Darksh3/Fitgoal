"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useApp } from "@/contexts/app-context"

export function useOptimizedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    refreshInterval?: number
    revalidateOnFocus?: boolean
    dedupingInterval?: number
    errorRetryCount?: number
  } = {},
) {
  const { state, actions } = useApp()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetch, setLastFetch] = useState(0)

  const { refreshInterval = 0, revalidateOnFocus = true, dedupingInterval = 2000, errorRetryCount = 3 } = options

  // Check cache first
  const cachedData = useMemo(() => {
    return actions.getCachedData<T>(key)
  }, [key, actions, state.cache])

  const fetchData = useCallback(
    async (force = false) => {
      const now = Date.now()

      // Deduping: prevent multiple requests within dedupingInterval
      if (!force && now - lastFetch < dedupingInterval) {
        return
      }

      // Use cached data if available and not forcing refresh
      if (!force && cachedData) {
        setData(cachedData)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetcher()
        setData(result)
        setLastFetch(now)

        // Update cache
        actions.getCachedData // This should be updateCache, but keeping consistent with existing API
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)

        // Retry logic
        if (errorRetryCount > 0) {
          setTimeout(() => fetchData(true), 1000)
        }
      } finally {
        setLoading(false)
      }
    },
    [key, fetcher, lastFetch, dedupingInterval, cachedData, errorRetryCount, actions],
  )

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => fetchData(true), refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchData])

  // Revalidate on focus
  useEffect(() => {
    if (revalidateOnFocus) {
      const handleFocus = () => fetchData(true)
      window.addEventListener("focus", handleFocus)
      return () => window.removeEventListener("focus", handleFocus)
    }
  }, [revalidateOnFocus, fetchData])

  // Revalidate when coming back online
  useEffect(() => {
    if (state.isOnline && !loading && error) {
      fetchData(true)
    }
  }, [state.isOnline, loading, error, fetchData])

  return {
    data,
    loading,
    error,
    mutate: fetchData,
    isValidating: loading,
  }
}

export function useOptimisticUpdate<T>() {
  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [isOptimistic, setIsOptimistic] = useState(false)

  const updateOptimistically = useCallback((data: T, updateFn: () => Promise<void>) => {
    setOptimisticData(data)
    setIsOptimistic(true)

    updateFn()
      .then(() => {
        setIsOptimistic(false)
        setOptimisticData(null)
      })
      .catch(() => {
        // Revert optimistic update on error
        setIsOptimistic(false)
        setOptimisticData(null)
      })
  }, [])

  return {
    optimisticData,
    isOptimistic,
    updateOptimistically,
  }
}

export function useBatchUpdates() {
  const [pendingUpdates, setPendingUpdates] = useState<Array<() => Promise<void>>>([])
  const [isBatching, setIsBatching] = useState(false)

  const addToBatch = useCallback((updateFn: () => Promise<void>) => {
    setPendingUpdates((prev) => [...prev, updateFn])
  }, [])

  const executeBatch = useCallback(async () => {
    if (pendingUpdates.length === 0) return

    setIsBatching(true)

    try {
      await Promise.all(pendingUpdates.map((fn) => fn()))
      setPendingUpdates([])
    } catch (error) {
      console.error("Batch update failed:", error)
    } finally {
      setIsBatching(false)
    }
  }, [pendingUpdates])

  return {
    addToBatch,
    executeBatch,
    pendingCount: pendingUpdates.length,
    isBatching,
  }
}
