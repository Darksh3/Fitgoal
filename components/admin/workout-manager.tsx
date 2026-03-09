"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react"

interface Exercise {
  name: string
  sets: string
  reps: string
  rest: string
  description: string
}

interface WorkoutDay {
  day: string
  title: string
  focus: string
  duration: string
  exercises: Exercise[]
}

interface WorkoutPlan {
  days: WorkoutDay[]
  weeklySchedule: string
  tips: string[]
}

interface WorkoutManagerProps {
  userId: string
}

const emptyExercise = (): Exercise => ({ name: "", sets: "", reps: "", rest: "", description: "" })
const emptyDay = (): WorkoutDay => ({
  day: "",
  title: "",
  focus: "",
  duration: "",
  exercises: [emptyExercise()],
})
const emptyWorkout = (): WorkoutPlan => ({
  days: [emptyDay()],
  weeklySchedule: "",
  tips: [""],
})

export function AdminWorkoutManager({ userId }: WorkoutManagerProps) {
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<WorkoutPlan>(emptyWorkout())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [expandedDays, setExpandedDays] = useState<number[]>([0])

  useEffect(() => {
    fetchWorkout()
  }, [userId])

  const fetchWorkout = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/user-workout?userId=${userId}`)
      const data = await res.json()
      setWorkout(data.workout)
      if (data.workout) {
        setForm(normalizeForm(data.workout))
      }
    } catch (error) {
      console.error("[v0] Error fetching workout:", error)
    } finally {
      setLoading(false)
    }
  }

  const normalizeForm = (w: any): WorkoutPlan => ({
    weeklySchedule: w.weeklySchedule || "",
    tips: Array.isArray(w.tips) ? w.tips : [],
    days: Array.isArray(w.days) ? w.days.map((d: any) => ({
      day: d.day || "",
      title: d.title || "",
      focus: d.focus || "",
      duration: d.duration || "",
      exercises: Array.isArray(d.exercises) ? d.exercises.map((e: any) => ({
        name: e.name || "",
        sets: e.sets || "",
        reps: e.reps || "",
        rest: e.rest || "",
        description: e.description || "",
      })) : [emptyExercise()],
    })) : [emptyDay()],
  })

  const saveWorkout = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/admin/user-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, workoutData: form }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Erro ao salvar")
      }
      setSaveSuccess(true)
      await fetchWorkout()
      setEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error: any) {
      setSaveError(error.message || "Erro desconhecido ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof WorkoutPlan, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateDay = (dIdx: number, field: keyof WorkoutDay, value: string) => {
    setForm(prev => {
      const days = [...prev.days]
      days[dIdx] = { ...days[dIdx], [field]: value }
      return { ...prev, days }
    })
  }

  const updateExercise = (dIdx: number, eIdx: number, field: keyof Exercise, value: string) => {
    setForm(prev => {
      const days = [...prev.days]
      const exercises = [...days[dIdx].exercises]
      exercises[eIdx] = { ...exercises[eIdx], [field]: value }
      days[dIdx] = { ...days[dIdx], exercises }
      return { ...prev, days }
    })
  }

  const addDay = () => {
    const idx = form.days.length
    setForm(prev => ({ ...prev, days: [...prev.days, emptyDay()] }))
    setExpandedDays(prev => [...prev, idx])
  }

  const removeDay = (dIdx: number) => {
    setForm(prev => ({ ...prev, days: prev.days.filter((_, i) => i !== dIdx) }))
    setExpandedDays(prev => prev.filter(i => i !== dIdx).map(i => i > dIdx ? i - 1 : i))
  }

  const addExercise = (dIdx: number) => {
    setForm(prev => {
      const days = [...prev.days]
      days[dIdx] = { ...days[dIdx], exercises: [...days[dIdx].exercises, emptyExercise()] }
      return { ...prev, days }
    })
  }

  const removeExercise = (dIdx: number, eIdx: number) => {
    setForm(prev => {
      const days = [...prev.days]
      days[dIdx] = { ...days[dIdx], exercises: days[dIdx].exercises.filter((_, i) => i !== eIdx) }
      return { ...prev, days }
    })
  }

  const updateTip = (idx: number, value: string) => {
    setForm(prev => {
      const tips = [...(prev.tips || [])]
      tips[idx] = value
      return { ...prev, tips }
    })
  }

  const addTip = () => setForm(prev => ({ ...prev, tips: [...(prev.tips || []), ""] }))
  const removeTip = (idx: number) => setForm(prev => ({ ...prev, tips: (prev.tips || []).filter((_, i) => i !== idx) }))

  const toggleDay = (idx: number) => {
    setExpandedDays(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const startEditing = () => {
    setForm(workout ? normalizeForm(workout) : emptyWorkout())
    setSaveError(null)
    setSaveSuccess(false)
    setExpandedDays([0])
    setEditing(true)
  }

  if (loading) return <div className="text-slate-300">Carregando treino...</div>

  return (
    <Card className="bg-slate-700 border-slate-600 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">Treino</h3>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)} variant="outline" className="border-slate-500 text-slate-300 hover:bg-slate-600">
                Cancelar
              </Button>
              <Button onClick={saveWorkout} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Salvando..." : "Salvar Treino"}
              </Button>
            </>
          ) : (
            <Button onClick={startEditing} className="bg-blue-600 hover:bg-blue-700">
              Editar
            </Button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-900 border border-green-600 rounded text-green-300 text-sm">
          Treino salvo com sucesso!
        </div>
      )}
      {saveError && (
        <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-300 text-sm">
          Erro: {saveError}
        </div>
      )}

      {editing ? (
        <div className="space-y-6">
          <div>
            <Label className="text-slate-300 text-xs">Cronograma Semanal</Label>
            <Textarea value={form.weeklySchedule} onChange={e => updateField("weeklySchedule", e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1 h-16 text-sm" placeholder="Ex: Seg/Qua/Sex - Treino A | Ter/Qui - Treino B" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-slate-200 font-medium">Dias de Treino ({form.days.length})</h4>
              <Button onClick={addDay} size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar Dia
              </Button>
            </div>
            <div className="space-y-3">
              {form.days.map((day, dIdx) => (
                <div key={dIdx} className="bg-slate-800 rounded-lg border border-slate-600">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => toggleDay(dIdx)}
                  >
                    <span className="text-slate-200 font-medium text-sm">
                      {day.day || "Dia " + (dIdx + 1)}
                      {day.title && <span className="text-slate-400 text-xs ml-2">- {day.title}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); removeDay(dIdx) }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedDays.includes(dIdx) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  {expandedDays.includes(dIdx) && (
                    <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-slate-400 text-xs">Dia</Label>
                          <Input value={day.day} onChange={e => updateDay(dIdx, "day", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: Segunda-feira" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Titulo</Label>
                          <Input value={day.title} onChange={e => updateDay(dIdx, "title", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: Peito e Triceps" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Foco</Label>
                          <Input value={day.focus} onChange={e => updateDay(dIdx, "focus", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: Hipertrofia" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Duracao</Label>
                          <Input value={day.duration} onChange={e => updateDay(dIdx, "duration", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: 60 minutos" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-slate-400 text-xs">Exercicios ({day.exercises.length})</Label>
                          <button onClick={() => addExercise(dIdx)} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Adicionar Exercicio
                          </button>
                        </div>
                        <div className="space-y-3">
                          {day.exercises.map((ex, eIdx) => (
                            <div key={eIdx} className="bg-slate-700 rounded p-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300 text-xs font-medium">{ex.name || "Exercicio " + (eIdx + 1)}</span>
                                <button onClick={() => removeExercise(dIdx, eIdx)} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <Label className="text-slate-500 text-xs">Nome do Exercicio</Label>
                                  <Input value={ex.name} onChange={e => updateExercise(dIdx, eIdx, "name", e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white mt-1 h-7 text-xs" placeholder="Ex: Supino Reto" />
                                </div>
                                <div>
                                  <Label className="text-slate-500 text-xs">Series</Label>
                                  <Input value={ex.sets} onChange={e => updateExercise(dIdx, eIdx, "sets", e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white mt-1 h-7 text-xs" placeholder="Ex: 4" />
                                </div>
                                <div>
                                  <Label className="text-slate-500 text-xs">Repeticoes</Label>
                                  <Input value={ex.reps} onChange={e => updateExercise(dIdx, eIdx, "reps", e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white mt-1 h-7 text-xs" placeholder="Ex: 8-12" />
                                </div>
                                <div>
                                  <Label className="text-slate-500 text-xs">Descanso</Label>
                                  <Input value={ex.rest} onChange={e => updateExercise(dIdx, eIdx, "rest", e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white mt-1 h-7 text-xs" placeholder="Ex: 60s" />
                                </div>
                                <div>
                                  <Label className="text-slate-500 text-xs">Descricao</Label>
                                  <Input value={ex.description} onChange={e => updateExercise(dIdx, eIdx, "description", e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white mt-1 h-7 text-xs" placeholder="Observacoes..." />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-slate-200 font-medium">Dicas</h4>
              <button onClick={addTip} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar Dica
              </button>
            </div>
            <div className="space-y-2">
              {(form.tips || []).map((tip, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={tip} onChange={e => updateTip(idx, e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white h-8 text-sm flex-1" placeholder="Dica de treino..." />
                  <button onClick={() => removeTip(idx)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {workout ? (
            <>
              {workout.weeklySchedule && (
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Cronograma Semanal</p>
                  <p className="text-white text-sm mt-1">{workout.weeklySchedule}</p>
                </div>
              )}
              <div className="bg-slate-800 rounded p-3">
                <p className="text-slate-400 text-xs">Total de Dias</p>
                <p className="text-white text-sm mt-1">{workout.days?.length || 0} dias de treino</p>
              </div>
              {workout.days && workout.days.length > 0 && (
                <div>
                  <h4 className="text-slate-300 text-sm font-medium mb-2">Dias de Treino</h4>
                  <div className="space-y-2">
                    {workout.days.map((day: any, i: number) => (
                      <div key={i} className="bg-slate-800 rounded p-3">
                        <div className="flex justify-between items-start">
                          <p className="text-white text-sm font-medium">{day.day || "Dia " + (i + 1)}</p>
                          <span className="text-slate-400 text-xs">{day.duration}</span>
                        </div>
                        {day.title && <p className="text-slate-300 text-xs mt-1">{day.title}</p>}
                        {day.focus && <p className="text-slate-400 text-xs">Foco: {day.focus}</p>}
                        {day.exercises && day.exercises.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {day.exercises.map((ex: any, ei: number) => (
                              <p key={ei} className="text-slate-300 text-xs">- {ex.name} | {ex.sets}x{ex.reps} | Descanso: {ex.rest}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-400 text-sm">Nenhum treino cadastrado para este cliente.</p>
          )}
        </div>
      )}
    </Card>
  )
}