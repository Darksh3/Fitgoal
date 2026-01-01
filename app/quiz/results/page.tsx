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

/* =========================
   CONFIG ROLETE / DESCONTO
========================= */
const WHEEL_KEY = "fitgoal_wheel_used"
const DISCOUNT_KEY = "fitgoal_discount"
const TIMER_KEY = "fitgoal_discount_timer"

export default function ResultsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  /* ROLETE */
  const [showWheel, setShowWheel] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [discount, setDiscount] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(300)

  /* ================= FETCH ================= */
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

      setData(stored)
      setLoading(false)
    }

    fetchData()
  }, [router])

  /* ================= LOAD ROLETE STATE ================= */
  useEffect(() => {
    if (typeof window === "undefined") return

    const used = localStorage.getItem(WHEEL_KEY)
    const savedDiscount = localStorage.getItem(DISCOUNT_KEY)
    const savedTimer = localStorage.getItem(TIMER_KEY)

    if (used && savedDiscount) {
      setDiscount(Number(savedDiscount))
      setShowWheel(true)
    }

    if (savedTimer) {
      setTimeLeft(Number(savedTimer))
    }
  }, [])

  /* ================= COUNTDOWN ================= */
  useEffect(() => {
    if (!discount) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          localStorage.clear()
          return 0
        }
        localStorage.setItem(TIMER_KEY, String(prev - 1))
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [discount])

  /* ================= HELPERS ================= */
  const getBMICategory = (imc: number) => {
    if (imc < 18.5) return { text: "Abaixo do peso", color: "text-blue-400" }
    if (imc < 25) return { text: "Peso normal", color: "text-lime-400" }
    if (imc < 30) return { text: "Sobrepeso", color: "text-yellow-400" }
    return { text: "Obesidade", color: "text-red-400" }
  }

  const calculateDailyCalories = () => {
    const weight = Number(data.weight) || 70
    const height = Number(data.height) || 170
    const age = Number(data.age) || 30
    const gender = data.gender || "homem"

    let bmr =
      gender === "homem"
        ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
        : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age

    const trainingDays = Number(data.trainingDays) || 3
    const activityFactor =
      trainingDays >= 5 ? 1.725 : trainingDays >= 3 ? 1.55 : 1.375

    let calories = bmr * activityFactor
    if (data.goal?.includes("perder-peso")) calories -= 500
    if (data.goal?.includes("ganhar-massa")) calories += 300

    return Math.round(calories)
  }

  const getCurrentBodyFatImage = () => {
    const bf = Number(data.bodyFat) || 25
    if (bf <= 15) return "/images/mtwo.webp"
    if (bf <= 25) return "/images/mfour.webp"
    return "/images/msix.webp"
  }

  const getImprovedBodyFatImage = () => {
    const bf = Number(data.bodyFat) || 25
    if (bf <= 25) return "/images/mtwo.webp"
    return "/images/mfour.webp"
  }

  /* ================= SPIN ================= */
  const spinWheel = () => {
    if (spinning) return
    if (localStorage.getItem(WHEEL_KEY)) return

    setSpinning(true)

    // Pool otimizado para conversão
    const pool = [
      30, 30, 30, 30, 30, // campeão de conversão
      20, 20, 20,
      40, 40,
      15,
    ]

    const result = pool[Math.floor(Math.random() * pool.length)]

    setTimeout(() => {
      setDiscount(result)
      localStorage.setItem(WHEEL_KEY, "true")
      localStorage.setItem(DISCOUNT_KEY, String(result))
      localStorage.setItem(TIMER_KEY, "300")
      setSpinning(false)
    }, 3500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin h-10 w-10 border-b-2 border-lime-500 rounded-full" />
      </div>
    )
  }

  const bmiInfo = getBMICategory(Number(data.imc))

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-md mx-auto px-4 space-y-10 pt-8">

        {/* TRANSFORMAÇÃO */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-2">Agora</p>
            <img src={getCurrentBodyFatImage()} className="mx-auto h-56" />
            <p className="text-orange-400 font-bold mt-2">Corpo atual</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">6 meses</p>
            <img src={getImprovedBodyFatImage()} className="mx-auto h-56" />
            <p className="text-lime-400 font-bold mt-2">Resultado esperado</p>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={() => setShowWheel(true)}
          className="w-full h-14 bg-orange-500 text-lg font-bold rounded-xl"
        >
          Desbloquear desconto 🎁
        </Button>

        {/* SUMMARY */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-2">IMC atual</p>
          <Gauge value={Number(data.imc)} maxValue={40} />
          <p className={`text-center mt-2 font-bold ${bmiInfo.color}`}>
            {bmiInfo.text}
          </p>
        </div>

        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-2">Calorias diárias</p>
          <Gauge value={calculateDailyCalories()} maxValue={5000} unit="kcal" />
        </div>

        {/* PLAN */}
        <div className="grid grid-cols-2 gap-3">
          <Info icon={Clock} label="Duração" value="1h" />
          <Info icon={MapPin} label="Local" value="Academia" />
          <Info icon={TrendingUp} label="Nível" value="Intermediário" />
          <Info icon={Calendar} label="Frequência" value="3x semana" />
        </div>

        {/* TESTIMONIAL */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <p className="text-sm italic text-gray-300">
            “Esse foi o primeiro plano que realmente funcionou para mim.”
          </p>
          <p className="text-xs text-gray-400 mt-2">— Jeffrey, 41</p>
        </div>
      </div>

      {/* ROLETE */}
      {showWheel && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm text-center">

            <h3 className="text-xl font-bold mb-1">Oferta exclusiva</h3>
            <p className="text-sm text-gray-400 mb-4">Apenas 1 giro • Tempo limitado</p>

            <div
              className={`w-64 h-64 mx-auto rounded-full mb-6 transition-transform duration-[3500ms] ease-out ${
                spinning ? "rotate-[1980deg]" : ""
              }`}
              style={{
                background:
                  "conic-gradient(#f97316 0deg 60deg,#fb923c 60deg 120deg,#fdba74 120deg 180deg,#f97316 180deg 240deg,#fb923c 240deg 300deg,#fdba74 300deg 360deg)",
              }}
            />

            {!discount ? (
              <Button onClick={spinWheel} className="w-full h-12 bg-orange-500">
                {spinning ? "Girando..." : "Girar roleta"}
              </Button>
            ) : (
              <>
                <p className="text-lime-400 font-bold mb-2">
                  🎉 Você ganhou {discount}% OFF
                </p>

                <p className="text-red-400 text-sm mb-4">
                  ⏰ Expira em {Math.floor(timeLeft / 60)}:
                  {String(timeLeft % 60).padStart(2, "0")}
                </p>

                <Button
                  onClick={() =>
                    router.push(`/checkout?discount=${discount}`)
                  }
                  className="w-full h-12 bg-lime-500"
                >
                  Usar desconto
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= SUB ================= */

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
      <Icon className="text-lime-400" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}
