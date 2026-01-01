"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import {
  Clock,
  MapPin,
  TrendingUp,
  Calendar,
  CheckCircle,
  Heart,
  Flame,
  Moon,
  TargetIcon,
  Zap,
} from "lucide-react"

/* ================= ASAAS LINKS ================= */
const ASAAS_CHECKOUT_LINKS: Record<number, string> = {
  10: "https://asaas.com/c/SEU-LINK-10",
  15: "https://asaas.com/c/SEU-LINK-15",
  20: "https://asaas.com/c/SEU-LINK-20",
  30: "https://asaas.com/c/SEU-LINK-30",
  40: "https://asaas.com/c/SEU-LINK-40",
}

/* ================= WHEEL LOGIC ================= */
const DISCOUNT_POOL = [
  { value: 10, weight: 5 },
  { value: 15, weight: 10 },
  { value: 20, weight: 35 },
  { value: 30, weight: 35 },
  { value: 40, weight: 15 },
]

function pickWeightedDiscount() {
  const total = DISCOUNT_POOL.reduce((s, d) => s + d.weight, 0)
  let rand = Math.random() * total
  for (const d of DISCOUNT_POOL) {
    if (rand < d.weight) return d.value
    rand -= d.weight
  }
  return 20
}

export default function ResultsPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showWheel, setShowWheel] = useState(false)
  const [discount, setDiscount] = useState<number | null>(null)
  const [expiresIn, setExpiresIn] = useState(480)

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!showWheel) return
    const i = setInterval(() => {
      setExpiresIn((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(i)
  }, [showWheel])

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const load = async () => {
      let stored = null

      if (typeof window !== "undefined") {
        const local = localStorage.getItem("quizData")
        if (local) stored = JSON.parse(local)
      }

      if (!stored && auth.currentUser) {
        const ref = doc(db, "users", auth.currentUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) stored = snap.data()
      }

      if (!stored) {
        router.push("/quiz")
        return
      }

      const used = localStorage.getItem("wheelUsed")
      if (used) {
        setDiscount(Number(localStorage.getItem("wheelDiscount")))
      }

      setData(stored)
      setLoading(false)
    }

    load()
  }, [router])

  /* ================= SPIN ================= */
  const spinWheel = async () => {
    if (discount) return

    const d = pickWeightedDiscount()
    setDiscount(d)

    localStorage.setItem("wheelUsed", "true")
    localStorage.setItem("wheelDiscount", String(d))

    if (auth.currentUser) {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        wheelUsed: true,
        discount: d,
      })
    }
  }

  const goCheckout = () => {
    const link = ASAAS_CHECKOUT_LINKS[discount || 20]
    window.location.href = link
  }

  if (loading) return null

  const minutes = Math.floor(expiresIn / 60)
  const seconds = String(expiresIn % 60).padStart(2, "0")

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      {/* CTA */}
      <Button
        onClick={() => setShowWheel(true)}
        className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-lg font-bold rounded-xl"
      >
        Girar roleta e desbloquear desconto 🎁
      </Button>

      {/* ================= WHEEL MODAL ================= */}
      {showWheel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold mb-2">Oferta exclusiva</h3>
            <p className="text-sm text-red-400 mb-4">
              Expira em {minutes}:{seconds}
            </p>

            <div
              className="w-64 h-64 rounded-full mx-auto mb-6 transition-transform duration-[4500ms] ease-out"
              style={{
                transform: discount
                  ? `rotate(${1440 + discount * 9}deg)`
                  : "rotate(0deg)",
                background:
                  "conic-gradient(#f97316, #fb923c, #fdba74, #f97316)",
              }}
            />

            {!discount ? (
              <Button
                onClick={spinWheel}
                className="w-full bg-orange-500 h-12 font-bold"
              >
                Girar agora
              </Button>
            ) : (
              <>
                <p className="text-lime-400 font-bold mb-4">
                  🎉 {discount}% OFF desbloqueado
                </p>
                <Button
                  onClick={goCheckout}
                  className="w-full bg-lime-500 h-12 font-bold"
                >
                  Ativar desconto
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
