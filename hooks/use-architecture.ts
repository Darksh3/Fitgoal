"use client"

import { useCallback, useEffect, useState } from "react"
import { container } from "@/lib/dependency-injection"
import { architectureManager } from "@/lib/architecture"

// Hook for dependency injection
export function useDependency<T>(serviceName: string): T | null {
  const [service, setService] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (container.isRegistered(serviceName)) {
        const resolvedService = container.resolve<T>(serviceName)
        setService(resolvedService)
        setError(null)
      } else {
        setError(`Service ${serviceName} not registered`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setService(null)
    }
  }, [serviceName])

  return service
}

// Hook for service lifecycle management
export function useServiceLifecycle() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialize = useCallback(async () => {
    try {
      await architectureManager.initialize()
      setIsInitialized(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Initialization failed")
    }
  }, [])

  const destroy = useCallback(async () => {
    try {
      await architectureManager.destroy()
      setIsInitialized(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Destruction failed")
    }
  }, [])

  useEffect(() => {
    initialize()
    return () => {
      destroy()
    }
  }, [initialize, destroy])

  return { isInitialized, error, initialize, destroy }
}

// Hook for architecture patterns
export function useObserver<T>() {
  const [data, setData] = useState<T | null>(null)
  const [observers, setObservers] = useState<((data: T) => void)[]>([])

  const subscribe = useCallback((callback: (data: T) => void) => {
    setObservers((prev) => [...prev, callback])

    return () => {
      setObservers((prev) => prev.filter((cb) => cb !== callback))
    }
  }, [])

  const notify = useCallback(
    (newData: T) => {
      setData(newData)
      observers.forEach((observer) => observer(newData))
    },
    [observers],
  )

  return { data, subscribe, notify }
}

// Hook for factory pattern
export function useFactory<T>() {
  const [instances, setInstances] = useState<Map<string, T>>(new Map())

  const create = useCallback(
    <K extends T>(key: string, factory: () => K): K => {
      if (instances.has(key)) {
        return instances.get(key) as K
      }

      const instance = factory()
      setInstances((prev) => new Map(prev).set(key, instance))
      return instance
    },
    [instances],
  )

  const get = useCallback(
    (key: string): T | undefined => {
      return instances.get(key)
    },
    [instances],
  )

  const remove = useCallback(
    (key: string): boolean => {
      if (instances.has(key)) {
        setInstances((prev) => {
          const newMap = new Map(prev)
          newMap.delete(key)
          return newMap
        })
        return true
      }
      return false
    },
    [instances],
  )

  const clear = useCallback(() => {
    setInstances(new Map())
  }, [])

  return { create, get, remove, clear, instances: Array.from(instances.entries()) }
}

// Hook for command pattern
export function useCommand() {
  const [history, setHistory] = useState<Array<{ execute: () => void; undo: () => void }>>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const execute = useCallback(
    (command: { execute: () => void; undo: () => void }) => {
      command.execute()

      const newHistory = history.slice(0, currentIndex + 1)
      newHistory.push(command)

      setHistory(newHistory)
      setCurrentIndex(newHistory.length - 1)
    },
    [history, currentIndex],
  )

  const undo = useCallback(() => {
    if (currentIndex >= 0) {
      history[currentIndex].undo()
      setCurrentIndex(currentIndex - 1)
    }
  }, [history, currentIndex])

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1
      history[nextIndex].execute()
      setCurrentIndex(nextIndex)
    }
  }, [history, currentIndex])

  const canUndo = currentIndex >= 0
  const canRedo = currentIndex < history.length - 1

  return { execute, undo, redo, canUndo, canRedo, history: history.length }
}

// Hook for strategy pattern
export function useStrategy<T, R>(strategies: Record<string, (data: T) => R>) {
  const [currentStrategy, setCurrentStrategy] = useState<string>(Object.keys(strategies)[0])

  const execute = useCallback(
    (data: T): R => {
      const strategy = strategies[currentStrategy]
      if (!strategy) {
        throw new Error(`Strategy ${currentStrategy} not found`)
      }
      return strategy(data)
    },
    [strategies, currentStrategy],
  )

  const setStrategy = useCallback(
    (strategyName: string) => {
      if (!strategies[strategyName]) {
        throw new Error(`Strategy ${strategyName} not available`)
      }
      setCurrentStrategy(strategyName)
    },
    [strategies],
  )

  return {
    execute,
    setStrategy,
    currentStrategy,
    availableStrategies: Object.keys(strategies),
  }
}
