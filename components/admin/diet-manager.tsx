"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface DietManagerProps {
  userId: string
}

export function AdminDietManager({ userId }: DietManagerProps) {
  const [diet, setDiet] = useState(null)
  const [editing, setEditing] = useState(false)
  const [dietData, setDietData] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDiet()
  }, [userId])

  const fetchDiet = async () => {
    try {
      const res = await fetch(`/api/admin/user-diet?userId=${userId}`)
      const data = await res.json()
      setDiet(data.diet)
      setDietData(JSON.stringify(data.diet, null, 2))
    } catch (error) {
      console.error("[v0] Error fetching diet:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveDiet = async () => {
    try {
      const res = await fetch("/api/admin/user-diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dietData: JSON.parse(dietData) })
      })
      if (res.ok) {
        fetchDiet()
        setEditing(false)
      }
    } catch (error) {
      console.error("[v0] Error saving diet:", error)
    }
  }

  if (loading) return <div className="text-slate-300">Carregando dieta...</div>

  return (
    <Card className="bg-slate-700 border-slate-600 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">Dieta</h3>
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
            value={dietData}
            onChange={(e) => setDietData(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white h-64 font-mono text-sm"
          />
          <Button
            onClick={saveDiet}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Salvar Dieta
          </Button>
        </div>
      ) : (
        <pre className="bg-slate-800 p-4 rounded text-slate-300 text-sm overflow-auto max-h-64">
          {dietData}
        </pre>
      )}
    </Card>
  )
}
