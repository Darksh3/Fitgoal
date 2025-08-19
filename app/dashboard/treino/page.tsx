"use client"

import { useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Calendar, Lightbulb, Target } from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button" // Importar Button

interface Exercise {
  name: string
  sets: string
  reps: string
  rest: string
  description: string
}

interface WorkoutDay {
  day: string
  title: string
  focus: string
  duration: string
  exercises: Exercise[]
}

interface WorkoutPlan {
  days: WorkoutDay[]
  weeklySchedule: string
  tips: string[]
}

interface UserData {
  workoutPlan?: WorkoutPlan
  quizData?: any
}

const debugDataFlow = (stage: string, data: any) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    stage,
    trainingFrequency: data?.trainingDaysPerWeek || data?.weeklySchedule || "not found",
    exerciseCount:
      data?.days?.reduce((total: number, day: any) => total + (day.exercises?.length || 0), 0) || "not found",
    totalDays: data?.days?.length || "not found",
  }

  console.log(`[DATA_FLOW] ${stage}:`, logEntry)

  if (typeof window !== "undefined") {
    const debugHistory = JSON.parse(sessionStorage.getItem("debugHistory") || "[]")
    debugHistory.push(logEntry)
    sessionStorage.setItem("debugHistory", JSON.stringify(debugHistory))
  }
}

export default function WorkoutPage() {
  const [user, loading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actualTrainingFrequency, setActualTrainingFrequency] = useState<string>("Carregando...")

  const syncUserData = async (firestoreData: UserData) => {
    if (typeof window === "undefined") return firestoreData

    try {
      const localStorageData = localStorage.getItem("quizData")
      if (localStorageData) {
        const localQuizData = JSON.parse(localStorageData)
        const firestoreQuizData = (firestoreData as any).quizData || firestoreData

        // Check for discrepancies in training frequency
        if (firestoreQuizData && localQuizData.trainingDaysPerWeek !== firestoreQuizData.trainingDaysPerWeek) {
          console.log("[TREINO] Frequency mismatch detected:")
          console.log("  localStorage:", localQuizData.trainingDaysPerWeek)
          console.log("  Firestore:", firestoreQuizData.trainingDaysPerWeek)

          // Update localStorage with Firestore data
          const updatedLocalData = { ...localQuizData, ...firestoreQuizData }
          localStorage.setItem("quizData", JSON.stringify(updatedLocalData))
          console.log("[TREINO] localStorage updated with Firestore data")
        }

        // Check for name discrepancies
        if (firestoreQuizData && localQuizData.name !== firestoreQuizData.name) {
          console.log("[TREINO] Name mismatch detected:")
          console.log("  localStorage:", localQuizData.name)
          console.log("  Firestore:", firestoreQuizData.name)

          const updatedLocalData = { ...localQuizData, ...firestoreQuizData }
          localStorage.setItem("quizData", JSON.stringify(updatedLocalData))
          console.log("[TREINO] Name synchronized from Firestore")
        }
      } else {
        const firestoreQuizData = (firestoreData as any).quizData
        if (firestoreQuizData) {
          console.log("[TREINO] Creating localStorage from Firestore data")
          localStorage.setItem("quizData", JSON.stringify(firestoreQuizData))
        }
      }
    } catch (error) {
      console.error("[TREINO] Error syncing data:", error)
    }

    return firestoreData
  }

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          console.log("[DASHBOARD] Loading user preferences for:", user.uid)
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            let data = userDoc.data() as UserData
            console.log("[DASHBOARD] Raw user data:", data)

            data = await syncUserData(data)

            let frequency = "Frequência não especificada"
            let frequencySource = "none"

            if (data.workoutPlan?.days?.length) {
              frequency = `${data.workoutPlan.days.length}x por semana`
              frequencySource = "workoutPlan.days"
              console.log("[DASHBOARD] Using actual workout plan days count:", frequency)
            }
            // Priority 2: Get from quiz data (fallback if no plan exists)
            else if ((data as any).quizData?.trainingDaysPerWeek) {
              const quizData = (data as any).quizData
              frequency = `${quizData.trainingDaysPerWeek}x por semana`
              frequencySource = "quizData"
              console.log("[DASHBOARD] Found training frequency from quiz:", frequency)
            }
            // Priority 3: Parse from weeklySchedule string (last resort)
            else if (data.workoutPlan?.weeklySchedule) {
              const match = data.workoutPlan.weeklySchedule.match(/(\d+)x?\s*por\s*semana/i)
              if (match) {
                frequency = `${match[1]}x por semana`
                frequencySource = "weeklySchedule"
                console.log("[DASHBOARD] Parsed from weeklySchedule:", frequency)
              }
            }

            console.log(`[DASHBOARD] Final frequency: ${frequency} (source: ${frequencySource})`)
            setActualTrainingFrequency(frequency)

            debugDataFlow("DASHBOARD_LOAD", data)
            setUserData(data)

            const quizData = (data as any).quizData
            const expectedFrequency = quizData?.trainingDaysPerWeek || 5
            const actualDays = data.workoutPlan?.days?.length || 0
            const hasMinimumExercises =
              data.workoutPlan?.days?.every((day: any) => day.exercises && day.exercises.length >= 5) || false

            const needsRegeneration =
              !data.workoutPlan ||
              !data.workoutPlan.days ||
              actualDays === 0 ||
              (actualDays > 0 && Math.abs(actualDays - expectedFrequency) > 1) // Only regenerate if difference is more than 1 day

            console.log(`[DASHBOARD] Regeneration check:`, {
              hasWorkoutPlan: !!data.workoutPlan,
              hasDays: !!data.workoutPlan?.days,
              actualDays,
              expectedFrequency,
              hasMinimumExercises,
              needsRegeneration,
            })

            if (needsRegeneration) {
              console.log("[DASHBOARD] Plan needs regeneration - generating new plan...")
              await generatePlans()
            } else {
              debugDataFlow("DASHBOARD_EXISTING_PLAN", data.workoutPlan)
              console.log(`[DASHBOARD] Using existing plan with ${actualDays} days`)
              data.workoutPlan.days.forEach((day: any, index: number) => {
                console.log(
                  `[DASHBOARD] Day ${index + 1} (${day.title || day.day}): ${day.exercises?.length || 0} exercises`,
                )
              })
            }
          } else {
            console.log("[DASHBOARD] No user document found, generating new plans...")
            await generatePlans()
          }
        } catch (error) {
          console.error("[DASHBOARD] Erro ao buscar dados do usuário:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (!loading) {
      fetchUserData()
    }
  }, [user, loading])

  const generatePlans = async () => {
    if (!user) return

    try {
      console.log("[DASHBOARD] Calling generate-plans-on-demand API...")
      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      })

      if (response.ok) {
        console.log("[DASHBOARD] Plans generated successfully, refreshing user data...")
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const newData = userDoc.data() as UserData
          setUserData(newData)

          if (newData.workoutPlan?.days?.length) {
            setActualTrainingFrequency(`${newData.workoutPlan.days.length}x por semana`)
          } else if ((newData as any).quizData?.trainingDaysPerWeek) {
            const quizData = (newData as any).quizData
            setActualTrainingFrequency(`${quizData.trainingDaysPerWeek}x por semana`)
          }
        }
      } else {
        console.error("[DASHBOARD] Failed to generate plans:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("[DASHBOARD] Erro ao gerar planos:", error)
    }
  }

  if (loading || isLoading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando seu plano de treino...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const workoutPlan = userData?.workoutPlan

  if (!workoutPlan || !workoutPlan.days || workoutPlan.days.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Dumbbell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Plano de Treino Não Encontrado</h2>
            <p className="text-gray-600 mb-6">Parece que você ainda não tem um plano de treino personalizado.</p>
            <Button onClick={() => (window.location.href = "/quiz")} className="mt-4">
              Fazer Quiz Gratuito
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seu Plano de Treino</h1>
          <p className="text-gray-600">Plano personalizado para atingir seus objetivos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Programação Semanal</p>
                  <p className="text-lg font-bold text-gray-900">{actualTrainingFrequency}</p>
                  {process.env.NODE_ENV === "development" && (
                    <p className="text-xs text-gray-500">
                      Quiz: {(userData as any)?.quizData?.trainingDaysPerWeek || "N/A"} | Plan:{" "}
                      {workoutPlan?.days?.length || "N/A"} dias
                      <br />
                      User: {(userData as any)?.quizData?.name || "N/A"}
                      {workoutPlan?.days?.length !== (userData as any)?.quizData?.trainingDaysPerWeek && (
                        <span className="text-orange-500"> (Discrepância detectada)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Duração Média por Treino</p>
                  <p className="text-lg font-bold text-gray-900">
                    {workoutPlan.days[0]?.duration || "Não especificado"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {workoutPlan.days.map((day, dayIndex) => (
            <Card key={dayIndex}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Dumbbell className="h-5 w-5 mr-2 text-blue-600" />
                  {day.title || day.day} - {day.focus}
                </CardTitle>
                <CardDescription>Duração: {day.duration}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {day.exercises && day.exercises.length > 0 ? (
                    day.exercises.map((exercise, exerciseIndex) => (
                      <div key={exerciseIndex} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <h4 className="font-bold text-lg">{exercise.name}</h4>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-1">
                          <Badge variant="secondary">Séries: {exercise.sets}</Badge>
                          <Badge variant="secondary">Repetições: {exercise.reps}</Badge>
                          <Badge variant="secondary">Descanso: {exercise.rest}</Badge>
                        </div>
                        <p className="text-gray-700 text-sm">{exercise.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum exercício especificado para este dia.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {workoutPlan.tips && workoutPlan.tips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
                Dicas de Treino
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {workoutPlan.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
