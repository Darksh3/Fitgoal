"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface FoodOption {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

interface FoodAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelectFood: (food: FoodOption) => void
  placeholder?: string
}

export function FoodAutocomplete({
  value,
  onChange,
  onSelectFood,
  placeholder = "Digite o nome do alimento...",
}: FoodAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<FoodOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Search for foods
  useEffect(() => {
    const searchFoods = async () => {
      if (value.length < 2) {
        setSuggestions([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        console.log("[v0] Searching foods with term:", value)
        const response = await fetch(`/api/foods/search-supabase?q=${encodeURIComponent(value)}`)
        const result = await response.json()
        console.log("[v0] Food search response:", result)
        
        // Handle both formats: { foods: [...] } and [...]
        const data = result.foods || result
        setSuggestions(Array.isArray(data) ? data : [])
        setIsOpen(data && data.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error("[v0] Error fetching food suggestions:", error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchFoods, 300)
    return () => clearTimeout(debounceTimer)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectFood(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  const handleSelectFood = (food: FoodOption) => {
    onSelectFood(food)
    onChange("")
    setIsOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((food, index) => (
            <div
              key={food.id}
              onClick={() => handleSelectFood(food)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? "bg-green-50 text-green-900"
                  : "hover:bg-gray-100 text-gray-900"
              }`}
            >
              <div className="font-medium">{food.name}</div>
              <div className="text-sm text-gray-600">
                {food.calories}cal | P:{food.protein}g | C:{food.carbs}g | G:{food.fats}g
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-lg text-gray-500">
          Buscando alimentos...
        </div>
      )}
    </div>
  )
}
