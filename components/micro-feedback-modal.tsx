"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface MicroFeedbackModalProps {
  isOpen: boolean
  title: string
  body: string
  cta?: string
  onContinue: () => void
}

export function MicroFeedbackModal({
  isOpen,
  title,
  body,
  cta = "Continuar",
  onContinue,
}: MicroFeedbackModalProps) {
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

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-lime-400/20 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
              {/* Header com close button (opcional) */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>
                </div>
              </div>

              {/* Corpo do texto */}
              <p className="text-gray-300 leading-relaxed text-base">{body}</p>

              {/* Botão CTA */}
              <button
                onClick={onContinue}
                className="w-full h-12 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-black text-base font-bold rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                {cta}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
