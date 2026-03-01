'use client'

import type { Meal } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MacroCreditDisplayProps {
  meal: Meal
  showLabel?: boolean
  onTransferCredit?: (mealIndex: number, targetMealIndex: number, macroCredit: Meal['macroCredit']) => void
  mealIndex?: number
  totalMeals?: number
  mealNames?: string[]
}

export function MacroCreditDisplay({ 
  meal, 
  showLabel = true, 
  onTransferCredit,
  mealIndex = 0,
  totalMeals = 1,
  mealNames = []
}: MacroCreditDisplayProps) {
  const [isTransferring, setIsTransferring] = useState(false)
  const [selectedTargetMeal, setSelectedTargetMeal] = useState<string>("")

  if (!meal.macroCredit || meal.macroCredit.calories === 0) {
    return null
  }

  const { calories, protein, carbs, fats } = meal.macroCredit

  const handleTransfer = () => {
    if (onTransferCredit && selectedTargetMeal) {
      const targetIndex = parseInt(selectedTargetMeal)
      setIsTransferring(true)
      onTransferCredit(mealIndex, targetIndex, meal.macroCredit)
      setSelectedTargetMeal("")
      setTimeout(() => setIsTransferring(false), 300)
    }
  }

  // Gerar lista de outras refeições (excluindo a atual)
  const otherMeals = Array.from({ length: totalMeals }, (_, i) => i).filter(i => i !== mealIndex)

  return (
    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
      {showLabel && <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Crédito de Macros Disponível</p>}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
          {Math.round(calories)} kcal
        </Badge>
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
          {Math.round(protein)}g proteína
        </Badge>
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
          {Math.round(carbs)}g carbs
        </Badge>
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
          {Math.round(fats)}g gordura
        </Badge>
      </div>
      
      <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
        Este crédito será aplicado ao próximo alimento que você adicionar ou substituir.
      </p>

      {/* Transferência para outra refeição */}
      {otherMeals.length > 0 && onTransferCredit && (
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-blue-600 dark:text-blue-300 mb-1 block">
                Levar crédito para:
              </label>
              <Select value={selectedTargetMeal} onValueChange={setSelectedTargetMeal}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700">
                  <SelectValue placeholder="Escolher refeição..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  {otherMeals.map((mealIdx) => (
                    <SelectItem key={mealIdx} value={mealIdx.toString()}>
                      {mealNames[mealIdx] || `Refeição ${mealIdx + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleTransfer}
              disabled={isTransferring || !selectedTargetMeal}
              size="sm"
              className="h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white"
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              {isTransferring ? 'Transferindo...' : 'Ir'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


