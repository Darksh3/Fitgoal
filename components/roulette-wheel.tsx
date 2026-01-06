"use client"

import { useState } from "react"
import Image from "next/image"

export function RouletteWheel({ onSpinComplete }: { onSpinComplete?: (discount: number) => void }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)

  const prizes = [
    { discount: 10, label: "10%" },
    { discount: 15, label: "15%" },
    { discount: 20, label: "20%" },
    { discount: 25, label: "25%" },
    { discount: 30, label: "30%" },
    { discount: 35, label: "35%" },
    { discount: 40, label: "40%" },
    { discount: 50, label: "50%" },
  ]

  const handleSpin = () => {
    if (isSpinning) return

    setIsSpinning(true)

    // Calculate random rotation (at least 5 full rotations + random position)
    const randomIndex = Math.floor(Math.random() * prizes.length)
    const segmentAngle = 360 / prizes.length
    const finalRotation = 360 * 5 + randomIndex * segmentAngle + Math.random() * segmentAngle

    setRotation(finalRotation)

    // Spin duration in milliseconds
    const spinDuration = 4000

    setTimeout(() => {
      setIsSpinning(false)
      if (onSpinComplete) {
        onSpinComplete(prizes[randomIndex].discount)
      }
    }, spinDuration)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Roulette Container */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Pointer/Needle at top */}
        <div className="absolute top-0 z-10 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
        </div>

        {/* Rotating Wheel */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? "4s" : "0s",
            transitionTimingFunction: isSpinning ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "linear",
          }}
        >
          <Image
            src="/images/roleta.webp"
            alt="Roulette Wheel"
            width={288}
            height={288}
            priority
            className="w-full h-full object-cover"
          />
        </div>

        {/* Center Circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-yellow-400 rounded-full shadow-lg z-20" />
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className="bg-white hover:bg-gray-100 disabled:bg-gray-300 text-black px-8 py-4 rounded-full text-lg font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
      >
        {isSpinning ? "GIRANDO..." : "GIRAR ROLETA"}
      </button>
    </div>
  )
}
