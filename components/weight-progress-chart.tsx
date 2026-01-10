export interface WeightProgressChartProps {
  currentWeight: number
  targetWeight: number
  startLabel?: string
  endLabel?: string
  unit?: string
}

export function WeightProgressChart({
  currentWeight,
  targetWeight,
  startLabel = "Agora",
  endLabel = "6 meses",
  unit = "kg",
}: WeightProgressChartProps) {
  // Convert to numbers and round
  const startWeight = Math.round(currentWeight * 10) / 10
  const endWeight = Math.round(targetWeight * 10) / 10

  const maxWeight = Math.max(startWeight, endWeight) + 5
  const minWeight = Math.min(startWeight, endWeight) - 5
  const range = maxWeight - minWeight

  const startY = ((maxWeight - startWeight) / range) * 180
  const endY = ((maxWeight - endWeight) / range) * 180

  const controlY = startY + (endY - startY) * 0.6

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8">
      <h3 className="text-2xl font-bold text-white mb-8">Summary</h3>

      {/* SVG Chart */}
      <div className="w-full h-80">
        <svg width="100%" height="100%" viewBox="0 0 500 300" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          <line x1="60" y1="40" x2="60" y2="240" stroke="#374151" strokeWidth="1.5" />
          <line x1="60" y1="240" x2="460" y2="240" stroke="#374151" strokeWidth="1.5" />

          {/* Horizontal grid lines */}
          <line x1="60" y1="80" x2="460" y2="80" stroke="#1F2937" strokeWidth="1" strokeDasharray="4,2" />
          <line x1="60" y1="120" x2="460" y2="120" stroke="#1F2937" strokeWidth="1" strokeDasharray="4,2" />
          <line x1="60" y1="160" x2="460" y2="160" stroke="#1F2937" strokeWidth="1" strokeDasharray="4,2" />
          <line x1="60" y1="200" x2="460" y2="200" stroke="#1F2937" strokeWidth="1" strokeDasharray="4,2" />

          {/* Line gradient */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="50%" stopColor="#FFC93C" />
              <stop offset="100%" stopColor="#00D084" />
            </linearGradient>
          </defs>

          <path
            d={`M 60 ${40 + startY} C 180 ${40 + controlY} 340 ${40 + controlY} 460 ${40 + endY}`}
            stroke="url(#lineGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start point */}
          <circle cx="60" cy={40 + startY} r="8" fill="#FF6B35" />

          {/* End point */}
          <circle cx="460" cy={40 + endY} r="8" fill="#00D084" />

          {/* Start weight label */}
          <text x="60" y="25" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
            {startWeight}
          </text>

          {/* End weight label */}
          <text x="460" y="270" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
            {endWeight}
          </text>

          {/* Unit labels */}
          <text x="60" y="50" textAnchor="middle" fill="#9CA3AF" fontSize="14">
            {unit}
          </text>
          <text x="460" y="290" textAnchor="middle" fill="#9CA3AF" fontSize="14">
            {unit}
          </text>
        </svg>
      </div>
    </div>
  )
}
