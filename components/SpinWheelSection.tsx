"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// =====================================================
// CONFIGURAÇÃO - FÁCIL DE MODIFICAR
// =====================================================

// Desconto que SEMPRE será o resultado (aparece como 70%)
const WINNING_DISCOUNT = 70

// Segmentos visuais da roleta (apenas visual, resultado é sempre WINNING_DISCOUNT)
const SEGMENTS = [
  { discount: 10, color: '#1c4d5d' },
  { discount: 20, color: '#2c7b61' },
  { discount: 30, color: '#1c4d5d' },
  { discount: 40, color: '#40a37a' },
  { discount: 50, color: '#1c4d5d' },
  { discount: 60, color: '#2c7b61' },
  { discount: 70, color: '#ff6b35' }, // Destaque laranja para 70%
  { discount: 20, color: '#40a37a' },
]

// Encontra o índice do segmento vencedor (70%)
const WINNING_SEGMENT_INDEX = SEGMENTS.findIndex(s => s.discount === WINNING_DISCOUNT)

// Gera posições das luzes
const generateLightPositions = (count = 24) => {
  const lights = []
  for (let i = 0; i < count; i++) {
    lights.push((i / count) * 360)
  }
  return lights
}

const WHEEL_LIGHTS = generateLightPositions(24)

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

interface SpinWheelSectionProps {
  onDiscountWon: (discount: number) => void
}

export default function SpinWheelSection({ onDiscountWon }: SpinWheelSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [lightsAnimating, setLightsAnimating] = useState(false)
  const [hasSpun, setHasSpun] = useState(false)
  const [showWinModal, setShowWinModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  
  const wheelSize = 340
  const center = wheelSize / 2
  const outerRadius = 145

  // Desenha a roleta no canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const scale = window.devicePixelRatio || 1
    canvas.width = wheelSize * scale
    canvas.height = wheelSize * scale
    ctx.scale(scale, scale)
    ctx.clearRect(0, 0, wheelSize, wheelSize)
    
    ctx.save()
    ctx.translate(center, center)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-center, -center)
    
    const segmentAngle = (2 * Math.PI) / SEGMENTS.length
    
    SEGMENTS.forEach((segment, index) => {
      const startAngle = index * segmentAngle - Math.PI / 2
      const endAngle = startAngle + segmentAngle
      
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, outerRadius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = segment.color
      ctx.fill()
      ctx.strokeStyle = '#0d1f1e'
      ctx.lineWidth = 2
      ctx.stroke()
      
      ctx.save()
      const midAngle = startAngle + segmentAngle / 2
      const textRadius = outerRadius * 0.65
      const textX = center + textRadius * Math.cos(midAngle)
      const textY = center + textRadius * Math.sin(midAngle)
      
      ctx.translate(textX, textY)
      ctx.rotate(midAngle + Math.PI / 2)
      
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px Inter, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 2
      
      ctx.fillText(`${segment.discount}%`, 0, 0)
      ctx.restore()
    })
    
    // Centro da roleta
    const gradient = ctx.createLinearGradient(center - 40, center - 40, center + 40, center + 40)
    gradient.addColorStop(0, '#40a37a')
    gradient.addColorStop(1, '#1c4d5d')
    
    ctx.beginPath()
    ctx.arc(center, center, 40, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = '#0d1f1e'
    ctx.lineWidth = 4
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(center, center, 30, 0, Math.PI * 2)
    ctx.fillStyle = '#2c7b61'
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(center, center, 18, 0, Math.PI * 2)
    ctx.fillStyle = '#40a37a'
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(center, center, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#77ff00'
    ctx.fill()
    
    ctx.restore()
  }, [rotation])

  // Função de girar (SEMPRE cai no 70%)
  const spin = () => {
    if (isSpinning || hasSpun) return

    setIsSpinning(true)
    setLightsAnimating(true)

    const segmentAngle = 360 / SEGMENTS.length
    const baseRotation = 360 * 5
    const segmentOffset = WINNING_SEGMENT_INDEX * segmentAngle
    const randomOffset = Math.random() * (segmentAngle * 0.4) + (segmentAngle * 0.3)
    const finalRotation = baseRotation + (360 - segmentOffset) - randomOffset + (segmentAngle / 2)

    const startRotation = rotation
    const targetRotation = startRotation + finalRotation
    const duration = 5000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
      const easedProgress = easeOutCubic(progress)
      const currentRotation = startRotation + (targetRotation - startRotation) * easedProgress
      setRotation(currentRotation)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsSpinning(false)
        setLightsAnimating(false)
        setHasSpun(true)
        setShowConfetti(true)
        setTimeout(() => setShowWinModal(true), 500)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    }
    
    requestAnimationFrame(animate)
  }

  const handleContinue = () => {
    setShowWinModal(false)
    onDiscountWon(WINNING_DISCOUNT)
  }

  return (
    <>
      {/* Confete */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {Array.from({ length: 100 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  top: -20, 
                  left: `${Math.random() * 100}%`,
                  rotate: 0 
                }}
                animate={{ 
                  top: '100vh',
                  rotate: 720 
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 2,
                  ease: "linear"
                }}
                style={{
                  width: 6 + Math.random() * 8,
                  height: 6 + Math.random() * 8,
                  backgroundColor: ['#77ff00', '#ffb800', '#40a37a', '#ff6b35', '#ffd700'][Math.floor(Math.random() * 5)],
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Vitória */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-b from-gray-900 to-black border border-orange-500/30 rounded-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-8 text-center" style={{ background: 'linear-gradient(180deg, rgba(255, 107, 53, 0.2) 0%, transparent 100%)' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-4xl">🎉</span>
                </motion.div>
                
                <h2 className="text-4xl font-bold text-orange-400 mb-2">PARABÉNS!</h2>
                <p className="text-gray-300 text-lg">Você ganhou o MAIOR desconto da roleta!</p>
              </div>

              <div className="p-8 text-center">
                <div className="inline-block px-8 py-4 rounded-2xl mb-6" style={{
                  background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(255, 107, 53, 0.2) 100%)',
                  border: '2px solid rgba(255, 184, 0, 0.4)',
                }}>
                  <span className="text-6xl font-bold text-orange-400">{WINNING_DISCOUNT}%</span>
                  <span className="block text-gray-300 text-lg mt-1">de desconto</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-green-400 mb-6">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Desconto aplicado automaticamente!</span>
                </div>

                <p className="text-gray-400 text-sm mb-6">
                  Seu plano vai sair por um preço especial!
                </p>

                <button
                  onClick={handleContinue}
                  className="w-full py-4 px-8 text-lg font-bold uppercase tracking-wider rounded-xl text-white flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(180deg, #ff6b35 0%, #e55a2b 50%, #cc4a1f 100%)',
                    boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4)',
                  }}
                >
                  <span>Ver Meu Preço Especial</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seção da Roleta */}
      <div className="w-full py-16 px-4" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255, 107, 53, 0.05) 50%, rgba(0,0,0,0) 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-orange-400 mb-2">
              GIRE A ROLETA
            </h2>
            <p className="text-white text-xl md:text-2xl mb-8">
              E GANHE UM DESCONTO EXCLUSIVO!
            </p>
          </motion.div>

          {/* Container da Roleta */}
          <div className="flex flex-col items-center gap-8">
            <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
              {/* Brilho externo */}
              <div 
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: '-40px',
                  background: 'radial-gradient(circle, rgba(255, 184, 0, 0.35) 0%, transparent 60%)',
                }}
              />
              
              {/* Anel dourado */}
              <div 
                className="absolute rounded-full"
                style={{
                  inset: '-8px',
                  background: 'linear-gradient(135deg, #ffd700 0%, #c9a227 50%, #ffd700 100%)',
                  zIndex: 1,
                }}
              />
              
              {/* Container do canvas */}
              <div 
                className="absolute rounded-full overflow-hidden"
                style={{
                  inset: '0px',
                  background: '#0d1f1e',
                  zIndex: 2,
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ width: wheelSize, height: wheelSize }}
                />
              </div>
              
              {/* Luzes */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                {WHEEL_LIGHTS.map((angle, index) => {
                  const radius = center + 12
                  const x = Math.cos((angle - 90) * Math.PI / 180) * radius + center
                  const y = Math.sin((angle - 90) * Math.PI / 180) * radius + center
                  return (
                    <div
                      key={index}
                      className={`absolute w-3 h-3 rounded-full ${lightsAnimating ? 'animate-pulse' : ''}`}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: 'translate(-50%, -50%)',
                        background: 'radial-gradient(circle, #ffcc00 0%, #ff9900 100%)',
                        boxShadow: '0 0 10px #ffcc00, 0 0 20px rgba(255, 204, 0, 0.5)',
                        animationDelay: `${index * 0.05}s`,
                      }}
                    />
                  )
                })}
              </div>

              {/* Ponteiro */}
              <div 
                className="absolute z-20"
                style={{ top: '-12px', left: '50%', transform: 'translateX(-50%)' }}
              >
                <div 
                  style={{ 
                    width: 0,
                    height: 0,
                    borderLeft: '22px solid transparent',
                    borderRight: '22px solid transparent',
                    borderTop: '40px solid #ffb800',
                    filter: 'drop-shadow(0 4px 12px rgba(255, 184, 0, 0.7))',
                  }}
                />
              </div>
            </div>

            {/* Botão de Girar */}
            <button
              onClick={spin}
              disabled={isSpinning || hasSpun}
              className="px-12 py-4 text-xl font-bold uppercase tracking-wider rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
              style={{
                background: hasSpun 
                  ? '#666' 
                  : 'linear-gradient(180deg, #ff6b35 0%, #e55a2b 50%, #cc4a1f 100%)',
                boxShadow: hasSpun 
                  ? 'none' 
                  : '0 4px 20px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {isSpinning ? 'Girando...' : hasSpun ? 'Desconto Ganho!' : 'Girar Roleta'}
            </button>

            {!hasSpun && (
              <p className="text-gray-400 text-center max-w-md">
                Clique no botão para girar a roleta e descobrir seu desconto exclusivo!
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
