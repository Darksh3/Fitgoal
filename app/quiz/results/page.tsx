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
  Heart,
  Flame,
  Moon,
  TargetIcon,
  Zap,
} from "lucide-react"
import { Gauge } from "@/components/gauge"

export default function ResultsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // 🎡 ROLETTE STATES
  const [showWheel, setShowWheel] = useState(false)
  const [discount, setDiscount] = useState<number | null>(null)

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

  /* ================= HELPERS (INALTERADOS) ================= */

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
    const gender = data.gender || "male"

    let bmr =
      gender === "homem"
        ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
        : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age

    const trainingDays = Number(data.trainingDays) || 3
    const activityFactor = trainingDays >= 5 ? 1.725 : trainingDays >= 3 ? 1.55 : 1.375

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
      <div className="max-w-md mx-auto px-4 space-y-10">

        {/* ================= TRANSFORMAÇÃO ================= */}
        <div className="grid grid-cols-2 gap-4 text-center pt-8">
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

        {/* CTA EARLY */}
        <Button
          onClick={() => router.push("/checkout")}
          className="w-full h-14 bg-lime-500 hover:bg-lime-600 text-lg font-bold rounded-xl"
        >
          Get my plan
        </Button>

        {/* ================= SUMMARY ================= */}
        <h2 className="text-xl font-bold text-center">Resumo pessoal</h2>

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

        {/* ================= PLAN ================= */}
        <h2 className="text-xl font-bold text-center">
          Plano personalizado para {data.name}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Info icon={Clock} label="Duração" value="1h" />
          <Info icon={MapPin} label="Local" value="Academia" />
          <Info icon={TrendingUp} label="Nível" value="Intermediário" />
          <Info icon={Calendar} label="Frequência" value="3x semana" />
        </div>

        {/* ================= WHAT YOU GET ================= */}
        <h2 className="text-xl font-bold text-center">What you get</h2>

        <Benefit text="Programa de treino personalizado" />
        <Benefit text="Resultados visíveis após o primeiro mês" />
        <Benefit text="Acompanhamento de progresso" />

        {/* ================= TESTIMONIAL ================= */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <p className="text-sm italic text-gray-300">
            “Esse foi o primeiro plano que realmente funcionou para mim.”
          </p>
          <p className="text-xs text-gray-400 mt-2">— Jeffrey, 41</p>
        </div>

        {/* ================= FINAL CTA ================= */}
        <Button
          onClick={() => setShowWheel(true)}
          className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-lg font-bold rounded-xl"
        >
          Girar roleta e ganhar desconto 🎁
        </Button>
      </div>

      {/* ================= ROLETE ================= */}
      {showWheel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold mb-4">Gire e ganhe desconto</h3>

            <div
              className="w-64 h-64 rounded-full mx-auto mb-6 transition-transform duration-[4000ms] ease-out"
              style={{
                transform: discount ? `rotate(${1440 + discount * 10}deg)` : "rotate(0deg)",
                background:
                  "conic-gradient(#f97316, #fb923c, #fdba74, #f97316)",
              }}
            />

            {!discount ? (
              <Button
                onClick={() => {
                  const prizes = [10, 15, 20, 30, 40, 50]
                  setDiscount(prizes[Math.floor(Math.random() * prizes.length)])
                }}
                className="w-full bg-orange-500 h-12 font-bold"
              >
                Girar
              </Button>
            ) : (
              <>
                <p className="text-lime-400 font-bold mb-4">
                  🎉 Você ganhou {discount}% OFF
                </p>
                <Button
                  onClick={() => router.push(`/checkout?discount=${discount}`)}
                  className="w-full bg-lime-500 h-12 font-bold"
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

/* ================= SUB COMPONENTS ================= */

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

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle className="text-lime-400" />
      <p>{text}</p>
    </div>
  )
}
