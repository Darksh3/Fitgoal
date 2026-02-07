"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"

interface MicroFeedbackModalProps {
  isOpen: boolean
  title: string
  body: string
  onDismiss: () => void
}

export function MicroFeedbackModal({
  isOpen,
  title,
  body,
  onDismiss,
}: MicroFeedbackModalProps) {
  // Auto-dismiss after 1.2-1.8 segundos (random para natureza)
  useEffect(() => {
    if (!isOpen) return

    const duration = 1200 + Math.random() * 600 // 1200ms to 1800ms
    const timer = setTimeout(() => {
      onDismiss()
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, onDismiss])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop com blur */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal - sem botão, apenas feedback visual */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.35, type: "spring", stiffness: 400, damping: 35 }}
          >
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-lime-400/30 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
              {/* Título */}
              <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>

              {/* Corpo do texto */}
              <p className="text-gray-300 leading-relaxed text-base">{body}</p>

              {/* Indicador visual de auto-dismiss */}
              <motion.div
                className="h-1 bg-gradient-to-r from-lime-500 to-green-500 rounded-full"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 1.5, ease: "linear" }}
                style={{ originX: 0 }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
