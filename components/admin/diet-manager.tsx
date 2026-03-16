"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react"

interface Food {
  name: string
  quantity: string
  calories: number
}

interface Meal {
  name: string
  time: string
  foods: Food[]
  calories: string
  macros: {
    protein: string
    carbs: string
    fats: string
  }
}

interface DietPlan {
  title: string
  calories: string
  protein: string
  carbs: string
  fats: string
  meals: Meal[]
  tips?: string[]
  totalDailyCalories?: string
  totalProtein?: string
  totalCarbs?: string
  totalFats?: string
}

interface DietManagerProps {
  userId: string
}

const emptyFood = (): Food => ({ name: "", quantity: "", calories: 0 })
const emptyMeal = (): Meal => ({
  name: "",
  time: "",
  foods: [emptyFood()],
  calories: "",
  macros: { protein: "", carbs: "", fats: "" },
})
const emptyDiet = (): DietPlan => ({
  title: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  totalDailyCalories: "",
  totalProtein: "",
  totalCarbs: "",
  totalFats: "",
  meals: [emptyMeal()],
  tips: [""],
})

export function AdminDietManager({ userId }: DietManagerProps) {
  const [diet, setDiet] = useState<DietPlan | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<DietPlan>(emptyDiet())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [expandedMeals, setExpandedMeals] = useState<number[]>([0])

  useEffect(() => {
    fetchDiet()
  }, [userId])

  const fetchDiet = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/user-diet?userId=${userId}`)
      const data = await res.json()
      setDiet(data.diet)
      if (data.diet) {
        setForm(normalizeForm(data.diet))
      }
    } catch (error) {
      console.error("[v0] Error fetching diet:", error)
    } finally {
      setLoading(false)
    }
  }

  const normalizeForm = (d: any): DietPlan => ({
    title: d.title || "",
    calories: d.calories || "",
    protein: d.protein || "",
    carbs: d.carbs || "",
    fats: d.fats || "",
    totalDailyCalories: d.totalDailyCalories || "",
    totalProtein: d.totalProtein || "",
    totalCarbs: d.totalCarbs || "",
    totalFats: d.totalFats || "",
    meals: Array.isArray(d.meals) ? d.meals.map((m: any) => ({
      name: m.name || "",
      time: m.time || "",
      calories: m.calories || "",
      macros: {
        protein: m.macros?.protein || "",
        carbs: m.macros?.carbs || "",
        fats: m.macros?.fats || "",
      },
      foods: Array.isArray(m.foods) ? m.foods.map((f: any) =>
        typeof f === "string" ? { name: f, quantity: "", calories: 0 } :
        { name: f.name || "", quantity: f.quantity || "", calories: f.calories || 0 }
      ) : [emptyFood()],
    })) : [emptyMeal()],
    tips: Array.isArray(d.tips) ? d.tips : [],
  })

  const saveDiet = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/admin/user-diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dietData: form }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Erro ao salvar")
      }
      setSaveSuccess(true)
      await fetchDiet()
      setEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error: any) {
      setSaveError(error.message || "Erro desconhecido ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof DietPlan, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateMeal = (mIdx: number, field: keyof Meal, value: string) => {
    setForm(prev => {
      const meals = [...prev.meals]
      meals[mIdx] = { ...meals[mIdx], [field]: value }
      return { ...prev, meals }
    })
  }

  const updateMealMacro = (mIdx: number, macro: "protein" | "carbs" | "fats", value: string) => {
    setForm(prev => {
      const meals = [...prev.meals]
      meals[mIdx] = { ...meals[mIdx], macros: { ...meals[mIdx].macros, [macro]: value } }
      return { ...prev, meals }
    })
  }

  const updateFood = (mIdx: number, fIdx: number, field: keyof Food, value: string | number) => {
    setForm(prev => {
      const meals = [...prev.meals]
      const foods = [...meals[mIdx].foods]
      foods[fIdx] = { ...foods[fIdx], [field]: value }
      meals[mIdx] = { ...meals[mIdx], foods }
      return { ...prev, meals }
    })
  }

  const addMeal = () => {
    const idx = form.meals.length
    setForm(prev => ({ ...prev, meals: [...prev.meals, emptyMeal()] }))
    setExpandedMeals(prev => [...prev, idx])
  }

  const removeMeal = (mIdx: number) => {
    setForm(prev => ({ ...prev, meals: prev.meals.filter((_, i) => i !== mIdx) }))
    setExpandedMeals(prev => prev.filter(i => i !== mIdx).map(i => i > mIdx ? i - 1 : i))
  }

  const addFood = (mIdx: number) => {
    setForm(prev => {
      const meals = [...prev.meals]
      meals[mIdx] = { ...meals[mIdx], foods: [...meals[mIdx].foods, emptyFood()] }
      return { ...prev, meals }
    })
  }

  const removeFood = (mIdx: number, fIdx: number) => {
    setForm(prev => {
      const meals = [...prev.meals]
      meals[mIdx] = { ...meals[mIdx], foods: meals[mIdx].foods.filter((_, i) => i !== fIdx) }
      return { ...prev, meals }
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

  const toggleMeal = (idx: number) => {
    setExpandedMeals(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const startEditing = () => {
    setForm(diet ? normalizeForm(diet) : emptyDiet())
    setSaveError(null)
    setSaveSuccess(false)
    setExpandedMeals([0])
    setEditing(true)
  }

  if (loading) return <div className="text-slate-300">Carregando dieta...</div>

  return (
    <Card className="bg-slate-700 border-slate-600 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">Dieta</h3>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)} variant="outline" className="border-slate-500 text-slate-300 hover:bg-slate-600">
                Cancelar
              </Button>
              <Button onClick={saveDiet} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Salvando..." : "Salvar Dieta"}
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
          Dieta salva com sucesso!
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
            <h4 className="text-slate-200 font-medium mb-3">Informacoes Gerais</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-slate-300 text-xs">Titulo do Plano</Label>
                <Input value={form.title} onChange={e => updateField("title", e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Ex: Plano de Ganho de Massa" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Calorias Diarias</Label>
                <Input value={form.totalDailyCalories || form.calories} onChange={e => { updateField("totalDailyCalories", e.target.value); updateField("calories", e.target.value) }}
                  className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Ex: 2500" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Proteina Total (g)</Label>
                <Input value={form.totalProtein || form.protein} onChange={e => { updateField("totalProtein", e.target.value); updateField("protein", e.target.value) }}
                  className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Ex: 180g" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Carboidratos Total (g)</Label>
                <Input value={form.totalCarbs || form.carbs} onChange={e => { updateField("totalCarbs", e.target.value); updateField("carbs", e.target.value) }}
                  className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Ex: 250g" />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Gorduras Total (g)</Label>
                <Input value={form.totalFats || form.fats} onChange={e => { updateField("totalFats", e.target.value); updateField("fats", e.target.value) }}
                  className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Ex: 70g" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-slate-200 font-medium">Refeicoes ({form.meals.length})</h4>
              <Button onClick={addMeal} size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar Refeicao
              </Button>
            </div>
            <div className="space-y-3">
              {form.meals.map((meal, mIdx) => (
                <div key={mIdx} className="bg-slate-800 rounded-lg border border-slate-600">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => toggleMeal(mIdx)}
                  >
                    <span className="text-slate-200 font-medium text-sm">
                      {meal.name || "Refeicao " + (mIdx + 1)}
                      {meal.time && <span className="text-slate-400 text-xs ml-2">({meal.time})</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); removeMeal(mIdx) }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedMeals.includes(mIdx) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  {expandedMeals.includes(mIdx) && (
                    <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-slate-400 text-xs">Nome da Refeicao</Label>
                          <Input value={meal.name} onChange={e => updateMeal(mIdx, "name", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: Cafe da manha" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Horario</Label>
                          <Input value={meal.time} onChange={e => updateMeal(mIdx, "time", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: 07:00" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Calorias</Label>
                          <Input value={meal.calories} onChange={e => updateMeal(mIdx, "calories", e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: 500 kcal" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs mb-1 block">Macros da Refeicao</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-slate-500 text-xs">Proteina</Label>
                            <Input value={meal.macros.protein} onChange={e => updateMealMacro(mIdx, "protein", e.target.value)}
                              className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: 30g" />
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">Carboidratos</Label>
                            <Input value={meal.macros.carbs} onChange={e => updateMealMacro(mIdx, "carbs", e.target.value)}
                              className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: 60g" />
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">Gorduras</Label>
                            <Input value={meal.macros.fats} onChange={e => updateMealMacro(mIdx, "fats", e.target.value)}
                              className="bg-slate-700 border-slate-500 text-white mt-1 h-8 text-sm" placeholder="Ex: 10g" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-slate-400 text-xs">Alimentos ({meal.foods.length})</Label>
                          <button onClick={() => addFood(mIdx)} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Adicionar Alimento
                          </button>
                        </div>
                        <div className="grid grid-cols-12 gap-1 mb-1">
                          <div className="col-span-5 text-slate-500 text-xs px-1">Alimento</div>
                          <div className="col-span-3 text-slate-500 text-xs px-1">Quantidade</div>
                          <div className="col-span-3 text-slate-500 text-xs px-1">Calorias</div>
                        </div>
                        <div className="space-y-1">
                          {meal.foods.map((food, fIdx) => (
                            <div key={fIdx} className="grid grid-cols-12 gap-1 items-center">
                              <div className="col-span-5">
                                <Input value={food.name} onChange={e => updateFood(mIdx, fIdx, "name", e.target.value)}
                                  className="bg-slate-600 border-slate-500 text-white h-7 text-xs" placeholder="Alimento" />
                              </div>
                              <div className="col-span-3">
                                <Input value={food.quantity} onChange={e => updateFood(mIdx, fIdx, "quantity", e.target.value)}
                                  className="bg-slate-600 border-slate-500 text-white h-7 text-xs" placeholder="100g" />
                              </div>
                              <div className="col-span-3">
                                <Input type="number" value={food.calories} onChange={e => updateFood(mIdx, fIdx, "calories", Number(e.target.value))}
                                  className="bg-slate-600 border-slate-500 text-white h-7 text-xs" placeholder="kcal" />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <button onClick={() => removeFood(mIdx, fIdx)} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3 h-3" />
                                </button>
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
                    className="bg-slate-800 border-slate-600 text-white h-8 text-sm flex-1" placeholder="Dica nutricional..." />
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
          {diet ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Titulo</p>
                  <p className="text-white text-sm mt-1">{diet.title || "sem titulo"}</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Calorias/dia</p>
                  <p className="text-white text-sm mt-1">{(diet as any).totalDailyCalories || diet.calories || "0"} kcal</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Proteina</p>
                  <p className="text-white text-sm mt-1">{(diet as any).totalProtein || diet.protein || "0"}</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Carboidratos</p>
                  <p className="text-white text-sm mt-1">{(diet as any).totalCarbs || diet.carbs || "0"}</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Gorduras</p>
                  <p className="text-white text-sm mt-1">{(diet as any).totalFats || diet.fats || "0"}</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-400 text-xs">Refeicoes</p>
                  <p className="text-white text-sm mt-1">{diet.meals?.length || 0} refeicoes</p>
                </div>
              </div>
              {diet.meals && diet.meals.length > 0 && (
                <div>
                  <h4 className="text-slate-300 text-sm font-medium mb-2">Refeicoes</h4>
                  <div className="space-y-2">
                    {diet.meals.map((meal: any, i: number) => (
                      <div key={i} className="bg-slate-800 rounded p-3">
                        <div className="flex justify-between items-start">
                          <p className="text-white text-sm font-medium">{meal.name || "Refeicao " + (i + 1)}</p>
                          <span className="text-slate-400 text-xs">{meal.time}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1">{meal.calories} - P: {meal.macros?.protein} | C: {meal.macros?.carbs} | G: {meal.macros?.fats}</p>
                        {meal.foods && meal.foods.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {meal.foods.map((food: any, fi: number) => (
                              <p key={fi} className="text-slate-300 text-xs">- {typeof food === "string" ? food : food.name + " - " + food.quantity + " (" + food.calories + " kcal)"}</p>
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
            <p className="text-slate-400 text-sm">Nenhuma dieta cadastrada para este cliente.</p>
          )}
        </div>
      )}
    </Card>
  )
}