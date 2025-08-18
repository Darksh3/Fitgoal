"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { safeLocalStorage } from "@/lib/performance-utils"

export function useOptimizedState<T>(initialValue: T, key?: string): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (key) {
      const stored = safeLocalStorage.getItem(key)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return initialValue
        }
      }
    }
    return initialValue
  })

  const setOptimizedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = typeof value === "function" ? (value as (prev: T) => T)(prev) : value

        if (key) {
          safeLocalStorage.setItem(key, JSON.stringify(newValue))
        }

        return newValue
      })
    },
    [key],
  )

  return [state, setOptimizedState]
}

// Debounced state for expensive operations
export function useDebouncedState<T>(initialValue: T, delay = 300): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const setValue = useCallback(
    (value: T) => {
      setImmediateValue(value)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)
    },
    [delay],
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [immediateValue, debouncedValue, setValue]
}

// Batch state updates for better performance
export function useBatchedState<T extends Record<string, any>>(
  initialState: T,
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = useState(initialState)
  const pendingUpdates = useRef<Partial<T>>({})
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, ...pendingUpdates.current }))
      pendingUpdates.current = {}
    }, 16) // Next frame
  }, [])

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (Object.keys(pendingUpdates.current).length > 0) {
      setState((prev) => ({ ...prev, ...pendingUpdates.current }))
      pendingUpdates.current = {}
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, batchUpdate, flushUpdates]
}
