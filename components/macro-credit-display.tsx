'use client'

import type { Meal } from '@/types'
import { Badge } from '@/components/ui/badge'

interface MacroCreditDisplayProps {
  meal: Meal
  showLabel?: boolean
}

export function MacroCreditDisplay({ meal, showLabel = true }: MacroCreditDisplayProps) {
  if (!meal.macroCredit || meal.macroCredit.calories === 0) {
    return null
  }

  const { calories, protein, carbs, fats } = meal.macroCredit

  return (
    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
      {showLabel && <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Crédito de Macros Disponível</p>}
      <div className="flex flex-wrap gap-2">
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
      <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
        Este crédito será aplicado ao próximo alimento que você adicionar ou substituir nesta refeição.
      </p>
    </div>
  )
}
