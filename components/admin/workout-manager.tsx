"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface WorkoutManagerProps {
  userId: string
}

export function AdminWorkoutManager({ userId }: WorkoutManagerProps) {
  const [workout, setWorkout] = useState(null)
  const [editing, setEditing] = useState(false)
  const [workoutData, setWorkoutData] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkout()
  }, [userId])

  const fetchWorkout = async () => {
    try {
      const res = await fetch(`/api/admin/user-workout?userId=${userId}`)
      const data = await res.json()
      setWorkout(data.workout)
      setWorkoutData(JSON.stringify(data.workout, null, 2))
    } catch (error) {
      console.error("[v0] Error fetching workout:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveWorkout = async () => {
    try {
      const res = await fetch("/api/admin/user-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, workoutData: JSON.parse(workoutData) })
      })
      if (res.ok) {
        fetchWorkout()
        setEditing(false)
      }
    } catch (error) {
      console.error("[v0] Error saving workout:", error)
    }
  }

  if (loading) return <div className="text-slate-300">Carregando treino...</div>

  return (
    <Card className="bg-slate-700 border-slate-600 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">Treino</h3>
        <Button
          onClick={() => setEditing(!editing)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {editing ? "Cancelar" : "Editar"}
        </Button>
      </div>

      {editing ? (
        <div className="space-y-4">
          <Textarea
            value={workoutData}
            onChange={(e) => setWorkoutData(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white h-64 font-mono text-sm"
          />
          <Button
            onClick={saveWorkout}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Salvar Treino
          </Button>
        </div>
      ) : (
        <pre className="bg-slate-800 p-4 rounded text-slate-300 text-sm overflow-auto max-h-64">
          {workoutData}
        </pre>
      )}
    </Card>
  )
}
