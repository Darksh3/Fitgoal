"use client"

import type React from "react"

import { useState, useEffect } from "react"
// import Image from "next/image" // Import Image component

import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"

import { Input } from "@/components/ui/input"

import { Checkbox } from "@/components/ui/checkbox"

import { Slider } from "@/components/ui/slider"

import { Textarea } from "@/components/ui/textarea"

import { ArrowLeft, CheckCircle, Droplets, X, ThumbsUp, ThumbsDown, Meh, Loader2, Dumbbell } from "lucide-react"

import { useRouter } from "next/navigation"

import { db, auth } from "@/lib/firebaseClient"

import { doc, setDoc, getDoc } from "firebase/firestore"

import { onAuthStateChanged, signInAnonymously } from "firebase/auth"

interface QuizData {
  gender: string
  bodyType: string
  goal: string[]
  subGoal: string
  bodyFat: number
  problemAreas: string[]
  diet: string
  sugarFrequency: string[]
  waterIntake: string
  allergies: string
  allergyDetails: string
  wantsSupplement: string
  supplementType: string
  height: string
  heightUnit: string
  currentWeight: string
  targetWeight: string
  weightUnit: string
  timeToGoal: string
  name: string
  workoutTime: string
  experience: string
  equipment: string[]
  exercisePreferences: {
    cardio: string
    pullups: string
    yoga: string
  }
  trainingDaysPerWeek: number
  email: string
  imc: number
  imcClassification: string
  imcStatus: string
  age: number
}

const initialQuizData: QuizData = {
  gender: "",
  bodyType: "",
  goal: [],
  subGoal: "",
  bodyFat: 15,
  problemAreas: [],
  diet: "",
  sugarFrequency: [],
  waterIntake: "",
  allergies: "",
  allergyDetails: "",
  wantsSupplement: "",
  supplementType: "",
  // </CHANGE>
  height: "",
  heightUnit: "cm",
  currentWeight: "",
  targetWeight: "",
  weightUnit: "kg",
  timeToGoal: "",
  name: "",
  // </CHANGE> Removed importantEvent and eventDate from initial data
  workoutTime: "",
  experience: "",
  equipment: [],
  exercisePreferences: {
    cardio: "",
    pullups: "",
    yoga: "",
  },
  trainingDaysPerWeek: 0,
  email: "",
  imc: 0,
  imcClassification: "",
  imcStatus: "",
  age: 0,
}

const debugDataFlow = (stage: string, data: any) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    stage,
    trainingFrequency: data?.trainingDaysPerWeek || "not found",
    exerciseCount: data?.exercises?.length || "not found",
    stackTrace: new Error().stack?.split("\n")[2],
  }

  console.log(`[DATA_FLOW] ${stage}:`, logEntry)

  // Store debug history in sessionStorage for analysis
  if (typeof window !== "undefined") {
    const debugHistory = JSON.parse(sessionStorage.getItem("debugHistory") || "[]")
    debugHistory.push(logEntry)
    sessionStorage.setItem("debugHistory", JSON.stringify(debugHistory))
  }
}

const debugFrequencySelection = (frequency: number) => {
  console.log(`[QUIZ] Frequency selected: ${frequency}`)
  console.log(`[QUIZ] Window available: ${typeof window !== "undefined"}`)
  console.log(
    `[QUIZ] Current localStorage:`,
    typeof window !== "undefined" ? localStorage.getItem("quizData") : "SSR mode",
  )

  // Check for hydration mismatches
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("quizData")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        console.log(`[QUIZ] Stored frequency: ${parsed.trainingDaysPerWeek}`)
      } catch (error) {
        console.error("[QUIZ] localStorage parse error:", error)
      }
    }
  }
}

const normalizeHeight = (value: string): string => {
  // Remove all spaces
  let normalized = value.replace(/\s/g, "")

  // If contains comma or period, treat as meters and convert to cm
  if (normalized.includes(",") || normalized.includes(".")) {
    // Replace comma with period for parseFloat
    normalized = normalized.replace(",", ".")
    const meters = Number.parseFloat(normalized)

    // If valid number and reasonable range (0.5m to 2.5m)
    if (!Number.isNaN(meters) && meters > 0.5 && meters < 2.5) {
      return Math.round(meters * 100).toString()
    }
  }

  // Return as-is if already in cm format or invalid
  return normalized
}

export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [quizData, setQuizData] = useState<QuizData>(initialQuizData)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showNutritionInfo, setShowNutritionInfo] = useState(false)
  const [showWaterCongrats, setShowWaterCongrats] = useState(false)
  const [showTimeCalculation, setShowTimeCalculation] = useState(false)
  const [showIMCResult, setShowIMCResult] = useState(false)
  const [loading, setLoading] = useState(false) // Renamed showLoading to loading
  const [totalSteps, setTotalSteps] = useState(24)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false) // Add isSubmitting state

  const [debugMode, setDebugMode] = useState(false)
  const [debugValues, setDebugValues] = useState({
    // Feminine markings
    chest_left: { top: 23, left: 26, width: 20, height: 6, rotate: -90 },
    chest_right: { top: 23, right: 32, width: 20, height: 6, rotate: -90 },
    arm_upper_left: { top: 23, left: 7, width: 9, height: 10, rotate: 4 },
    arm_lower_left: { top: 37, left: 2, width: 10, height: 11, rotate: 2 },
    arm_upper_right: { top: 23, right: 10, width: 9, height: 8, rotate: -25 },
    arm_lower_right: { top: 32, right: 8, width: 6, height: 8, rotate: 29 },
    belly: { top: 31, left: 50, width: 26, height: 11, rotate: 0 },
    leg_upper_left: { top: 54, left: 24, width: 18, height: 12, rotate: -2 },
    leg_lower_left: { top: 74, left: 37, width: 5, height: 9, rotate: -17 },
    leg_upper_right: { top: 54, right: 33, width: 14, height: 11, rotate: 11 },
    leg_lower_right: { top: 72, right: 41, width: 6, height: 13, rotate: 12 },
    // Masculine markings
    m_chest_left: { top: 21, left: 34, width: 21, height: 11, rotate: -90 },
    m_chest_right: { top: 21, right: 32, width: 21, height: 11, rotate: -89 },
    m_arm_upper_left: { top: 23, left: 20, width: 9, height: 10, rotate: 4 },
    m_arm_lower_left: { top: 36, left: 17, width: 8, height: 12, rotate: 6 },
    m_arm_upper_right: { top: 23, right: 19, width: 9, height: 10, rotate: -12 },
    m_arm_lower_right: { top: 36, right: 15, width: 8, height: 12, rotate: -1 },
    m_abs_1_left: { top: 31, left: 40, width: 12, height: 4.5, rotate: 0 },
    m_abs_1_right: { top: 31, right: 40, width: 10, height: 4.5, rotate: 0 },
    m_abs_2_left: { top: 35, left: 40, width: 11, height: 4.5, rotate: 0 },
    m_abs_2_right: { top: 35, right: 40, width: 11, height: 4.5, rotate: 0 },
    m_abs_3_left: { top: 39, left: 41, width: 11, height: 4, rotate: 0 },
    m_abs_3_right: { top: 39, right: 41, width: 10, height: 4, rotate: 0 },
    m_leg_upper_left: { top: 50, left: 31, width: 16, height: 15, rotate: 12 },
    m_leg_lower_left: { top: 72, left: 23, width: 11, height: 16, rotate: 10 }, // Updated m_leg_lower_left height from 17 to 16
    m_leg_upper_right: { top: 50, right: 31, width: 16, height: 15, rotate: -12 },
    m_leg_lower_right: { top: 72, right: 25, width: 11, height: 16, rotate: -6 },
  })

  const updateDebugValue = (key: string, property: string, value: number) => {
    setDebugValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [property]: value },
    }))
  }

  const copyDebugValues = () => {
    navigator.clipboard.writeText(JSON.stringify(debugValues, null, 2))
    alert("Valores copiados para área de transferência!")
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        // Se o usuário está logado (ou anônimo), tenta carregar dados de quiz existentes
        if (db) {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists() && userDocSnap.data().quizData) {
            setQuizData(userDocSnap.data().quizData)
            console.log("Loaded existing quiz data for user:", user.uid)
          }
        }
      } else {
        // Se nenhum usuário está logado, tenta fazer login anonimamente
        try {
          const anonymousUser = await signInAnonymously(auth)
          setCurrentUser(anonymousUser.user)
          console.log("Signed in anonymously:", anonymousUser.user.uid)
          // Tenta carregar dados de quiz para este usuário anônimo se existirem
          if (db) {
            const userDocRef = doc(db, "users", anonymousUser.user.uid)
            const userDocSnap = await getDoc(userDocRef)
            if (userDocSnap.exists() && userDocSnap.data().quizData) {
              setQuizData(userDocSnap.data().quizData)
              console.log("Loaded existing quiz data for anonymous user:", anonymousUser.user.uid)
            }
          }
        } catch (error) {
          console.error("Error signing in anonymously:", error)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const prefetchImages = () => {
      const imagesToPrefetch: string[] = []

      // Prefetch images for next step based on current step
      if (currentStep === 1) {
        // Next: Body type images
        imagesToPrefetch.push(
          "/images/male-ectomorph-real-new.webp",
          "/images/male-mesomorph-real-new.webp",
          "/images/male-endomorph-real-new.webp",
          "/images/female-ectomorph-real-new.webp",
          "/images/female-mesomorph-real-new.webp",
          "/images/female-endomorph-real-new.webp",
        )
      } else if (currentStep === 2) {
        // Based on gender, prefetch body type images
        if (quizData.gender === "mulher") {
          imagesToPrefetch.push(
            "/images/female-ectomorph-real-new.webp",
            "/images/female-mesomorph-real-new.webp",
            "/images/female-endomorph-real-new.webp",
          )
        } else {
          imagesToPrefetch.push(
            "/images/male-ectomorph-real-new.webp",
            "/images/male-mesomorph-real-new.webp",
            "/images/male-endomorph-real-new.webp",
          )
        }
      } else if (currentStep === 3) {
        // Next: Goals images
        imagesToPrefetch.push(
          "/images/calories-icon.webp",
          "/images/body-icon.webp",
          "/images/slim-body-icon.webp",
          "/images/better-health-icon.webp",
          "/images/training-icon.webp",
        )
      } else if (currentStep === 4) {
        // Next: Sub-goal images based on gender
        if (quizData.gender === "mulher") {
          imagesToPrefetch.push(
            "/images/female-ectomorph-real-new.webp",
            "/images/female-mesomorph-real-new.webp",
            "/images/female-endomorph-real-new.webp",
          )
        } else {
          imagesToPrefetch.push(
            "/images/male-ectomorph-real-new.webp",
            "/images/male-mesomorph-real-new.webp",
            "/images/male-endomorph-real-new.webp",
          )
        }
      } else if (currentStep === 16) {
        // Next: Exercise preferences images
        if (quizData.gender === "mulher") {
          imagesToPrefetch.push(
            "/images/female-cardio-real.webp",
            "/images/female-pullup-real.webp",
            "/images/female-stretching-real.webp",
          )
        } else {
          imagesToPrefetch.push(
            "/images/male-cardio-real.webp",
            "/images/male-pullup-real.webp",
            "/images/male-stretching-real.webp",
          )
        }
      }

      // Prefetch all images
      imagesToPrefetch.forEach((src) => {
        const img = new Image()
        img.src = src
      })
    }

    prefetchImages()
  }, [currentStep, quizData.gender, quizData.bodyType]) // Added quizData.bodyType to dependency array

  const calculateIMC = (weight: number, height: number): { imc: number; classification: string; status: string } => {
    const heightInMeters = height / 100
    const imc = weight / (heightInMeters * heightInMeters)

    let classification = ""
    let status = ""

    if (imc < 18.5) {
      classification = "Abaixo do peso"
      status = "underweight"
    } else if (imc < 25) {
      classification = "Peso normal"
      status = "normal"
    } else if (imc < 30) {
      classification = "Sobrepeso"
      status = "overweight"
    } else {
      classification = "Obesidade"
      status = "obese"
    }

    return { imc: Math.round(imc * 10) / 10, classification, status }
  }

  const updateQuizData = (key: keyof QuizData, value: any) => {
    const normalizedValue = key === "height" ? normalizeHeight(value) : value
    const newData = { ...quizData, [key]: normalizedValue }

    if (key === "currentWeight" || key === "height") {
      const weight = Number.parseFloat(key === "currentWeight" ? normalizedValue : newData.currentWeight)
      const height = Number.parseFloat(key === "height" ? normalizedValue : newData.height)

      if (weight > 0 && height > 0) {
        const imcData = calculateIMC(weight, height)
        newData.imc = imcData.imc
        newData.imcClassification = imcData.classification
        newData.imcStatus = imcData.status
      }
    }

    setQuizData(newData)
  }

  const updateExercisePreference = (exercise: string, preference: string) => {
    setQuizData((prev) => ({
      ...prev,
      exercisePreferences: {
        ...prev.exercisePreferences,
        [exercise]: preference,
      },
    }))
  }

  const handleArrayUpdate = (field: keyof QuizData, value: string, checked: boolean) => {
    setQuizData((prev) => {
      const currentArray = prev[field] as string[]
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] }
      } else {
        return { ...prev, [field]: currentArray.filter((item) => item !== value) }
      }
    })
  }

  const calculateTimeToGoal = () => {
    const current = Number.parseFloat(quizData.currentWeight)
    const target = Number.parseFloat(quizData.targetWeight)
    if (isNaN(current) || isNaN(target) || current <= 0 || target <= 0) return ""

    const weightDifference = Math.abs(current - target)
    const weeksNeeded = Math.ceil(weightDifference / 0.75)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weeksNeeded * 7)

    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    const day = targetDate.getDate()
    const month = months[targetDate.getMonth()]
    const year = targetDate.getFullYear()

    return `${day} de ${month}. de ${year}`
  }

  const getCurrentDate = () => {
    const currentDate = new Date()
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    const day = currentDate.getDate()
    const month = months[currentDate.getMonth()]
    const year = currentDate.getFullYear()
    return `${day} de ${month}. de ${year}`
  }

  const generateAndSavePlan = async (data: QuizData, userId: string) => {
    console.log("generateAndSavePlan: Iniciando para userId:", userId)

    if (!db) {
      console.error("generateAndSavePlan: Firestore DB não inicializado.")
      return false
    }

    try {
      // Salva quizData no Firestore (coleção users)
      const userDocRef = doc(db, "users", userId)
      await setDoc(
        userDocRef,
        {
          quizData: data,
          lastActivity: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      console.log("generateAndSavePlan: Quiz data saved to Firestore (users collection) successfully:", userId)

      // Salva dados do lead no Firestore (coleção leads)
      const leadDocRef = doc(db, "leads", userId)
      await setDoc(
        leadDocRef,
        {
          quizData: data,
          email: data.email,
          name: data.name,
          leadSource: "quiz_completion",
          completedAt: new Date().toISOString(),
          status: "quiz_completed",
          hasPaid: false,
          imc: data.imc, // Agora vem do quizData
          imcClassification: data.imcClassification, // Agora vem do quizData
          primaryGoals: data.goal,
          bodyType: data.bodyType,
          experience: data.experience,
          gender: data.gender,
          age: data.age,
          dietPreferences: data.diet,
          hasAllergies: data.allergies === "sim",
          waterIntake: data.waterIntake,
          workoutTime: data.workoutTime,
          equipment: data.equipment,
          trainingDaysPerWeek: data.trainingDaysPerWeek,
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      )
      console.log("generateAndSavePlan: Lead data saved to Firestore (leads collection) successfully:", userId)

      console.log("generateAndSavePlan: Chamando API /api/generate-plans-on-demand...")
      const controller = new AbortController()
      // Aumentar o tempo limite para 120 segundos (2 minutos)
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.warn(
          "generateAndSavePlan: Requisição para /api/generate-plans-on-demand excedeu o tempo limite (120s).",
        )
      }, 120000) // 120 segundos

      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId, // Only pass userId, API will fetch quiz data from Firestore
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const result = await response.json()
        console.log("generateAndSavePlan: API /api/generate-plans-on-demand response:", result)
        // A API agora é responsável por salvar dietPlan e workoutPlan no Firestore
        // Não é necessário salvá-los aqui novamente.
      } else {
        const errorData = await response.json()
        console.error("generateAndSavePlan: Erro da API /api/generate-plans-on-demand:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        console.warn("generateAndSavePlan: Falha na chamada da API, usando planos mock.")
        // Fallback para planos mock se a API falhar, e salva-os diretamente aqui
        const mockDietPlan = {
          title: "Plano de Dieta Básico (Mock)",
          calories: "2000 kcal",
          protein: "150g",
          carbs: "200g",
          fats: "70g",
          meals: [
            { name: "Café da Manhã", time: "08:00", foods: ["Aveia com frutas e proteína"], calories: "400 kcal" },
            {
              name: "Almoço",
              time: "13:00",
              foods: ["Frango grelhado com arroz integral e legumes"],
              calories: "600 kcal",
            },
            { name: "Jantar", time: "19:00", foods: ["Salmão com batata doce e salada"], calories: "500 kcal" },
            { name: "Lanche 1", time: "10:30", foods: ["Iogurte grego com nuts"], calories: "200 kcal" },
            { name: "Lanche 2", time: "16:00", foods: ["Frutas com pasta de amendoim"], calories: "300 kcal" },
          ],
        }
        const mockWorkoutPlan = {
          days: [
            {
              day: "Segunda",
              title: "Treino de Peito e Tríceps (Mock)",
              focus: "Força",
              duration: "45-60 min",
              exercises: [
                {
                  name: "Supino Reto",
                  sets: "3",
                  reps: "8-12",
                  rest: "60s",
                  description: "Deite-se no banco, segure a barra e empurre para cima.",
                },
              ],
            },
            {
              day: "Terça",
              title: "Cardio Leve (Mock)",
              focus: "Resistência",
              duration: "30 min",
              exercises: [
                {
                  name: "Corrida na Esteira",
                  sets: "1",
                  reps: "30 min",
                  rest: "0s",
                  description: "Corra em ritmo moderado na esteira.",
                },
              ],
            },
          ],
        }
        await setDoc(
          userDocRef,
          { dietPlan: mockDietPlan, workoutPlan: mockWorkoutPlan, planGeneratedAt: new Date().toISOString() },
          { merge: true },
        )
        console.log(
          "generateAndSavePlan: Planos mock salvos no Firestore devido a falha da API para o usuário:",
          userId,
        )
      }
      return true
    } catch (error) {
      console.error("generateAndSavePlan: Erro geral na função:", error)
      return false
    } finally {
      console.log("generateAndSavePlan: Finalizado.")
    }
  }

  const getBodyImage = (gender: string) => {
    if (gender === "mulher") {
      return "/images/5069027231916993985-1-removebg-preview.webp"
    }
    return "/images/5073348832305196416-removebg-preview.webp"
  }

  const getBodyTypeImageForFocus = () => {
    const isWoman = quizData.gender === "mulher"
    const bodyType = quizData.bodyType
    if (!bodyType) return getBodyImage(quizData.gender)

    switch (bodyType) {
      case "ectomorfo":
        return isWoman ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorfo-real-new.webp"
      case "mesomorfo":
        return isWoman ? "/images/female-mesomorph-real-new.webp" : "/images/male-mesomorph-real-new.webp"
      case "endomorfo":
        return isWoman ? "/images/female-endomorph-real-new.webp" : "/images/male-endomorph-real-new.webp"
      default:
        return getBodyImage(quizData.gender)
    }
  }

  const nextStep = () => {
    if (currentStep === 8 && quizData.diet !== "nao-sigo") {
      // Updated from step 7 to 8
      setShowNutritionInfo(true)
    } else if (currentStep === 9 && (quizData.waterIntake === "7-10" || quizData.waterIntake === "mais-10")) {
      // Updated from step 8 to 9
      setShowWaterCongrats(true)
    } else if (currentStep === 11 && quizData.allergies === "nao") {
      setCurrentStep(13)
      // </CHANGE>
    } else if (currentStep === 13 && quizData.wantsSupplement === "nao") {
      setCurrentStep(14)
    } else if (currentStep === 15 && quizData.timeToGoal) {
      // Check if timeToGoal is calculated
      setShowTimeCalculation(true)
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      if (currentStep === 13 && quizData.allergies === "nao") {
        // Updated from step 12 to 13
        setCurrentStep(11) // Updated from 10 to 11
      } else if (currentStep === 14 && quizData.wantsSupplement === "nao") {
        setCurrentStep(13)
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const handleSubmit = async () => {
    console.log("handleSubmit: Iniciando...")
    setIsSubmitting(true) // Set isSubmitting to true
    if (!currentUser || !currentUser.uid) {
      console.error("handleSubmit: No user ID available. Cannot save quiz data or generate plans.")
      alert("Erro: Não foi possível identificar o usuário. Tente novamente.")
      setIsSubmitting(false) // Reset isSubmitting
      return
    }

    try {
      const { imc, classification, status } = calculateIMC(
        Number.parseFloat(quizData.currentWeight),
        Number.parseFloat(quizData.height),
      )
      const updatedQuizData = {
        ...quizData,
        imc: imc,
        imcClassification: classification,
        imcStatus: status,
      }
      setQuizData(updatedQuizData) // Atualiza o estado local

      console.log("[QUIZ] Form submitted with frequency:", updatedQuizData.trainingDaysPerWeek)
      debugDataFlow("QUIZ_SUBMIT", updatedQuizData)

      try {
        localStorage.setItem("quizData", JSON.stringify(updatedQuizData))
        console.log("handleSubmit: Quiz data saved to localStorage")
        debugDataFlow("QUIZ_LOCALSTORAGE_SAVE", updatedQuizData)
      } catch (error) {
        console.error("[QUIZ] Storage failed:", error)
      }

      const userDocRef = doc(db, "users", currentUser.uid)
      const leadDocRef = doc(db, "leads", currentUser.uid)

      await setDoc(
        userDocRef,
        {
          quizData: updatedQuizData,
          email: updatedQuizData.email,
          name: updatedQuizData.name,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      await setDoc(
        leadDocRef,
        {
          quizData: updatedQuizData,
          email: updatedQuizData.email,
          name: updatedQuizData.name,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      console.log("handleSubmit: Quiz data saved to Firestore (users and leads collections) successfully")

      if (imc > 0) {
        setShowIMCResult(true)
      } else {
        setShowSuccess(true)
      }
    } catch (error) {
      console.error("handleSubmit: Erro no handleSubmit:", error)
      alert("Erro inesperado. Tente novamente.")
    } finally {
      console.log("handleSubmit: Finalizando, definindo isSubmitting para false.")
      setIsSubmitting(false) // Reset isSubmitting
    }
  }

  const BodyIllustration = ({
    type = "normal",
    highlightAreas = [],
    className = "w-32 h-48",
    gender = "male",
  }: {
    type?: string
    highlightAreas?: string[]
    className?: string
    gender?: string
  }) => {
    const getBodyImage = () => {
      if (currentStep === 1) {
        return gender === "female" ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
      }
      if (type === "ectomorfo") {
        return gender === "female" ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
      }
      if (type === "mesomorfo") {
        return gender === "female" ? "/images/female-mesomorph-real-new.webp" : "/images/male-mesomorph-real-new.webp"
      }
      if (type === "endomorfo") {
        return gender === "female" ? "/images/female-endomorph-real-new.webp" : "/images/male-endomorph-real-new.webp"
      }
      return gender === "female" ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
    }
    return (
      <div className={`${className} relative`}>
        <img
          src={getBodyImage() || "/placeholder.svg"}
          alt={`${gender} ${type} body type`}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none"
            e.currentTarget.nextElementSibling.style.display = "block"
          }}
        />
        <svg viewBox="0 0 100 150" className="w-full h-full" style={{ display: "none" }}>
          <path
            d="M50 10 C45 10 40 15 40 25 L40 35 C35 40 35 50 40 55 L40 90 C40 95 35 100 30 105 L30 140 C30 145 35 150 40 150 L60 150 C65 150 70 145 70 140 L70 105 C65 100 60 95 60 90 L60 55 C65 50 65 40 60 35 L60 25 C60 15 55 10 50 10 Z"
            fill="#D4A574"
            stroke="#B8956A"
            strokeWidth="1"
          />
          <circle cx="50" cy="20" r="12" fill="#D4A574" stroke="#B8956A" strokeWidth="1" />
          <ellipse cx="25" cy="45" rx="8" ry="20" fill="#D4A574" stroke="#B8956A" strokeWidth="1" />
          <ellipse cx="75" cy="45" rx="8" ry="20" fill="#D4A574" stroke="#B8956A" strokeWidth="1" />
          <rect x="35" y="85" width="30" height="20" rx="3" fill="#4A90A4" />
        </svg>
        {highlightAreas.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {highlightAreas.map((area) => (
              <div
                key={area}
                className="absolute bg-lime-500 bg-opacity-30 rounded-full animate-pulse"
                style={{
                  ...(area === "Peito" && { top: "25%", left: "35%", width: "30%", height: "15%" }),
                  ...(area === "Braços" && { top: "20%", left: "10%", width: "20%", height: "40%" }),
                  ...(area === "Barriga" && { top: "45%", left: "30%", width: "40%", height: "20%" }),
                  ...(area === "Pernas" && { top: "65%", left: "25%", width: "50%", height: "35%" }),
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const ExerciseIllustration = ({ type, className = "w-full h-48" }: { type: string; className?: string }) => {
    const getExerciseImage = () => {
      const isWoman = quizData.gender === "mulher"
      switch (type) {
        case "cardio":
          return isWoman ? "/images/female-cardio-real.webp" : "/images/male-cardio-real.webp"
        case "pullups":
          return isWoman ? "/images/female-pullup-real.webp" : "/images/male-pullup-real.webp"
        case "yoga":
          return isWoman ? "/images/female-stretching-real.webp" : "/images/male-stretching-real.webp"
        default:
          return isWoman ? "/images/female-cardio-real.webp" : "/images/male-cardio-real.webp"
      }
    }
    const getSVGFallback = () => {
      const illustrations = {
        cardio: (
          <svg viewBox="0 0 200 200" className={className}>
            <defs>
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4A574" />
                <stop offset="100%" stopColor="#B8956A" />
              </linearGradient>
            </defs>
            <ellipse cx="100" cy="40" rx="15" ry="18" fill="url(#bodyGradient)" />
            <circle cx="100" cy="25" r="12" fill="url(#bodyGradient)" />
            <rect x="85" y="55" width="30" height="40" rx="15" fill="url(#bodyGradient)" />
            <ellipse cx="70" cy="65" rx="8" ry="20" fill="url(#bodyGradient)" transform="rotate(-30 70 65)" />
            <ellipse cx="130" cy="65" rx="8" ry="20" fill="url(#bodyGradient)" transform="rotate(30 130 65)" />
            <ellipse cx="90" cy="120" rx="8" ry="25" fill="url(#bodyGradient)" transform="rotate(-20 90 120)" />
            <ellipse cx="110" cy="120" rx="8" ry="25" fill="url(#bodyGradient)" transform="rotate(20 110 120)" />
            <rect x="85" y="85" width="30" height="20" rx="3" fill="#4A90A4" />
            <ellipse cx="85" cy="155" rx="12" ry="6" fill="#84CC16" />
            <ellipse cx="115" cy="155" rx="12" ry="6" fill="#84CC16" />
            <path d="M 60 80 Q 50 85 55 90" stroke="#84CC16" strokeWidth="2" fill="none" />
            <path d="M 140 80 Q 150 85 145 90" stroke="#84CC16" strokeWidth="2" fill="none" />
          </svg>
        ),
        pullups: (
          <svg viewBox="0 0 200 200" className={className}>
            <defs>
              <linearGradient id="bodyGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4A574" />
                <stop offset="100%" stopColor="#B8956A" />
              </linearGradient>
            </defs>
            <rect x="50" y="20" width="100" height="8" rx="4" fill="#666" />
            <circle cx="100" cy="45" r="12" fill="url(#bodyGradient2)" />
            <rect x="85" y="55" width="30" height="50" rx="15" fill="url(#bodyGradient2)" />
            <ellipse cx="80" cy="40" rx="6" ry="18" fill="url(#bodyGradient2)" />
            <ellipse cx="120" cy="40" rx="6" ry="18" fill="url(#bodyGradient2)" />
            <ellipse cx="90" cy="130" rx="8" ry="20" fill="url(#bodyGradient2)" transform="rotate(20 90 130)" />
            <ellipse cx="110" cy="130" rx="8" ry="20" fill="url(#bodyGradient2)" transform="rotate(-20 110 130)" />
            <rect x="85" y="95" width="30" height="20" rx="3" fill="#4A90A4" />
            <ellipse cx="85" cy="155" rx="10" ry="5" fill="#84CC16" />
            <ellipse cx="115" cy="155" rx="10" ry="5" fill="#84CC16" />
          </svg>
        ),
        yoga: (
          <svg viewBox="0 0 200 200" className={className}>
            <defs>
              <linearGradient id="bodyGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4A574" />
                <stop offset="100%" stopColor="#B8956A" />
              </linearGradient>
            </defs>
            <rect x="40" y="140" width="120" height="8" rx="4" fill="#8B4513" />
            <circle cx="100" cy="60" r="12" fill="url(#bodyGradient4)" />
            <rect x="85" y="70" width="30" height="35" rx="15" fill="url(#bodyGradient4)" />
            <ellipse cx="85" cy="85" rx="6" ry="15" fill="url(#bodyGradient4)" transform="rotate(-20 85 85)" />
            <ellipse cx="115" cy="85" rx="6" ry="15" fill="url(#bodyGradient4)" transform="rotate(20 115 85)" />
            <ellipse cx="85" cy="120" rx="12" ry="8" fill="url(#bodyGradient4)" transform="rotate(30 85 120)" />
            <ellipse cx="115" cy="120" rx="12" ry="8" fill="url(#bodyGradient4)" transform="rotate(-30 115 120)" />
            <rect x="85" y="95" width="30" height="15" rx="3" fill="#4A90A4" />
            <circle cx="100" cy="80" r="3" fill="#D4A574" />
            <circle cx="60" cy="50" r="2" fill="#84CC16" opacity="0.7" />
            <circle cx="140" cy="45" r="2" fill="#84CC16" opacity="0.7" />
            <circle cx="70" cy="40" r="1.5" fill="#84CC16" opacity="0.5" />
          </svg>
        ),
      }
      return illustrations[type as keyof typeof illustrations]
    }
    return (
      <div className="flex justify-center">
        <img
          src={getExerciseImage() || "/placeholder.svg"}
          alt={`${type} exercise`}
          className={`${className} object-contain`}
          onError={(e) => {
            e.currentTarget.style.display = "none"
            e.currentTarget.nextElementSibling.style.display = "block"
          }}
        />
        <div style={{ display: "none" }}>{getSVGFallback()}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 md:p-6">
        <div className="text-center space-y-4 md:space-y-6 max-w-md">
          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto relative">
            <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#374151" strokeWidth="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#84CC16"
                strokeWidth="8"
                fill="none"
                strokeDasharray="251.2"
                strokeDashoffset="188.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Gerando seu plano personalizado...</h2>
          <p className="text-sm md:text-base text-gray-400">
            Analisando suas respostas e criando treinos ideais para você
          </p>
        </div>
      </div>
    )
  }

  if (showIMCResult) {
    const { imc, classification, status } = calculateIMC(
      Number.parseFloat(quizData.currentWeight),
      Number.parseFloat(quizData.height),
    )
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 md:p-6">
        <div className="text-center space-y-4 md:space-y-6 max-w-md">
          <BodyIllustration
            className="w-40 h-52 md:w-48 md:h-64 mx-auto"
            gender={quizData.gender === "mulher" ? "female" : "male"}
          />
          <h2 className="text-2xl md:text-3xl font-bold">Resultado do seu IMC</h2>
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <p className="text-gray-300 text-base md:text-lg mb-4">
              Calculamos o seu IMC e ele é de <span className="text-lime-400 font-bold">{imc}</span>
            </p>
            <p className="text-white text-lg md:text-xl mb-4">
              Você está com <span className="text-lime-400 font-bold">{classification}</span>
            </p>
            <p className="text-sm md:text-base text-gray-400">
              É importante manter um IMC saudável para sua saúde geral. Seu plano personalizado ajudará você a alcançar
              seus objetivos!
            </p>
          </div>
          <Button
            onClick={() => setShowIMCResult(false)}
            className="w-full py-4 md:py-6 text-base md:text-lg bg-lime-500 hover:bg-lime-600 text-gray-900 font-bold"
          >
            Continuar
          </Button>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-6 md:space-y-8 max-w-lg w-full">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30 animate-in zoom-in duration-500">
            <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-white stroke-[3]" />
          </div>

          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Seu plano de treino personalizado está pronto!
            </h2>

            <button
              onClick={() => {
                setShowSuccess(false)
                router.push("/quiz/results")
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 md:py-5 px-6 rounded-xl transition-colors text-base md:text-lg"
            >
              Ver Resultados
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showNutritionInfo) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <BodyIllustration className="w-48 h-64 mx-auto" gender={quizData.gender === "mulher" ? "female" : "male"} />
          <h2 className="text-3xl font-bold">
            <span className="text-lime-400">81%</span> dos seus resultados são sobre nutrição
          </h2>
          <p className="text-gray-300">Para obter os maiores ganhos em massa muscular e força, você precisa:</p>
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
              <p className="text-white">Total de calorias suficientes a cada dia.</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
              <p className="text-white">Proteína adequada para realmente reconstruir mais tecido muscular.</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowNutritionInfo(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white py-4 text-lg rounded-full"
          >
            Entendi
          </Button>
        </div>
      </div>
    )
  }

  if (showWaterCongrats) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-32 h-32 mx-auto relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="45" fill="#374151" />
              <path d="M 50 5 A 45 45 0 0 1 95 50 L 50 50 Z" fill="#3B82F6" />
              <path d="M 50 5 A 45 45 0 1 1 20 80 L 50 50 Z" fill="#60A5FA" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold">Uau! Impressionante!</h2>
          <p className="text-gray-300 text-lg">Você bebe mais água do que 92% dos usuários*</p>
          <p className="text-gray-300 text-lg">Continue assim!</p>
          <p className="text-gray-500 text-sm">*Usuários do ATHLIX que fizeram o teste</p>
          <Button
            onClick={() => {
              setShowWaterCongrats(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white py-4 text-lg rounded-full"
          >
            Entendi
          </Button>
        </div>
      </div>
    )
  }

  if (showTimeCalculation) {
    const current = Number.parseFloat(quizData.currentWeight)
    const target = Number.parseFloat(quizData.targetWeight)
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-md">
          <h2 className="text-2xl font-bold">
            O último plano de que você precisará para <span className="text-lime-400">finalmente entrar</span> em forma
          </h2>
          <p className="text-gray-300">Com base em nossos cálculos, você atingirá seu peso ideal de {target} kg até</p>
          <div className="text-2xl font-bold text-lime-400 border-b-2 border-lime-400 pb-2 inline-block">
            {quizData.timeToGoal}
          </div>
          <div className="relative h-32 bg-gray-800 rounded-lg p-4">
            <div className="absolute top-4 left-4 bg-gray-700 px-3 py-1 rounded text-sm">{current} kg</div>
            <div className="absolute bottom-4 right-4 bg-lime-500 px-3 py-1 rounded text-sm">{target} kg</div>
            <svg viewBox="0 0 300 100" className="w-full h-full">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B4513" />
                  <stop offset="100%" stopColor="#84CC16" />
                </linearGradient>
              </defs>
              <path d="M 20 20 Q 150 60 280 80" stroke="url(#progressGradient)" strokeWidth="4" fill="none" />
              <circle cx="20" cy="20" r="4" fill="#8B4513" />
              <circle cx="280" cy="80" r="4" fill="#84CC16" />
            </svg>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{getCurrentDate()}</span>
            <span>{quizData.timeToGoal}</span>
          </div>
          <Button
            onClick={() => {
              setShowTimeCalculation(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white py-4 text-lg rounded-full"
          >
            Entendi
          </Button>
        </div>
      </div>
    )
  }

  const getBodyFatImage = () => {
    const isMale = quizData.gender === "homem"

    if (isMale) {
      // Male images: mone.webp to meight.webp
      if (quizData.bodyFat <= 10) return "/images/mone.webp"
      if (quizData.bodyFat <= 15) return "/images/mtwo.webp"
      if (quizData.bodyFat <= 20) return "/images/mthree.webp"
      if (quizData.bodyFat <= 25) return "/images/mfour.webp"
      if (quizData.bodyFat <= 30) return "/images/mfive.webp"
      if (quizData.bodyFat <= 35) return "/images/msix.webp"
      if (quizData.bodyFat <= 39) return "/images/mseven.webp"
      return "/images/meight.webp"
    } else {
      // Female images: bodyfat-one.webp to bodyfat-eight.webp
      if (quizData.bodyFat <= 10) return "/images/bodyfat-one.webp"
      if (quizData.bodyFat <= 15) return "/images/bodyfat-two.webp"
      if (quizData.bodyFat <= 20) return "/images/bodyfat-three.webp"
      if (quizData.bodyFat <= 25) return "/images/bodyfat-four.webp"
      if (quizData.bodyFat <= 30) return "/images/bodyfat-five.webp"
      if (quizData.bodyFat <= 35) return "/images/bodyfat-six.webp"
      if (quizData.bodyFat <= 39) return "/images/bodyfat-seven.webp"
      return "/images/bodyfat-eight.webp"
    }
  }

  const getBodyFatRange = () => {
    if (quizData.bodyFat <= 10) return "5-10%"
    if (quizData.bodyFat <= 15) return "11-15%"
    if (quizData.bodyFat <= 20) return "16-20%"
    if (quizData.bodyFat <= 25) return "21-25%"
    if (quizData.bodyFat <= 30) return "26-30%"
    if (quizData.bodyFat <= 35) return "31-35%"
    if (quizData.bodyFat <= 39) return "36-39%"
    return ">40%"
  }

  // New structure for questions
  const questions = [
    {
      step: 1,
      question: "Qual o seu gênero?",
      subtitle: "",
      type: "single",
      options: [
        { value: "homem", label: "Homem", icon: "/images/male-gender-icon.webp" },
        { value: "mulher", label: "Mulher", icon: "/images/female-gender-icon.webp" },
      ],
      onSelect: (value: string) => updateQuizData("gender", value),
      value: quizData.gender,
    },
    {
      step: 2,
      question: "Qual a sua idade?",
      subtitle: "",
      type: "input_number",
      value: quizData.age.toString(),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateQuizData("age", Number.parseInt(e.target.value) || 0),
      min: 16,
      max: 80,
      placeholder: "Digite sua idade",
    },
    {
      step: 3,
      question: "Qual o seu tipo de Corpo?",
      subtitle: "Selecione a opção que melhor descreve seu biotipo",
      type: "single_card",
      options: [
        {
          value: "ectomorfo",
          label: "Ectomorfo",
          desc: "Corpo magro, dificuldade para ganhar peso",
          img: "/images/female-ectomorph-real-new.webp",
        },
        {
          value: "mesomorfo",
          label: "Mesomorfo",
          desc: "Corpo atlético, facilidade para ganhar músculos",
          img: "/images/female-mesomorph-real-new.webp",
        },
        {
          value: "endomorfo",
          label: "Endomorfo",
          desc: "Corpo mais largo, tendência a acumular gordura",
          img: "/images/female-endomorph-real-new.webp",
        },
      ],
      onSelect: (value: string) => updateQuizData("bodyType", value),
      value: quizData.bodyType,
      getImage: (type: string) => {
        const isWoman = quizData.gender === "mulher"
        switch (type) {
          case "ectomorfo":
            return isWoman ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
          case "mesomorfo":
            return isWoman ? "/images/female-mesomorph-real-new.webp" : "/images/male-mesomorph-real-new.webp"
          case "endomorfo":
            return isWoman ? "/images/female-endomorph-real-new.webp" : "/images/male-endomorph-real-new.webp"
          default:
            return "/placeholder.svg"
        }
      },
    },
    {
      step: 4,
      question: "Quais são os seus objetivos?",
      subtitle: "Selecione todos que se aplicam",
      type: "multiple_card",
      options: [
        { value: "perder-peso", label: "Perder peso e queimar gordura", icon: "/images/calories-icon.webp" },
        {
          value: "ganhar-massa",
          label: "Ganhar massa muscular e definir o corpo",
          icon: quizData.gender === "mulher" ? "/images/slim-body-icon.webp" : "/images/body-icon.webp",
        },
        {
          value: "melhorar-saude",
          label: "Melhorar minha saúde, disposição e bem-estar",
          icon: "/images/better-health-icon.webp",
        },
        {
          value: "aumentar-resistencia",
          label: "Aumentar a minha resistência física e condicionamento",
          icon: "/images/training-icon.webp",
        },
      ],
      onSelect: (value: string, checked: boolean) => handleArrayUpdate("goal", value, checked),
      value: quizData.goal,
    },
    {
      step: 5,
      question: "Escolha o seu nível de gordura corporal",
      subtitle: "",
      type: "slider",
      value: quizData.bodyFat,
      min: 5,
      max: 45,
      step: 1,
      onChange: (value: number) => updateQuizData("bodyFat", value),
      getRange: (value: number) => {
        if (value <= 10) return "5-10%"
        if (value <= 15) return "11-15%"
        if (value <= 20) return "16-20%"
        if (value <= 25) return "21-25%"
        if (value <= 30) return "26-30%"
        if (value <= 35) return "31-35%"
        if (value <= 39) return "36-39%"
        return ">40%"
      },
      getImage: () => getBodyFatImage(),
    },
    {
      step: 6,
      question: "Qual área você quer focar mais?",
      subtitle: "Selecione todos que se aplicam",
      type: "problem_areas",
      options: ["Peito", "Braços", "Barriga", "Pernas", "Corpo inteiro"],
      onSelect: (value: string, checked: boolean) => handleArrayUpdate("problemAreas", value, checked),
      value: quizData.problemAreas,
      getImage: () => (quizData.gender === "mulher" ? "/images/wbody.webp" : "/images/body.webp"),
      debugMode: debugMode,
      setDebugMode: setDebugMode,
      debugValues: debugValues,
      updateDebugValue: updateDebugValue,
      copyDebugValues: copyDebugValues,
    },
    {
      step: 7,
      question: "Você segue alguma dessas dietas?",
      subtitle: "",
      type: "single_diet",
      options: [
        { value: "vegetariano", label: "Vegetariano", desc: "Exclui carne", icon: "🌱" },
        { value: "vegano", label: "Vegano", desc: "Exclui todos os produtos de origem animal", icon: "🌿" },
        { value: "keto", label: "Keto", desc: "Baixo teor de carboidratos e alto teor de gordura", icon: "🥑" },
        { value: "mediterraneo", label: "Mediterrâneo", desc: "Rico em alimentos à base de plantas", icon: "🫒" },
      ],
      onSelect: (value: string) => updateQuizData("diet", value),
      value: quizData.diet,
      noDietOption: { value: "nao-sigo", label: "Não, não sigo nenhuma dessas dietas", icon: X },
    },
    {
      step: 8,
      question: "Com que frequência você consome doces ou bebidas alcoólicas?",
      subtitle: "Selecione todas que se aplicam",
      type: "multiple_checkbox",
      options: [
        { value: "esporadicamente", label: "Esporadicamente", icon: "🍷" },
        { value: "com-frequencia", label: "Com frequência", icon: "🍭" },
        { value: "todos-dias", label: "Todos os dias", icon: "🍰" },
        { value: "nao-consumo-alcool", label: "Não consumo álcool", icon: "🚫" },
        { value: "nao-consumo-doces", label: "Não consumo doces", icon: "❌" },
      ],
      onSelect: (value: string, checked: boolean) => handleArrayUpdate("sugarFrequency", value, checked),
      value: quizData.sugarFrequency,
    },
    {
      step: 9,
      question: "Quantidade diária de água",
      subtitle: "",
      type: "single_card",
      options: [
        { value: "menos-2", label: "Menos de 2 copos", desc: "até 0,5 l", icon: Droplets },
        { value: "2-6", label: "2-6 copos", desc: "0,5-1,5 l", icon: Droplets },
        { value: "7-10", label: "7-10 copos", desc: "1,5-2,5 l", icon: Droplets },
        { value: "mais-10", label: "Mais de 10 copos", desc: "mais de 2,5 l", icon: Droplets },
      ],
      onSelect: (value: string) => updateQuizData("waterIntake", value),
      value: quizData.waterIntake,
    },
    {
      step: 10,
      question: "Qual é a sua altura?",
      subtitle: "Digite em metros (ex: 1.75) ou centímetros (ex: 175)",
      type: "input_text",
      value: quizData.height,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleaned = e.target.value.replace(/[^\d.,]/g, "")
        setQuizData({ ...quizData, height: cleaned })
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const normalized = normalizeHeight(e.target.value)
        updateQuizData("height", normalized)
      },
      placeholder: "Altura em metros (ex: 1.75 ou 1,75)",
    },
    {
      step: 11,
      question: "Possui alergias ou restrições alimentares?",
      subtitle: "",
      type: "yes_no",
      options: [
        { value: "sim", label: "Sim, possuo alergias ou restrições", icon: CheckCircle, color: "text-lime-500" },
        { value: "nao", label: "Não, não possuo alergias ou restrições", icon: X, color: "text-lime-500" },
      ],
      onSelect: (value: string) => updateQuizData("allergies", value),
      value: quizData.allergies,
    },
    {
      step: 12,
      question: "Quais são suas alergias ou restrições alimentares?",
      subtitle: "Descreva suas alergias, intolerâncias ou restrições alimentares",
      type: "textarea",
      value: quizData.allergyDetails,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateQuizData("allergyDetails", e.target.value),
      placeholder: "Ex: Alergia a amendoim, intolerância à lactose, não como carne vermelha...",
    },
    {
      step: 13,
      question: "Podemos adicionar algum suplemento à sua dieta?",
      subtitle: "Por exemplo: Hipercalórico, Whey Protein...",
      type: "supplement_choice",
      onSelect: (wantsSupplement: string, supplementType: string) => {
        setQuizData((prev) => ({
          ...prev,
          wantsSupplement: wantsSupplement,
          supplementType: supplementType,
        }))
      },
      value: quizData.wantsSupplement,
      supplementType: quizData.supplementType,
      bodyType: quizData.bodyType,
      bodyFat: quizData.bodyFat,
      problemAreas: quizData.problemAreas,
    },
    {
      step: 14,
      question: "Qual é o seu peso atual?",
      subtitle: "",
      type: "input_number",
      value: quizData.currentWeight,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateQuizData("currentWeight", e.target.value),
      placeholder: `Peso atual, kg`,
    },
    {
      step: 15,
      question: "Qual é o seu objetivo de peso?",
      subtitle: "",
      type: "input_number",
      value: quizData.targetWeight,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        updateQuizData("targetWeight", e.target.value)
      },
      onBlur: () => {
        const calculatedTime = calculateTimeToGoal()
        if (calculatedTime) {
          updateQuizData("timeToGoal", calculatedTime)
        }
      },
      placeholder: `Peso alvo, kg`,
      min: 1,
      max: 500,
      step: 0.1,
    },
    {
      step: 16,
      question: "Qual é o seu nome?",
      subtitle: "",
      type: "input_text",
      value: quizData.name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateQuizData("name", e.target.value),
      placeholder: "Digite seu nome",
    },
    {
      step: 17,
      question: "Quanto tempo você tem para treinar?",
      subtitle: "",
      type: "single_card",
      options: [
        { value: "30min", label: "30 minutos" },
        { value: "45min", label: "45 minutos" },
        { value: "1hora", label: "1 hora" },
        { value: "mais-1h", label: "Mais de 1 hora" },
      ],
      onSelect: (value: string) => updateQuizData("workoutTime", value),
      value: quizData.workoutTime,
    },
    {
      step: 18,
      question: "Qual é sua experiência com exercícios?",
      subtitle: "",
      type: "single_experience",
      options: [
        { value: "iniciante", label: "Iniciante - Nunca treinei" },
        { value: "basico", label: "Básico - Treino ocasionalmente" },
        { value: "intermediario", label: "Intermediário - Treino regularmente" },
        { value: "avancado", label: "Avançado - Treino há anos" },
      ],
      onSelect: (value: string) => updateQuizData("experience", value),
      value: quizData.experience,
    },
    {
      step: 19,
      question: "Que equipamentos você tem acesso?",
      subtitle: "Selecione todos que se aplicam",
      type: "multiple_checkbox",
      options: [
        { value: "academia", label: "Academia completa", icon: "🏋️" },
        { value: "halteres", label: "Halteres", icon: "🏋️‍♀️" },
        { value: "barras", label: "Barras para exercícios", icon: "🤸" },
        { value: "elasticos", label: "Elásticos/Faixas", icon: "🎯" },
        { value: "esteira", label: "Esteira", icon: "🏃" },
        { value: "bicicleta", label: "Bicicleta ergométrica", icon: "🚴" },
        { value: "nenhum", label: "Apenas peso corporal", icon: "🤲" },
      ],
      onSelect: (value: string, checked: boolean) => handleArrayUpdate("equipment", value, checked),
      value: quizData.equipment,
    },
    {
      step: 20,
      question: "Como você se sente sobre exercícios cardiovasculares?",
      subtitle: "",
      type: "exercise_preference",
      exerciseType: "cardio",
      options: [
        { value: "amo", label: "Amo cardio!", icon: ThumbsUp, color: "text-green-500" },
        { value: "neutro", label: "É ok para mim", icon: Meh, color: "text-yellow-500" },
        { value: "odeio", label: "Odeio cardio", icon: ThumbsDown, color: "text-red-500" },
      ],
      onSelect: (value: string) => updateExercisePreference("cardio", value),
      value: quizData.exercisePreferences.cardio,
      illustration: <ExerciseIllustration type="cardio" className="w-64 h-64" />,
    },
    {
      step: 21,
      question: "Como você se sente sobre flexões e exercícios de força?",
      subtitle: "",
      type: "exercise_preference",
      exerciseType: "pullups",
      options: [
        { value: "amo", label: "Amo exercícios de força!", icon: ThumbsUp, color: "text-green-500" },
        { value: "neutro", label: "É ok para mim", icon: Meh, color: "text-yellow-500" },
        { value: "odeio", label: "Prefiro evitar", icon: ThumbsDown, color: "text-red-500" },
      ],
      onSelect: (value: string) => updateExercisePreference("pullups", value),
      value: quizData.exercisePreferences.pullups,
      illustration: <ExerciseIllustration type="pullups" className="w-64 h-64" />,
    },
    {
      step: 22,
      question: "Como você se sente sobre yoga e alongamento?",
      subtitle: "",
      type: "exercise_preference",
      exerciseType: "yoga",
      options: [
        { value: "amo", label: "Amo yoga/alongamento!", icon: ThumbsUp, color: "text-green-500" },
        { value: "neutro", label: "É ok para mim", icon: Meh, color: "text-yellow-500" },
        { value: "odeio", label: "Prefiro evitar", icon: ThumbsDown, color: "text-red-500" },
      ],
      onSelect: (value: string) => updateExercisePreference("yoga", value),
      value: quizData.exercisePreferences.yoga,
      illustration: <ExerciseIllustration type="yoga" className="w-64 h-64" />,
    },
    {
      step: 23,
      question: "Quantos dias você irá treinar por semana?",
      subtitle: "Selecione de 1 a 7 dias",
      type: "slider_days",
      value: quizData.trainingDaysPerWeek,
      min: 1,
      max: 7,
      step: 1,
      onChange: (value: number) => updateQuizData("trainingDaysPerWeek", value),
    },
    {
      step: 24,
      question: "Digite o seu e-mail",
      subtitle: "Para receber seu plano personalizado",
      type: "input_email",
      value: quizData.email,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateQuizData("email", e.target.value),
      placeholder: "seu@email.com",
    },
  ]

  const renderStep = () => {
    const currentQuestion = questions.find((q) => q.step === currentStep)
    if (!currentQuestion) return <div>Erro ao carregar pergunta.</div>

    switch (currentQuestion.type) {
      case "single":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            {/* Reduced gap for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-lg mx-auto">
              {currentQuestion.options.map((option: any) => (
                <div
                  key={option.value}
                  className="text-center space-y-4 cursor-pointer"
                  onClick={() => currentQuestion.onSelect(option.value)}
                >
                  <div className="flex justify-center items-center h-40">
                    <img
                      src={option.icon || "/placeholder.svg"}
                      alt={option.label}
                      className="w-24 h-24 object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div
                    className={`bg-gray-800 rounded-lg p-4 transition-all ${
                      currentQuestion.value === option.value ? "border-2 border-lime-500" : "border border-gray-700"
                    }`}
                  >
                    <h3 className="text-xl font-bold text-white">{option.label}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case "input_number":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="max-w-md mx-auto">
              <Input
                type="number"
                value={currentQuestion.value}
                onChange={currentQuestion.onChange}
                min={currentQuestion.min}
                max={currentQuestion.max}
                placeholder={currentQuestion.placeholder}
                className="w-full p-4 text-xl text-center bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-lime-500 focus:outline-none"
              />
            </div>
          </div>
        )
      case "single_card":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-3 sm:space-y-6">
              {currentQuestion.options.map((type: any) => (
                <div
                  key={type.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                    currentQuestion.value === type.value ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => currentQuestion.onSelect(type.value)}
                >
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{type.label}</h3>
                    <p className="text-gray-400 text-lg">{type.desc}</p>
                  </div>
                  <div className="flex-shrink-0 ml-6">
                    <img
                      src={currentQuestion.getImage(type.value) || "/placeholder.svg"}
                      alt={`${type.label} body type`}
                      className="w-auto h-32 sm:h-48 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case "multiple_card":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-3 sm:space-y-4">
              {currentQuestion.options.map((goal: any) => (
                <div
                  key={goal.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                    currentQuestion.value.includes(goal.value) ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => currentQuestion.onSelect(goal.value, !currentQuestion.value.includes(goal.value))}
                >
                  <h3 className="text-xl font-bold text-white">{goal.label}</h3>
                  <img
                    src={goal.icon || "/placeholder.svg"}
                    alt={goal.label}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      case "slider":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="relative flex flex-col items-center">
              <div className="relative w-64 h-80 mb-[-80px] z-10">
                <div className="absolute inset-0 bg-gradient-radial from-white/20 via-white/5 to-transparent blur-3xl" />
                <img
                  src={currentQuestion.getImage() || "/placeholder.svg"}
                  alt="Body fat representation"
                  className="relative w-full h-full object-contain transition-opacity duration-500"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>
              <div className="relative max-w-md w-full px-4 z-20">
                <div className="bg-zinc-900/95 backdrop-blur-sm rounded-2xl px-6 py-6 space-y-4 border border-zinc-800/50">
                  <div className="relative h-8">
                    <div
                      className="absolute bg-zinc-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 -translate-x-1/2"
                      style={{
                        left: `${((currentQuestion.value - currentQuestion.min) / (currentQuestion.max - currentQuestion.min)) * 100}%`,
                        top: "-8px",
                      }}
                    >
                      {currentQuestion.getRange(currentQuestion.value)}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-800" />
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[currentQuestion.value]}
                      onValueChange={(value) => currentQuestion.onChange(value[0])}
                      max={currentQuestion.max}
                      min={currentQuestion.min}
                      step={currentQuestion.step}
                      className="w-full body-fat-slider"
                    />
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>{currentQuestion.min}%</span>
                    <span>{`>${currentQuestion.max - 5}%`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case "problem_areas":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="flex items-start justify-center space-x-8">
              <div className="relative w-64 h-auto bg-transparent">
                <img
                  src={currentQuestion.getImage() || "/placeholder.svg"}
                  alt="Corpo base"
                  className="w-full h-auto object-contain relative z-10"
                  style={quizData.gender === "mulher" ? { mixBlendMode: "lighten" } : {}}
                />

                {/* MASCULINE PROBLEM AREAS */}
                {quizData.gender !== "mulher" &&
                  (quizData.problemAreas.includes("Peito") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_chest_left.top}%`,
                          left: `${debugValues.m_chest_left.left}%`,
                          width: `${debugValues.m_chest_left.width}%`,
                          height: `${debugValues.m_chest_left.height}%`,
                          borderRadius: "50% 50% 45% 55% / 55% 45% 60% 40%",
                          transform: `rotate(${debugValues.m_chest_left.rotate}deg)`,
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_chest_right.top}%`,
                          right: `${debugValues.m_chest_right.right}%`,
                          width: `${debugValues.m_chest_right.width}%`,
                          height: `${debugValues.m_chest_right.height}%`,
                          borderRadius: "50% 50% 55% 45% / 45% 55% 40% 60%",
                          transform: `rotate(${debugValues.m_chest_right.rotate}deg)`,
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {quizData.gender !== "mulher" &&
                  (quizData.problemAreas.includes("Braços") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_arm_upper_left.top}%`,
                          left: `${debugValues.m_arm_upper_left.left}%`,
                          width: `${debugValues.m_arm_upper_left.width}%`,
                          height: `${debugValues.m_arm_upper_left.height}%`,
                          borderRadius: "45% 55% 50% 50% / 50% 50% 45% 55%",
                          transform: `rotate(${debugValues.m_arm_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.m_arm_lower_left.top}%`,
                          left: `${debugValues.m_arm_lower_left.left}%`,
                          width: `${debugValues.m_arm_lower_left.width}%`,
                          height: `${debugValues.m_arm_lower_left.height}%`,
                          borderRadius: "40% 60% 50% 50% / 60% 40% 50% 50%",
                          transform: `rotate(${debugValues.m_arm_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 12px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_arm_upper_right.top}%`,
                          right: `${debugValues.m_arm_upper_right.right}%`,
                          width: `${debugValues.m_arm_upper_right.width}%`,
                          height: `${debugValues.m_arm_upper_right.height}%`,
                          borderRadius: "55% 45% 50% 50% / 50% 50% 55% 45%",
                          transform: `rotate(${debugValues.m_arm_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.m_arm_lower_right.top}%`,
                          right: `${debugValues.m_arm_lower_right.right}%`,
                          width: `${debugValues.m_arm_lower_right.width}%`,
                          height: `${debugValues.m_arm_lower_right.height}%`,
                          borderRadius: "60% 40% 50% 50% / 40% 60% 50% 50%",
                          transform: `rotate(${debugValues.m_arm_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 12px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {quizData.gender !== "mulher" &&
                  (quizData.problemAreas.includes("Barriga") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_abs_1_left.top}%`,
                          left: `${debugValues.m_abs_1_left.left}%`,
                          width: `${debugValues.m_abs_1_left.width}%`,
                          height: `${debugValues.m_abs_1_left.height}%`,
                          borderRadius: "45% 55% 40% 60%",
                          boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_abs_1_right.top}%`,
                          right: `${debugValues.m_abs_1_right.right}%`,
                          width: `${debugValues.m_abs_1_right.width}%`,
                          height: `${debugValues.m_abs_1_right.height}%`,
                          borderRadius: "55% 45% 60% 40%",
                          boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_abs_2_left.top}%`,
                          left: `${debugValues.m_abs_2_left.left}%`,
                          width: `${debugValues.m_abs_2_left.width}%`,
                          height: `${debugValues.m_abs_2_left.height}%`,
                          borderRadius: "40% 60% 45% 55%",
                          boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_abs_2_right.top}%`,
                          right: `${debugValues.m_abs_2_right.right}%`,
                          width: `${debugValues.m_abs_2_right.width}%`,
                          height: `${debugValues.m_abs_2_right.height}%`,
                          borderRadius: "60% 40% 55% 45%",
                          boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_abs_3_left.top}%`,
                          left: `${debugValues.m_abs_3_left.left}%`,
                          width: `${debugValues.m_abs_3_left.width}%`,
                          height: `${debugValues.m_abs_3_left.height}%`,
                          borderRadius: "45% 55% 50% 50%",
                          boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_abs_3_right.top}%`,
                          right: `${debugValues.m_abs_3_right.right}%`,
                          width: `${debugValues.m_abs_3_right.width}%`,
                          height: `${debugValues.m_abs_3_right.height}%`,
                          borderRadius: "55% 45% 50% 50%",
                          boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {quizData.gender !== "mulher" &&
                  (quizData.problemAreas.includes("Pernas") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_leg_upper_left.top}%`,
                          left: `${debugValues.m_leg_upper_left.left}%`,
                          width: `${debugValues.m_leg_upper_left.width}%`,
                          height: `${debugValues.m_leg_upper_left.height}%`,
                          borderRadius: "50% 50% 45% 55% / 60% 60% 40% 40%",
                          transform: `rotate(${debugValues.m_leg_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.m_leg_lower_left.top}%`,
                          left: `${debugValues.m_leg_lower_left.left}%`,
                          width: `${debugValues.m_leg_lower_left.width}%`,
                          height: `${debugValues.m_leg_lower_left.height}%`,
                          borderRadius: "50% 50% 40% 60% / 60% 60% 50% 50%",
                          transform: `rotate(${debugValues.m_leg_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 12px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_leg_upper_right.top}%`,
                          right: `${debugValues.m_leg_upper_right.right}%`,
                          width: `${debugValues.m_leg_upper_right.width}%`,
                          height: `${debugValues.m_leg_upper_right.height}%`,
                          borderRadius: "50% 50% 55% 45% / 60% 60% 40% 40%",
                          transform: `rotate(${debugValues.m_leg_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.m_leg_lower_right.top}%`,
                          right: `${debugValues.m_leg_lower_right.right}%`,
                          width: `${debugValues.m_leg_lower_right.width}%`,
                          height: `${debugValues.m_leg_lower_right.height}%`,
                          borderRadius: "50% 50% 60% 40% / 60% 60% 50% 50%",
                          transform: `rotate(${debugValues.m_leg_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 12px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {/* FEMININE PROBLEM AREAS */}
                {quizData.gender === "mulher" &&
                  (quizData.problemAreas.includes("Peito") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90 animate-pulse"
                        style={{
                          top: `${debugValues.chest_left.top}%`,
                          left: `${debugValues.chest_left.left}%`,
                          width: `${debugValues.chest_left.width}%`,
                          height: `${debugValues.chest_left.height}%`,
                          borderRadius: "50% 50% 45% 55% / 55% 55% 45% 45%",
                          transform: `rotate(${debugValues.chest_left.rotate}deg)`,
                          boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.5), 0 0 15px rgba(0, 200, 200, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90 animate-pulse"
                        style={{
                          top: `${debugValues.chest_right.top}%`,
                          right: `${debugValues.chest_right.right}%`,
                          width: `${debugValues.chest_right.width}%`,
                          height: `${debugValues.chest_right.height}%`,
                          borderRadius: "50% 50% 55% 45% / 55% 55% 45% 45%",
                          transform: `rotate(${debugValues.chest_right.rotate}deg)`,
                          boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.5), 0 0 15px rgba(0, 200, 200, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {quizData.gender === "mulher" &&
                  (quizData.problemAreas.includes("Braços") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.arm_upper_left.top}%`,
                          left: `${debugValues.arm_upper_left.left}%`,
                          width: `${debugValues.arm_upper_left.width}%`,
                          height: `${debugValues.arm_upper_left.height}%`,
                          borderRadius: "50% 50% 45% 55% / 55% 55% 45% 45%",
                          transform: `rotate(${debugValues.arm_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 18px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.arm_lower_left.top}%`,
                          left: `${debugValues.arm_lower_left.left}%`,
                          width: `${debugValues.arm_lower_left.width}%`,
                          height: `${debugValues.arm_lower_left.height}%`,
                          borderRadius: "45% 55% 50% 50% / 60% 60% 40% 40%",
                          transform: `rotate(${debugValues.arm_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.arm_upper_right.top}%`,
                          right: `${debugValues.arm_upper_right.right}%`,
                          width: `${debugValues.arm_upper_right.width}%`,
                          height: `${debugValues.arm_upper_right.height}%`,
                          borderRadius: "50% 50% 55% 45% / 55% 55% 45% 45%",
                          transform: `rotate(${debugValues.arm_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 18px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.arm_lower_right.top}%`,
                          right: `${debugValues.arm_lower_right.right}%`,
                          width: `${debugValues.arm_lower_right.width}%`,
                          height: `${debugValues.arm_lower_right.height}%`,
                          borderRadius: "55% 45% 50% 50% / 60% 60% 40% 40%",
                          transform: `rotate(${debugValues.arm_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                    </>
                  )}

                {quizData.gender === "mulher" &&
                  (quizData.problemAreas.includes("Barriga") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <div
                      className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                      style={{
                        top: `${debugValues.belly.top}%`,
                        left: `${debugValues.belly.left}%`,
                        transform: `translateX(-50%) rotate(${debugValues.belly.rotate}deg)`,
                        width: `${debugValues.belly.width}%`,
                        height: `${debugValues.belly.height}%`,
                        borderRadius: "45% 55% 50% 50% / 40% 40% 60% 60%",
                        boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.4)",
                      }}
                    ></div>
                  )}

                {quizData.gender === "mulher" &&
                  (quizData.problemAreas.includes("Pernas") || quizData.problemAreas.includes("Corpo inteiro")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.leg_upper_left.top}%`,
                          left: `${debugValues.leg_upper_left.left}%`,
                          width: `${debugValues.leg_upper_left.width}%`,
                          height: `${debugValues.leg_upper_left.height}%`,
                          borderRadius: "50% 50% 45% 55% / 60% 60% 40% 40%",
                          transform: `rotate(${debugValues.leg_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.leg_lower_left.top}%`,
                          left: `${debugValues.leg_lower_left.left}%`,
                          width: `${debugValues.leg_lower_left.width}%`,
                          height: `${debugValues.leg_lower_left.height}%`,
                          borderRadius: "50% 50% 45% 55% / 65% 65% 35% 35%",
                          transform: `rotate(${debugValues.leg_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 18px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.leg_upper_right.top}%`,
                          right: `${debugValues.leg_upper_right.right}%`,
                          width: `${debugValues.leg_upper_right.width}%`,
                          height: `${debugValues.leg_upper_right.height}%`,
                          borderRadius: "50% 50% 55% 45% / 60% 60% 40% 40%",
                          transform: `rotate(${debugValues.leg_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.leg_lower_right.top}%`,
                          right: `${debugValues.leg_lower_right.right}%`,
                          width: `${debugValues.leg_lower_right.width}%`,
                          height: `${debugValues.leg_lower_right.height}%`,
                          borderRadius: "50% 50% 60% 40% / 60% 60% 50% 50%",
                          transform: `rotate(${debugValues.leg_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 18px rgba(0, 255, 255, 0.4)",
                        }}
                      ></div>
                    </>
                  )}
              </div>

              {currentQuestion.debugMode && (
                <div className="w-96 max-h-[600px] overflow-y-auto bg-gray-900/95 rounded-lg p-4 space-y-4 border border-purple-500">
                  <div className="flex justify-between items-center sticky top-0 bg-gray-900 pb-2 border-b border-purple-500">
                    <h3 className="text-lg font-bold text-white">
                      Ajustar Marcações ({quizData.gender === "mulher" ? "Feminino" : "Masculino"})
                    </h3>
                    <button
                      onClick={currentQuestion.copyDebugValues}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Copiar Valores
                    </button>
                  </div>

                  {Object.entries(currentQuestion.debugValues)
                    .filter(([key]) => (quizData.gender === "mulher" ? !key.startsWith("m_") : key.startsWith("m_")))
                    .map(([key, values]) => (
                      <div key={key} className="space-y-2 border-b border-gray-700 pb-3">
                        <h4 className="text-sm font-semibold text-purple-300">
                          {key.replace(/m_/g, "").replace(/_/g, " ").toUpperCase()}
                        </h4>

                        <div className="space-y-1">
                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Top: {values.top}%</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={values.top}
                              onChange={(e) => currentQuestion.updateDebugValue(key, "top", Number(e.target.value))}
                              className="w-48"
                            />
                          </label>

                          {"left" in values && (
                            <label className="text-xs text-gray-400 flex justify-between">
                              <span>Left: {values.left}%</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={values.left}
                                onChange={(e) => currentQuestion.updateDebugValue(key, "left", Number(e.target.value))}
                                className="w-48"
                              />
                            </label>
                          )}

                          {"right" in values && (
                            <label className="text-xs text-gray-400 flex justify-between">
                              <span>Right: {values.right}%</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={values.right}
                                onChange={(e) => currentQuestion.updateDebugValue(key, "right", Number(e.target.value))}
                                className="w-48"
                              />
                            </label>
                          )}

                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Width: {values.width}%</span>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={values.width}
                              onChange={(e) => currentQuestion.updateDebugValue(key, "width", Number(e.target.value))}
                              className="w-48"
                            />
                          </label>

                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Height: {values.height}%</span>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={values.height}
                              onChange={(e) => currentQuestion.updateDebugValue(key, "height", Number(e.target.value))}
                              className="w-48"
                            />
                          </label>

                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Rotate: {values.rotate}°</span>
                            <input
                              type="range"
                              min="-90"
                              max="90"
                              value={values.rotate}
                              onChange={(e) => currentQuestion.updateDebugValue(key, "rotate", Number(e.target.value))}
                              className="w-48"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex flex-col space-y-4 max-w-md">
                {currentQuestion.options.map((area: string) => (
                  <div
                    key={area}
                    className={`rounded-lg p-6 cursor-pointer transition-all border-2 ${
                      currentQuestion.value.includes(area)
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-white hover:border-orange-500"
                    }`}
                    onClick={() => currentQuestion.onSelect(area, !currentQuestion.value.includes(area))}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{area}</h3>
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          currentQuestion.value.includes(area) ? "bg-white border-white" : "border-gray-400"
                        }`}
                      >
                        {currentQuestion.value.includes(area) && <CheckCircle className="h-4 w-4 text-orange-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case "single_diet":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-4">
              {currentQuestion.options.map((diet: any) => (
                <div
                  key={diet.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 border ${
                    currentQuestion.value === diet.value ? "border-2 border-lime-500" : "border-gray-700"
                  }`}
                  onClick={() => currentQuestion.onSelect(diet.value)}
                >
                  <span className="text-2xl">{diet.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{diet.label}</h3>
                    <p className="text-gray-400 text-sm">{diet.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-4">
              <div
                className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                  currentQuestion.value === currentQuestion.noDietOption.value
                    ? "border-2 border-lime-500"
                    : "border border-gray-700"
                }`}
                onClick={() => currentQuestion.onSelect(currentQuestion.noDietOption.value)}
              >
                <h3 className="text-lg font-bold text-white">{currentQuestion.noDietOption.label}</h3>
                <currentQuestion.noDietOption.icon className="h-6 w-6 text-lime-500" />
              </div>
            </div>
          </div>
        )
      case "multiple_checkbox":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-3">
              {currentQuestion.options.map((freq: any) => (
                <div key={freq.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={freq.value}
                    checked={currentQuestion.value.includes(freq.value)}
                    onCheckedChange={(checked) => currentQuestion.onSelect(freq.value, checked as boolean)}
                  />
                  <Label htmlFor={freq.value} className="text-white text-lg flex items-center space-x-2">
                    <span className="text-xl">{freq.icon}</span>
                    <span>{freq.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )
      case "input_text":
      case "input_email":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-6">
              <Input
                type={currentQuestion.type === "input_email" ? "email" : "text"}
                value={currentQuestion.value}
                onChange={currentQuestion.onChange}
                placeholder={currentQuestion.placeholder}
                className="bg-transparent border-0 border-b-2 border-gray-600 text-white text-center text-xl rounded-none focus:border-lime-500"
              />
            </div>
          </div>
        )
      case "yes_no":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-4">
              {currentQuestion.options.map((option: any) => (
                <div
                  key={option.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                    currentQuestion.value === option.value ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => currentQuestion.onSelect(option.value)}
                >
                  <h3 className="text-lg font-bold text-white">{option.label}</h3>
                  <option.icon className={`h-6 w-6 ${option.color}`} />
                </div>
              ))}
            </div>
          </div>
        )
      case "textarea":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-6">
              <Textarea
                value={currentQuestion.value}
                onChange={currentQuestion.onChange}
                placeholder={currentQuestion.placeholder}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 min-h-32"
              />
            </div>
          </div>
        )
      case "supplement_choice":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="space-y-4">
              <button
                type="button"
                className={`w-full bg-gray-800 rounded-lg p-6 transition-all flex items-center justify-between border-2 hover:border-lime-400 cursor-pointer ${
                  currentQuestion.value === "sim" ? "border-lime-500 bg-lime-500/10" : "border-gray-700"
                }`}
                onClick={() => {
                  const isEctomorph = currentQuestion.bodyType === "ectomorfo"
                  const hasHighBodyFat =
                    currentQuestion.gender === "mulher" ? currentQuestion.bodyFat > 30 : currentQuestion.bodyFat > 20
                  const hasBellyProblem = currentQuestion.problemAreas.includes("Barriga")

                  let supplementType = "whey-protein"
                  if (isEctomorph && !hasHighBodyFat && !hasBellyProblem) {
                    supplementType = "hipercalorico"
                  }
                  currentQuestion.onSelect("sim", supplementType)
                }}
              >
                <h3 className="text-lg font-bold text-white">Sim, pode adicionar</h3>
                <CheckCircle
                  className={`h-6 w-6 ${currentQuestion.value === "sim" ? "text-lime-500" : "text-gray-500"}`}
                />
              </button>
              <button
                type="button"
                className={`w-full bg-gray-800 rounded-lg p-6 transition-all flex items-center justify-between border-2 hover:border-lime-400 cursor-pointer ${
                  currentQuestion.value === "nao" ? "border-lime-500 bg-lime-500/10" : "border-gray-700"
                }`}
                onClick={() => currentQuestion.onSelect("nao", "")}
              >
                <h3 className="text-lg font-bold text-white">Não, prefiro sem suplementos</h3>
                <X className={`h-6 w-6 ${currentQuestion.value === "nao" ? "text-lime-500" : "text-gray-500"}`} />
              </button>
            </div>
            {currentQuestion.value === "sim" && currentQuestion.supplementType && (
              <div className="bg-lime-500/10 border border-lime-500 rounded-lg p-4 text-center">
                <p className="text-lime-400 font-semibold">
                  Recomendamos:{" "}
                  {currentQuestion.supplementType === "hipercalorico" ? "Hipercalórico Growth" : "Whey Protein Growth"}
                </p>
                <p className="text-gray-300 text-sm mt-2">
                  {currentQuestion.supplementType === "hipercalorico"
                    ? "Ideal para ganho de massa muscular e atingir suas calorias diárias"
                    : "Ideal para atingir suas metas de proteína e manter a massa muscular"}
                </p>
              </div>
            )}
          </div>
        )
      case "exercise_preference":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-8">
              {currentQuestion.illustration}
              <div className="space-y-4 flex-1 max-w-sm">
                {currentQuestion.options.map((pref: any) => (
                  <div
                    key={pref.value}
                    className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                      currentQuestion.value === pref.value ? "border-2 border-lime-500" : "border border-gray-700"
                    }`}
                    onClick={() => currentQuestion.onSelect(pref.value)}
                  >
                    <pref.icon className={`h-6 w-6 ${pref.color}`} />
                    <h3 className="text-lg font-bold text-white">{pref.label}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case "slider_days":
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQuestion.question}</h2>
              {currentQuestion.subtitle && (
                <p className="text-sm md:text-base text-gray-400">{currentQuestion.subtitle}</p>
              )}
            </div>
            <div className="text-center space-y-8">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-full px-4 py-2 inline-block">
                    <span className="text-white font-bold">{currentQuestion.value} dias</span>
                  </div>
                  <div className="px-4">
                    <Slider
                      value={[currentQuestion.value]}
                      onValueChange={(value) => currentQuestion.onChange(value[0])}
                      max={currentQuestion.max}
                      min={currentQuestion.min}
                      step={currentQuestion.step}
                      className="w-full"
                    />
                    <div className="flex justify-between text-gray-400 text-sm mt-2">
                      <span>{currentQuestion.min} dia</span>
                      <span>{currentQuestion.max} dias</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return <div>Tipo de pergunta não suportado.</div>
    }
  }

  const isStepValid = (step: number): boolean => {
    const currentQuestion = questions.find((q) => q.step === step)
    if (!currentQuestion) return false

    switch (currentQuestion.type) {
      case "single":
        return currentQuestion.value !== ""
      case "input_number":
        return (
          currentQuestion.value !== "" &&
          Number.parseFloat(currentQuestion.value) >= currentQuestion.min &&
          Number.parseFloat(currentQuestion.value) <= currentQuestion.max
        )
      case "single_card":
        return currentQuestion.value !== ""
      case "multiple_card":
        return currentQuestion.value.length > 0
      case "slider":
        return currentQuestion.value > 0
      case "problem_areas":
        return currentQuestion.value.length > 0
      case "single_diet":
        return currentQuestion.value !== ""
      case "multiple_checkbox":
        return currentQuestion.value.length > 0
      case "input_text":
      case "input_email":
        return (
          currentQuestion.value.trim() !== "" &&
          (currentQuestion.type !== "input_email" || currentQuestion.value.includes("@"))
        )
      case "yes_no":
        return currentQuestion.value !== ""
      case "textarea":
        return currentQuestion.value.trim() !== ""
      case "supplement_choice":
        return currentQuestion.value !== ""
      case "exercise_preference":
        return currentQuestion.value !== ""
      case "slider_days":
        return currentQuestion.value >= 1 && currentQuestion.value <= 7
      default:
        return true
    }
  }

  const canContinue = () => {
    return isStepValid(currentStep)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <p className="text-gray-400">
              {currentStep} de {totalSteps}
            </p>
          </div>
          <div className="w-16" />
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 mb-6 md:mb-8">
          <div
            className="bg-lime-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Question content */}
        <div className="space-y-6 md:space-y-8">{renderStep()}</div>

        <div className="flex justify-center mt-12">
          {currentStep === totalSteps ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl font-bold rounded-full disabled:opacity-50 shadow-2xl shadow-lime-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-lime-400"
            >
              <div className="relative px-12 md:px-20 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300 disabled:hover:scale-100 disabled:shadow-none">
                <span className="relative z-10 flex items-center gap-3">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Finalizar Avaliação
                      <Dumbbell className="h-6 w-6" />
                    </>
                  )}
                </span>
              </div>
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canContinue()}
              className="w-full max-w-md mx-auto py-5 md:py-6 text-base md:text-lg bg-lime-500 hover:bg-lime-600 text-gray-900 font-bold"
            >
              Continuar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
