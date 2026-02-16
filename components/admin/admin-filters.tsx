"use client"

import { ReactNode } from "react"

interface FilterOption {
  label: string
  value: string
}

interface AdminFiltersProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  filters?: {
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]
  actions?: {
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: "primary" | "secondary"
  }[]
}

export function AdminFilters({
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  filters = [],
  actions = [],
}: AdminFiltersProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-3 w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-lime-500"
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Filter Selects */}
        <div className="flex-1 flex gap-2">
          {filters.map((filter, idx) => (
            <select
              key={idx}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-lime-500"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                action.variant === "primary"
                  ? "bg-lime-500 hover:bg-lime-600 text-slate-900"
                  : "border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
