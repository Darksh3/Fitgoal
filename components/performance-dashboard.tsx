"use client"

import { useState, useEffect } from "react"
import { usePerformanceMonitor } from "@/lib/performance-monitor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function PerformanceDashboard() {
  const { getReport, exportMetrics } = usePerformanceMonitor()
  const [report, setReport] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const updateReport = () => {
        setReport(getReport())
      }

      updateReport()
      const interval = setInterval(updateReport, 5000) // Update every 5 seconds

      return () => clearInterval(interval)
    }
  }, [isVisible, getReport])

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          Performance
        </Button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80">
          <CardContent className="p-4">
            <div className="text-center">Loading performance data...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "bg-green-500"
    if (value <= thresholds.warning) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-h-96 overflow-y-auto">
      <Card className="w-80 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Performance Monitor</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const data = exportMetrics()
                  const blob = new Blob([data], { type: "application/json" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `performance-${Date.now()}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                variant="outline"
                size="sm"
              >
                Export
              </Button>
              <Button onClick={() => setIsVisible(false)} variant="outline" size="sm">
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>Page Load</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(report.summary.avgPageLoad || 0)}ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>API Response</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(report.summary.avgAPIResponse || 0)}ms
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>FPS</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(report.summary.avgFPS || 0)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Long Tasks</span>
                <Badge variant={report.summary.longTasks > 5 ? "destructive" : "outline"} className="text-xs">
                  {report.summary.longTasks}
                </Badge>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          {report.memoryTrend.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Memory Usage</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getStatusColor(
                      report.memoryTrend[report.memoryTrend.length - 1]?.metadata?.percentage || 0,
                      { good: 50, warning: 75 },
                    )}`}
                    style={{
                      width: `${Math.min(100, report.memoryTrend[report.memoryTrend.length - 1]?.metadata?.percentage || 0)}%`,
                    }}
                  />
                </div>
                <span className="text-xs">
                  {Math.round(report.memoryTrend[report.memoryTrend.length - 1]?.metadata?.percentage || 0)}%
                </span>
              </div>
            </div>
          )}

          {/* Active Timers */}
          {report.activeTimers.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Active Timers</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {report.activeTimers.map((timer: any) => (
                  <div key={timer.id} className="flex items-center justify-between">
                    <span className="truncate">{timer.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round((Date.now() - timer.startTime) / 1000)}s
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slowest APIs */}
          {report.slowestAPIs.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Slowest APIs</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {report.slowestAPIs.slice(0, 3).map((api: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="truncate text-xs">{api.metadata?.url?.split("/").pop() || "API"}</span>
                    <Badge variant={api.value > 3000 ? "destructive" : "outline"} className="text-xs">
                      {Math.round(api.value)}ms
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render Issues */}
          {report.renderIssues.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-red-600">Render Issues</div>
              <div className="text-xs text-red-600">{report.renderIssues.length} long tasks detected</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
