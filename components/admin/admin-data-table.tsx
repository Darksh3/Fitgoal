"use client"

import { ReactNode } from "react"

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => ReactNode)
  width?: string
  render?: (value: any, item: T) => ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectChange?: (id: string) => void
}

export function AdminDataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = "Nenhum dado encontrado",
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onSelectChange,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-800 bg-slate-800/50">
          <tr>
            {selectable && (
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  onChange={(e) => {
                    if (onSelectChange) {
                      data.forEach((item) => {
                        if (e.target.checked && !selectedIds.has(item.id)) {
                          onSelectChange(item.id)
                        }
                      })
                    }
                  }}
                />
              </th>
            )}
            {columns.map((column, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-left text-sm font-semibold text-slate-300"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center text-slate-400">
                Carregando...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-slate-800/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onSelectChange?.(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-600"
                    />
                  </td>
                )}
                {columns.map((column, idx) => {
                  const value = typeof column.accessor === "function" ? column.accessor(item) : item[column.accessor]
                  return (
                    <td key={idx} className="px-6 py-4 text-sm text-slate-300">
                      {column.render ? column.render(value, item) : value}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
