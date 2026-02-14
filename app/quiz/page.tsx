"use client"

import { useState, useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { Slider } from "@/components/ui/slider"

import { Textarea } from "@/components/ui/textarea"

import { ArrowLeft, CheckCircle, Droplets, X, Dumbbell, Clock } from "lucide-react"

import { AiOrb } from "@/components/ai-orb"

import { useRouter } from "next/navigation"

import { db, auth } from "@/lib/firebaseClient"

import { doc, setDoc, getDoc } from "firebase/firestore"

import { onAuthStateChanged, signInAnonymously } from "firebase/auth"

import { motion } from "framer-motion"

import { calculateScientificCalories } from "@/lib/calorieCalculator"

// Helper function to generate dynamic month labels based on goal date
const getGoalForecast = (currentWeight: string | number | undefined, targetWeight: string | number | undefined) => {
  const current = Number.parseFloat(String(currentWeight ?? 0))
  const target = Number.parseFloat(String(targetWeight ?? 0))

  if (isNaN(current) || isNaN(target) || current <= 0 || target <= 0) {
    return null
  }

  const weightDifference = Math.abs(current - target)
  const weeksNeeded = Math.ceil(weightDifference / 0.75) // 0.75 kg por semana

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + weeksNeeded * 7)

  return { targetDate, weeksNeeded }
}

const monthsPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const buildMonthlyTicks = (start: Date, end: Date): Date[] => {
  const ticks: Date[] = []
  const current = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)

  while (current <= last) {
    ticks.push(new Date(current))
    current.setMonth(current.getMonth() + 1)
  }

  return ticks
}

const generateChartMonthLabels = (currentWeight: string | number | undefined, targetWeight: string | number | undefined) => {
  const forecast = getGoalForecast(currentWeight, targetWeight)
  if (!forecast) {
    return ["jan", "fev", "mar", "abr", "mai"]
  }

  const startDate = new Date()
  startDate.setDate(1) // First day of current month

  const endDate = forecast.targetDate

  const ticks = buildMonthlyTicks(startDate, endDate)

  // Se temos muitos ticks, mostrar apenas alguns estratégicos
  let displayTicks: Date[] = []

  if (ticks.length <= 5) {
    displayTicks = ticks
  } else {
    // Mostrar: primeiro, último, e aproximadamente 3 intermediários
    displayTicks = [ticks[0]]
    const step = Math.floor((ticks.length - 1) / 4)
    for (let i = 1; i < ticks.length - 1; i += step) {
      if (i < ticks.length - 1) displayTicks.push(ticks[i])
    }
    displayTicks.push(ticks[ticks.length - 1])
  }

  return displayTicks.map((d, idx) => {
    const isLast = idx === displayTicks.length - 1
    const isFirstOfNewYear = idx > 0 && d.getFullYear() !== displayTicks[idx - 1].getFullYear()
    const month = monthsPt[d.getMonth()]
    const year = d.getFullYear()

    if (isLast || isFirstOfNewYear) {
      return `${month}\n${year}`
    }
    return month
  })
}

// Helper component for AnimatedPercentage
const AnimatedPercentage = ({ targetPercentage = 100, duration = 8, onPercentageChange }) => {
  const [percentage, setPercentage] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)

      let eased
      if (progress < 0.83) {
        // Até 83%: easeOutQuad normal
        eased = 1 - Math.pow(1 - progress / 0.83, 2)
        eased = eased * 0.83
      } else {
        // De 83% a 100%: easeOutCubic mais lento
        const remainingProgress = (progress - 0.83) / 0.17
        eased = 0.83 + (1 - Math.pow(1 - remainingProgress, 3)) * 0.17
      }

      const currentPercentage = Math.floor(eased * targetPercentage)
      setPercentage(currentPercentage)

      if (onPercentageChange) {
        onPercentageChange(currentPercentage)
      }

      if (progress >= 1) {
        clearInterval(interval)
        setPercentage(targetPercentage)
        if (onPercentageChange) {
          onPercentageChange(targetPercentage)
        }
      }
    }, 16)

    return () => clearInterval(interval)
  }, [targetPercentage, duration, onPercentageChange])

  return <>{percentage}%</>
}

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
  heightUnit: "cm" | "inches" // Added specific type for heightUnit
  currentWeight: string
  targetWeight: string
  weightUnit: "kg" | "lbs" // Added specific type for weightUnit
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
  strengthTraining?: string
  weight: string // This seems redundant with currentWeight. Consider unifying.
  healthConditions: string[]
  supplement: string // This seems redundant with wantsSupplement. Consider unifying.
  sweetsFrequency: string[]
  cardioFeeling: string
  strengthFeeling: string
  stretchingFeeling: string
  trainingDays: string // This seems redundant with trainingDaysPerWeek. Consider unifying.
  previousProblems: string[]
  additionalGoals: string[]
  foodPreferences: {
    vegetables: string[]
    grains: string[]
    ingredients: string[]
    meats: string[]
    fruits: string[]
  }
  alcoholFrequency?: string
  trainingDays?: string // Added for slider in case 23
  letMadMusclesChoose?: boolean // Added for food preference step
}
// </CHANGE>

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
  recommendedSupplement: "",
  weightChangeType: "",
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
  trainingDaysPerWeek: 0,
  email: "",
  imc: 0,
  imcClassification: "",
  imcStatus: "",
  age: 0,
  weight: "", // Redundant, consider removing or unifying with currentWeight
  healthConditions: [], // Redundant with allergyDetails, consider unifying.
  supplement: "", // Redundant, consider unifying with wantsSupplement.
  sweetsFrequency: [], // This is likely meant to be sugarFrequency.
  cardioFeeling: "",
  strengthFeeling: "",
  stretchingFeeling: "",
  trainingDays: "", // Will be set by user selection in case 23
  previousProblems: [],
  additionalGoals: [],
  foodPreferences: {
    vegetables: [],
    grains: [],
    ingredients: [],
    meats: [],
    fruits: [],
  },
  alcoholFrequency: "",
  letMadMusclesChoose: false, // Default value for the new toggle
}

const debugDataFlow = (stage: string, data: any) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    stage,
    trainingFrequency: data?.trainingDays || "not found",
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
  const [showMotivationMessage, setShowMotivationMessage] = useState(false)
  const [showCortisolMessage, setShowCortisolMessage] = useState(false)
  // </CHANGE>
  const [currentStep, setCurrentStep] = useState(0) // Start at 0 for intro page
  const [debugChart, setDebugChart] = useState(false)
  const [musclePoints, setMusclePoints] = useState([
    { x: 0, y: 250 },
    { x: 133, y: 150 },
    { x: 266, y: 80 },
    { x: 400, y: 30 },
  ])
  const [fatPoints, setFatPoints] = useState([
    { x: 0, y: 50 },
    { x: 133, y: 150 },
    { x: 266, y: 220 },
    { x: 400, y: 270 },
  ])

  const [showQuickResults, setShowQuickResults] = useState(false)
  const [animateChart, setAnimateChart] = useState(false)

  const musclePathRef = useRef<SVGPathElement>(null)
  const fatPathRef = useRef<SVGPathElement>(null)
  const [pathLengths, setPathLengths] = useState({ muscle: 0, fat: 0 })

  useEffect(() => {
    if (showQuickResults) {
      const muscleLen = musclePathRef.current?.getTotalLength() ?? 0
      const fatLen = fatPathRef.current?.getTotalLength() ?? 0

      console.log("[v0] Initial pathLengths - muscle:", muscleLen, "fat:", fatLen)

      // If getTotalLength returns 0, retry after a small delay
      if (muscleLen === 0 || fatLen === 0) {
        setTimeout(() => {
          const retryMuscleLen = musclePathRef.current?.getTotalLength() ?? 468
          const retryFatLen = fatPathRef.current?.getTotalLength() ?? 440
          console.log("[v0] Retry pathLengths - muscle:", retryMuscleLen, "fat:", retryFatLen)
          setPathLengths({ muscle: retryMuscleLen, fat: retryFatLen })
        }, 100)
      } else {
        setPathLengths({ muscle: muscleLen, fat: fatLen })
      }
    }
  }, [showQuickResults])

  useEffect(() => {
    if (pathLengths.muscle > 0 && pathLengths.fat > 0) {
      setTimeout(() => {
        console.log("[v0] Animation triggered with pathLengths:", pathLengths)
        setAnimateChart(true)
      }, 200)
    }
  }, [pathLengths])

  const [quizData, setQuizData] = useState<QuizData>(initialQuizData) // Use initialQuizData
  const [showSuccess, setShowSuccess] = useState(false)
  const [showNutritionInfo, setShowNutritionInfo] = useState(false)
  const [showWaterCongrats, setShowWaterCongrats] = useState(false)
  const [showTimeCalculation, setShowTimeCalculation] = useState(false)
  const [showGoalTimeline, setShowGoalTimeline] = useState(false)
  const [calculatedWeeks, setCalculatedWeeks] = useState(0)
  const [isCalculatingGoal, setIsCalculatingGoal] = useState(false)
  // Micro feedback state
  const [microFeedback, setMicroFeedback] = useState<{
    title: string
    body: string
    cta?: string
    next: () => void
  } | null>(null)
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
    leg_upper_right: { top: 54, right: 40, width: 10, height: 14, rotate: 6 },
    leg_lower_right: { top: 72, right: 44, width: 6, height: 14, rotate: 9 },
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
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  const statuses = [
    { label: "Atributos Físicos", threshold: 20 },
    { label: "Nível de Fitness", threshold: 65 },
    { label: "Análise de Potencial", threshold: 78 },
    { label: "Geração de Dieta", threshold: 86 },
    { label: "Geração de Treino", threshold: 100 },
  ]

  const getMainTitle = () => {
    if (animatedPercentage < 30) return "Estamos\nanalisando\nseus dados"
    if (animatedPercentage < 60) return "Estamos\ncriando sua\ndieta"
    if (animatedPercentage < 80) return "Estamos\ncriando seu\ntreino"
    if (animatedPercentage < 95) return "Estamos\ncriando um plano\npersonalizado"
    return "Plano de\nmudança\ncompleto!"
  }
  // </CHANGE>

  const getStatusMessage = () => {
    if (animatedPercentage < 20) return "[Estamos analisando seus dados...]"
    if (animatedPercentage < 50) return "[Estamos criando sua dieta...]"
    if (animatedPercentage < 80) return "[Estamos criando seu treino...]"
    if (animatedPercentage < 98) return "[Estamos criando um plano personalizado...]"
    return "[Plano de mudança completo!]"
  }

  const isComplete = animatedPercentage === 100

  // </CHANGE>

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        // Salvar UID no localStorage para usar no checkout
        localStorage.setItem("clientUid", user.uid)
        console.log("[v0] Initializing clientUid from quiz:", user.uid)
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
          // Salvar UID anônimo no localStorage
          localStorage.setItem("clientUid", anonymousUser.user.uid)
          console.log("[v0] Signed in anonymously:", anonymousUser.user.uid)
          console.log("[v0] Initializing clientUid from quiz:", anonymousUser.user.uid)
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
          experience: data.strengthTraining, // Mapear strengthTraining para experience
          gender: data.gender,
          age: data.age,
          dietPreferences: data.diet,
          hasAllergies: data.allergies === "sim",
          waterIntake: data.waterIntake,
          workoutTime: data.workoutTime,
          equipment: data.equipment,
          trainingDaysPerWeek: Number.parseInt(data.trainingDays || "3"), // Ensure it's a number
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

  const saveLead = async () => {
    try {
      if (!currentUser || !currentUser.uid) {
        console.error("[v0] SAVE_LEAD - No user ID available")
        return
      }

      console.log("[v0] SAVE_LEAD - Starting to save lead for user:", currentUser.uid)
      setShowAnalyzingData(true)
      setAnalyzingStep(0)

      // Make API call to save lead with all quiz data
      const response = await fetch("/api/save-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          quizData: quizData,
          name: quizData.name,
          email: quizData.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] SAVE_LEAD - API error:", errorData)
        throw new Error(errorData.details || "Failed to save lead")
      }

      const result = await response.json()
      console.log("[v0] SAVE_LEAD - Success:", result)

      // Redirect to results after a short delay
      setTimeout(() => {
        router.push("/quiz/results")
      }, 500)
    } catch (error: any) {
      console.error("[v0] SAVE_LEAD - Error:", error.message)
      // Still redirect even if lead saving fails, as the quiz is complete
      setTimeout(() => {
        router.push("/quiz/results")
      }, 500)
    }
  }

  const nextStep = () => {
    // Handle specific step logic
    if (currentStep === 0) {
      // From intro, go to step 1
      setCurrentStep(1)
      return
    }
    if (currentStep === 3) {
      // Micro feedback #1 - after goals/objectives
      setMicroFeedback({
        title: "Perfeito. Agora ficou claro o seu objetivo.",
        body: "Muita gente falha porque segue treinos genéricos que não respeitam isso. Seu plano vai ser ajustado para os objetivos que você marcou.",
        cta: "Continuar",
        next: () => setCurrentStep(4),
      })
      return
    }
    if (currentStep === 5) {
      // Show quick results after case 5
      setShowQuickResults(true)
      return
    } else if (currentStep === 7) {
      // Show nutrition info after case 7
      setShowNutritionInfo(true)
      return
    } else if (currentStep === 15) {
      // Micro feedback #2 - after strength training (experience level)
      setMicroFeedback({
        title: "Ótimo. Vamos ajustar o nível do seu treino.",
        body: "Com isso, evitamos dois erros comuns: treino leve demais (sem resultado) ou pesado demais (lesão e abandono).",
        cta: "Continuar",
        next: () => setCurrentStep(16),
      })
      return
    } else if (currentStep === 19) {
      // Micro feedback #4 - after previous problems (emotional connection)
      setMicroFeedback({
        title: "Entendi. Isso é mais comum do que parece.",
        body: "Esses problemas normalmente acontecem por falta de um plano claro e ajustado ao nível da pessoa. Vamos evitar isso no seu.",
        cta: "Continuar",
        next: () => setCurrentStep(20),
      })
      return
    } else if (currentStep === 22) {
      // Micro feedback #3 - after workout time (routine/reality check)
      setMicroFeedback({
        title: "Boa. Seu plano precisa caber na sua rotina.",
        body: "Agora vamos ajustar frequência e estrutura para você conseguir seguir no dia a dia — sem plano impossível.",
        cta: "Continuar",
        next: () => setCurrentStep(23),
      })
      return
    } else if (currentStep === 24) {
      // Micro feedback #5 - after food preferences
      setMicroFeedback({
        title: "Perfeito. Vamos adaptar sua dieta ao que você gosta.",
        body: "Dietas falham quando ignoram suas preferências. Seu plano alimentar vai ser montado com base nisso — e você poderá ajustar depois.",
        cta: "Continuar",
        next: () => setCurrentStep(25),
      })
      return
    } else if (currentStep === 27) {
      // Micro feedback #6 - pre-offer (before name/email)
      setMicroFeedback({
        title: "Seu plano está quase pronto.",
        body: "Com base nas suas respostas, já conseguimos definir a estratégia ideal para o seu objetivo. Agora é só personalizar e liberar seus resultados.",
        cta: "Continuar",
        next: () => {
          // Original logic for supplement step
          if (quizData.wantsSupplement === "sim") {
            setCurrentStep(28)
          } else {
            setCurrentStep(29)
          }
        },
      })
      return
    } else if (currentStep === totalSteps) {
      // When reaching the final step, save the lead and redirect to results
      saveLead()
      return
    } else if (currentStep < totalSteps) {
      const nextStepNumber = currentStep + 1
      setCurrentStep(nextStepNumber)
    }
  }

  const prevStep = () => {
    if (currentStep === 0) {
      // Can't go back from intro page
      return
    }
    if (currentStep > 1) {
      // Handle specific step back navigation
      if (currentStep === 4 && microFeedback) {
        // Going back from objectives micro feedback
        setMicroFeedback(null)
        return
      }
      if (currentStep === 5 && microFeedback) {
        // Going back from strength training micro feedback
        setMicroFeedback(null)
        return
      }
      if (currentStep === 20 && microFeedback) {
        // Going back from problems micro feedback
        setMicroFeedback(null)
        return
      }
      if (currentStep === 23 && microFeedback) {
        // Going back from workout time micro feedback
        setMicroFeedback(null)
        return
      }
      if (currentStep === 25 && microFeedback) {
        // Going back from food preferences micro feedback
        setMicroFeedback(null)
        return
      }
      if (currentStep === 26 && quizData.allergies === "nao") {
        // If we are at allergy details (case 26) and allergies was 'no' (case 25)
        // we should go back to the supplement interest question (case 27, which follows this)
        // effectively skipping the allergy details step.
        setCurrentStep(25) // Go back to allergies question
      } else if (currentStep === 29 && quizData.wantsSupplement === "nao") {
        // If we are at email question (case 29) and supplement interest was 'no' (case 27)
        // we need to go back to the supplement interest question (case 27).
        setCurrentStep(27)
      } else if (currentStep === 27 && quizData.wantsSupplement === "sim") {
        // If we are at supplement interest (case 27) and wantsSupplement was 'yes', we should go back to case 26 (allergy details) if allergies were 'yes'
        // or back to case 25 (allergies) if allergies were 'no'
        if (quizData.allergies === "sim") {
          setCurrentStep(26) // Go back to allergy details
        } else {
          setCurrentStep(25) // Go back to allergies question
        }
      } else if (currentStep === 19 && showMotivationMessage) {
        // If motivation message was shown, go back to previous step before motivation message
        setShowMotivationMessage(false)
        // The logic to show motivation message is now tied to previousProblems being empty.
        // So if we are at step 19 (additional goals) and motivation message was shown, it means we came from step 18
        // where previousProblems was empty. So we should go back to step 18.
        setCurrentStep(18)
      } else if (currentStep === 22 && showCortisolMessage) {
        // Adding back navigation for cortisol message
        setShowCortisolMessage(false)
        setCurrentStep(21)
        // </CHANGE>
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true) // Set isSubmitting to true
    if (!currentUser || !currentUser.uid) {
      console.error("handleSubmit: No user ID available. Cannot save quiz data or generate plans.")
      alert("Erro: Não foi possível identificar o usuário. Tente novamente.")
      setIsSubmitting(false) // Reset isSubmitting
      return
    }

    try {
      // Use quizData.weight for IMC calculation as it's the most current weight input.
      const weightForIMC = Number.parseFloat(quizData.weight || "0")
      const heightForIMC = Number.parseFloat(quizData.height || "0")

      const { imc, classification, status } = calculateIMC(weightForIMC, heightForIMC)

      // Prepare updated quiz data before saving
      const updatedQuizData = {
        ...quizData,
        uid: currentUser.uid, // Adicionar UID explicitamente
        currentWeight: quizData.weight, // Add currentWeight for results page
        imc: imc,
        imcClassification: classification,
        imcStatus: status,
        calorieGoal: calculateScientificCalories(quizData), // Calculate and add calorie goal
        // </CHANGE> Renaming fields for consistency with the canProceed updates
        sweetsFrequency: quizData.sugarFrequency, // Use sweetsFrequency
        trainingDays: quizData.trainingDays, // Use trainingDays as string from slider
        trainingDaysPerWeek: Number(quizData.trainingDays ?? 5), // Add trainingDaysPerWeek synchronized with trainingDays
        cardioFeeling: quizData.exercisePreferences.cardio,
        strengthFeeling: quizData.exercisePreferences.pullups,
        stretchingFeeling: quizData.exercisePreferences.yoga,
        healthConditions: quizData.allergyDetails.length > 0 ? [quizData.allergyDetails] : [], // Convert allergyDetails to healthConditions array
        supplement: quizData.wantsSupplement, // Use supplement field
        previousProblems: quizData.previousProblems, // Include previousProblems
        letMadMusclesChoose: quizData.letMadMusclesChoose, // Include letMadMusclesChoose
      }
      setQuizData(updatedQuizData) // Atualiza o estado local

      try {
        localStorage.setItem("quizData", JSON.stringify(updatedQuizData))
        debugDataFlow("QUIZ_LOCALSTORAGE_SAVE", updatedQuizData)
      } catch (error) {
        console.error("[QUIZ] Storage failed:", error)
      }

      const userDocRef = doc(db, "users", currentUser.uid)
      const leadDocRef = doc(db, "leads", currentUser.uid)

      // Buscar documento existente para verificar se initialWeight já foi setado
      const existingUserDoc = await getDoc(userDocRef)
      const existingInitialWeight = existingUserDoc.data()?.quizData?.initialWeight

      // Se initialWeight não existe ainda, setá-lo com o weight do quiz (só uma vez!)
      const finalQuizData = {
        ...updatedQuizData,
        initialWeight: existingInitialWeight || updatedQuizData.weight, // Só seta uma vez!
      }

      await setDoc(
        userDocRef,
        {
          quizData: finalQuizData,
          email: updatedQuizData.email,
          name: updatedQuizData.name,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      await setDoc(
        leadDocRef,
        {
          quizData: finalQuizData,
          email: updatedQuizData.email,
          name: updatedQuizData.name,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      if (imc > 0) {
        setShowSuccess(true)
      }
    } catch (error) {
      console.error("handleSubmit: Erro no handleSubmit:", error)
      alert("Erro inesperado. Tente novamente.")
    } finally {
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

  const messages = [
    "Estamos analisando seus dados...",
    "Calculando suas necessidades fisiológicas...",
    "Ajustando seu plano ideal...",
  ]

  const showAnalyzingDataMessage = showAnalyzingData && analyzingStep < messages.length
  // </CHANGE>

  if (showQuickResults) {
    return (
      <motion.div
        className="
        min-h-screen text-white flex items-center justify-center px-4 py-10
        bg-gradient-to-b from-black to-gray-900
      "
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-2xl w-full space-y-8">
          {/* Header */}
          <motion.div
            className="text-center space-y-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold">Apenas 2 semanas para sentir os primeiros sinais</h1>
            <p className="text-gray-300 text-lg">
              Com base no seu perfil, estes são os resultados iniciais mais comuns
            </p>
          </motion.div>

          {/* Status Box */}
          <motion.div
            className="
            bg-gradient-to-br from-blue-950/40 via-purple-950/30 to-blue-950/40
            border border-blue-800/40
            rounded-3xl px-6 py-6 space-y-5 backdrop-blur-sm
          "
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            {/* Item 1 */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
                  <span className="text-green-400 text-lg">✓</span>
                </div>
                <span className="text-lg">Energia diária</span>
              </div>
              <span className="text-green-400 font-medium">↑ Estável</span>
            </motion.div>

            <div className="h-px bg-blue-800/30" />

            {/* Item 2 */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65, duration: 0.6 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                  <span className="text-red-400 text-lg">✓</span>
                </div>
                <span className="text-lg">Gordura corporal</span>
              </div>
              <span className="text-red-400 font-medium">↓ Em queda</span>
            </motion.div>

            <div className="h-px bg-blue-800/30" />

            {/* Item 3 */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.85, duration: 0.6 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center">
                  <span className="text-cyan-400 text-lg">✓</span>
                </div>
                <span className="text-lg">Corpo mais firme</span>
              </div>
              <span className="text-cyan-400 font-medium">↑ Ativando</span>
            </motion.div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            className="text-center space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.6 }}
          >
            <div className="flex justify-between text-sm text-gray-300 px-2">
              <span>Agora</span>
              <span>7 dias</span>
              <span className="text-white font-medium">14 dias</span>
            </div>

            <div className="relative h-1 bg-blue-900/40 rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-1
                         bg-gradient-to-r from-blue-600 to-cyan-400
                         rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "66%" }}
                transition={{ delay: 1.15, duration: 0.9, ease: "easeOut" }}
              />
            </div>

            <p className="text-sm text-gray-300">▲ primeiros sinais perceptíveis</p>
          </motion.div>

          {/* Proof */}
          <motion.p
            className="text-center text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.35, duration: 0.5 }}
          >
            *Estimativa baseada em mais de 1,3 milhão de treinos analisados
          </motion.p>

          {/* CTA */}
          <motion.button
            onClick={() => {
              setShowQuickResults(false)
              setCurrentStep(6)
            }}
            className="
            w-full h-16 text-xl font-bold text-black
            bg-white
            rounded-full shadow-lg
          "
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Continuar
          </motion.button>
        </div>
      </motion.div>
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

  if (showMotivationMessage && currentStep === 19) {
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
                  setCurrentStep(27) // Adjusted to step 27 which is Name
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

  if (showTimeCalculation) {
    const current = Number.parseFloat(quizData.weight)
    const target = Number.parseFloat(quizData.targetWeight)
    const isGaining = target > current
    const goalText = `${target} kg`

    // Y-axis labels (de cima para baixo: maior no topo, menor embaixo)
    const minWeight = Math.min(current, target)
    const maxWeight = Math.max(current, target)
    const weightRange = maxWeight - minWeight
    const step = weightRange / 6

    const yLabels = isGaining
      ? [target, target - step, target - step * 2, target - step * 3, target - step * 4, target - step * 5, current].map(v => Math.round(v * 10) / 10)
      : [current, current - step, current - step * 2, current - step * 3, current - step * 4, current - step * 5, target].map(v => Math.round(v * 10) / 10)

    // Gerar path suave - curva S baseada nos metadados
    const generateSmoothPath = () => {
      if (isGaining) {
        return "M 10 198 C 50 193, 80 175, 115 155 C 160 130, 195 105, 240 80 C 285 55, 315 35, 355 18 C 380 5, 395 0, 410 -2"
      } else {
        return "M 10 -2 C 50 5, 80 25, 115 45 C 160 70, 195 95, 240 120 C 285 145, 315 165, 355 180 C 380 193, 395 198, 410 200"
      }
    }

    return (
      <div
        className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-start pt-8 pb-6 px-6 relative"
      >
        {/* Main Content */}
        <div className="flex flex-col items-center w-full max-w-lg">
          {/* Title */}
          <h1
            className="text-3xl md:text-4xl font-bold text-center leading-tight mb-3"
            style={{
              color: '#e8dcc8',
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: '-0.02em',
              fontStyle: 'italic'
            }}
          >
            O último plano que você precisará<br />
            para entrar em forma
          </h1>

          {/* Prediction Text */}
          <p
            className="text-lg md:text-xl text-center mb-6"
            style={{ color: '#a8a090' }}
          >
            Com base em nossos cálculos, você atingirá o seu peso ideal de<br />
            <span className="font-bold" style={{ color: '#e8dcc8' }}>{target} kg</span> até <span className="font-bold" style={{ color: '#e8dcc8' }}>{quizData.timeToGoal}</span>*
          </p>

          {/* Chart Container with Y-axis labels */}
          <div
            className="w-full relative rounded-2xl"
            style={{
              backgroundColor: '#131619',
              border: '1px solid rgba(40, 45, 50, 0.6)',
              padding: '24px 16px 16px 16px'
            }}
          >
            <div className="flex">
              {/* Y-axis labels column */}
              <div
                className="flex flex-col justify-between pr-2"
                style={{
                  height: '210px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
                }}
              >
                {yLabels.map((label, i) => (
                  <span key={i} className="text-right" style={{ minWidth: '32px' }}>
                    {label}
                  </span>
                ))}
              </div>

              {/* SVG Chart area */}
              <div className="flex-1 relative">
                <svg
                  viewBox="0 -15 430 250"
                  className="w-full"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ height: '210px', overflow: 'visible' }}
                >
                  <defs>
                    {/* Gradiente da linha - laranja -> amarelo -> verde -> ciano */}
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="20%" stopColor="#fb923c" />
                      <stop offset="35%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#a3e635" />
                      <stop offset="70%" stopColor="#4ade80" />
                      <stop offset="85%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>

                    {/* Glow effect suave */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Grid horizontal lines - linhas sutis */}
                  {[0, 33, 66, 99, 132, 165, 198].map((y, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={y}
                      x2="415"
                      y2={y}
                      stroke="rgba(50, 55, 60, 0.4)"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Chart Line with gradient */}
                  <path
                    d={generateSmoothPath()}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    style={{
                      animation: "madDraw 2.5s ease forwards",
                    }}
                  />

                  {/* End point - white circle with cyan glow */}
                  <circle
                    cx="410"
                    cy={isGaining ? -2 : 200}
                    r="9"
                    fill="#ffffff"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.7))'
                    }}
                  />

                  {/* Goal Tooltip */}
                  <g>
                    {/* Tooltip background com bordas arredondadas */}
                    <rect
                      x="325"
                      y={isGaining ? 20 : 120}
                      width="75"
                      height="60"
                      rx="10"
                      ry="10"
                      fill="#323538"
                    />
                    {/* Tooltip arrow pointing up/down */}
                    <polygon
                      points={isGaining ? "355,20 365,7 375,20" : "355,180 365,193 375,180"}
                      fill="#323538"
                    />
                    {/* Tooltip text - Goal */}
                    <text
                      x="362"
                      y={isGaining ? 45 : 148}
                      fill="#b0b0b0"
                      fontSize="14"
                      fontWeight="500"
                      textAnchor="middle"
                      fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                    >Goal</text>
                    {/* Tooltip text - Weight value */}
                    <text
                      x="362"
                      y={isGaining ? 67 : 168}
                      fill="#ffffff"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                      dangerouslySetInnerHTML={{ __html: goalText }}
                    />
                  </g>
                </svg>

                {/* X-axis labels */}
                <div
                  className="flex justify-between mt-2 px-1"
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                >
                  {generateChartMonthLabels(quizData.currentWeight, quizData.targetWeight).map((label, i) => (
                    <span key={i} className={i === 4 ? "text-center leading-tight" : ""}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p
            className="text-xs text-center mt-4 px-4 leading-relaxed"
            style={{ color: '#6b7280' }}
          >
            *Baseado nos nossos cálculos e nos resultados de nossos usuários.<br />
            Consulte seu médico antes. O gráfico é uma ilustração<br />
            não personalizada e os resultdos podem variar.
          </p>
        </div>

        {/* Continue Button */}
        <div className="w-full max-w-lg mt-4">
          <button
            onClick={() => {
              setShowTimeCalculation(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full py-5 text-xl font-bold rounded-full transition-all duration-200 hover:opacity-90"
            style={{
              backgroundColor: '#f5f0e8',
              color: '#0d0d0d'
            }}
          >
            Continuar
          </button>
        </div>

        <style>{`
        @keyframes madDraw {
          from { stroke-dasharray: 700; stroke-dashoffset: 700; }
          to { stroke-dasharray: 700; stroke-dashoffset: 0; }
        }
      `}</style>
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
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        {/* Progress Bar */}
        <div className="w-full max-w-2xl mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-full max-w-lg h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm">ANALISANDO SEU CORPO – 81% CONCLUÍDO</p>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-2xl space-y-8 text-center">
          {/* Glowing Gradient Circle */}
          <div className="flex justify-center mb-8">
            <AiOrb size={190} />
          </div>

          {/* Title */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              SEU MAIOR GARGALO
              <br />
              NÃO É O TREINO
            </h2>
            <p className="text-gray-300 text-lg">Nutrição influencia 81% do seu resultado</p>
          </motion.div>

          {/* Insight Cards */}
          <div className="space-y-4 mt-8">
            <motion.div
              className="flex items-start space-x-4 border border-gray-700/50 rounded-2xl p-6 bg-gray-800/30 backdrop-blur-sm hover:border-cyan-500/30 transition-all"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-green-500">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-white text-left text-base sm:text-lg">
                  {quizData.bodyType === "endomorfo" 
                    ? "O excesso calórico está travando seus resultados"
                    : "Seu corpo não recebe calorias suficientes para crescer"
                  }
                </p>
              </div>
            </motion.div>

            <motion.div
              className="flex items-start space-x-4 border border-gray-700/50 rounded-2xl p-6 bg-gray-800/30 backdrop-blur-sm hover:border-cyan-500/30 transition-all"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-green-500">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-white text-left text-base sm:text-lg">
                  A baixa ingestão de proteína hoje limita sua recuperação muscular
                </p>
              </div>
            </motion.div>
          </div>

          {/* CTA Button */}
          <motion.button
            onClick={() => {
              setShowNutritionInfo(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Continuar
          </motion.button>

          {/* Footer text */}
          <motion.p
            className="text-gray-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            Leva menos de 1 minuto
          </motion.p>
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

          <button
            onClick={() => {
              setShowWaterCongrats(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </button>

          <p className="text-gray-500 text-xs">Baseado nos dados dos usuários do Fitgoal</p>
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

      return imagePath
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
      case 23:
        return quizData.trainingDays !== ""
      case 24: // Updated from 22. Allergies
        // Allow proceeding if "Let Mad Muscles Choose" is true or if at least one food preference is selected
        return quizData.letMadMusclesChoose || Object.values(quizData.foodPreferences).some((arr) => arr.length > 0)
      case 25: // Updated from 23. Allergy Details (only if allergies is 'sim')
        return quizData.allergies !== ""
      case 26: // Updated from 24. Supplement Interest
        return (quizData.allergies === "sim" && quizData.allergyDetails !== "") || quizData.allergies === "nao"
      case 27: // Updated from 25. Supplement Recommendation
        return quizData.wantsSupplement !== ""
      case 28: // Updated from 27. Email
        return quizData.name.trim() !== ""
      case 29: // Updated from 28. Training days per week
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return quizData.email !== "" && emailRegex.test(quizData.email)
      case 30: // Final submit
        // Training days per week is now handled by step 23.
        // This step is now the final submit.
        return true

      // </CHANGE>
      default:
        return true
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        // Intro page
        return (
          <div className="relative space-y-8 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="relative z-10 text-center space-y-6 max-w-2xl">
              <div className="mb-8">
                <AiOrb size={120} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                Vamos criar <span className="text-lime-400">um plano realmente feito para você</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                As próximas perguntas servem para evitar erros comuns como:
              </p>

              <div className="space-y-3 text-left max-w-lg mx-auto">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-lime-400 flex-shrink-0" />
                  <p className="text-base text-gray-200 font-medium">Treinos ineficientes</p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-lime-400 flex-shrink-0" />
                  <p className="text-base text-gray-200 font-medium">Dietas que não funcionam</p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-lime-400 flex-shrink-0" />
                  <p className="text-base text-gray-200 font-medium">Falta de resultados mesmo treinando</p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-gray-400 italic pt-4">
                Quanto <strong>mais preciso</strong> você for, mais eficaz será seu plano.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                ⏱️ Leva menos de 3 minutos
              </p>

              <button
                onClick={() => {
                  setCurrentStep(1)
                }}
                className="w-full max-w-md h-14 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-black text-lg font-bold rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 mt-8"
              >
                Começar
              </button>
            </div>
          </div>
        )

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
                    ${quizData.gender === gender.value
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
                    ${quizData.bodyType === type.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5"
                    }`}
                  onClick={() => {
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
                  className={`backdrop-blur-sm rounded-lg p-4 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center gap-4 ${quizData.goal.includes(goal.value)
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
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
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
                  onClick={() => {
                    updateQuizData("weightChangeType", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${quizData.weightChangeType === option.value
                    ? "border-2 border-lime-500 bg-lime-500/10"
                    : "border border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${quizData.weightChangeType === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
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

      case 5: // Updated from 4
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
            <div className="flex justify-center mt-8 max-w-2xl w-full mx-auto px-4">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual área você quer focar mais?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="relative flex items-start justify-center space-x-8">
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
                              onChange={(e) => updateDebugValue(key, "top", Number(e.target.value))}
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
                                onChange={(e) => updateDebugValue(key, "left", Number(e.target.value))}
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
                                onChange={(e) => updateDebugValue(key, "right", Number(e.target.value))}
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
                              onChange={(e) => updateDebugValue(key, "width", Number(e.target.value))}
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
                              onChange={(e) => updateDebugValue(key, "height", Number(e.target.value))}
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
                              onChange={(e) => updateDebugValue(key, "rotate", Number(e.target.value))}
                              className="w-48"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex flex-col space-y-4 max-w-md">
                {["Peito", "Braços", "Barriga", "Pernas", "Tudo"].map((area) => (
                  <div
                    key={area}
                    className={`rounded-lg p-6 cursor-pointer transition-all border-2 ${quizData.problemAreas.includes(area)
                      ? "border-lime-500 bg-lime-500/10 text-white"
                      : "bg-white/5 backdrop-blur-sm border-white/10 hover:border-lime-500"
                      }`}
                    onClick={() => handleArrayUpdate("problemAreas", area, !quizData.problemAreas.includes(area))}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{area}</h3>
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${quizData.problemAreas.includes(area) ? "bg-white border-white" : "border-white/30"
                          }`}
                      >
                        {quizData.problemAreas.includes(area) && <CheckCircle className="h-4 w-4 text-lime-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 7: // Updated from 5
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Você segue alguma dessas dietas?</h2>
            </div>
            <div className="space-y-2 sm:space-y-4">
              {[
                { value: "vegetariano", label: "Vegetariano", desc: "Exclui carne", icon: "🌱" },
                { value: "vegano", label: "Vegano", desc: "Exclui todos os produtos de origem animal", icon: "🌿" },
                { value: "keto", label: "Keto", desc: "Baixo teor de carboidratos e alto teor de gordura", icon: "🥑" },
                {
                  value: "mediterraneo",
                  label: "Mediterrâneo",
                  desc: "Rico em alimentos à base de plantas",
                  icon: "🫒",
                },
              ].map((diet) => (
                <div
                  key={diet.value}
                  className={`backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 border ${quizData.diet === diet.value
                    ? "border-2 border-lime-500 bg-lime-500/10"
                    : "border border-white/10 bg-white/5"
                    }`}
                  onClick={() => {
                    updateQuizData("diet", diet.value)
                    // SHOW NUTRITION INFO PAGE AFTER SELECTING A HEALTHY DIET
                    setTimeout(() => {
                      setShowNutritionInfo(true)
                    }, 300)
                  }}
                >
                  <span className="text-xl sm:text-2xl">{diet.icon}</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">{diet.label}</h3>
                    <p className="text-gray-400 text-sm sm:text-sm">{diet.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-3 sm:pt-4">
              <div
                className={`backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 border ${quizData.diet === "nao-sigo"
                  ? "border-2 border-red-500 bg-red-500/20"
                  : "border border-white/10 bg-white/5"
                  }`}
                onClick={() => {
                  updateQuizData("diet", "nao-sigo")
                  // SKIP NUTRITION INFO PAGE WHEN NOT FOLLOWING A DIET
                  setTimeout(() => nextStep(), 300)
                }}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />

                <h3 className="text-base sm:text-lg font-bold text-white">Não, não sigo dieta</h3>
              </div>
            </div>
          </div>
        )

      case 8: // Updated from 7
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Com que frequência você consome doces?</h2>
              <p className="text-gray-300">Selecione uma opção</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "esporadicamente", label: "Às vezes", icon: "🍬" },
                { value: "com-frequencia", label: "Com frequência", icon: "🍭" },
                { value: "todos-dias", label: "Todos os dias", icon: "🍫" },
                { value: "nao-consumo", label: "Não consumo", icon: "🚫" },
              ].map((freq) => (
                <div
                  key={freq.value}
                  className={`backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all border ${quizData.sugarFrequency.includes(freq.value)
                    ? "border-2 border-lime-500 bg-lime-500/10"
                    : "border border-white/10 bg-white/5"
                    }`}
                  onClick={() => {
                    updateQuizData("sugarFrequency", [freq.value])
                    setTimeout(() => nextStep(), 300)
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{freq.icon}</span>
                    <h3 className="text-lg font-bold text-white">{freq.label}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 9: // Updated from 8
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Com que frequência você consome álcool?</h2>
              <p className="text-gray-300">Selecione uma opção</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "esporadicamente", label: "Às vezes", icon: "🍻" },
                { value: "com-frequencia", label: "Com frequência", icon: "🥂" },
                { value: "todos-dias", label: "Todos os dias", icon: "🍷" },
                { value: "nao-consumo", label: "Não consumo", icon: "🚫" },
              ].map((freq) => (
                <div
                  key={freq.value}
                  className={`backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all border ${quizData.alcoholFrequency === freq.value
                    ? "border-2 border-lime-500 bg-lime-500/10"
                    : "border border-white/10 bg-white/5"
                    }`}
                  onClick={() => {
                    updateQuizData("alcoholFrequency", freq.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{freq.icon}</span>
                    <h3 className="text-lg font-bold text-white">{freq.label}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 10: // Updated from 9
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quantidade diária de água</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "menos-2", label: "Menos de 2 copos", desc: "até 0,5 l", icon: Droplets },
                { value: "2-6", label: "2-6 copos", desc: "0,5-1,5 l", icon: Droplets },
                { value: "6-10", label: "7-10 copos", desc: "1,5-2,5 l", icon: Droplets },
                { value: "mais-10", label: "Mais de 10 copos", desc: "mais de 2,5 l", icon: Droplets },
              ].map((water) => {
                const Icon = water.icon
                return (
                  <div
                    key={water.value}
                    className={`backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all border ${quizData.waterIntake === water.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5"
                      }`}
                    onClick={() => {
                      updateQuizData("waterIntake", water.value)
                      if (water.value === "6-10" || water.value === "mais-10") {
                        setTimeout(() => {
                          setShowWaterCongrats(true)
                          setWaterFill(water.value === "6-10" ? 75 : 90)
                        }, 300)
                      } else {
                        setTimeout(() => nextStep(), 300)
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{water.label}</h3>
                        <p className="text-sm text-gray-400">{water.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 11: // Updated from 10
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é a sua idade?</h2>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                type="number"
                inputMode="numeric"
                min="16"
                max="80"
                placeholder="Sua idade"
                value={quizData.age === 0 ? "" : quizData.age.toString()}
                onChange={(e) => updateQuizData("age", Number.parseInt(e.target.value) || 0)}
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 12: // Updated from 11
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é a sua altura?</h2>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Altura em metros (ex: 1.75 ou 1,75)"
                value={quizData.height}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d.,]/g, "")
                  setQuizData({ ...quizData, height: cleaned })
                }}
                onBlur={(e) => {
                  const normalized = normalizeHeight(e.target.value)
                  updateQuizData("height", normalized)
                }}
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 13: // Updated from 12
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu peso atual?</h2>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                type="number"
                placeholder="Peso atual em kg"
                value={quizData.weight}
                onChange={(e) => updateQuizData("weight", e.target.value)}
                min="1"
                max="500"
                step="0.1"
                inputMode="decimal"
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 14: // Updated from 13
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu objetivo de peso?</h2>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                type="number"
                placeholder="Meta de peso em kg"
                value={quizData.targetWeight}
                onChange={(e) => {
                  updateQuizData("targetWeight", e.target.value)
                }}
                onBlur={() => {
                  const calculatedTime = calculateTimeToGoal()
                  if (calculatedTime) {
                    updateQuizData("timeToGoal", calculatedTime)
                  }
                }}
                min="1"
                max="500"
                step="0.1"
                inputMode="decimal"
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>

            {/* Updated the continue button logic for this step */}
            <div className="flex justify-center mt-8">
              <button
                onClick={() => {
                  const calculatedTime = calculateTimeToGoal()
                  if (calculatedTime) {
                    updateQuizData("timeToGoal", calculatedTime)
                    setShowTimeCalculation(true)
                  } else {
                    nextStep()
                  }
                }}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 15: // Updated from 14
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual seu nível de experiência com treinos?</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  value: "beginner",
                  label: "Iniciante",
                  desc: "Menos de 6 meses de treino",
                  icon: <Dumbbell className="w-6 h-6 text-lime-500" />,
                },
                {
                  value: "intermediate",
                  label: "Intermediário",
                  desc: "6 meses a 2 anos de treino",
                  icon: <Dumbbell className="w-6 h-6 text-lime-500" />,
                },
                {
                  value: "advanced",
                  label: "Avançado",
                  desc: "Mais de 2 anos de treino",
                  icon: <Dumbbell className="w-6 h-6 text-lime-500" />,
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("strengthTraining", option.value)
                    setTimeout(() => nextStep(), 300) // Added setTimeout for smooth transition
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${quizData.strengthTraining === option.value
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/50"
                    }`}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0">{option.icon}</div>
                    <div className="text-left flex-1">
                      <h3 className="text-white font-medium">{option.label}</h3>
                      <p className="text-white/50 text-sm mt-1">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 16: // Updated from 15
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como você se sente com cardio?</h2>
            </div>
            <div className="flex justify-center mb-6">
              <ExerciseIllustration type="cardio" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { value: "love", label: "Gosto!" },
                { value: "neutral", label: "Neutro!" },
                { value: "avoid", label: "Não Gosto Muito!" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("cardioFeeling", option.value)
                    setTimeout(() => nextStep(), 300) // Added setTimeout for smooth transition
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${quizData.cardioFeeling === option.value
                    ? option.value === "avoid"
                      ? "border-red-500 bg-red-500/20"
                      : option.value === "neutral"
                        ? "border-yellow-500 bg-yellow-500/20"
                        : "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/10 backdrop-blur-sm"
                    }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 17: // Updated from 16
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como você se sente com flexões?</h2>
            </div>
            <div className="flex justify-center mb-6">
              <ExerciseIllustration type="pullups" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { value: "love", label: "Gosto!" },
                { value: "neutral", label: "Neutro!" },
                { value: "modify", label: "Não Gosto Muito!" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("strengthFeeling", option.value)
                    setTimeout(() => nextStep(), 300) // Added setTimeout for smooth transition
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${quizData.strengthFeeling === option.value
                    ? option.value === "modify"
                      ? "border-red-500 bg-red-500/20"
                      : option.value === "neutral"
                        ? "border-yellow-500 bg-yellow-500/20"
                        : "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/10 backdrop-sm"
                    }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 18: // Updated from 17
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como você se sente com alongamentos?</h2>
            </div>
            <div className="flex justify-center mb-6">
              <ExerciseIllustration type="yoga" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { value: "love", label: "Gosto!" },
                { value: "neutral", label: "Neutro!" },
                { value: "skip", label: "Não Gosto Muito!" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("stretchingFeeling", option.value)
                    setTimeout(() => nextStep(), 300) // Added setTimeout for smooth transition
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${quizData.stretchingFeeling === option.value
                    ? option.value === "skip"
                      ? "border-red-500 bg-red-500/20"
                      : option.value === "neutral"
                        ? "border-yellow-500 bg-yellow-500/20"
                        : "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/10 backdrop-blur-sm"
                    }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 19: // Updated from 18
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Você já enfrentou algum desses problemas em suas tentativas anteriores de entrar em forma?
              </h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "no-motivation", label: "Falta de motivação", icon: "�����" },
                { value: "no-plan", label: "Não tinha um plano claro", icon: "📅" },
                { value: "too-hard", label: "Meus treinos eram muito difíceis", icon: "🏋️" },
                { value: "bad-training", label: "Treinamento ruim", icon: "👤" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateQuizData(
                      "previousProblems",
                      quizData.previousProblems.includes(option.value)
                        ? quizData.previousProblems.filter((p) => p !== option.value)
                        : [...quizData.previousProblems, option.value],
                    )
                  }
                  className={`w-full p-4 rounded-lg border-2 transition-all ${quizData.previousProblems.includes(option.value)
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/50"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-left">{option.label}</span>
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center ${quizData.previousProblems.includes(option.value) ? "bg-white border-white" : "border-white/30"
                        }`}
                    >
                      {quizData.previousProblems.includes(option.value) && (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  updateQuizData("previousProblems", ["no-problems"])
                  setTimeout(() => nextStep(), 300)
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all ${quizData.previousProblems.includes("no-problems")
                  ? "border-red-500 bg-red-500/10"
                  : "border-white/10 bg-white/5 hover:border-red-500/50"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-left">Não, eu não tenho</span>
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${quizData.previousProblems.includes("no-problems")
                      ? "bg-red-500 border-red-500"
                      : "border-white/30"
                      }`}
                  >
                    {quizData.previousProblems.includes("no-problems") && <X className="h-4 w-4 text-white" />}
                  </div>
                </div>
              </button>
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 20: // Updated from 19
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Marque abaixo os seus objetivos adicionais:</h2>
              <p className="text-gray-400 text-sm">
                Temos certeza de que você deseja não apenas um corpo melhor, mas também melhorar seu estilo de vida.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { value: "better-sleep", label: "Melhorar o sono", icon: "😴" },
                { value: "feel-healthier", label: "Ter mais saúde", icon: "➕" },
                { value: "reduce-stress", label: "Reduzir o estresse", icon: "🧘" },
                { value: "increase-energy", label: "Ter mais energia", icon: "⚡" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateQuizData(
                      "additionalGoals",
                      quizData.additionalGoals.includes(option.value)
                        ? quizData.additionalGoals.filter((g) => g !== option.value)
                        : [...quizData.additionalGoals, option.value],
                    )
                  }
                  className={`w-full p-4 rounded-lg border-2 transition-all ${quizData.additionalGoals.includes(option.value)
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/50"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-left">{option.label}</span>
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center ${quizData.additionalGoals.includes(option.value) ? "bg-white border-white" : "border-white/30"
                        }`}
                    >
                      {quizData.additionalGoals.includes(option.value) && (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  updateQuizData("additionalGoals", ["none"])
                  setTimeout(() => nextStep(), 300)
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all ${quizData.additionalGoals.includes("none")
                  ? "border-red-500 bg-red-500/10"
                  : "border-white/10 bg-white/5 hover:border-red-500/50"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-left">Nenhuma das acima</span>
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${quizData.additionalGoals.includes("none") ? "bg-red-500 border-red-500" : "border-white/30"
                      }`}
                  >
                    {quizData.additionalGoals.includes("none") && <X className="h-4 w-4 text-white" />}
                  </div>
                </div>
              </button>
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 21: // Updated from 20
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Que equipamentos você tem acesso?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "gym", label: "Academia completa" },
                { value: "dumbbells", label: "Halteres" },
                { value: "bodyweight", label: "Apenas peso corporal" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateQuizData(
                      "equipment",
                      quizData.equipment.includes(option.value)
                        ? quizData.equipment.filter((e) => e !== option.value)
                        : [...quizData.equipment, option.value],
                    )
                  }
                  className={`w-full p-4 rounded-lg border-2 transition-all ${quizData.equipment.includes(option.value)
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/50"
                    }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 22: // Updated from 21
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Qual é o seu tempo disponível para treino?</h2>
              <p className="text-gray-300">Quanto tempo você pode dedicar por sessão?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  value: "15-30",
                  label: "15-30 minutos",
                  desc: "Treinos rápidos e eficientes",
                  icon: <Clock className="w-6 h-6 text-lime-500" />,
                },
                {
                  value: "30-45",
                  label: "30-45 minutos",
                  desc: "Tempo ideal para maioria dos treinos",
                  icon: <Clock className="w-6 h-6 text-lime-500" />,
                },
                {
                  value: "45-60",
                  label: "45-60 minutos",
                  desc: "Treinos completos e detalhados",
                  icon: <Clock className="w-6 h-6 text-lime-500" />,
                },
                {
                  value: "60+",
                  label: "Mais de 60 minutos",
                  desc: "Treinos extensos e avançados",
                  icon: <Clock className="w-6 h-6 text-lime-500" />,
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("workoutTime", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${quizData.workoutTime === option.value
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/5 hover:border-lime-500/50 backdrop-blur-sm"
                    }`}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0">{option.icon}</div>
                    <div className="text-left flex-1">
                      <h3 className="text-white font-medium">{option.label}</h3>
                      <p className="text-white/50 text-sm mt-1">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 23:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Quantos dias você irá treinar por semana?</h2>
              <p className="text-gray-300">Selecione de 1 a 7 dias</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-8">
                {/* Value display */}
                <div className="flex justify-center">
                  <div className="bg-white/10 rounded-full px-8 py-3">
                    <span className="text-xl md:text-2xl font-bold text-white">
                      {quizData.trainingDays || 5} {(quizData.trainingDays || 5) === "1" ? "dia" : "dias"}
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-4">
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={quizData.trainingDays || 5}
                    onChange={(e) => updateQuizData("trainingDays", Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #84cc16 0%, #84cc16 ${((Number.parseInt(quizData.trainingDays || 5) - 1) / 6) * 100}%, #374151 ${((Number.parseInt(quizData.trainingDays || 5) - 1) / 6) * 100}%, #374151 100%)`,
                    }}
                  />

                  {/* Labels */}
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>1 dia</span>
                    <span>7 dias</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-8">
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )

      case 24: // Updated from 22
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Escolha os produtos que você gosta.</h2>
              <p className="text-gray-300 text-sm">
                Vamos criar um plano alimentar com base nas suas preferências. Você sempre poderá ajustá-lo
                posteriormente.
              </p>
            </div>

            {/* Toggle switch */}
            <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <span className="text-white font-medium">Deixe que a FitGoal escolha.</span>
              <button
                onClick={() => updateQuizData("letMadMusclesChoose", !quizData.letMadMusclesChoose)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${quizData.letMadMusclesChoose ? "bg-lime-500" : "bg-gray-600"
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${quizData.letMadMusclesChoose ? "translate-x-7" : "translate-x-1"
                    }`}
                />
              </button>
            </div>

            {/* Food categories */}
            <div className="space-y-6">
              {/* Vegetables */}
              <div>
                <h3 className="text-white font-bold mb-3">Vegetais</h3>
                <div className="flex flex-wrap gap-2">
                  {["Brócolis", "Alface", "Cebola", "Pimentão", "Repolho", "Cenoura", "Tomate"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.vegetables
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, vegetables: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${quizData.foodPreferences.vegetables.includes(item)
                        ? "border-lime-500 bg-lime-500/10 text-white"
                        : "border-gray-300 bg-transparent text-white hover:bg-gray-300/10"
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grains */}
              <div>
                <h3 className="text-white font-bold mb-3">Grão</h3>
                <div className="flex flex-wrap gap-2">
                  {["Arroz", "Quinoa", "Cuscuz", "Fubá", "Farinha"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.grains
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, grains: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${quizData.foodPreferences.grains.includes(item)
                        ? "border-lime-500 bg-lime-500/10 text-white"
                        : "border-gray-300 bg-transparent text-white hover:bg-gray-300/10"
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="text-white font-bold mb-3">Ingredientes</h3>
                <div className="flex flex-wrap gap-2">
                  {["Abacate", "Feijões", "Ovos", "Aveia", "Granola", "Queijo", "Leite", "Leite vegetal"].map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() => {
                          const current = quizData.foodPreferences.ingredients
                          const updated = current.includes(item)
                            ? current.filter((i) => i !== item)
                            : [...current, item]
                          updateQuizData("foodPreferences", { ...quizData.foodPreferences, ingredients: updated })
                        }}
                        className={`px-4 py-2 rounded-full border-2 transition-all ${quizData.foodPreferences.ingredients.includes(item)
                          ? "border-lime-500 bg-lime-500/10 text-white"
                          : "border-gray-300 bg-transparent text-white hover:bg-gray-300/10"
                          }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  {/* </CHANGE> */}
                </div>
              </div>

              {/* Meats and Fish - Optional */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold">Carnes e peixes</h3>
                  <span className="text-gray-400 text-sm">Opcional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Carne moida", "Carne bovina", "Frango", "Carne de porco", "Peixe"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.meats
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, meats: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${quizData.foodPreferences.meats.includes(item)
                        ? "border-lime-500 bg-lime-500/10 text-white"
                        : "border-gray-300 bg-transparent text-white hover:bg-gray-300/10"
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fruits and Berries - Optional */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold">Frutas e bagas</h3>
                  <span className="text-gray-400 text-sm">Opcional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Maçã",
                    "Pera",
                    "Kiwi",
                    "Bananas",
                    "Caqui",
                    "Pêssego",
                    "Frutas vermelhas",
                    "Uva",
                    "Romã",
                    "Frutas tropicais (abacaxi, mamão, pitaya)",
                  ].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.fruits
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, fruits: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${quizData.foodPreferences.fruits.includes(item)
                        ? "border-lime-500 bg-lime-500/10 text-white"
                        : "border-gray-300 bg-transparent text-white hover:bg-gray-300/10"
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continue button */}
            <div className="flex justify-center">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 25: // Updated from 23
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Você possui alergias ou restrições alimentares?</h2>
            </div>
            <div className="space-y-4">
              <div
                className={`backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 border-2 hover:border-lime-400 ${quizData.allergies === "sim" ? "border-lime-500 bg-lime-500/10" : "border-white/10 bg-white/5"
                  }`}
                onClick={() => {
                  updateQuizData("allergies", "sim")
                  setTimeout(() => nextStep(), 300)
                }}
              >
                <CheckCircle
                  className={`h-6 w-6 flex-shrink-0 ${quizData.allergies === "sim" ? "text-lime-500" : "text-gray-500"}`}
                />
                <h3 className="text-lg font-bold text-white">Sim, possuo alergias ou restrições</h3>
              </div>
              <div
                className={`backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 border-2 hover:border-red-400 ${quizData.allergies === "nao" ? "border-red-500 bg-red-500/20" : "border-white/10 bg-white/5"
                  }`}
                onClick={() => {
                  updateQuizData("allergies", "nao")
                  setTimeout(() => setCurrentStep(27), 300)
                }}
              >
                <X
                  className={`h-6 w-6 flex-shrink-0 ${quizData.allergies === "nao" ? "text-red-500" : "text-gray-500"}`}
                />
                <h3 className="text-lg font-bold text-white">Não possuo alergias ou restrições</h3>
              </div>
            </div>
          </div>
        )

      case 26: // Updated from 24
        if (quizData.allergies !== "sim") {
          return null
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais são suas alergias ou restrições alimentares?</h2>
              <p className="text-gray-300">Descreva suas alergias, intolerâncias ou restrições alimentares</p>
            </div>
            <div className="space-y-6">
              <Textarea
                placeholder="Ex: Alergia a amendoim, intolerância à lactose, não como carne vermelha..."
                value={quizData.allergyDetails}
                onChange={(e) => updateQuizData("allergyDetails", e.target.value)}
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 27: // Updated from 25. Now Supplement Interest
        const shouldRecommendHipercalorico = () => {
          // Factor 1: Low IMC (underweight)
          if (quizData.imc && quizData.imc < 18.5) {
            return true
          }

          // Factor 2: Body type is ectomorph or "magro" (thin)
          if (quizData.bodyType === "ectomorfo" || quizData.bodyType === "magro") {
            return true
          }

          // Factor 3: Goal is to gain weight/muscle mass
          const hasGainGoal = quizData.goal?.some(
            (g) =>
              g.toLowerCase().includes("ganhar") ||
              g.toLowerCase().includes("massa") ||
              g.toLowerCase().includes("muscular"),
          )

          // Factor 4: Current weight is significantly lower than target weight
          const currentWeight = Number.parseFloat(quizData.currentWeight)
          const targetWeight = Number.parseFloat(quizData.targetWeight)

          if (currentWeight && targetWeight && hasGainGoal) {
            const weightDifference = targetWeight - currentWeight
            // If needs to gain more than 3kg, recommend hypercaloric
            if (weightDifference > 3) {
              return true
            }
          }

          // Factor 5: Difficulty gaining weight (weightChange)
          if (quizData.weightChangeType === "struggle-gain") {
            return true
          }

          return false
        }

        const supplementRecommendation = shouldRecommendHipercalorico()
          ? {
            name: "Hipercalórico Growth",
            description: "Ideal para ganho de massa muscular e atingir suas calorias diárias",
          }
          : {
            name: "Whey Protein",
            description: "Ideal para ganho de massa muscular e recuperação pós-treino",
          }

        const supplementType = shouldRecommendHipercalorico() ? "hipercalorico" : "whey-protein"

        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Podemos adicionar algum suplemento à sua dieta?
              </h2>
              <p className="text-gray-400">Por exemplo: Hipercalórico, Whey Protein...</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {/* Yes option with recommendation */}
              <button
                onClick={() => {
                  updateQuizData("wantsSupplement", "sim")
                  updateQuizData("recommendedSupplement", supplementRecommendation.name)
                  updateQuizData("supplementType", supplementType)
                  setTimeout(() => setCurrentStep(28), 300)
                }}
                className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-left ${quizData.wantsSupplement === "sim"
                  ? "border-lime-500 bg-lime-500/10"
                  : "border-white/20 bg-white/5 hover:border-lime-500/50"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${quizData.wantsSupplement === "sim" ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                  >
                    {quizData.wantsSupplement === "sim" && (
                      <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-white font-bold text-lg">Sim, pode adicionar</span>
                </div>
              </button>

              {/* No option */}
              <button
                onClick={() => {
                  updateQuizData("wantsSupplement", "nao")
                  updateQuizData("recommendedSupplement", "")
                  updateQuizData("supplementType", "")
                  setTimeout(() => setCurrentStep(28), 300)
                }}
                className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-left ${quizData.wantsSupplement === "nao"
                  ? "border-red-500 bg-red-500/10"
                  : "border-white/20 bg-white/5 hover:border-red-500/50"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${quizData.wantsSupplement === "nao" ? "border-red-500 bg-red-500/10" : "border-white/30"
                      }`}
                  >
                    {quizData.wantsSupplement === "nao" && (
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-white font-bold text-lg">Não, prefiro sem suplementos</span>
                </div>
              </button>

              {/* Recommendation box */}
              <div className="mt-6 p-6 rounded-xl border-2 border-lime-500/50 bg-lime-500/5">
                <p className="text-lime-400 font-bold text-lg mb-2">Recomendamos: {supplementRecommendation.name}</p>
                <p className="text-gray-300">{supplementRecommendation.description}</p>
              </div>
            </div>
          </div>
        )

      case 28: // Updated from 26. Now Name
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como podemos te chamar?</h2>
              <p className="text-gray-300">Seu nome para personalizar seu plano</p>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="Seu nome"
                value={quizData.name}
                onChange={(e) => updateQuizData("name", e.target.value)}
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 29: // Updated from 27. Email
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu e-mail?</h2>
              <p className="text-gray-300">Enviaremos seu plano para este e-mail</p>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="exemplo@email.com"
                type="email"
                value={quizData.email}
                onChange={(e) => updateQuizData("email", e.target.value)}
                className="
                w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500
                
                [--muted-foreground:theme(colors.gray.500)]
                "
              />
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Destravar meus resultados
              </button>
            </div>
          </div>
        )

      case 30: // Final Submit - Loading page with animated percentage
        return (
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
            {/* Compact Hero Section */}
            <div className="w-full max-w-sm flex flex-col items-center justify-center gap-3">
              {/* Percentage */}
              <div className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                <AnimatedPercentage targetPercentage={100} duration={8} onPercentageChange={setAnimatedPercentage} />
              </div>

              {/* Title */}
              <h2 className="text-base md:text-lg font-bold text-white text-center leading-tight whitespace-pre-wrap">
                {getMainTitle()}
              </h2>

              {/* Progress bar */}
              <div className="w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden mx-auto">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-100"
                  style={{ width: `${animatedPercentage}%` }}
                />
              </div>

              {/* Status message */}
              <p className="text-gray-500 text-xs">{getStatusMessage()}</p>

              {/* Status box - Compact */}
              <div className="w-full bg-gray-900/60 border border-gray-800/50 rounded-lg p-3 mt-1">
                <h3 className="text-white text-xs font-bold mb-2">Status</h3>
                <div className="space-y-1">
                  {statuses.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span
                        className={`text-xs transition-colors duration-300 ${animatedPercentage >= status.threshold ? "text-white font-medium" : "text-gray-500"
                          }`}
                      >
                        {status.label}
                      </span>
                      {animatedPercentage >= status.threshold && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer message */}
              <div className="text-center text-gray-600 text-xs mt-2">
                <p>Over 100,000+ Programs Gerados</p>
              </div>

              {isComplete && (
                <button
                  onClick={async () => {
                    await handleSubmit()
                    setTimeout(() => {
                      router.push("/quiz/results")
                    }, 500)
                  }}
                  className="w-full h-11 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-100 transition-colors shadow-lg mt-2"
                >
                  Continuar
                </button>
              )}
            </div>
          </div>
        )

      default:
        return true
    }
  }

  return (
    <div
      className="min-h-screen text-white p-6 relative overflow-hidden bg-[#0a0f1a]"
      style={{
        background: "radial-gradient(at center, #0f1419 0%, #0a0f1a 70%)",
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          width: "380px",
          height: "380px",
          background: "#1c3dff55",
          filter: "blur(150px)",
          borderRadius: "50%",
          top: "20%",
          right: "-10%",
        }}
      />

      <div
        className="absolute pointer-events-none"
        style={{
          width: "300px",
          height: "300px",
          background: "#7f3dff33",
          filter: "blur(140px)",
          borderRadius: "50%",
          bottom: "10%",
          left: "15%",
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <p className="text-gray-400">
              {currentStep === 0 ? "Início" : `${currentStep} de ${totalSteps}`}
            </p>
          </div>
          <div className="w-16" />
        </div>
        {currentStep > 0 && (
          <div className="w-full bg-white/10 backdrop-blur-sm rounded-full h-2 mb-8">
            <div
              className="bg-lime-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        )}

        {/* Micro Feedback Modal */}
        {microFeedback && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center mb-8">
            <div className="relative z-10 text-center space-y-6 max-w-2xl">
              <div className="mb-8">
                <AiOrb size={120} />
              </div>
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.7 }}
              >
                <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                  {microFeedback.title}
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  {microFeedback.body}
                </p>
              </motion.div>

              <button
                onClick={() => {
                  microFeedback.next()
                  setMicroFeedback(null)
                }}
                className="w-full max-w-md h-14 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-black text-lg font-bold rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 mt-8"
              >
                {microFeedback.cta || "Continuar"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">{!microFeedback && renderStep()}</div>
        {/* Adjust the condition to include steps that don't need a manual next button */}
        {!showMotivationMessage &&
          !showCortisolMessage &&
          !showTimeCalculation &&
          !showAnalyzingData &&
          !showNutritionInfo &&
          !microFeedback && // Added condition for micro feedback
          ![
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
            30,
          ].includes(currentStep) && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                size="lg"
                className="w-full max-w-md bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-black font-bold px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl rounded-full disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-200"
              >
                Continuar
              </Button>
            </div>
          )}
      </div>
    </div>
  )
}
