"use client"

import React from "react"

import { safeLocalStorage } from "@/lib/performance-utils"

interface DataEntry<T = any> {
  data: T
  timestamp: number
  version: number
  checksum: string
  synced: boolean
  lastModified: number
}

interface SyncConflict<T = any> {
  key: string
  localData: T
  remoteData: T
  localTimestamp: number
  remoteTimestamp: number
}

interface BackupMetadata {
  timestamp: number
  version: string
  dataKeys: string[]
  totalSize: number
}

class DataPersistenceManager {
  private static instance: DataPersistenceManager
  private syncQueue: Set<string> = new Set()
  private conflictResolver: Map<string, (conflict: SyncConflict) => any> = new Map()
  private migrationHandlers: Map<number, (data: any) => any> = new Map()
  private currentVersion = 1

  private constructor() {
    this.initializeIndexedDB()
    this.setupPeriodicSync()
    this.setupStorageEventListener()
  }

  static getInstance(): DataPersistenceManager {
    if (!DataPersistenceManager.instance) {
      DataPersistenceManager.instance = new DataPersistenceManager()
    }
    return DataPersistenceManager.instance
  }

  private async initializeIndexedDB(): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return

    try {
      const request = indexedDB.open("FitGoalDB", this.currentVersion)

      request.onerror = () => {
        console.warn("IndexedDB not available, falling back to localStorage")
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains("userData")) {
          const store = db.createObjectStore("userData", { keyPath: "key" })
          store.createIndex("timestamp", "timestamp", { unique: false })
          store.createIndex("synced", "synced", { unique: false })
        }

        if (!db.objectStoreNames.contains("backups")) {
          db.createObjectStore("backups", { keyPath: "timestamp" })
        }
      }

      request.onsuccess = () => {
        console.log("IndexedDB initialized successfully")
      }
    } catch (error) {
      console.warn("Failed to initialize IndexedDB:", error)
    }
  }

  private setupPeriodicSync(): void {
    // Sync every 5 minutes
    setInterval(
      () => {
        this.syncPendingData()
      },
      5 * 60 * 1000,
    )

    // Sync when coming back online
    window.addEventListener("online", () => {
      this.syncPendingData()
    })
  }

  private setupStorageEventListener(): void {
    window.addEventListener("storage", (event) => {
      if (event.key?.startsWith("fitgoal_")) {
        // Handle cross-tab synchronization
        this.handleCrossTabSync(event.key, event.newValue)
      }
    })
  }

  private generateChecksum(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  async setData<T>(
    key: string,
    data: T,
    options: {
      skipSync?: boolean
      version?: number
    } = {},
  ): Promise<boolean> {
    try {
      const entry: DataEntry<T> = {
        data,
        timestamp: Date.now(),
        version: options.version || this.currentVersion,
        checksum: this.generateChecksum(data),
        synced: options.skipSync || false,
        lastModified: Date.now(),
      }

      // Try IndexedDB first
      const idbSuccess = await this.setIndexedDBData(key, entry)

      // Fallback to localStorage
      if (!idbSuccess) {
        const success = safeLocalStorage.setItem(`fitgoal_${key}`, JSON.stringify(entry))
        if (!success) return false
      }

      // Add to sync queue if not skipping sync
      if (!options.skipSync) {
        this.syncQueue.add(key)
      }

      return true
    } catch (error) {
      console.error("Failed to set data:", error)
      return false
    }
  }

  async getData<T>(key: string): Promise<T | null> {
    try {
      // Try IndexedDB first
      let entry = await this.getIndexedDBData<T>(key)

      // Fallback to localStorage
      if (!entry) {
        const stored = safeLocalStorage.getItem(`fitgoal_${key}`)
        if (stored) {
          entry = JSON.parse(stored)
        }
      }

      if (!entry) return null

      // Validate checksum
      const expectedChecksum = this.generateChecksum(entry.data)
      if (entry.checksum !== expectedChecksum) {
        console.warn(`Data corruption detected for key: ${key}`)
        return null
      }

      // Handle data migration if needed
      if (entry.version < this.currentVersion) {
        const migratedData = await this.migrateData(entry.data, entry.version)
        if (migratedData) {
          await this.setData(key, migratedData, { skipSync: true, version: this.currentVersion })
          return migratedData
        }
      }

      return entry.data
    } catch (error) {
      console.error("Failed to get data:", error)
      return null
    }
  }

  async removeData(key: string): Promise<boolean> {
    try {
      // Remove from IndexedDB
      await this.removeIndexedDBData(key)

      // Remove from localStorage
      safeLocalStorage.removeItem(`fitgoal_${key}`)

      // Remove from sync queue
      this.syncQueue.delete(key)

      return true
    } catch (error) {
      console.error("Failed to remove data:", error)
      return false
    }
  }

  private async setIndexedDBData<T>(key: string, entry: DataEntry<T>): Promise<boolean> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return false

    try {
      const request = indexedDB.open("FitGoalDB", this.currentVersion)

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(["userData"], "readwrite")
          const store = transaction.objectStore("userData")

          const putRequest = store.put({ key, ...entry })

          putRequest.onsuccess = () => resolve(true)
          putRequest.onerror = () => resolve(false)
        }

        request.onerror = () => resolve(false)
      })
    } catch (error) {
      return false
    }
  }

  private async getIndexedDBData<T>(key: string): Promise<DataEntry<T> | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return null

    try {
      const request = indexedDB.open("FitGoalDB", this.currentVersion)

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(["userData"], "readonly")
          const store = transaction.objectStore("userData")

          const getRequest = store.get(key)

          getRequest.onsuccess = () => {
            const result = getRequest.result
            if (result) {
              const { key: _, ...entry } = result
              resolve(entry as DataEntry<T>)
            } else {
              resolve(null)
            }
          }

          getRequest.onerror = () => resolve(null)
        }

        request.onerror = () => resolve(null)
      })
    } catch (error) {
      return null
    }
  }

  private async removeIndexedDBData(key: string): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return

    try {
      const request = indexedDB.open("FitGoalDB", this.currentVersion)

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(["userData"], "readwrite")
          const store = transaction.objectStore("userData")

          const deleteRequest = store.delete(key)

          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => resolve()
        }

        request.onerror = () => resolve()
      })
    } catch (error) {
      // Ignore errors
    }
  }

  async createBackup(): Promise<string | null> {
    try {
      const allKeys = this.getAllStoredKeys()
      const backupData: Record<string, any> = {}

      for (const key of allKeys) {
        const data = await this.getData(key)
        if (data) {
          backupData[key] = data
        }
      }

      const backup = {
        timestamp: Date.now(),
        version: this.currentVersion,
        data: backupData,
        metadata: {
          timestamp: Date.now(),
          version: "1.0.0",
          dataKeys: allKeys,
          totalSize: JSON.stringify(backupData).length,
        } as BackupMetadata,
      }

      const backupString = JSON.stringify(backup)

      // Store backup in IndexedDB
      await this.storeBackup(backup)

      return backupString
    } catch (error) {
      console.error("Failed to create backup:", error)
      return null
    }
  }

  async restoreFromBackup(backupString: string): Promise<boolean> {
    try {
      const backup = JSON.parse(backupString)

      if (!backup.data || !backup.metadata) {
        throw new Error("Invalid backup format")
      }

      // Clear existing data
      const existingKeys = this.getAllStoredKeys()
      for (const key of existingKeys) {
        await this.removeData(key)
      }

      // Restore data
      for (const [key, data] of Object.entries(backup.data)) {
        await this.setData(key, data, { skipSync: true })
      }

      console.log("Data restored from backup successfully")
      return true
    } catch (error) {
      console.error("Failed to restore from backup:", error)
      return false
    }
  }

  private async storeBackup(backup: any): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) return

    try {
      const request = indexedDB.open("FitGoalDB", this.currentVersion)

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(["backups"], "readwrite")
          const store = transaction.objectStore("backups")

          const putRequest = store.put(backup)

          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => resolve()
        }

        request.onerror = () => resolve()
      })
    } catch (error) {
      // Ignore errors
    }
  }

  private getAllStoredKeys(): string[] {
    const keys: string[] = []

    // Get keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("fitgoal_")) {
        keys.push(key.replace("fitgoal_", ""))
      }
    }

    return keys
  }

  private async syncPendingData(): Promise<void> {
    if (this.syncQueue.size === 0 || !navigator.onLine) return

    console.log(`Syncing ${this.syncQueue.size} pending items...`)

    for (const key of this.syncQueue) {
      try {
        const data = await this.getData(key)
        if (data) {
          // Here you would sync with your remote database (Firebase, etc.)
          // For now, we'll just mark as synced
          await this.markAsSynced(key)
          this.syncQueue.delete(key)
        }
      } catch (error) {
        console.error(`Failed to sync key ${key}:`, error)
      }
    }
  }

  private async markAsSynced(key: string): Promise<void> {
    const entry = await this.getIndexedDBData(key)
    if (entry) {
      entry.synced = true
      await this.setIndexedDBData(key, entry)
    }
  }

  private async migrateData(data: any, fromVersion: number): Promise<any> {
    let migratedData = data

    for (let version = fromVersion; version < this.currentVersion; version++) {
      const migrationHandler = this.migrationHandlers.get(version + 1)
      if (migrationHandler) {
        migratedData = migrationHandler(migratedData)
      }
    }

    return migratedData
  }

  private handleCrossTabSync(key: string, newValue: string | null): void {
    // Handle synchronization between tabs
    if (newValue) {
      try {
        const entry = JSON.parse(newValue)
        // Update local cache or trigger re-render
        console.log(`Cross-tab sync for key: ${key}`)
      } catch (error) {
        console.error("Failed to handle cross-tab sync:", error)
      }
    }
  }

  // Public API methods
  registerConflictResolver(key: string, resolver: (conflict: SyncConflict) => any): void {
    this.conflictResolver.set(key, resolver)
  }

  registerMigrationHandler(version: number, handler: (data: any) => any): void {
    this.migrationHandlers.set(version, handler)
  }

  async clearAllData(): Promise<void> {
    const keys = this.getAllStoredKeys()
    for (const key of keys) {
      await this.removeData(key)
    }
    this.syncQueue.clear()
  }

  getStorageInfo(): {
    totalKeys: number
    pendingSyncCount: number
    estimatedSize: number
  } {
    const keys = this.getAllStoredKeys()
    let estimatedSize = 0

    for (const key of keys) {
      const stored = safeLocalStorage.getItem(`fitgoal_${key}`)
      if (stored) {
        estimatedSize += stored.length
      }
    }

    return {
      totalKeys: keys.length,
      pendingSyncCount: this.syncQueue.size,
      estimatedSize,
    }
  }
}

export const dataPersistence = DataPersistenceManager.getInstance()

// React hooks for data persistence
export function usePersistentData<T>(key: string, initialValue: T) {
  const [data, setData] = React.useState<T>(initialValue)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadData = async () => {
      const stored = await dataPersistence.getData<T>(key)
      if (stored !== null) {
        setData(stored)
      }
      setLoading(false)
    }

    loadData()
  }, [key])

  const updateData = React.useCallback(
    async (newData: T) => {
      setData(newData)
      await dataPersistence.setData(key, newData)
    },
    [key],
  )

  return { data, updateData, loading }
}

export function useBackupRestore() {
  const [isCreatingBackup, setIsCreatingBackup] = React.useState(false)
  const [isRestoring, setIsRestoring] = React.useState(false)

  const createBackup = React.useCallback(async () => {
    setIsCreatingBackup(true)
    try {
      const backup = await dataPersistence.createBackup()
      if (backup) {
        // Download backup file
        const blob = new Blob([backup], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `fitgoal-backup-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        return true
      }
      return false
    } finally {
      setIsCreatingBackup(false)
    }
  }, [])

  const restoreFromFile = React.useCallback(async (file: File) => {
    setIsRestoring(true)
    try {
      const text = await file.text()
      return await dataPersistence.restoreFromBackup(text)
    } finally {
      setIsRestoring(false)
    }
  }, [])

  return {
    createBackup,
    restoreFromFile,
    isCreatingBackup,
    isRestoring,
  }
}
