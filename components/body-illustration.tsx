"use client"

interface BodyIllustrationProps {
  className?: string
  gender: "male" | "female"
  bodyFat?: number
}

export function BodyIllustration({ className = "", gender, bodyFat = 15 }: BodyIllustrationProps) {
  const getBodyFatColor = (bodyFat: number) => {
    if (bodyFat < 10) return "#10B981" // Green - very lean
    if (bodyFat < 15) return "#F59E0B" // Yellow - lean
    if (bodyFat < 25) return "#EF4444" // Red - average
    return "#DC2626" // Dark red - high body fat
  }

  const bodyColor = getBodyFatColor(bodyFat)

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 200 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body outline */}
        <path
          d={
            gender === "female"
              ? "M100 50 C85 50 75 60 75 75 L75 120 C70 125 70 135 75 140 L75 180 C75 190 80 200 85 210 L85 280 C85 290 95 295 100 295 C105 295 115 290 115 280 L115 210 C120 200 125 190 125 180 L125 140 C130 135 130 125 125 120 L125 75 C125 60 115 50 100 50 Z"
              : "M100 50 C90 50 80 60 80 75 L80 120 C80 130 85 140 85 150 L85 180 C85 190 85 200 90 210 L90 280 C90 290 95 295 100 295 C105 295 110 290 110 280 L110 210 C115 200 115 190 115 180 L115 150 C115 140 120 130 120 120 L120 75 C120 60 110 50 100 50 Z"
          }
          fill={bodyColor}
          stroke="#374151"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* Head */}
        <circle cx="100" cy="35" r="20" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />

        {/* Arms */}
        <path
          d="M75 80 L60 90 L55 120 L60 125 L70 115 L75 100"
          fill={bodyColor}
          stroke="#374151"
          strokeWidth="2"
          opacity="0.8"
        />
        <path
          d="M125 80 L140 90 L145 120 L140 125 L130 115 L125 100"
          fill={bodyColor}
          stroke="#374151"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* Legs */}
        <path
          d="M90 210 L85 250 L85 280 L90 285 L95 280 L95 250 L100 210"
          fill={bodyColor}
          stroke="#374151"
          strokeWidth="2"
          opacity="0.8"
        />
        <path
          d="M110 210 L105 250 L105 280 L110 285 L115 280 L115 250 L120 210"
          fill={bodyColor}
          stroke="#374151"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* Body fat percentage indicator */}
        <text x="100" y="160" textAnchor="middle" className="text-xs font-bold fill-white">
          {bodyFat}%
        </text>
      </svg>
    </div>
  )
}
