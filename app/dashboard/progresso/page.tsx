"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Target, Ruler, Save, TrendingUp } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"

interface QuizData {
  gender: string
  name: string
  bodyType: string
  goal: string[]
  currentWeight: string
  targetWeight: string
  timeToGoal: string
  workoutTime: string
  experience: string
}

interface BodyMeasurements {
  weight: string
  height: string
  chest: string
  waist: string
  hips: string
  leftArm: string
  rightArm: string
  leftThigh: string
  rightThigh: string
  neck: string
  calf: string
  date: string
}

interface ProgressData {
  currentWeight: string
  targetWeight: string
}

export default function ProgressoPage() {
  const router = useRouter()
  const [user] = useAuthState(auth)
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    weight: "",
    height: "",
    chest: "",
    waist: "",
    hips: "",
    leftArm: "",
    rightArm: "",
    leftThigh: "",
    rightThigh: "",
    neck: "",
    calf: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [measurementHistory, setMeasurementHistory] = useState<BodyMeasurements[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState<ProgressData>({
    currentWeight: "",
    targetWeight: "",
  })

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return

      try {
        // Try Firebase first
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.quizData) {
            setQuizData(userData.quizData)

            // Pre-fill weight and height from quiz data
            setMeasurements((prev) => ({
              ...prev,
              weight: userData.quizData.currentWeight || prev.weight,
              height: userData.quizData.height || prev.height,
            }))

            // Set progress data
            setProgress({
              currentWeight: userData.quizData.currentWeight || "",
              targetWeight: userData.quizData.targetWeight || "",
            })
          }
        } else {
          // Fallback to localStorage
          const savedQuizData = localStorage.getItem("quizData")
          if (savedQuizData) {
            const parsedData = JSON.parse(savedQuizData)
            setQuizData(parsedData)
            setMeasurements((prev) => ({
              ...prev,
              weight: parsedData.currentWeight || prev.weight,
              height: parsedData.height || prev.height,
            }))

            // Set progress data
            setProgress({
              currentWeight: parsedData.currentWeight || "",
              targetWeight: parsedData.targetWeight || "",
            })
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        // Fallback to localStorage on error
        const savedQuizData = localStorage.getItem("quizData")
        if (savedQuizData) {
          const parsedData = JSON.parse(savedQuizData)
          setQuizData(parsedData)
          setMeasurements((prev) => ({
            ...prev,
            weight: parsedData.currentWeight || prev.weight,
            height: parsedData.height || prev.height,
          }))

          // Set progress data
          setProgress({
            currentWeight: parsedData.currentWeight || "",
            targetWeight: parsedData.targetWeight || "",
          })
        }
      }
    }

    loadUserData()

    if (user) {
      loadMeasurementHistory()
    }
  }, [user])

  const loadMeasurementHistory = async () => {
    if (!user) return

    try {
      const measurementsRef = collection(db, "users", user.uid, "measurements")
      const q = query(measurementsRef, orderBy("date", "desc"), limit(10))
      const querySnapshot = await getDocs(q)

      const history: BodyMeasurements[] = []
      querySnapshot.forEach((doc) => {
        history.push(doc.data() as BodyMeasurements)
      })

      setMeasurementHistory(history)

      // Load latest measurements into form
      if (history.length > 0) {
        const latest = history[0]
        setMeasurements({
          ...latest,
          date: new Date().toISOString().split("T")[0],
        })
      }
    } catch (error) {
      console.error("Error loading measurement history:", error)
    }
  }

  const saveMeasurements = async () => {
    if (!user) {
      console.log("[v0] No user logged in")
      alert("Você precisa estar logado para salvar medidas.")
      return
    }

    console.log("[v0] Starting save measurements for user:", user.uid)
    console.log("[v0] Measurements to save:", measurements)

    setIsSaving(true)
    try {
      const measurementsRef = collection(db, "users", user.uid, "measurements")
      console.log("[v0] Collection reference created:", `users/${user.uid}/measurements`)

      await addDoc(measurementsRef, {
        ...measurements,
        timestamp: new Date(),
      })

      console.log("[v0] Measurements saved successfully!")

      // Reload history
      await loadMeasurementHistory()

      alert("Medidas salvas com sucesso!")
    } catch (error: any) {
      console.error("[v0] Error saving measurements:", error)
      console.error("[v0] Error code:", error.code)
      console.error("[v0] Error message:", error.message)
      alert(`Erro ao salvar medidas: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMeasurementChange = (field: keyof BodyMeasurements, value: string) => {
    setMeasurements((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const getBodyAnalysis = () => {
    if (!quizData) return null

    const isWoman = quizData.gender === "mulher"
    const bodyType = quizData.bodyType
    const goals = quizData.goal || []

    return {
      bodyType: {
        name: bodyType === "ectomorfo" ? "Ectomorfo" : bodyType === "mesomorfo" ? "Mesomorfo" : "Endomorfo",
        description:
          bodyType === "ectomorfo"
            ? "Corpo naturalmente magro, metabolismo acelerado, dificuldade para ganhar peso"
            : bodyType === "mesomorfo"
              ? "Corpo atlético natural, facilidade para ganhar músculo e perder gordura"
              : "Tendência a acumular gordura, metabolismo mais lento, facilidade para ganhar peso",
        characteristics:
          bodyType === "ectomorfo"
            ? ["Ombros estreitos", "Metabolismo rápido", "Pouca gordura corporal", "Músculos longos"]
            : bodyType === "mesomorfo"
              ? ["Ombros largos", "Cintura fina", "Músculos bem definidos", "Metabolismo eficiente"]
              : ["Quadris largos", "Tendência ao acúmulo de gordura", "Músculos arredondados", "Metabolismo lento"],
      },
      recommendations: {
        diet:
          bodyType === "ectomorfo"
            ? "Dieta hipercalórica com carboidratos complexos e proteínas de qualidade"
            : bodyType === "mesomorfo"
              ? "Dieta balanceada com controle de porções e timing nutricional"
              : "Dieta hipocalórica com foco em proteínas e redução de carboidratos",
        training:
          bodyType === "ectomorfo"
            ? "Treinos intensos e curtos, foco em exercícios compostos"
            : bodyType === "mesomorfo"
              ? "Combinação de treino de força e cardio moderado"
              : "Cardio frequente combinado com treino de resistência",
        supplements:
          bodyType === "ectomorfo"
            ? ["Whey Protein", "Creatina", "Hipercalórico", "BCAA"]
            : bodyType === "mesomorfo"
              ? ["Whey Protein", "Creatina", "Multivitamínico"]
              : ["Whey Protein", "L-Carnitina", "Termogênico", "Ômega 3"],
      },
      metrics: {
        metabolismRate: bodyType === "ectomorfo" ? 85 : bodyType === "mesomorfo" ? 70 : 45,
        muscleGainPotential: bodyType === "ectomorfo" ? 60 : bodyType === "mesomorfo" ? 90 : 65,
        fatLossPotential: bodyType === "ectomorfo" ? 90 : bodyType === "mesomorfo" ? 80 : 55,
        recoveryRate: bodyType === "ectomorfo" ? 75 : bodyType === "mesomorfo" ? 85 : 60,
      },
    }
  }

  const analysis = getBodyAnalysis()

  const biotypeImage: Record<string, string> = {
    ectomorfo: "/biotypes/ectomorfo1.png",
    mesomorfo: "/biotypes/mesomorfo1.png",
    endomorfo: "/biotypes/endomorfo1.png",
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="px-5 py-1.5 text-sm font-semibold rounded-full transition-all border-2 bg-gray-900/80 hover:bg-gray-800 text-gray-100 border-gray-600/50 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Análise Corporal Completa</h1>
          <p className="text-gray-600 dark:text-gray-400">Entenda seu biotipo e acompanhe suas medidas</p>
        </div>

        {/* Body Measurements Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ruler className="h-5 w-5 text-purple-500" />
              <span>Medidas Corporais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={measurements.weight}
                  onChange={(e) => handleMeasurementChange("weight", e.target.value)}
                  placeholder="Ex: 70.5"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={measurements.height}
                  onChange={(e) => handleMeasurementChange("height", e.target.value)}
                  placeholder="Ex: 175"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="chest">Peitoral (cm)</Label>
                <Input
                  id="chest"
                  type="number"
                  step="0.1"
                  value={measurements.chest}
                  onChange={(e) => handleMeasurementChange("chest", e.target.value)}
                  placeholder="Ex: 95.5"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="waist">Cintura (cm)</Label>
                <Input
                  id="waist"
                  type="number"
                  step="0.1"
                  value={measurements.waist}
                  onChange={(e) => handleMeasurementChange("waist", e.target.value)}
                  placeholder="Ex: 80.0"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="hips">Quadril (cm)</Label>
                <Input
                  id="hips"
                  type="number"
                  step="0.1"
                  value={measurements.hips}
                  onChange={(e) => handleMeasurementChange("hips", e.target.value)}
                  placeholder="Ex: 95.0"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="leftArm">Braço Esquerdo (cm)</Label>
                <Input
                  id="leftArm"
                  type="number"
                  step="0.1"
                  value={measurements.leftArm}
                  onChange={(e) => handleMeasurementChange("leftArm", e.target.value)}
                  placeholder="Ex: 35.5"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="rightArm">Braço Direito (cm)</Label>
                <Input
                  id="rightArm"
                  type="number"
                  step="0.1"
                  value={measurements.rightArm}
                  onChange={(e) => handleMeasurementChange("rightArm", e.target.value)}
                  placeholder="Ex: 35.5"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="leftThigh">Coxa Esquerda (cm)</Label>
                <Input
                  id="leftThigh"
                  type="number"
                  step="0.1"
                  value={measurements.leftThigh}
                  onChange={(e) => handleMeasurementChange("leftThigh", e.target.value)}
                  placeholder="Ex: 55.0"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="rightThigh">Coxa Direita (cm)</Label>
                <Input
                  id="rightThigh"
                  type="number"
                  step="0.1"
                  value={measurements.rightThigh}
                  onChange={(e) => handleMeasurementChange("rightThigh", e.target.value)}
                  placeholder="Ex: 55.0"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="neck">Pescoço (cm)</Label>
                <Input
                  id="neck"
                  type="number"
                  value={measurements.neck}
                  onChange={(e) => handleMeasurementChange("neck", e.target.value)}
                  placeholder="Ex: 38.0"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="calf">Panturrilha (cm)</Label>
                <Input
                  id="calf"
                  type="number"
                  step="0.1"
                  value={measurements.calf}
                  onChange={(e) => handleMeasurementChange("calf", e.target.value)}
                  placeholder="Ex: 38.0"
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={measurements.date}
                  onChange={(e) => handleMeasurementChange("date", e.target.value)}
                  className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={saveMeasurements}
                disabled={isSaving}
                className="px-8 py-2.5 text-base font-semibold rounded-full transition-all border-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar Medidas"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Measurement History Section */}
        {measurementHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Histórico de Medidas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Peso</th>
                      <th className="text-left p-2">Cintura</th>
                      <th className="text-left p-2">Peitoral</th>
                      <th className="text-left p-2">Braço E</th>
                      <th className="text-left p-2">Coxa E</th>
                      <th className="text-left p-2">Pescoço</th>
                      <th className="text-left p-2">Panturrilha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurementHistory.slice(0, 5).map((measurement, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{new Date(measurement.date).toLocaleDateString("pt-BR")}</td>
                        <td className="p-2">{measurement.weight || "-"} kg</td>
                        <td className="p-2">{measurement.waist || "-"} cm</td>
                        <td className="p-2">{measurement.chest || "-"} cm</td>
                        <td className="p-2">{measurement.leftArm || "-"} cm</td>
                        <td className="p-2">{measurement.leftThigh || "-"} cm</td>
                        <td className="p-2">{measurement.neck || "-"} cm</td>
                        <td className="p-2">{measurement.calf || "-"} cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <div className="space-y-12">
            {/* TOPO – Biotipo */}
            <Card className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/40 rounded-3xl p-10">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                <img
                  src={biotypeImage[quizData?.bodyType?.toLowerCase() || "ectomorfo"]}
                  alt={`Biotipo ${analysis.bodyType.name}`}
                  className="w-28 md:w-36 drop-shadow-[0_0_25px_rgba(0,112,255,0.8)]"
                />

                <div className="flex-1 space-y-6">
                  <h2 className="text-4xl font-bold text-white leading-tight">
                    Seu <span className="text-blue-400">Biotipo:</span> {analysis.bodyType.name}
                  </h2>

                  <p className="text-gray-400 text-lg leading-relaxed">{analysis.bodyType.description}</p>
                </div>
              </div>
            </Card>

            {/* Action Plan */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Plano de Ação Personalizado</span>
                </CardTitle>
              </CardHeader>
            </Card>

            <hr className="border-gray-700/40" />

            {/* CARACTERÍSTICAS PRINCIPAIS */}
            <Card className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/40 rounded-3xl p-10">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Características Principais</h3>

                <div className="flex flex-wrap gap-4">
                  {analysis.bodyType.characteristics.map((char, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-800/50 border border-gray-700/50 
                      rounded-full text-gray-200 text-sm shadow hover:bg-gray-800/70 
                      transition-all"
                    >
                      <span className="text-blue-400 text-lg">⚡</span>
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <hr className="border-gray-700/40" />

            {/* MÉTRICAS CORPORAIS */}
            <Card className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/40 rounded-3xl p-10">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Métricas Corporais</h3>

                <div className="space-y-6">
                  {/* Taxa Metabólica */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Taxa Metabólica</span>
                      <span className="text-gray-400">{analysis.metrics.metabolismRate}%</span>
                    </div>
                    <Progress value={analysis.metrics.metabolismRate} className="h-2" />
                  </div>

                  {/* Potencial de Ganho Muscular */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Potencial de Ganho Muscular</span>
                      <span className="text-gray-400">{analysis.metrics.muscleGainPotential}%</span>
                    </div>
                    <Progress value={analysis.metrics.muscleGainPotential} className="h-2" />
                  </div>

                  {/* Potencial de Perda de Gordura */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Potencial de Perda de Gordura</span>
                      <span className="text-gray-400">{analysis.metrics.fatLossPotential}%</span>
                    </div>
                    <Progress value={analysis.metrics.fatLossPotential} className="h-2" />
                  </div>

                  {/* Taxa de Recuperação */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Taxa de Recuperação</span>
                      <span className="text-gray-400">{analysis.metrics.recoveryRate}%</span>
                    </div>
                    <Progress value={analysis.metrics.recoveryRate} className="h-2" />
                  </div>
                </div>
              </div>
            </Card>

            <hr className="border-gray-700/40" />

            {/* DIETA + TREINO + SUPLEMENTOS */}
            <Card className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/40 rounded-3xl p-10">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Recomendações</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Dieta */}
                  <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-3">🍽️ Dieta Recomendada</h4>
                    <p className="text-gray-400 text-sm">{analysis.recommendations.diet}</p>
                  </div>

                  {/* Treino */}
                  <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-3">💪 Treino Ideal</h4>
                    <p className="text-gray-400 text-sm">{analysis.recommendations.training}</p>
                  </div>

                  {/* Suplementos */}
                  <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-3">💊 Suplementos</h4>
                    <div className="space-y-2">
                      {analysis.recommendations.supplements.map((supplement, idx) => (
                        <div
                          key={idx}
                          className="text-center bg-gray-900/40 border border-gray-700/40 rounded-xl px-4 py-2 text-gray-300"
                        >
                          {supplement}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
