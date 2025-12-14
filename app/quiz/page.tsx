"use client"

import { useState, useEffect } from "react"
// import Image from "next/image" // Import Image component

import { Button } from "@/components/ui/button"

import { Slider } from "@/components/ui/slider"

import { CheckCircle, ArrowRight } from "lucide-react"

import { useRouter } from "next/navigation"

import { db, auth } from "@/lib/firebaseClient"

import { doc, setDoc, getDoc } from "firebase/firestore"

import { onAuthStateChanged, signInAnonymously } from "firebase/auth"

import { motion } from "framer-motion"

// Moved useState to inside the component to adhere to hook rules
// const [showMotivationMessage, setShowMotivationMessage] = useState(false)

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
  recommendedSupplement: string
  weightChangeType: string
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
  strengthTraining?: string // Added this field
  // </CHANGE> Added weight field
  weight: string
  // </CHANGE>
  healthConditions: string[] // Added for step 13
  supplement: string // Added for step 14
  sweetsFrequency: string[] // Renamed from sugarFrequency to be more specific
  cardioFeeling: string // Added for step 19
  strengthFeeling: string // Added for step 20
  stretchingFeeling: string // Added for step 21
  trainingDays: string // Renamed from trainingDaysPerWeek to string for consistency in canProceed
  previousProblems: string[] // Added for new step 18
  additionalGoals: string[]
  letMadMusclesChoose: boolean
  foodPreferences: {
    vegetables: string[]
    grains: string[]
    ingredients: string[]
    meats: string[]
    fruits: string[]
  }
  alcoholFrequency?: string // Added for new step
  // </CHANGE>
}

const initialQuizData: QuizData = {
  gender: "",
  bodyType: "",
  goal: [],
  subGoal: "",
  bodyFat: 15,
  problemAreas: [],
  diet: "",
  sugarFrequency: [], // This will be renamed to sweetsFrequency
  waterIntake: "",
  allergies: "",
  allergyDetails: "",
  wantsSupplement: "",
  supplementType: "",
  recommendedSupplement: "",
  // </CHANGE>
  // Initialize weightChangeType field
  weightChangeType: "",
  // </CHANGE>
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
  trainingDaysPerWeek: 0, // This will be renamed to trainingDays
  email: "",
  imc: 0,
  imcClassification: "",
  imcStatus: "",
  age: 0,
  strengthTraining: "", // Initialize strengthTraining
  // </CHANGE> Initialize weight field
  weight: "",
  // </CHANGE>
  healthConditions: [], // Initialize healthConditions
  supplement: "", // Initialize supplement
  sweetsFrequency: [], // Initialize sweetsFrequency (renamed from sugarFrequency)
  cardioFeeling: "", // Initialize cardioFeeling
  strengthFeeling: "", // Initialize strengthFeeling
  stretchingFeeling: "", // Initialize stretchingFeeling
  trainingDays: "1", // Initialize trainingDays as string, default to 1
  previousProblems: [], // Initialize previousProblems
  additionalGoals: [],
  foodPreferences: {
    vegetables: [],
    grains: [],
    ingredients: [],
    meats: [],
    fruits: [],
  },
  // </CHANGE>
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
        const parsed = JSON.JSON.parse(stored)
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

const ease = [0.22, 1, 0.36, 1] as const

function buildPath(points: Array<[number, number]>) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
}

export default function QuizPage() {
  const [showMotivationMessage, setShowMotivationMessage] = useState(false)
  const [showCortisolMessage, setShowCortisolMessage] = useState(false)
  // </CHANGE>
  const [currentStep, setCurrentStep] = useState(1)
  const [showQuickResults, setShowQuickResults] = useState(false)

  const [quizData, setQuizData] = useState<QuizData>({
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
    height: "",
    heightUnit: "cm",
    currentWeight: "",
    targetWeight: "",
    weightUnit: "kg",
    timeToGoal: "",
    name: "",
    workoutTime: "",
    experience: "",
    equipment: [],
    exercisePreferences: {
      cardio: "",
      pullups: "",
      yoga: "",
    },
    trainingDaysPerWeek: 3,
    email: "",
    imc: 0,
    imcClassification: "",
    imcStatus: "",
    age: 0,
    weight: "",
    healthConditions: [],
    supplement: "",
    sweetsFrequency: [],
    cardioFeeling: "",
    strengthFeeling: "",
    stretchingFeeling: "",
    trainingDays: "",
    previousProblems: [],
    additionalGoals: [],
    foodPreferences: {
      vegetables: [],
      grains: [],
      ingredients: [],
      meats: [],
      fruits: [],
    },
    // </CHANGE>
    // Initialize weightChangeType
    weightChangeType: "",
    // </CHANGE>
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [showNutritionInfo, setShowNutritionInfo] = useState(false)
  const [showWaterCongrats, setShowWaterCongrats] = useState(false)
  const [showTimeCalculation, setShowTimeCalculation] = useState(false)
  const [showGoalTimeline, setShowGoalTimeline] = useState(false)
  const [calculatedWeeks, setCalculatedWeeks] = useState(0)
  const [isCalculatingGoal, setIsCalculatingGoal] = useState(false)
  // </CHANGE>
  const [showIMCResult, setShowIMCResult] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [totalSteps, setTotalSteps] = useState(30)
  // </CHANGE>

  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false) // Add isSubmitting state
  const [waterFill, setWaterFill] = useState(0)

  const [showAnalyzingData, setShowAnalyzingData] = useState(false)
  const [analyzingStep, setAnalyzingStep] = useState(0)
  // </CHANGE>

  const [debugMode, setDebugMode] = useState(false) // Disabled debug mode
  const [debugValues, setDebugValues] = useState({
    chest_left: { top: 23, left: 33, width: 14, height: 6, rotate: -90 },
    chest_right: { top: 23, right: 38, width: 14, height: 6, rotate: -90 },
    arm_upper_left: { top: 22, left: 23, width: 6, height: 12, rotate: 4 },
    arm_lower_left: { top: 37, left: 21, width: 5, height: 11, rotate: 2 },
    arm_upper_right: { top: 20, right: 27, width: 5, height: 11, rotate: -25 },
    arm_lower_right: { top: 32, right: 24, width: 5, height: 8, rotate: 29 },
    belly: { top: 31, left: 49, width: 22, height: 13, rotate: 0 },
    leg_upper_left: { top: 54, left: 34, width: 11, height: 14, rotate: -2 },
    leg_lower_left: { top: 73, left: 42, width: 5, height: 9, rotate: -17 },
    leg_upper_right: { top: 54, right: 36, width: 11, height: 14, rotate: 2 },
    leg_lower_right: { top: 73, right: 43, width: 5, height: 9, rotate: 17 },
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
    m_leg_lower_left: { top: 72, left: 23, width: 11, height: 16, rotate: 10 },
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
    if (showWaterCongrats) {
      setTimeout(() => setWaterFill(90), 200)
    } else {
      setWaterFill(0)
    }
  }, [showWaterCongrats])
  // </CHANGE>

  useEffect(() => {
    if (showAnalyzingData) {
      const messages = [
        "Estamos analisando seus dados...",
        "Calculando suas necessidades fisiológicas...",
        "Ajustando seu plano ideal...",
      ]

      if (analyzingStep < messages.length) {
        const timer = setTimeout(() => {
          setAnalyzingStep((prev) => prev + 1)
        }, 1800)
        return () => clearTimeout(timer)
      } else if (analyzingStep === messages.length) {
        const timer = setTimeout(() => {
          setShowAnalyzingData(false)
          setAnalyzingStep(0)
          setCurrentStep(25) // Move to supplement interest question
        }, 2500)
        return () => clearTimeout(timer)
      }
    }
  }, [showAnalyzingData, analyzingStep])
  // </CHANGE>

  useEffect(() => {
    if (showGoalTimeline) {
      setIsCalculatingGoal(true)

      // Calculate weeks
      const current = Number.parseFloat(quizData.weight)
      const target = Number.parseFloat(quizData.targetWeight)
      if (!isNaN(current) && !isNaN(target) && current > 0 && target > 0) {
        const weightDifference = Math.abs(current - target)
        const weeks = Math.ceil(weightDifference / 0.75)

        // Show loading animation for 2 seconds, then reveal result
        setTimeout(() => {
          setCalculatedWeeks(weeks)
          setIsCalculatingGoal(false)
        }, 2000)
      }
    }
  }, [showGoalTimeline, quizData.weight, quizData.targetWeight])
  // </CHANGE>

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
    setQuizData((prev) => {
      const normalizedValue = key === "height" ? normalizeHeight(value) : value
      const updated = { ...prev, [key]: normalizedValue }

      // Recalcular IMC se necessário
      if (key === "currentWeight" || key === "height" || key === "weight") {
        const weight = Number.parseFloat(
          key === "currentWeight" ? normalizedValue : prev.currentWeight || (key === "weight" ? normalizedValue : "0"),
        )

        const height = Number.parseFloat(key === "height" ? normalizedValue : prev.height || "0")

        if (weight > 0 && height > 0) {
          const imcData = calculateIMC(weight, height)
          updated.imc = imcData.imc
          updated.imcClassification = imcData.classification
          updated.imcStatus = imcData.status
        }
      }

      return updated
    })
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
    const current = Number.parseFloat(quizData.weight)
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
        console.log("generateAndSavePlan: API /api-generate-plans-on-demand response:", result)
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
    console.log("[v0] nextStep called, currentStep:", currentStep, "quizData:", quizData)

    if (currentStep === 5 && quizData.bodyFat !== 0) {
      setShowQuickResults(true)
      return
    }

    if (currentStep === 21) {
      setShowCortisolMessage(true)
      setCurrentStep(22) // Move to step 22, but cortisol message will show first
      return
    }
    // </CHANGE>

    if (currentStep === 22 && quizData.allergies === "nao") {
      // This case is now related to Training Days per week (step 24).
      // The original code had a condition here for allergies, which is now handled in step 22.
      // If the intention was to always advance after the cortisol message, this should be handled by the render logic.
      // For now, assuming we simply advance.
      setCurrentStep(currentStep + 1)
      return
    }
    // </CHANGE>

    if (currentStep === 17) {
      // This case 17 is now about previous problems
      console.log("[v0] Advancing from step 17, checking for motivation message logic...")
      if (
        quizData.previousProblems.length === 0 ||
        (quizData.previousProblems.length === 1 && quizData.previousProblems[0] === "no-problems")
      ) {
        // If user selected "Não, eu não tenho", we show motivation message directly
        setShowMotivationMessage(true)
        console.log("[v0] No previous problems selected, showing motivation message.")
      }
      setCurrentStep(currentStep + 1) // Always advance to the next step (which is now additional goals)
      return
    }
    // </CHANGE>

    if (currentStep === 22 && quizData.allergies === "nao") {
      // This condition is now handled within the step 22 rendering logic by directly setting the next step.
      // If this block is reached, it means the user selected "nao" for allergies.
      // The logic to skip to 24 is already implemented in the button's onClick handler.
      // So, no action needed here, just advance normally if this block is not removed.
      // However, the `nextStep` should be called from the UI handler.
      // If this block remains, it implies that `nextStep` is called regardless of the UI interaction, which is not ideal.
      // Assuming the UI handler for the 'nao' button is correct, this `if` can be removed.
      // For safety, if it's intended to be a fallback, let's advance the step.
      // But the direct jump to 24 in the UI is preferred.
      // Let's comment it out for clarity, relying on the UI handler.
      // setCurrentStep(currentStep + 1)
      // </CHANGE>
    } else if (currentStep === 23 && quizData.allergies === "sim") {
      // This step is for allergy details. If allergies is 'sim', we proceed to the next step.
      // If allergies is 'nao', case 22 already jumped to case 24.
      // This if block might be redundant if the UI handler manages the flow correctly.
      // Let's assume the UI handler for the 'Continue' button at case 23 handles the progression.
      // If the 'Continue' button is pressed, `nextStep()` is called.
      // The current step is 23. We want to go to case 24.
      // This block might be intended to skip if there are no allergies, but that's handled in step 22.
      // For now, let's assume `nextStep` will correctly advance to 24.
      // If the user *did* fill in allergy details, `nextStep` would normally advance to the next step.
      // If they skipped it (which shouldn't be possible if `canProceed` is correct), this might be a fallback.
      // Based on the structure, it seems the `nextStep()` call from the UI is sufficient.
      // If this were meant to manually set the step, it should be `setCurrentStep(24)`.
      // For now, we'll let the general `nextStep` logic handle it.
    } else if (currentStep === 25 && quizData.wantsSupplement === "nao") {
      // Step 25 is supplement interest. If 'nao', we skip supplement details (case 25 handles this by setting currentStep to 26).
      setCurrentStep(26) // Skip supplement recommendation and go to step 26 (name)
    } else if (currentStep === 26 && quizData.wantsSupplement === "nao") {
      // </CHANGE>
      setCurrentStep(27) // Skip supplement details and go to name (case 27)
    } else if (currentStep === 12 && quizData.weight !== "" && quizData.targetWeight !== "") {
      // Original was step 15, now step 13 (weight related)
      const calculatedTime = calculateTimeToGoal()
      console.log("[v0] calculatedTime:", calculatedTime)
      if (calculatedTime) {
        updateQuizData("timeToGoal", calculatedTime)
        setShowTimeCalculation(true)
      } else {
        // If calculation fails, just move to next step
        setCurrentStep(currentStep + 1)
      }
      // </CHANGE>
    } else if (currentStep === 29) {
      setShowAnalyzingData(true)
      setCurrentStep(30)
      // </CHANGE>
    } else if (currentStep === 26 && quizData.name.trim() !== "") {
      // Calculate weeks to reach goal based on weight difference and goals
      const current = Number.parseFloat(quizData.currentWeight)
      const target = Number.parseFloat(quizData.targetWeight)
      const diff = Math.abs(target - current)

      // Basic calculation: 0.5-1kg per week is healthy
      // For weight loss: 8-16 weeks, for muscle gain: 12-20 weeks
      let weeks = 11 // default

      if (quizData.goal.includes("perder-peso")) {
        weeks = Math.ceil(diff / 0.5) // 0.5kg per week for weight loss
        weeks = Math.max(8, Math.min(weeks, 16)) // Between 8-16 weeks
      } else if (quizData.goal.includes("ganhar-massa")) {
        weeks = Math.ceil(diff / 0.3) // 0.3kg per week for muscle gain
        weeks = Math.max(12, Math.min(weeks, 20)) // Between 12-20 weeks
      }

      setCalculatedWeeks(weeks)
      setShowGoalTimeline(true)
      return
    } else if (currentStep < totalSteps) {
      const nextStepNumber = currentStep + 1
      setCurrentStep(nextStepNumber)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      // Adjusted step numbers to match the new flow
      if (currentStep === 25 && quizData.allergies === "nao") {
        // If we are at supplement interest question (case 25) and allergies was 'no' (case 22, which jumps to 24)
        // We need to go back to the allergies question (case 22).
        setCurrentStep(22) // Go back to allergies question
      } else if (currentStep === 27 && quizData.wantsSupplement === "nao") {
        // If we are at name question (case 27) and supplement interest was 'no' (case 25, which jumps to 26)
        // We need to go back to the supplement interest question (case 25).
        setCurrentStep(25)
      } else if (currentStep === 26 && quizData.wantsSupplement === "sim") {
        // If we are at supplement recommendation (case 26) and supplement interest was 'yes' (case 25)
        // We need to go back to the supplement interest question (case 25).
        setCurrentStep(25)
      } else if (currentStep === 23 && quizData.allergies === "sim") {
        // If we are at allergy details (case 23) and allergies was 'yes' (case 22)
        // We need to go back to the allergies question (case 22).
        setCurrentStep(22) // Go back to allergies question
      } else if (currentStep === 18 && quizData.additionalGoals.length === 0) {
        // If we are at the additional goals page (now case 18) and user selected none,
        // and we are navigating back from this page, we should go back to the previous problem page (case 17)
        setShowMotivationMessage(false) // Hide motivation message if it was shown
        setCurrentStep(17)
      } else if (currentStep === 18 && showMotivationMessage) {
        // If motivation message was shown, go back to previous step before motivation message
        setShowMotivationMessage(false)
        // The logic to show motivation message is now tied to previousProblems being empty.
        // So if we are at step 18 (additional goals) and motivation message was shown, it means we came from step 17
        // where previousProblems was empty. So we should go back to step 17.
        setCurrentStep(17)
      } else if (currentStep === 23 && showCortisolMessage) {
        // Adding back navigation for cortisol message
        setShowCortisolMessage(false)
        setCurrentStep(22)
        // </CHANGE>
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
      const weightForIMC = Number.parseFloat(quizData.weight || "0") // Use quizData.weight for IMC
      const heightForIMC = Number.parseFloat(quizData.height || "0")

      console.log("[v0] IMC Calculation - Weight:", weightForIMC, "Height:", heightForIMC)

      const { imc, classification, status } = calculateIMC(weightForIMC, heightForIMC)

      console.log("[v0] IMC Result:", { imc, classification, status })
      // </CHANGE>

      const updatedQuizData = {
        ...quizData,
        imc: imc,
        imcClassification: classification,
        imcStatus: status,
        // </CHANGE> Renaming fields for consistency with the canProceed updates
        sweetsFrequency: quizData.sugarFrequency, // Use sweetsFrequency
        trainingDays: quizData.trainingDaysPerWeek.toString(), // Use trainingDays as string
        cardioFeeling: quizData.exercisePreferences.cardio,
        strengthFeeling: quizData.exercisePreferences.pullups,
        stretchingFeeling: quizData.exercisePreferences.yoga,
        healthConditions: quizData.allergyDetails.length > 0 ? [quizData.allergyDetails] : [], // Convert allergyDetails to healthConditions array
        supplement: quizData.wantsSupplement, // Use supplement field
        previousProblems: quizData.previousProblems, // Include previousProblems
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
            <ellipse cx="85" cy="40" rx="6" ry="18" fill="url(#bodyGradient2)" />
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
            <rect x="85" y="70" width="30" height={35} rx="15" fill="url(#bodyGradient4)" />
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

  const messages = [
    "Estamos analisando seus dados...",
    "Calculando suas necessidades fisiológicas...",
    "Ajustando seu plano ideal...",
  ]

  const showAnalyzingDataMessage = showAnalyzingData && analyzingStep < messages.length

  if (showQuickResults) {\
    const musclePts: Array<[number, number]> = [
      [0, 250],
      [100, 200],
      [200, 150],
      [300, 100],
      [400, 80],
    ]

    const fatPts: Array<[number, number]> = [
      [0, 100],
      [100, 120],
      [200, 180],
      [300, 220],
      [400, 240],
    ]

    const muscleD = buildPath(musclePts)
    const fatD = buildPath(fatPts)

    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="text-3xl sm:text-4xl font-bold"
            >
              Apenas 2 semanas para o primeiro resultado
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease }}
              className="text-gray-300 text-lg"
            >
              Prevemos que você verá melhorias até o final da 2ª semana
            </motion.p>
          </div>

          <div className="relative w-full h-[420px] bg-gray-800/40 rounded-2xl p-6 backdrop-blur-sm border border-gray-700 overflow-hidden">
            {/* Glow effect */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-lime-500 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-400 blur-3xl" />
            </div>

            <div className="relative w-full h-full">
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400">
                <span>Alto</span>
                <span>Médio</span>
                <span>Baixo</span>
              </div>

              <div className="absolute bottom-0 left-12 right-0 flex justify-between text-xs text-gray-400">
                <span>Agora</span>
                <span>1 Mês</span>
                <span>2 Meses</span>
                <span>3 Meses</span>
              </div>

              <svg className="absolute left-12 top-4 right-4 bottom-8" viewBox="0 0 400 300" preserveAspectRatio="none">
                {/* Grid lines */}
                <g opacity="0.12">
                  {[60, 120, 180, 240].map((y) => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="white" strokeWidth="1" />
                  ))}
                </g>

                {/* Muscle line (white) with pathLength animation */}
                <motion.path
                  d={muscleD}
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.9 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.05, ease }}
                />

                {/* Fat line (lime) with pathLength animation and glow */}
                <motion.path
                  d={fatD}
                  fill="none"
                  stroke="#84cc16"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.9 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.05, delay: 0.18, ease }}
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(132, 204, 22, 0.35))",
                  }}
                />

                {/* Animated dots with pulse effect */}
                <motion.circle
                  cx="100"
                  cy="120"
                  r="7"
                  fill="#84cc16"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, delay: 0.55, ease }}
                  style={{ filter: "drop-shadow(0 0 10px rgba(132, 204, 22, 0.5))" }}
                />
                <motion.circle
                  cx="400"
                  cy="240"
                  r="7"
                  fill="#84cc16"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, delay: 0.75, ease }}
                  style={{ filter: "drop-shadow(0 0 10px rgba(132, 204, 22, 0.5))" }}
                />
                <motion.circle
                  cx="400"
                  cy="80"
                  r="7"
                  fill="white"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: [1, 1.12, 1] }}
                  transition={{ duration: 0.6, delay: 0.65, ease }}
                  style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.25))" }}
                />
              </svg>

              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.35, ease }}
                className="absolute top-4 right-8 text-sm font-semibold text-white"
              >
                Massa muscular
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.6, ease }}
                className="absolute bottom-12 right-8 text-sm font-semibold bg-lime-500 text-black px-3 py-1 rounded"
              >
                % de gordura
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.85, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7, ease }}
                className="absolute top-[40%] left-16 bg-lime-500 text-black px-3 py-1 rounded font-semibold text-sm shadow-[0_0_18px_rgba(132,204,22,0.35)]"
              >
                2ª semana 🔥
              </motion.div>
            </div>
          </div>

          <div className="space-y-2 text-center text-sm text-gray-400">
            <p>*Baseado em dados de 1,3 milhões de treinos.</p>
            <p className="text-xs">
              *Gráfico ilustrativo baseado em dados de bem-estar auto-relatados. Resultados individuais podem variar.
            </p>
          </div>

          <Button
            onClick={() => {
              setShowQuickResults(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-lime-500 hover:bg-lime-600 text-black py-6 text-xl rounded-full font-bold transition-all duration-300 flex items-center justify-center gap-2"
          >
            Entendi
            <ArrowRight className="w-6 h-6" />
          </Button>
        </div>
      </div>
    )
  }

  if (showCortisolMessage && currentStep === 22) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <h2 className="text-3xl font-bold text-white text-center">Não é necessário se esforçar ao limite!</h2>

          <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            {/* Graph visualization */}
            <div className="relative h-64 mb-6">
              <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Cortisol line (white) going down */}
                <path
                  d="M 0,60 Q 100,50 200,80 Q 300,110 400,150"
                  stroke="white"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Testosterone line (orange) going up */}
                <path
                  d="M 0,120 Q 100,130 200,100 Q 300,70 400,40"
                  stroke="#f97316"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* End point indicators */}
                <circle cx="400" cy="150" r="6" fill="white" />
                <circle cx="400" cy="40" r="6" fill="#f97316" />
              </svg>
              {/* Labels */}
              <div className="absolute top-12 left-4 text-white text-sm font-semibold">Cortisol</div>
              <div className="absolute top-24 left-4 text-orange-500 text-sm font-semibold">Testosterona</div>
              <div className="absolute bottom-2 left-4 text-gray-400 text-xs">Agora</div>
              <div className="absolute bottom-2 right-4 text-gray-400 text-xs">6 meses</div>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-gray-300 text-lg leading-relaxed">
                Exercícios muito intensos podem aumentar seus níveis de cortisol e dificultar o ganho de massa muscular.
                Nosso programa personaliza seu plano para ajudá-lo a atingir seus objetivos sem exagerar.
              </p>
              <p className="text-gray-400 text-sm italic">*Baseado em dados de 1.3m treinos.</p>
            </div>
          </div>

          <button
            onClick={() => {
              console.log("[v0] Got it button clicked, continuing on step 22")
              setShowCortisolMessage(false)
              // The renderQuestion will handle showing the next step correctly (case 22)
            }}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white rounded-lg py-4 font-semibold transition-all shadow-lg"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }
  // </CHANGE>

  if (showMotivationMessage && currentStep === 19) {
    // Changed from 19 to 18 based on renumbering
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-start justify-center p-6 pt-16">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-lime-500 flex items-center justify-center bg-lime-900/30">
              <svg className="w-12 h-12 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white">Por que as pessoas desistem de se exercitar?</h3>

          <div className="space-y-6 text-lg text-gray-300">
            <p className="font-semibold text-white">O principal motivo é começar grande demais muito rapidamente.</p>

            <p>Você vai alcançar muito mais do que apenas algumas semanas de exercícios.</p>

            <p>
              Não prometemos resultados rápidos. O principal objetivo do nosso programa é mudar seu estilo de vida para
              melhor.
            </p>
          </div>

          <button
            onClick={() => {
              console.log("[v0] Entendi button clicked, hiding motivation and advancing")
              setShowMotivationMessage(false)
              // The renderQuestion will handle showing case 19 (additional goals) which is now case 19
            }}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white rounded-lg py-4 font-semibold transition-all shadow-lg"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }
  // </CHANGE>

  if (showGoalTimeline) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-center space-y-8 max-w-md">
          {isCalculatingGoal ? (
            <>
              {/* Loading state with animated spinner */}
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a4f" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset="62.8"
                    style={{
                      animation: "spinCircle 1.5s ease-in-out infinite",
                      filter: "drop-shadow(0 0 10px #06b6d4)",
                    }}
                  />
                </svg>
              </div>
              <p className="text-gray-300 text-lg">Baseado no seu perfil, você pode atingir seu objetivo em</p>
            </>
          ) : (
            <>
              {/* Result state */}
              <p className="text-gray-300 text-lg">Baseado no seu perfil, você pode atingir seu objetivo em</p>
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-lime-400/20 blur-3xl rounded-full" />
                <div className="relative">
                  <div className="text-8xl font-bold text-lime-400">{calculatedWeeks}</div>
                  <div className="text-3xl font-semibold text-lime-400 mt-2">semanas</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowGoalTimeline(false)
                  setIsCalculatingGoal(false)
                  setCalculatedWeeks(0)
                  setCurrentStep(27) // Adjusted to step 27 which is Email
                }}
                className="mt-8 bg-lime-500 hover:bg-lime-600 text-gray-900 font-bold py-4 px-12 rounded-full text-lg transition-colors"
              >
                Continuar
              </button>
            </>
          )}

          <style>{`
            @keyframes spinCircle {
              0% {
                stroke-dashoffset: 251.2;
                transform: rotate(0deg);
              }
              50% {
                stroke-dashoffset: 62.8;
                transform: rotate(180deg);
              }
              100% {
                stroke-dashoffset: 251.2;
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    )
  }
  // </CHANGE>

  if (showTimeCalculation) {
    const current = Number.parseFloat(quizData.weight)
    const target = Number.parseFloat(quizData.targetWeight)
    const isGaining = target > current

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-lime-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: "-10px",
                animation: `floatUp ${8 + Math.random() * 8}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
                opacity: Math.random() * 0.5 + 0.3,
              }}
            />
          ))}
        </div>
        {/* </CHANGE> */}

        <div className="text-center space-y-4 max-w-2xl relative z-10">
          <h2 className="text-xl md:text-3xl font-bold leading-tight">
            O último plano de que você precisará para <span className="text-lime-400">finalmente entrar em forma</span>
          </h2>

          <p className="text-gray-300 text-sm md:text-base">
            Com base em nossos cálculos, você atingirá seu peso ideal de {target} kg até
          </p>

          <div className="relative inline-block">
            <div className="absolute inset-0 bg-lime-400/20 blur-3xl rounded-full" />
            <div className="relative text-2xl md:text-4xl font-bold text-lime-400">{quizData.timeToGoal}</div>
          </div>

          <div className="relative w-full max-w-md mx-auto">
            <div
              className={`relative rounded-xl p-4 border border-lime-500/30 bg-[#0B0F10] shadow-[0_0_20px_rgba(132,204,22,0.15)]`}
            >
              {/* Weight labels */}
              <div
                className={`absolute ${isGaining ? "bottom-4 left-4" : "top-4 left-4"} bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium z-20`}
              >
                {current} kg
              </div>
              <div
                className={`absolute ${isGaining ? "top-4 right-4" : "bottom-4 right-4"} bg-lime-500 px-3 py-1.5 rounded-lg text-sm font-bold z-20`}
              >
                {target} kg
              </div>

              <svg viewBox="0 0 300 200" className="w-full h-auto relative z-10">
                <defs>
                  <filter id="limeGlow">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#84cc16" />
                  </filter>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#84CC16" />
                  </linearGradient>
                </defs>

                {/* Animated line - slowed down to 2.5s */}
                <polyline
                  stroke="url(#progressGradient)"
                  strokeWidth="4"
                  fill="none"
                  filter="url(#limeGlow)"
                  strokeDasharray="450"
                  strokeDashoffset="450"
                  style={{
                    animation: "madDraw 2.5s ease forwards",
                  }}
                  points={
                    isGaining
                      ? "10,150 70,140 130,120 180,100 230,75 280,55"
                      : "10,55 70,75 130,100 180,120 230,140 280,150"
                  }
                />

                {/* Fixed points - no animation */}
                {(isGaining
                  ? [
                      [70, 140],
                      [130, 120],
                      [180, 100],
                      [230, 75],
                      [280, 55],
                    ]
                  : [
                      [70, 75],
                      [130, 100],
                      [180, 120],
                      [230, 140],
                      [280, 150],
                    ]
                ).map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="6" fill="#84cc16" filter="url(#limeGlow)" />
                ))}
              </svg>
              {/* </CHANGE> */}

              {/* Side bars */}
              <div className="absolute left-0 top-5 bottom-5 w-[4px] bg-lime-500/15 rounded-full overflow-hidden">
                <div
                  className="bg-lime-500 w-full rounded-full"
                  style={{
                    animation: "madBar 1.3s cubic-bezier(.3,.8,.4,1) forwards",
                  }}
                />
              </div>
              <div className="absolute right-0 top-5 bottom-5 w-[4px] bg-lime-500/15 rounded-full overflow-hidden">
                <div
                  className="bg-lime-500 w-full rounded-full"
                  style={{
                    animation: "madBar 1.3s cubic-bezier(.3,.8,.4,1) forwards",
                    animationDelay: ".2s",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between text-xs md:text-sm text-gray-400">
            <span>{getCurrentDate()}</span>
            <span>{quizData.timeToGoal}</span>
          </div>

          <div className="bg-lime-500 hover:bg-lime-600 transition-colors rounded-full p-1 max-w-md mx-auto">
            <button
              onClick={() => {
                setShowTimeCalculation(false)
                setCurrentStep(currentStep + 1)
              }}
              className="w-full max-w-md mx-auto block bg-lime-500 hover:bg-lime-600 text-white py-3 px-8 text-lg font-semibold rounded-full transition-colors"
            >
              Entendi
            </button>
          </div>

          <style>{`
            @keyframes madDraw {
              to { stroke-dashoffset: 0; }
            }
            @keyframes madBar {
              from { height: 0%; }
              to { height: 100%; }
            }
            @keyframes floatUp {
              0% {
                transform: translateY(0) translateX(0);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(-100vh) translateX(${Math.random() * 40 - 20}px);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (showIMCResult) {
    const { imc, classification, status } = calculateIMC(
      Number.parseFloat(quizData.weight), // Use quizData.weight for IMC calculation
      Number.parseFloat(quizData.height),
    )

    const getIMCBodyImage = () => {
      const isWoman = quizData.gender === "mulher"
      const bodyType = quizData.bodyType

      if (!bodyType) {
        // Fallback to generic image if bodyType is not set
        return isWoman ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
      }

      switch (bodyType) {
        case "ectomorfo":
          return isWoman ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
        case "mesomorfo":
          return isWoman ? "/images/female-mesomorph-real-new.webp" : "/images/male-mesomorph-real-new.webp"
        case "endomorfo":
          return isWoman ? "/images/female-endomorph-real-new.webp" : "/images/male-endomorph-real-new.webp"
        default:
          return isWoman ? "/images/female-ectomorph-real-new.webp" : "/images/male-ectomorph-real-new.webp"
      }
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <img
            src={getIMCBodyImage() || "/placeholder.svg"}
            alt={`${quizData.bodyType} body type`}
            className="w-48 h-64 mx-auto object-contain"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg"
            }}
          />
          <h2 className="text-3xl font-bold">Resultado do seu IMC</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-300 text-lg mb-4">
              Calculamos o seu IMC e ele é de <span className="text-lime-400 font-bold">{imc}</span>
            </p>
            <p className="text-white text-xl mb-4">
              Você está com <span className="text-lime-400 font-bold">{classification}</span>
            </p>
          </div>
          <Button
            onClick={() => {
              setShowIMCResult(false)
              setShowSuccess(true)
            }}
            className="group relative"
          >
            {/* Botão principal */}
            <div className="relative px-16 py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
              <span className="relative z-10">Continuar</span>

              {/* Efeito de brilho animado */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
            </div>
          </Button>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-lg w-full">
          <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30 animate-in zoom-in duration-500">
            <CheckCircle className="h-16 w-16 text-white stroke-[3]" />
          </div>

          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Seu plano de treino personalizado está pronto!
            </h2>

            <button
              onClick={() => {
                setShowSuccess(false)
                router.push("/quiz/results")
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] animate-in fade-in duration-700 delay-500"
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
            className="w-full bg-lime-500 hover:bg-lime-600 text-white rounded-lg py-4 font-semibold transition-all shadow-lg"
          >
            Entendi
          </Button>
        </div>
      </div>
    )
  }

  if (showWaterCongrats) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 py-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 mx-auto relative">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl"></div>
            <div className="relative w-full h-full rounded-full border-4 border-cyan-500 flex items-center justify-center bg-cyan-500/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="w-10 h-10 text-cyan-500"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold">Uau! Impressionante!</h2>

          <p className="text-gray-300 text-sm">Você bebe mais água do que 95% dos usuários do Fitgoal.</p>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4">
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-lg font-semibold">Nível de Hidratação</h3>

              <div className="relative w-full max-w-[160px]">
                <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-cyan-400/40 bg-[#0B0F10] shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                  {/* Water level animation */}
                  <div
                    className="absolute bottom-0 left-0 w-full bg-cyan-400/40 transition-all duration-[1800ms] ease-out"
                    style={{
                      height: `${waterFill}%`,
                      clipPath: "url(#waveClip)",
                    }}
                  />

                  {/* Wave SVG */}
                  <svg className="absolute bottom-0 left-0 w-full h-full">
                    <defs>
                      <clipPath id="waveClip" clipPathUnits="objectBoundingBox">
                        <path d="M0,0.1 C0.15,0.08 0.35,0.12 0.5,0.1 C0.65,0.08 0.85,0.12 1,0.1 V1 H0 Z" fill="white">
                          <animate
                            attributeName="d"
                            dur="4s"
                            repeatCount="indefinite"
                            values="
                              M0,0.1 C0.15,0.08 0.35,0.12 0.5,0.1 C0.65,0.08 0.85,0.12 1,0.1 V1 H0 Z;
                              M0,0.12 C0.15,0.10 0.35,0.14 0.5,0.12 C0.65,0.10 0.85,0.14 1,0.12 V1 H0 Z;
                              M0,0.08 C0.15,0.06 0.35,0.10 0.5,0.08 C0.65,0.06 0.85,0.10 1,0.08 V1 H0 Z;
                              M0,0.1 C0.15,0.08 0.35,0.12 0.5,0.1 C0.65,0.08 0.85,0.12 1,0.1 V1 H0 Z
                            "
                          />
                        </path>
                      </clipPath>
                    </defs>
                  </svg>

                  {/* Glow line on water surface */}
                  <div
                    className="absolute w-full h-1 bg-cyan-300/60 shadow-[0_0_12px_rgba(34,211,238,0.8)] transition-all duration-[1800ms]"
                    style={{ bottom: `${waterFill}%` }}
                  />
                </div>

                <div className="text-center text-2xl mt-2 text-cyan-300 font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]">
                  {waterFill}%
                </div>
              </div>

              <p className="text-sm text-gray-300">acima da média</p>
            </div>
          </div>

          <p className="text-gray-500 text-xs">Baseado nos dados dos usuários do Fitgoal</p>

          <button
            onClick={() => {
              setShowWaterCongrats(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-8 rounded-2xl transition-colors text-base"
          >
            Continuar
          </button>
        </div>
      </div>
    )
  }

  const getBodyFatImage = () => {
    const isMale = quizData.gender === "homem"

    console.log(
      "[v0] getBodyFatImage called, gender:",
      quizData.gender,
      "isMale:",
      isMale,
      "bodyFat:",
      quizData.bodyFat,
    )
    // </CHANGE>

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
      const imagePath =
        quizData.bodyFat <= 10
          ? "/images/bodyfat-one.webp"
          : quizData.bodyFat <= 15
            ? "/images/bodyfat-two.webp"
            : quizData.bodyFat <= 20
              ? "/images/bodyfat-three.webp"
              : quizData.bodyFat <= 25
                ? "/images/bodyfat-four.webp"
                : quizData.bodyFat <= 30
                  ? "/images/bodyfat-five.webp"
                  : quizData.bodyFat <= 35
                    ? "/images/bodyfat-six.webp"
                    : quizData.bodyFat <= 39
                      ? "/images/bodyfat-seven.webp"
                      : "/images/bodyfat-eight.webp"

      console.log("[v0] Female image path:", imagePath)
      return imagePath
      // </CHANGE>
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return quizData.gender !== ""
      case 2:
        return quizData.bodyType !== ""
      case 3:
        return quizData.goal.length > 0
      case 4:
        return quizData.weightChangeType !== ""
      // </CHANGE>
      case 5: // Updated from 4
        return quizData.bodyFat !== 0
      case 6: // Updated from 5
        return quizData.problemAreas.length > 0
      case 7: // Updated from 6. Sweets Frequency
        return quizData.diet !== ""
      case 8: // Updated from 7. Alcohol Frequency
        return quizData.sugarFrequency.length > 0
      case 9: // Updated from 8. Water Intake
        return quizData.alcoholFrequency !== undefined && quizData.alcoholFrequency !== ""
      case 10: // Updated from 9. Age
        return quizData.waterIntake !== ""
      case 11: // Updated from 10. Height
        return quizData.age > 0
      case 12: // Updated from 11. Current Weight
        return quizData.height !== "" && normalizeHeight(quizData.height) !== ""
      case 13: // Updated from 12. Target Weight
        return quizData.weight !== ""
      case 14: // Updated from 13. Strength Training Experience
        return quizData.targetWeight !== ""
      case 15: // Updated from 14. Cardio Feeling
        return quizData.strengthTraining !== ""
      case 16: // Updated from 15. Strength Feeling
        return quizData.cardioFeeling !== ""
      case 17: // Updated from 16. Stretching Feeling
        return quizData.strengthFeeling !== ""
      case 18: // Updated from 17. Previous Problems
        return quizData.stretchingFeeling !== ""
      case 19: // Updated from 18. Additional Goals
        // Allow proceeding even if no previous problems are selected, as user can select "Não tenho"
        return true
      case 20: // Updated from 19. Equipment
        return quizData.additionalGoals.length > 0
      case 21: // Updated from 20. Workout Time
        return quizData.equipment.length > 0
      case 22: // Updated from 21. Food Preferences
        return quizData.workoutTime !== ""
      case 23: // Updated from 22. Allergies
        // Allow proceeding if "Let Mad Muscles Choose" is true or if at least one food preference is selected
        return quizData.letMadMusclesChoose || Object.values(quizData.foodPreferences).some((arr) => arr.length > 0)
      case 24: // Updated from 23. Allergy Details (only if allergies is 'sim')
        return quizData.allergies !== ""
      case 25: // Updated from 24. Supplement Interest
        return (quizData.allergies === "sim" && quizData.allergyDetails !== "") || quizData.allergies === "nao"
      case 26: // Updated from 25. Supplement Recommendation
        return quizData.wantsSupplement !== ""
      case 27: // Updated from 26. Name
        // This case is now for Supplement Interest, and we can always proceed to next step if we want to show recommendation.
        // The actual *choice* of supplement type was removed from the flow.
        return true // Always allow proceeding after seeing recommendation
      // </CHANGE>
      case 28: // Updated from 27. Email
        return quizData.name.trim() !== ""
      case 29: // Updated from 28. Training days per week
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return quizData.email !== "" && emailRegex.test(quizData.email)
      case 30: // Final submit
        return quizData.trainingDays !== ""

      // </CHANGE>
      default:
        return true
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="relative space-y-4 sm:space-y-8">
            <div className="relative z-10 text-center space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Qual o seu gênero?</h2>
            </div>
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 max-w-lg mx-auto">
              {[
                {
                  value: "homem",
                  label: "Homem",
                  icon: "/images/male-gender-icon.webp",
                },
                {
                  value: "mulher",
                  label: "Mulher",
                  icon: "/images/female-gender-icon.webp",
                },
              ].map((gender) => (
                <div
                  key={gender.value}
                  onClick={() => {
                    updateQuizData("gender", gender.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`backdrop-blur-sm rounded-lg p-4 sm:p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 sm:gap-4
                    ${
                      quizData.gender === gender.value
                        ? "border-2 border-lime-500 bg-lime-500/10"
                        : "border border-white/10 bg-white/5"
                    }`}
                >
                  <img
                    src={gender.icon || "/placeholder.svg"}
                    alt={gender.label}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                  />
                  <h3 className="text-lg sm:text-xl font-bold text-white">{gender.label}</h3>
                </div>
              ))}
            </div>
          </div>
        )

      case 2:
        const getBodyTypeImage = (type: string) => {
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
        }
        return (
          <div className="space-y-5 sm:space-y-8">
            <div className="text-center space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">Qual o seu tipo de Corpo?</h2>
            </div>
            <div className="space-y-3 sm:space-y-3 md:space-y-6">
              {[
                { value: "ectomorfo", label: "Ectomorfo", desc: "Corpo magro, dificuldade para ganhar peso" },
                { value: "mesomorfo", label: "Mesomorfo", desc: "Corpo atlético, facilidade para ganhar músculos" },
                { value: "endomorfo", label: "Endomorfo", desc: "Corpo mais largo, tendência a acumular gordura" },
              ].map((type) => (
                <div
                  key={type.value}
                  className={`backdrop-blur-sm rounded-lg p-4 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center justify-between gap-3 sm:gap-4
                    ${
                      quizData.bodyType === type.value
                        ? "border-2 border-lime-500 bg-lime-500/10"
                        : "border border-white/10 bg-white/5"
                    }`}
                  onClick={() => {
                    console.log("CLICADO:", type.value)
                    updateQuizData("bodyType", type.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                >
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">{type.label}</h3>
                    <p className="text-gray-400 text-sm sm:text-sm md:text-lg">{type.desc}</p>
                  </div>
                  <div className="flex-shrink-0 ml-3 sm:ml-4 md:ml-6">
                    <img
                      src={getBodyTypeImage(type.value) || "/placeholder.svg"}
                      alt={`${type.label} body type`}
                      className="w-auto h-24 sm:h-32 md:h-48 object-contain"
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

      case 3:
        const getGoalIcon = (goalValue: string) => {
          switch (goalValue) {
            case "perder-peso":
              return "/images/calories-icon.webp"
            case "ganhar-massa":
              return quizData.gender === "mulher" ? "/images/slim-body-icon.webp" : "/images/body-icon.webp"
            case "melhorar-saude":
              return "/images/better-health-icon.webp"
            case "aumentar-resistencia":
              return "/images/training-icon.webp"
            default:
              return "/placeholder.svg"
          }
        }
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">Quais são os seus objetivos?</h2>
              <p className="text-base sm:text-base text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-3 sm:space-y-3 md:space-y-4">
              {[
                { value: "perder-peso", label: "Perder peso e queimar gordura" },
                { value: "ganhar-massa", label: "Ganhar massa muscular e definir o corpo" },
                { value: "melhorar-saude", label: "Melhorar minha saúde, disposição e bem-estar" },
                { value: "aumentar-resistencia", label: "Aumentar a minha resistência física" },
              ].map((goal) => (
                <div
                  key={goal.value}
                  className={`backdrop-blur-sm rounded-lg p-4 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center gap-4 ${
                    quizData.goal.includes(goal.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5"
                  }`}
                  onClick={() => handleArrayUpdate("goal", goal.value, !quizData.goal.includes(goal.value))}
                >
                  <img
                    src={getGoalIcon(goal.value) || "/placeholder.svg"}
                    alt={goal.label}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">{goal.label}</h3>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Button onClick={nextStep} disabled={!canProceed()} className="group relative">
                <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                  <span className="relative z-10">Continuar</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                </div>
              </Button>
            </div>
          </div>
        )

      case 4: // Renamed from 3.5
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como o seu peso costuma mudar?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "gain-fast-lose-slow", label: "Ganho peso rápido, mas perco devagar" },
                { value: "gain-lose-easily", label: "Ganho e perco peso facilmente" },
                { value: "struggle-to-gain", label: "Tenho dificuldade para ganhar peso ou músculos" },
              ].map((option) => (
                <button
                  key={option.value}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.weightChangeType === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => {
                    updateQuizData("weightChangeType", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.weightChangeType === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.weightChangeType === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 5: // Renamed from 4
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu nível de gordura corporal?</h2>
            </div>
            <div className="relative flex flex-col items-center">
              {/* Body fat image */}
              <div className="relative w-64 h-80 mb-[-80px] z-10">
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-radial from-white/20 via-white/5 to-transparent blur-3xl" />

                <img
                  src={getBodyFatImage() || "/placeholder.svg"}
                  alt="Body fat representation"
                  className="relative w-full h-full object-contain transition-opacity duration-500"
                  onError={(e) => {
                    console.error("[v0] Image failed to load:", e.currentTarget.src)
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>

              {/* Slider container - now overlapping the image bottom */}
              <div className="relative max-w-md w-full px-4 z-20">
                <div className="bg-zinc-900/95 backdrop-blur-sm rounded-2xl px-6 py-6 space-y-4 border border-zinc-800/50">
                  {/* Tooltip above slider thumb showing current percentage */}
                  <div className="relative h-8">
                    <div
                      className="absolute bg-zinc-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 -translate-x-1/2 min-w-[80px] text-center whitespace-nowrap"
                      style={{
                        left: `${((quizData.bodyFat - 5) / 40) * 100}%`,
                        top: "-8px",
                      }}
                    >
                      {getBodyFatRange()}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-800" />
                    </div>
                  </div>

                  {/* Custom styled slider */}
                  <div className="relative">
                    <Slider
                      value={[quizData.bodyFat]}
                      onValueChange={(value) => updateQuizData("bodyFat", value[0])}
                      max={45}
                      min={5}
                      step={1}
                      className="w-full body-fat-slider"
                    />
                  </div>

                  {/* Min and max labels below slider */}
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>5-9%</span>
                    <span>{">40%"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <Button onClick={nextStep} disabled={!canProceed()} className="group relative disabled:opacity-50">
                <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                  <span className="relative z-10">Continuar</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                </div>
              </Button>
            </div>
          </div>
        )

      case 6: // Renamed from 5
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual área você quer focar mais?</h2>
            </div>
            <div className="relative flex flex-col items-center">
              <div
                className={`relative bg-transparent ${quizData.gender === "mulher" ? "w-52 h-[420px]" : "w-52 h-auto"}`}
              >
                <img
                  src={quizData.gender === "mulher" ? "/images/wbody.webp" : "/images/body.webp"}
                  alt="Corpo base"
                  className="w-full h-full object-contain relative z-10"
                  style={quizData.gender === "mulher" ? { mixBlendMode: "lighten" } : {}}
                />

                {/* MASCULINE PROBLEM AREAS */}
                {quizData.gender !== "mulher" &&
                  (quizData.problemAreas.includes("Peito") || quizData.problemAreas.includes("Tudo")) && (
                    <>
                      {/* Peitoral esquerdo */}
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
                      {/* Peitoral direito */}
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
                  (quizData.problemAreas.includes("Braços") || quizData.problemAreas.includes("Tudo")) && (
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
                  (quizData.problemAreas.includes("Barriga") || quizData.problemAreas.includes("Tudo")) && (
                    <>
                      {/* Abdômen superior esquerdo */}
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
                      {/* Abdômen superior direito */}
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
                      {/* Abdômen médio esquerdo */}
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
                      {/* Abdômen médio direito */}
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
                      {/* Abdômen inferior esquerdo */}
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
                      {/* Abdômen inferior direito */}
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
                  (quizData.problemAreas.includes("Pernas") || quizData.problemAreas.includes("Tudo")) && (
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
                  (quizData.problemAreas.includes("Peito") || quizData.problemAreas.includes("Tudo")) && (
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
                  (quizData.problemAreas.includes("Braços") || quizData.problemAreas.includes("Tudo")) && (
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
                  (quizData.problemAreas.includes("Barriga") || quizData.problemAreas.includes("Tudo")) && (
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
                  (quizData.problemAreas.includes("Pernas") || quizData.problemAreas.includes("Tudo")) && (
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

              {debugMode && (
                <div className="w-96 max-h-[600px] overflow-y-auto bg-gray-900/95 rounded-lg p-4 space-y-4 border border-purple-500">
                  <div className="flex justify-between items-center sticky top-0 bg-gray-900 pb-2 border-b border-purple-500">
                    <h3 className="text-lg font-bold text-white">
                      Ajustar Marcações ({quizData.gender === "mulher" ? "Feminino" : "Masculino"})
                    </h3>
                    <button
                      onClick={copyDebugValues}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Copiar Valores
                    </button>
                  </div>

                  {Object.entries(debugValues)
                    .filter(([key]) => (quizData.gender === "mulher" ? !key.startsWith("m_") : key.startsWith("m_")))
                    .map(([key, values]) => (
                      <div key={key} className="space-y-2 border-b border-gray-700 pb-3">
\
