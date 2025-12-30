"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import {
  Clock,
  MapPin,
  TrendingUp,
  Calendar,
  CheckCircle,
} from "lucide-react"
import { Gauge } from "@/components/gauge"

/* ================= CONFIG ================= */
const WHEEL_USED_KEY = "fitgoal_wheel_used"
const DISCOUNT_KEY = "fitgoal_discount"
const TIMER_KEY = "fitgoal_timer"

const ASSAS_CHECKOUT: Record<number, string> = {
  10: "https://checkout.assas.com/fitgoal-10",
  15: "https://checkout.assas.com/fitgoal-15",
  20: "https://checkout.assas.com/fitgoal-20",
  30: "https://checkout.assas.com/fitgoal-30",
  40: "https://checkout.assas.com/fitgoal-40",
  50: "https://checkout.assas.com/fitgoal-50",
}

export default function ResultsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // 🎡 ROLETTE
  const [showWheel, setShowWheel] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [discount, setDiscount] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(300)

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      let stored: any = null

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

      const used = localStorage.getItem(WHEEL_USED_KEY)
      const savedDiscount = localStorage.getItem(DISCOUNT_KEY)
      const savedTimer = localStorage.getItem(TIMER_KEY)

      if (used && savedDiscount) {
        setDiscount(Number(savedDiscount))
        setShowWheel(true)
      }

      if (savedTimer) setTimeLeft(Number(savedTimer))

      setData(stored)
      setLoading(false)
    }

    fetchData()
  }, [router])

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!discount) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0
        localStorage.setItem(TIMER_KEY, String(prev - 1))
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [discount])

  /* ================= HELPERS ================= */
  const spinWheel = () => {
    if (spinning || localStorage.getItem(WHEEL_USED_KEY)) return
    setSpinning(true)

    // 🎯 distribuição que mais converte
    const pool = [
      30, 30, 30, 30, 30, 30,
      20, 20, 20,
      40, 40,
      50,
    ]

    const result = pool[Math.floor(Math.random() * pool.length)]

    setTimeout(() => {
      setDiscount(result)
      localStorage.setItem(WHEEL_USED_KEY, "true")
      localStorage.setItem(DISCOUNT_KEY, String(result))
      localStorage.setItem(TIMER_KEY, "300")
      setSpinning(false)
    }, 3500)
  }

  const goCheckout = () => {
    if (!discount) return
    window.location.href = ASSAS_CHECKOUT[discount]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-lime-500 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-md mx-auto px-4 space-y-10 pt-8">

        {/* CTA */}
        <Button
          onClick={() => setShowWheel(true)}
          className="w-full h-14 bg-orange-500 rounded-xl font-bold"
        >
          Unlock my discount 🎁
        </Button>
      </div>

      {/* ================= WHEEL MODAL ================= */}
      {showWheel && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm text-center">

            <h3 className="text-xl font-bold mb-1">
              Exclusive offer unlocked
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              One spin only — expires soon
            </p>

            <div
              className={`w-64 h-64 mx-auto rounded-full mb-6 transition-transform duration-[3500ms] ease-out ${
                spinning ? "rotate-[1980deg]" : ""
              }`}
              style={{
                background:
                  "conic-gradient(#f97316,#fb923c,#fdba74,#f97316)",
              }}
            />

            {!discount ? (
              <button
                onClick={spinWheel}
                disabled={spinning}
                className="w-full h-12 bg-orange-500 rounded-xl font-bold"
              >
                {spinning ? "Spinning..." : "Spin the wheel"}
              </button>
            ) : (
              <>
                <p className="text-lime-400 font-bold text-lg mb-2">
                  🎉 {discount}% OFF unlocked
                </p>

                <p className="text-red-400 text-sm mb-4">
                  ⏰ Expires in {Math.floor(timeLeft / 60)}:
                  {String(timeLeft % 60).padStart(2, "0")}
                </p>

                <button
                  onClick={goCheckout}
                  className="w-full h-12 bg-lime-500 rounded-xl font-bold"
                >
                  Continue with discount
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
