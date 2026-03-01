'use client'

import type { Meal } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface MacroCreditDisplayProps {
  meal: Meal
  showLabel?: boolean
  onTransferCredit?: (mealIndex: number, macroCredit: Meal['macroCredit']) => void
  mealIndex?: number
  isLastMeal?: boolean
}

export function MacroCreditDisplay({ 
  meal, 
  showLabel = true, 
  onTransferCredit,
  mealIndex = 0,
  isLastMeal = false
}: MacroCreditDisplayProps) {
  const [isTransferring, setIsTransferring] = useState(false)

  if (!meal.macroCredit || meal.macroCredit.calories === 0) {
    return null
  }

  const { calories, protein, carbs, fats } = meal.macroCredit

  const handleTransfer = () => {
    if (onTransferCredit && !isLastMeal) {
      setIsTransferring(true)
      onTransferCredit(mealIndex, meal.macroCredit)
      setTimeout(() => setIsTransferring(false), 300)
    }
  }

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
        Este crédito será aplicado ao próximo alimento que você adicionar ou substituir nesta refeição.
      </p>

      {/* Botão de transferência para próxima refeição */}
      {!isLastMeal && onTransferCredit && (
        <Button
          onClick={handleTransfer}
          disabled={isTransferring}
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
        >
          <ChevronRight className="h-4 w-4 mr-1" />
          {isTransferring ? 'Transferindo...' : 'Levar para próxima refeição'}
        </Button>
      )}
    </div>
  )
}

