"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { dataPersistence, useBackupRestore } from "@/lib/data-persistence"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, Upload, Trash2, RefreshCw, Database } from "@/lib/icons"

export function DataManagementPanel() {
  const [storageInfo, setStorageInfo] = useState({
    totalKeys: 0,
    pendingSyncCount: 0,
    estimatedSize: 0,
  })
  const [isVisible, setIsVisible] = useState(false)
  const { createBackup, restoreFromFile, isCreatingBackup, isRestoring } = useBackupRestore()

  useEffect(() => {
    if (isVisible) {
      const updateInfo = () => {
        setStorageInfo(dataPersistence.getStorageInfo())
      }

      updateInfo()
      const interval = setInterval(updateInfo, 5000)

      return () => clearInterval(interval)
    }
  }, [isVisible])

  const handleFileRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      restoreFromFile(file).then((success) => {
        if (success) {
          alert("Data restored successfully!")
          window.location.reload()
        } else {
          alert("Failed to restore data. Please check the backup file.")
        }
      })
    }
  }

  const handleClearAllData = async () => {
    if (confirm("Are you sure you want to clear all local data? This action cannot be undone.")) {
      await dataPersistence.clearAllData()
      setStorageInfo({ totalKeys: 0, pendingSyncCount: 0, estimatedSize: 0 })
      alert("All data cleared successfully!")
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Database className="w-4 h-4 mr-2" />
          Data
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 max-h-96 overflow-y-auto">
      <Card className="w-80 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Data Management</CardTitle>
            <Button onClick={() => setIsVisible(false)} variant="outline" size="sm">
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Storage Statistics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Stored Items</span>
              <Badge variant="outline">{storageInfo.totalKeys}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending Sync</span>
              <Badge variant={storageInfo.pendingSyncCount > 0 ? "destructive" : "outline"}>
                {storageInfo.pendingSyncCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Storage Used</span>
              <Badge variant="outline">{formatBytes(storageInfo.estimatedSize)}</Badge>
            </div>
          </div>

          {/* Storage Usage Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Storage Usage</span>
              <span>{Math.round((storageInfo.estimatedSize / (5 * 1024 * 1024)) * 100)}%</span>
            </div>
            <Progress value={(storageInfo.estimatedSize / (5 * 1024 * 1024)) * 100} className="h-2" />
            <div className="text-xs text-muted-foreground">5MB limit (estimated)</div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Backup & Restore</div>
            <div className="flex gap-2">
              <Button
                onClick={createBackup}
                disabled={isCreatingBackup}
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent"
              >
                {isCreatingBackup ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Download className="w-3 h-3 mr-1" />
                )}
                Backup
              </Button>
              <label className="flex-1">
                <Button variant="outline" size="sm" className="w-full bg-transparent" disabled={isRestoring} asChild>
                  <span>
                    {isRestoring ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3 mr-1" />
                    )}
                    Restore
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  className="hidden"
                  disabled={isRestoring}
                />
              </label>
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Data Management</div>
            <Button
              onClick={handleClearAllData}
              variant="outline"
              size="sm"
              className="w-full text-red-600 hover:text-red-700 bg-transparent"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All Data
            </Button>
          </div>

          {/* Sync Status */}
          {storageInfo.pendingSyncCount > 0 && (
            <div className="p-2 bg-yellow-50 rounded text-xs">
              <div className="font-medium text-yellow-800">Sync Pending</div>
              <div className="text-yellow-600">{storageInfo.pendingSyncCount} items waiting to sync when online</div>
            </div>
          )}

          {/* Offline Indicator */}
          {!navigator.onLine && (
            <div className="p-2 bg-red-50 rounded text-xs">
              <div className="font-medium text-red-800">Offline Mode</div>
              <div className="text-red-600">Data will sync when connection is restored</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
