"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface ScratchCardProps {
  discount: number
  onReveal?: () => void
}

export function ScratchCard({ discount, onReveal }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 300
    canvas.height = 200

    // Draw scratch overlay
    ctx.fillStyle = "#FB923C"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw text
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 20px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Scratch it off", canvas.width / 2, 50)

    // Draw scratch marks
    ctx.strokeStyle = "#D97706"
    ctx.lineWidth = 8
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const marks = [
      { x: 80, y: 80, angle: 0.3 },
      { x: 150, y: 100, angle: 0.5 },
      { x: 220, y: 90, angle: 0.2 },
    ]

    marks.forEach((mark) => {
      ctx.beginPath()
      ctx.moveTo(mark.x - 30, mark.y - 20)
      ctx.lineTo(mark.x + 30, mark.y + 20)
      ctx.stroke()
    })

    // Draw hand icon (simplified)
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height - 40, 15, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const handleMouseDown = () => setIsDrawing(true)
  const handleMouseUp = () => setIsDrawing(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Clear area with eraser effect
    ctx.clearRect(x - 20, y - 20, 40, 40)

    // Check if enough area is revealed
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    let revealedPixels = 0

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) revealedPixels++
    }

    if (revealedPixels > (data.length / 4) * 0.4) {
      setIsRevealed(true)
      onReveal?.()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">Scratch to reveal your special discount!</h2>
        <p className="text-gray-400 text-center">We want you to start your journey with a nice surprise</p>
      </div>

      <div className="flex justify-center">
        <div className="relative w-80 h-56 bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
          {/* Hidden content */}
          {isRevealed && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-400 to-lime-500 z-0 flex-col space-y-2">
              <div className="text-5xl font-black text-white">{discount}%</div>
              <div className="text-lg font-bold text-white">OFF</div>
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
            className={`w-80 h-56 cursor-pointer rounded-3xl ${isRevealed ? "opacity-0" : "opacity-100"} transition-opacity`}
          />
        </div>
      </div>

      {isRevealed && (
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-lg font-semibold text-lime-400">🎉 Parabéns! Você ganhou {discount}% de desconto!</p>
          <p className="text-gray-400">Use este desconto ao escolher seu plano personalizado abaixo</p>
        </div>
      )}
    </div>
  )
}
