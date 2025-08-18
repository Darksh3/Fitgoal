"use client"

interface ExerciseIllustrationProps {
  className?: string
  type: "cardio" | "pullups" | "yoga"
}

export function ExerciseIllustration({ className = "", type }: ExerciseIllustrationProps) {
  const renderCardio = () => (
    <svg viewBox="0 0 300 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Treadmill base */}
      <rect x="50" y="120" width="200" height="60" rx="10" fill="#374151" stroke="#6B7280" strokeWidth="2" />

      {/* Treadmill belt */}
      <rect x="60" y="130" width="180" height="40" rx="5" fill="#1F2937" />

      {/* Running person */}
      <circle cx="150" cy="80" r="15" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
      <path
        d="M150 95 L150 140 M135 110 L165 110 M140 155 L135 170 M160 155 L165 170"
        stroke="#374151"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Motion lines */}
      <path
        d="M120 70 L110 70 M125 85 L115 85 M120 100 L110 100"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Heart rate indicator */}
      <path
        d="M200 40 C195 35 185 35 180 45 C175 35 165 35 160 40 C165 50 180 65 180 65 C180 65 195 50 200 40"
        fill="#EF4444"
      />

      <text x="150" y="25" textAnchor="middle" className="text-sm font-bold fill-gray-700">
        Cardio
      </text>
    </svg>
  )

  const renderPullups = () => (
    <svg viewBox="0 0 300 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pull-up bar */}
      <rect x="80" y="30" width="140" height="8" rx="4" fill="#374151" />
      <rect x="75" y="25" width="10" height="18" rx="2" fill="#6B7280" />
      <rect x="215" y="25" width="10" height="18" rx="2" fill="#6B7280" />

      {/* Person doing pull-up */}
      <circle cx="150" cy="70" r="12" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
      <path
        d="M150 82 L150 120 M135 90 L165 90 M140 135 L145 150 M160 135 L155 150"
        stroke="#374151"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Arms reaching up to bar */}
      <path d="M142 90 L145 40 M158 90 L155 40" stroke="#374151" strokeWidth="3" strokeLinecap="round" />

      {/* Muscle definition lines */}
      <path d="M140 95 L145 100 M155 100 L160 95" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

      <text x="150" y="180" textAnchor="middle" className="text-sm font-bold fill-gray-700">
        Força
      </text>
    </svg>
  )

  const renderYoga = () => (
    <svg viewBox="0 0 300 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Yoga mat */}
      <rect x="70" y="140" width="160" height="40" rx="20" fill="#8B5CF6" opacity="0.3" />

      {/* Person in yoga pose */}
      <circle cx="150" cy="80" r="12" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />

      {/* Body in meditation pose */}
      <path d="M150 92 L150 130" stroke="#374151" strokeWidth="3" strokeLinecap="round" />

      {/* Arms in meditation position */}
      <path
        d="M135 105 C130 100 125 105 130 110 C135 115 140 110 135 105"
        stroke="#374151"
        strokeWidth="2"
        fill="#F3F4F6"
      />
      <path
        d="M165 105 C170 100 175 105 170 110 C165 115 160 110 165 105"
        stroke="#374151"
        strokeWidth="2"
        fill="#F3F4F6"
      />

      {/* Legs crossed */}
      <path d="M135 130 L165 130 M140 140 L160 140" stroke="#374151" strokeWidth="3" strokeLinecap="round" />

      {/* Zen circles */}
      <circle cx="120" cy="60" r="3" fill="#8B5CF6" opacity="0.6" />
      <circle cx="180" cy="60" r="3" fill="#8B5CF6" opacity="0.6" />
      <circle cx="150" cy="45" r="3" fill="#8B5CF6" opacity="0.6" />

      <text x="150" y="25" textAnchor="middle" className="text-sm font-bold fill-gray-700">
        Yoga & Alongamento
      </text>
    </svg>
  )

  const renderExercise = () => {
    switch (type) {
      case "cardio":
        return renderCardio()
      case "pullups":
        return renderPullups()
      case "yoga":
        return renderYoga()
      default:
        return renderCardio()
    }
  }

  return <div className={`flex items-center justify-center ${className}`}>{renderExercise()}</div>
}
