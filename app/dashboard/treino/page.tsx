"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebaseClient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "@/components/protected-route"
import dynamic from "next/dynamic"
import { Dumbbell, Calendar, Lightbulb, Target, RefreshCw, Download, AlertCircle, ArrowLeft } from "lucide-react"
import React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const html2pdf = dynamic(() => import("html2pdf.js"), { ssr: false })

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

function ExerciseSubstituteButton({
  exercise,
  dayIndex,
  exerciseIndex,
  onSubstitute,
}: {
  exercise: any
  dayIndex: number
  exerciseIndex: number
  onSubstitute: (dayIndex: number, exerciseIndex: number, exercise: any) => void
}) {
  const [isSubstituting, setIsSubstituting] = React.useState(false)

  const handleSubstitute = async () => {
    setIsSubstituting(true)
    await onSubstitute(dayIndex, exerciseIndex, exercise)
    setIsSubstituting(false)
  }

  return (
    <button
      onClick={handleSubstitute}
      disabled={isSubstituting}
      className="px-3 py-1.5 text-xs font-medium rounded-md border-2 border-lime-400 dark:border-lime-500 bg-transparent text-lime-600 dark:text-lime-400 hover:bg-lime-400/10 dark:hover:bg-lime-500/10 transition-all duration-200 shadow-[0_0_10px_rgba(163,230,53,0.3)] hover:shadow-[0_0_15px_rgba(163,230,53,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
    >
      {isSubstituting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      {isSubstituting ? "Substituindo..." : "Substituir"}
    </button>
  )
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

export default function TreinoPage() {
  const [user, loading] = useAuthState(auth)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actualTrainingFrequency, setActualTrainingFrequency] = useState<string>("Carregando...")
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const router = useRouter()

  // Helper para obter trainingDaysPerWeek com fallback seguro
  const getTrainingDaysPerWeek = (quizData: any): number => {
    // Priority 1: Use trainingDaysPerWeek if it's a valid number > 0
    if (quizData?.trainingDaysPerWeek && quizData.trainingDaysPerWeek > 0) {
      return quizData.trainingDaysPerWeek
    }
    // Priority 2: Parse from trainingDays string
    if (quizData?.trainingDays) {
      const parsed = Number.parseInt(quizData.trainingDays)
      if (parsed > 0) return parsed
    }
    // Priority 3: Default to 5
    return 5
  }

  const detectAndCleanInconsistentData = async (data: any, currentUserEmail: string) => {
    const hasInconsistentData =
      (data.quizData?.email && data.quizData.email !== currentUserEmail) ||
      (data.workoutPlan?.email && data.workoutPlan.email !== currentUserEmail) ||
      (data.quizData?.name && data.quizData.name.toLowerCase().includes("nathalia")) ||
      (data.workoutPlan?.name && data.workoutPlan.name.toLowerCase().includes("nathalia"))

    if (hasInconsistentData) {
      console.log("[TREINO] 🚨 INCONSISTENT DATA DETECTED!")
      console.log("  Current user email:", currentUserEmail)
      console.log("  Quiz data email:", data.quizData?.email)
      console.log("  Quiz data name:", data.quizData?.name)
      console.log("  Workout plan email:", data.workoutPlan?.email)
      console.log("  Workout plan name:", data.workoutPlan?.name)

      // Clear all local storage
      localStorage.clear()
      sessionStorage.clear()

      // Force cleanup via API
      try {
        const cleanupResponse = await fetch("/api/cleanup-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUserEmail }),
        })

        if (cleanupResponse.ok) {
          console.log("[TREINO] ✅ Cleanup completed successfully")
          // Force page reload to start fresh
          window.location.reload()
          return true
        }
      } catch (error) {
        console.error("[TREINO] ❌ Cleanup failed:", error)
      }
    }

    return false
  }

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

  const generatePlans = async () => {
    if (!user) return

    try {
      setIsRegenerating(true)
      console.log("[DASHBOARD] Calling generate-plans-on-demand API...")

      localStorage.clear()
      sessionStorage.clear()

      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          forceRegenerate: true,
          cleanupFirst: true, // New parameter to force cleanup
        }),
      })

      if (response.ok) {
        console.log("[DASHBOARD] Plans generated successfully, refreshing user data...")
        window.location.reload()
      } else {
        console.error("[DASHBOARD] Failed to generate plans:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("[DASHBOARD] Erro ao gerar planos:", error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleExerciseSubstitution = async (dayIndex: number, exerciseIndex: number, newExercise: Exercise) => {
    if (!userData?.workoutPlan || !user) return

    const updatedWorkoutPlan = { ...userData.workoutPlan }
    updatedWorkoutPlan.days[dayIndex].exercises[exerciseIndex] = newExercise

    // Update local state
    setUserData({
      ...userData,
      workoutPlan: updatedWorkoutPlan,
    })

    // Save to Firestore
    try {
      console.log("[TREINO] Saving exercise substitution to Firestore...")
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        workoutPlan: updatedWorkoutPlan,
      })
      console.log("[TREINO] Exercise substitution saved successfully")
    } catch (error) {
      console.error("[TREINO] Error saving exercise substitution:", error)
    }
  }

  const downloadWorkoutPDF = async () => {
    if (!userData?.workoutPlan) return

    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default

      const workoutPlan = userData.workoutPlan

      // Create PDF content as HTML string
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Plano de Treino Personalizado</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .header h1 { color: #3b82f6; margin: 0; font-size: 28px; }
            .header p { color: #666; margin: 5px 0; }
            .workout-day { margin: 20px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; }
            .day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            .day-title { font-size: 20px; font-weight: bold; color: #1e293b; }
            .day-focus { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
            .day-duration { color: #666; font-size: 14px; margin-top: 5px; }
            .exercise { padding: 15px; margin: 10px 0; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; }
            .exercise-name { font-weight: bold; font-size: 16px; color: #1e293b; margin-bottom: 8px; }
            .exercise-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 8px 0; }
            .detail { font-size: 14px; color: #475569; }
            .detail-label { font-weight: 600; color: #3b82f6; }
            .exercise-description { font-size: 14px; color: #666; margin-top: 8px; line-height: 1.5; }
            .tips { margin-top: 30px; page-break-before: always; }
            .tips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
            .tip { padding: 15px; border-radius: 8px; }
            .tip-1 { background: #dbeafe; border-left: 4px solid #3b82f6; }
            .tip-2 { background: #dcfce7; border-left: 4px solid #059669; }
            .tip-3 { background: #fef3c7; border-left: 4px solid #d97706; }
            .tip-4 { background: #fee2e2; border-left: 4px solid #dc2626; }
            .tip-title { font-weight: bold; margin-bottom: 5px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Plano de Treino Personalizado</h1>
            <p>Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
            <p>${workoutPlan.weeklySchedule || "Plano semanal personalizado"}</p>
          </div>

          ${workoutPlan.days
            .map(
              (day) => `
            <div class="workout-day">
              <div class="day-header">
                <div class="day-title">${day.day} - ${day.title}</div>
                <div class="day-focus">${day.focus}</div>
                <div class="day-duration">Duração: ${day.duration}</div>
              </div>
              
              ${day.exercises
                .map(
                  (exercise) => `
                <div class="exercise">
                  <div class="exercise-name">${exercise.name}</div>
                  <div class="exercise-details">
                    <div class="detail"><span class="detail-label">Séries:</span> ${exercise.sets}</div>
                    <div class="detail"><span class="detail-label">Repetições:</span> ${exercise.reps}</div>
                    <div class="detail"><span class="detail-label">Descanso:</span> ${exercise.rest}</div>
                  </div>
                  <div class="exercise-description">${exercise.description}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          `,
            )
            .join("")}

          ${
            workoutPlan.tips && Array.isArray(workoutPlan.tips) && workoutPlan.tips.length > 0
              ? `
            <div class="tips">
              <h2 style="color: #1e293b; margin-bottom: 10px;">Dicas Importantes</h2>
              <div class="tips-grid">
                ${workoutPlan.tips
                  .map(
                    (tip, index) => `
                  <div class="tip tip-${(index % 4) + 1}">
                    <div class="tip-title">Dica ${index + 1}</div>
                    <div>${tip}</div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          <div class="footer">
            <p><strong>FitGoal</strong> - Seu plano de treino personalizado</p>
            <p>Este plano foi criado especificamente para você com base em seus objetivos e experiência.</p>
          </div>
        </body>
        </html>
      `

      // Create a temporary div to hold the HTML content
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = pdfContent
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      document.body.appendChild(tempDiv)

      // Configure PDF options
      const options = {
        margin: 10,
        filename: `plano-treino-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }

      // Generate and download PDF
      await html2pdf.set(options).from(tempDiv).save()

      // Clean up
      document.body.removeChild(tempDiv)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      alert("Erro ao gerar PDF. Tente novamente.")
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          console.log("[DASHBOARD] Loading user preferences for:", user.uid)
          const [leadsDoc, userDoc] = await Promise.all([
            getDoc(doc(db, "leads", user.uid)),
            getDoc(doc(db, "users", user.uid)),
          ])

          let data: UserData = {}

          // Get quiz data from leads collection
          if (leadsDoc.exists()) {
            const leadsData = leadsDoc.data()
            console.log("[DASHBOARD] Quiz data from leads:", leadsData)
            data.quizData = leadsData
          }

          // Get workout plan from users collection
          if (userDoc.exists()) {
            const userData = userDoc.data()
            console.log("[DASHBOARD] Workout plan from users:", userData)
            if (userData.workoutPlan) {
              data.workoutPlan = userData.workoutPlan
            }
          }

          console.log("[DASHBOARD] Combined user data:", data)

          const needsCleanup = await detectAndCleanInconsistentData(data, user.email || "")
          if (needsCleanup) {
            return // Page will reload after cleanup
          }

          data = await syncUserData(data)

          let frequency = "Frequência não especificada"
          let frequencySource = "none"

          // Priority 1: Use actual workout plan days count
          if (data.workoutPlan?.days?.length) {
            frequency = `${data.workoutPlan.days.length}x por semana`
            frequencySource = "workoutPlan.days"
            console.log("[DASHBOARD] Using actual workout plan days count:", frequency)
          }
          // Priority 2: Get from quiz data (from leads collection)
          else if (data.quizData?.trainingDaysPerWeek) {
            frequency = `${data.quizData.trainingDaysPerWeek}x por semana`
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

          const expectedFrequency = Number(data.quizData?.trainingDaysPerWeek ?? 5)
          const actualDays = Number(data.workoutPlan?.days?.length ?? 0)

          console.log("[DASHBOARD] Frequency types:", {
            expectedFrequency,
            expectedType: typeof expectedFrequency,
            actualDays,
            actualType: typeof actualDays,
          })

          const hasMinimumExercises =
            data.workoutPlan?.days?.every((day: any) => day.exercises && day.exercises.length >= 5) || false

          const needsRegeneration =
            !data.workoutPlan ||
            !Array.isArray(data.workoutPlan.days) ||
            actualDays === 0 ||
            actualDays !== expectedFrequency ||
            !hasMinimumExercises

          console.log(`[DASHBOARD] Regeneration check:`, {
            hasWorkoutPlan: !!data.workoutPlan,
            hasDays: !!data.workoutPlan?.days,
            actualDays,
            expectedFrequency,
            hasMinimumExercises,
            needsRegeneration,
          })
 // Regenerate if any difference

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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plano de Treino Não Encontrado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Parece que você ainda não tem um plano de treino personalizado.
            </p>
            <Button onClick={() => router.push("/quiz")} className="mt-4">
              Fazer Quiz Gratuito
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <button
              onClick={() => window.history.back()}
              className="mb-4 px-4 py-2 text-sm font-medium rounded-md border-2 border-blue-400 dark:border-blue-500 bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-400/10 dark:hover:bg-blue-500/10 transition-all duration-200 shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seu Plano de Treino</h1>
              <button
                onClick={downloadWorkoutPDF}
                className="px-4 py-2 text-sm font-medium rounded-md border-2 border-blue-400 dark:border-blue-500 bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-400/10 dark:hover:bg-blue-500/10 transition-all duration-200 shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Plano personalizado para atingir seus objetivos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Programação Semanal</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{actualTrainingFrequency}</p>
                    {process.env.NODE_ENV === "development" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Quiz: {(userData as any)?.quizData?.trainingDaysPerWeek || "N/A"} | Plan:{" "}
                        {workoutPlan?.days?.length || "N/A"} dias
                        <br />
                        User: {(userData as any)?.quizData?.name || "N/A"}
                        {workoutPlan?.days?.length !== (userData as any)?.quizData?.trainingDaysPerWeek && (
                          <span className="text-orange-500 dark:text-orange-400"> (Discrepância detectada)</span>
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
                  <Target className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Duração Média por Treino</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {workoutPlan.days[0]?.duration || "Não especificado"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {workoutPlan?.days?.length !== (userData as any)?.quizData?.trainingDaysPerWeek && (
            <div className="mb-6 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-900/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm text-orange-800 dark:text-orange-300 mb-1">
                      Discrepância Detectada
                    </h3>
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      Seu plano tem {workoutPlan?.days?.length || 0} dias, mas você selecionou{" "}
                      {getTrainingDaysPerWeek((userData as any)?.quizData)} dias no quiz.
                    </p>
                  </div>
                </div>
                <button
                  onClick={generatePlans}
                  disabled={isRegenerating}
                  className="px-4 py-2 text-sm font-medium rounded-md border-2 border-orange-400 dark:border-orange-500 bg-transparent text-orange-600 dark:text-orange-400 hover:bg-orange-400/10 dark:hover:bg-orange-500/10 transition-all duration-200 shadow-[0_0_8px_rgba(251,146,60,0.3)] hover:shadow-[0_0_12px_rgba(251,146,60,0.5)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isRegenerating ? "Regenerando..." : "Regenerar Plano"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <Accordion type="multiple">
              {workoutPlan.days.map((day, dayIndex) => (
                <AccordionItem
                  key={dayIndex}
                  value={`day-${dayIndex}`}
                  className="bg-white dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                    <div className="flex items-center gap-3 text-left w-full">
                      <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 shadow-md">
                        <Dumbbell className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {day.title || day.day} - {day.focus}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {day.exercises?.length || 0} exercícios
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-6">
                      {day.exercises && day.exercises.length > 0 ? (
                        day.exercises.map((exercise, exerciseIndex) => (
                          <div
                            key={exerciseIndex}
                            className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white flex-1">
                                {exercise.name}
                              </h4>
                              <ExerciseSubstituteButton
                                exercise={exercise}
                                dayIndex={dayIndex}
                                exerciseIndex={exerciseIndex}
                                onSubstitute={handleExerciseSubstitution}
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Séries: {exercise.sets}
                              </span>
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Repetições: {exercise.reps}
                              </span>
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                                Descanso: {exercise.rest}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {exercise.description}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                          Nenhum exercício especificado para este dia.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {workoutPlan.tips && workoutPlan.tips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                  Dicas de Treino
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {workoutPlan.tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                      <span className="text-gray-700 dark:text-gray-400">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
