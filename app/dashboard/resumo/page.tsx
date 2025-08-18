"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Target, Calendar, Ruler, Save, Edit } from "lucide-react"
import { getAuth } from "firebase/auth" // Importar getAuth
import { doc, getDoc } from "firebase/firestore" // Importar doc e getDoc
import { db, app } from "@/lib/firebase" // Importar db e app do firebase

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
  startDate?: string
}

interface Measurements {
  chest: string
  waist: string
  hip: string
  arm: string
  thigh: string
  height: string
}

interface ProgressData {
  consecutiveDays: number
  completedWorkouts: number
  dietAdherence: number
  weightProgress: number
  lastUpdated?: string
}

export default function ResumoPage() {
  const router = useRouter()
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [measurements, setMeasurements] = useState<Measurements>({
    chest: "",
    waist: "",
    hip: "",
    arm: "",
    thigh: "",
    height: "",
  })
  const [progressData, setProgressData] = useState<ProgressData>({
    consecutiveDays: 0,
    completedWorkouts: 0,
    dietAdherence: 0,
    weightProgress: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [loadingQuizData, setLoadingQuizData] = useState(true)

  const calculateDaysSinceStart = (startDate: string): number => {
    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const loadProgressData = (userData: QuizData) => {
    const savedProgress = localStorage.getItem("userProgress")

    if (savedProgress) {
      // Load existing progress data
      setProgressData(JSON.parse(savedProgress))
    } else {
      // Initialize progress for new user
      const startDate = userData.startDate || new Date().toISOString()
      const daysSinceStart = calculateDaysSinceStart(startDate)

      // For new users (less than 1 day), show 0 values
      // For users who have been in the program longer, show minimal realistic progress
      const initialProgress: ProgressData = {
        consecutiveDays: daysSinceStart < 1 ? 0 : Math.min(daysSinceStart, 3),
        completedWorkouts: daysSinceStart < 1 ? 0 : Math.min(Math.floor(daysSinceStart / 2), 5),
        dietAdherence: daysSinceStart < 1 ? 0 : Math.min(60 + daysSinceStart * 5, 85),
        weightProgress: daysSinceStart < 1 ? 0 : Math.min(daysSinceStart * 0.1, 1.5),
        lastUpdated: new Date().toISOString(),
      }

      setProgressData(initialProgress)
      localStorage.setItem("userProgress", JSON.stringify(initialProgress))
    }
  }

  useEffect(() => {
    const auth = getAuth(app)
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const savedQuizData = localStorage.getItem("quizData")
        if (savedQuizData) {
          const parsedQuizData = JSON.parse(savedQuizData)
          setQuizData(parsedQuizData)
          loadProgressData(parsedQuizData)
          setLoadingQuizData(false)
        } else if (db) {
          try {
            const userDocRef = doc(db, "users", user.uid)
            const docSnap = await getDoc(userDocRef)

            if (docSnap.exists()) {
              const data = docSnap.data()
              if (data.quizData) {
                const quizDataWithStartDate = {
                  ...data.quizData,
                  startDate: data.quizData.startDate || new Date().toISOString(),
                }
                setQuizData(quizDataWithStartDate)
                localStorage.setItem("quizData", JSON.stringify(quizDataWithStartDate))
                loadProgressData(quizDataWithStartDate)
              } else {
                router.push("/quiz")
              }
            } else {
              router.push("/quiz")
            }
          } catch (error) {
            console.error("Erro ao buscar quizData do Firestore:", error)
            router.push("/quiz")
          } finally {
            setLoadingQuizData(false)
          }
        } else {
          console.warn("Firebase DB not initialized. Redirecting to quiz.")
          router.push("/quiz")
          setLoadingQuizData(false)
        }
      } else {
        router.push("/auth")
        setLoadingQuizData(false)
      }
    })

    const savedMeasurements = localStorage.getItem("userMeasurements")
    if (savedMeasurements) {
      setMeasurements(JSON.parse(savedMeasurements))
    }

    return () => unsubscribe()
  }, [router])

  const handleSaveMeasurements = () => {
    localStorage.setItem("userMeasurements", JSON.stringify(measurements))
    setIsEditing(false)
  }

  const getGoalText = (goals: string[]) => {
    const goalMap: { [key: string]: string } = {
      "perder-peso": "Perder peso",
      "ganhar-massa": "Ganhar massa muscular",
      "melhorar-saude": "Melhorar saúde",
      "aumentar-resistencia": "Aumentar resistência",
    }
    return goals.map((goal) => goalMap[goal] || goal).join(", ")
  }

  const getBodyTypeText = (bodyType: string) => {
    const typeMap: { [key: string]: string } = {
      ectomorfo: "Ectomorfo - Corpo naturalmente magro",
      mesomorfo: "Mesomorfo - Corpo atlético natural",
      endomorfo: "Endomorfo - Tendência a ganhar peso",
    }
    return typeMap[bodyType] || bodyType
  }

  const calculateBMI = () => {
    if (!quizData?.currentWeight || !measurements.height) return null
    const weight = Number.parseFloat(quizData.currentWeight)
    const height = Number.parseFloat(measurements.height) / 100 // convert cm to m
    const bmi = weight / (height * height)
    return bmi.toFixed(1)
  }

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: "Abaixo do peso", color: "text-blue-600" }
    if (bmi < 25) return { text: "Peso normal", color: "text-green-600" }
    if (bmi < 30) return { text: "Sobrepeso", color: "text-yellow-600" }
    return { text: "Obesidade", color: "text-red-600" }
  }

  const bmi = calculateBMI()
  const bmiCategory = bmi ? getBMICategory(Number.parseFloat(bmi)) : null

  if (loadingQuizData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-700">Carregando suas informações...</div>
      </div>
    )
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-700">Nenhum dado do quiz encontrado. Redirecionando para o quiz...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Resumo Completo</h1>
            <p className="text-gray-600">Suas informações e progresso detalhado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-500" />
                  <span>Informações Pessoais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Nome</Label>
                    <p className="font-medium">{quizData?.name || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Gênero</Label>
                    <p className="font-medium capitalize">{quizData?.gender || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Peso Atual</Label>
                    <p className="font-medium">{quizData?.currentWeight} kg</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Peso Meta</Label>
                    <p className="font-medium">{quizData?.targetWeight} kg</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Tipo Corporal</Label>
                  <p className="font-medium">{getBodyTypeText(quizData?.bodyType || "")}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Experiência</Label>
                  <Badge variant="outline" className="capitalize">
                    {quizData?.experience || "Não informado"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-500" />
                  <span>Objetivos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Metas Principais</Label>
                  <p className="font-medium">{getGoalText(quizData?.goal || [])}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Prazo</Label>
                    <p className="font-medium">{quizData?.timeToGoal || "Não definido"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Tempo de Treino</Label>
                    <p className="font-medium">{quizData?.workoutTime || "Não definido"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BMI Card */}
            {bmi && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <span>Índice de Massa Corporal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">{bmi}</div>
                    <div className={`text-lg font-medium ${bmiCategory?.color}`}>{bmiCategory?.text}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Measurements */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Ruler className="h-5 w-5 text-orange-500" />
                    <span>Medidas Corporais</span>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancelar" : "Editar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      value={measurements.height}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, height: e.target.value }))}
                      placeholder="Ex: 175"
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="chest">Peitoral (cm)</Label>
                    <Input
                      id="chest"
                      value={measurements.chest}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, chest: e.target.value }))}
                      placeholder="Ex: 95"
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="waist">Cintura (cm)</Label>
                    <Input
                      id="waist"
                      value={measurements.waist}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, waist: e.target.value }))}
                      placeholder="Ex: 80"
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hip">Quadril (cm)</Label>
                    <Input
                      id="hip"
                      value={measurements.hip}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, hip: e.target.value }))}
                      placeholder="Ex: 95"
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="arm">Braço (cm)</Label>
                    <Input
                      id="arm"
                      value={measurements.arm}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, arm: e.target.value }))}
                      placeholder="Ex: 35"
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="thigh">Coxa (cm)</Label>
                    <Input
                      id="thigh"
                      value={measurements.thigh}
                      onChange={(e) => setMeasurements((prev) => ({ ...prev, thigh: e.target.value }))}
                      placeholder="Ex: 55"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <Button onClick={handleSaveMeasurements} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Medidas
                  </Button>
                )}

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Por que adicionar medidas?</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Acompanhar progresso além do peso</li>
                    <li>• Dietas e treinos mais precisos</li>
                    <li>• Análise corporal detalhada</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Progress Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <span>Resumo do Progresso</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{progressData.consecutiveDays}</div>
                <div className="text-sm text-gray-600">Dias Consecutivos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{progressData.completedWorkouts}</div>
                <div className="text-sm text-gray-600">Treinos Completos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">{progressData.dietAdherence}%</div>
                <div className="text-sm text-gray-600">Aderência à Dieta</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {progressData.weightProgress.toFixed(1)}kg
                </div>
                <div className="text-sm text-gray-600">Progresso</div>
              </div>
            </div>
            {progressData.consecutiveDays === 0 && progressData.completedWorkouts === 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
                <p className="text-green-800 font-medium">🎯 Bem-vindo ao seu programa!</p>
                <p className="text-green-700 text-sm mt-1">
                  Seus dados de progresso serão atualizados conforme você completa treinos e segue sua dieta.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
