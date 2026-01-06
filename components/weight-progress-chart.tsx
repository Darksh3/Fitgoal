"use client"

export interface WeightProgressChartProps {
  startWeight: number
  endWeight: number
  startLabel?: string
  endLabel?: string
  unit?: string
}

export function WeightProgressChart({
  startWeight,
  endWeight,
  startLabel = "Agora",
  endLabel = "6 meses",
  unit = "lbs",
}: WeightProgressChartProps) {
  const maxWeight = Math.max(startWeight, endWeight) + 10
  const minWeight = Math.min(startWeight, endWeight) - 10
  const range = maxWeight - minWeight

  const startY = ((maxWeight - startWeight) / range) * 100
  const endY = ((maxWeight - endWeight) / range) * 100

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
      <h3 className="text-2xl font-bold text-white mb-6">Summary</h3>

      {/* SVG Chart */}
      <div className="w-full aspect-video flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          <line x1="50" y1="50" x2="50" y2="200" stroke="#374151" strokeWidth="1" />
          <line x1="50" y1="200" x2="380" y2="200" stroke="#374151" strokeWidth="1" />

          {/* Horizontal grid lines */}
          <line x1="50" y1="80" x2="380" y2="80" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />
          <line x1="50" y1="110" x2="380" y2="110" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />
          <line x1="50" y1="140" x2="380" y2="140" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />
          <line x1="50" y1="170" x2="380" y2="170" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3" />

          {/* Line gradient */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="50%" stopColor="#FFC93C" />
              <stop offset="100%" stopColor="#00D084" />
            </linearGradient>
          </defs>

          {/* Progress line */}
          <path
            d={`M 50 ${50 + startY * 1.5} Q 215 ${50 + ((startY + endY) / 2) * 1.5} 380 ${50 + endY * 1.5}`}
            stroke="url(#lineGradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Start point */}
          <circle cx="50" cy={50 + startY * 1.5} r="6" fill="#FF6B35" />

          {/* End point */}
          <circle cx="380" cy={50 + endY * 1.5} r="6" fill="#00D084" />

          {/* Start weight label */}
          <text x="50" y="30" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            {startWeight} {unit}
          </text>

          {/* End weight label */}
          <text x="380" y="230" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            {endWeight} {unit}
          </text>
        </svg>
      </div>
    </div>
  )
}
