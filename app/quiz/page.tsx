"use client"

import { useState, useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { Slider } from "@/components/ui/slider"

import { Textarea } from "@/components/ui/textarea"

import { ArrowLeft, CheckCircle, X } from "lucide-react"

import { AiOrb } from "@/components/ai-orb"

import { useRouter } from "next/navigation"

import { db, auth } from "@/lib/firebaseClient"

import { doc, setDoc, getDoc } from "firebase/firestore"

import { onAuthStateChanged, signInAnonymously } from "firebase/auth"

import { motion } from "framer-motion"

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
  trainingDaysPerWeek: 3,
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
  trainingDays: "", // Redundant, consider unifying with trainingDaysPerWeek.
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
  trainingDays: "5", // Default value for the new slider
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
  const [currentStep, setCurrentStep] = useState(1)
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
      console.log("[v0] Auth state changed. User:", user ? user.uid.substring(0, 8) + "..." : "null")
      if (user) {
        setCurrentUser(user)
        // Se o usuário está logado (ou anônimo), tenta carregar dados de quiz existentes
        if (db) {
          const userDocRef = doc(db, "users", user.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists() && userDocSnap.data().quizData) {
            setQuizData(userDocSnap.data().quizData)
            console.log(
              "[v0] ✅ Loaded existing quiz data from /users collection for user:",
              user.uid.substring(0, 8) + "...",
              "Data keys:",
              Object.keys(userDocSnap.data().quizData || {}),
            )
          } else {
            console.log(
              "[v0] ℹ️ No existing quiz data found in /users collection for user:",
              user.uid.substring(0, 8) + "...",
            )
          }
        }
      } else {
        // Se nenhum usuário está logado, tenta fazer login anonimamente
        try {
          console.log("[v0] 🔄 No user found, signing in anonymously...")
          const anonymousUser = await signInAnonymously(auth)
          setCurrentUser(anonymousUser.user)
          console.log("[v0] ✅ Signed in anonymously:", anonymousUser.user.uid.substring(0, 8) + "...")
          // Tenta carregar dados de quiz para este usuário anônimo se existirem
          if (db) {
            const userDocRef = doc(db, "users", anonymousUser.user.uid)
            const userDocSnap = await getDoc(userDocRef)
            if (userDocSnap.exists() && userDocSnap.data().quizData) {
              setQuizData(userDocSnap.data().quizData)
              console.log(
                "[v0] ✅ Loaded existing quiz data from /users collection for anonymous user:",
                anonymousUser.user.uid.substring(0, 8) + "...",
                "Data keys:",
                Object.keys(userDocSnap.data().quizData || {}),
              )
            } else {
              console.log(
                "[v0] ℹ️ No existing quiz data found in /users collection for anonymous user:",
                anonymousUser.user.uid.substring(0, 8) + "...",
              )
            }
          }
        } catch (error) {
          console.error("[v0] ❌ Error signing in anonymously:", error)
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
      console.log("[v0] 💾 Starting to save quiz data for user:", userId.substring(0, 8) + "...")
      console.log("[v0] 📊 Data to save:", {
        hasQuizData: !!data,
        quizDataKeys: data ? Object.keys(data) : [],
        timestamp: new Date().toISOString(),
      })

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
      console.log("[v0] ✅ Quiz data saved to /users collection successfully:", userId.substring(0, 8) + "...")

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
          imc: data.imc,
          imcClassification: data.imcClassification,
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
          trainingDaysPerWeek: Number.parseInt(data.trainingDays || "3"),
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      )
      console.log(
        "[v0] ✅ Lead data saved to /leads collection successfully:",
        userId.substring(0, 8) + "...",
        "with email:",
        data.email,
      )

      console.log("[v0] 🚀 Calling /api/generate-plans-on-demand...")
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
    // Handle specific step logic
    if (currentStep === 5) {
      // Show quick results after case 5
      setShowQuickResults(true)
      return
    } else if (currentStep === 7) {
      // Show nutrition info after case 7
      setShowNutritionInfo(true)
      return
    } else if (currentStep === 27) {
      // Adjusted logic for supplement interest step
      if (quizData.wantsSupplement === "sim") {
        // If user wants supplement, proceed to the next step (Name)
        setCurrentStep(28)
      } else {
        // If user doesn't want supplement, skip to the Name step (which is now 28)
        setCurrentStep(29) // Skip to email
      }
      return
    } else if (currentStep < totalSteps) {
      const nextStepNumber = currentStep + 1
      setCurrentStep(nextStepNumber)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      // Handle specific step back navigation
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
        imc: imc,
        imcClassification: classification,
        imcStatus: status,
        // </CHANGE> Renaming fields for consistency with the canProceed updates
        sweetsFrequency: quizData.sugarFrequency, // Use sweetsFrequency
        trainingDays: quizData.trainingDays, // Use trainingDays as string from slider
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

      if (imc > 0) {
        setShowIMCResult(true)
      } else {
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
        bg-gradient-to-br from-blue-950/50 via-purple-950/30 to-blue-950/50
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

          <button
            onClick={() => {
              setShowTimeCalculation(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full h-16 bg-white text-black text-xl font-bold rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Entendi
          </button>

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
                  Seu corpo não recebe calorias suficientes para crescer
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
                  A ingestão de proteína hoje limita sua recuperação muscular
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
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.weightChangeType === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
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
                      {/* Coxa esquerda */}
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_leg_upper_left.top}%`,
                          left: `${debugValues.m_leg_upper_left.left}%`,
                          width: `${debugValues.m_leg_upper_left.width}%`,
                          height: `${debugValues.m_leg_upper_left.height}%`,
                          borderRadius: "45% 55% 55% 45%",
                          transform: `rotate(${debugValues.m_leg_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      {/* Panturrilha esquerda */}
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.m_leg_lower_left.top}%`,
                          left: `${debugValues.m_leg_lower_left.left}%`,
                          width: `${debugValues.m_leg_lower_left.width}%`,
                          height: `${debugValues.m_leg_lower_left.height}%`,
                          borderRadius: "50% 50% 45% 55%",
                          transform: `rotate(${debugValues.m_leg_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      {/* Coxa direita */}
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.m_leg_upper_right.top}%`,
                          right: `${debugValues.m_leg_upper_right.right}%`,
                          width: `${debugValues.m_leg_upper_right.width}%`,
                          height: `${debugValues.m_leg_upper_right.height}%`,
                          borderRadius: "55% 45% 45% 55%",
                          transform: `rotate(${debugValues.m_leg_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      {/* Panturrilha direita */}
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.m_leg_lower_right.top}%`,
                          right: `${debugValues.m_leg_lower_right.right}%`,
                          width: `${debugValues.m_leg_lower_right.width}%`,
                          height: `${debugValues.m_leg_lower_right.height}%`,
                          borderRadius: "50% 50% 55% 45%",
                          transform: `rotate(${debugValues.m_leg_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {/* FEMININE PROBLEM AREAS */}
                {quizData.gender === "mulher" &&
                  (quizData.problemAreas.includes("Peito") || quizData.problemAreas.includes("Tudo")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.chest_left.top}%`,
                          left: `${debugValues.chest_left.left}%`,
                          width: `${debugValues.chest_left.width}%`,
                          height: `${debugValues.chest_left.height}%`,
                          borderRadius: "50% 50% 45% 55%/55% 45% 60% 40%",
                          transform: `rotate(${debugValues.chest_left.rotate}deg)`,
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.chest_right.top}%`,
                          right: `${debugValues.chest_right.right}%`,
                          width: `${debugValues.chest_right.width}%`,
                          height: `${debugValues.chest_right.height}%`,
                          borderRadius: "50% 50% 55% 45%/45% 55% 40% 60%",
                          transform: `rotate(${debugValues.chest_right.rotate}deg)`,
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.3)",
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
                          borderRadius: "45% 55% 50% 50%/50% 50% 45% 55%",
                          transform: `rotate(${debugValues.arm_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.arm_lower_left.top}%`,
                          left: `${debugValues.arm_lower_left.left}%`,
                          width: `${debugValues.arm_lower_left.width}%`,
                          height: `${debugValues.arm_lower_left.height}%`,
                          borderRadius: "40% 60% 50% 50%/60% 40% 50% 50%",
                          transform: `rotate(${debugValues.arm_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 12px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.arm_upper_right.top}%`,
                          right: `${debugValues.arm_upper_right.right}%`,
                          width: `${debugValues.arm_upper_right.width}%`,
                          height: `${debugValues.arm_upper_right.height}%`,
                          borderRadius: "55% 45% 50% 50%/50% 50% 55% 45%",
                          transform: `rotate(${debugValues.arm_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.arm_lower_right.top}%`,
                          right: `${debugValues.arm_lower_right.right}%`,
                          width: `${debugValues.arm_lower_right.width}%`,
                          height: `${debugValues.arm_lower_right.height}%`,
                          borderRadius: "60% 40% 50% 50%/40% 60% 50% 50%",
                          transform: `rotate(${debugValues.arm_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 12px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}

                {quizData.gender === "mulher" &&
                  (quizData.problemAreas.includes("Barriga") || quizData.problemAreas.includes("Tudo")) && (
                    <>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.belly.top}%`,
                          left: `${debugValues.belly.left}%`,
                          width: `${debugValues.belly.width}%`,
                          height: `${debugValues.belly.height}%`,
                          borderRadius: "50% 50% 50% 50%",
                          boxShadow: "inset 0 0 20px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
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
                          borderRadius: "45% 55% 55% 45%",
                          transform: `rotate(${debugValues.leg_upper_left.rotate}deg)`,
                          boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.leg_lower_left.top}%`,
                          left: `${debugValues.leg_lower_left.left}%`,
                          width: `${debugValues.leg_lower_left.width}%`,
                          height: `${debugValues.leg_lower_left.height}%`,
                          borderRadius: "50% 50% 45% 55%",
                          transform: `rotate(${debugValues.leg_lower_left.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/95 animate-pulse"
                        style={{
                          top: `${debugValues.leg_upper_right.top}%`,
                          right: `${debugValues.leg_upper_right.right}%`,
                          width: `${debugValues.leg_upper_right.width}%`,
                          height: `${debugValues.leg_upper_right.height}%`,
                          borderRadius: "55% 45% 45% 55%",
                          transform: `rotate(${debugValues.leg_upper_right.rotate}deg)`,
                          boxShadow: "inset 0 0 25px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                      <div
                        className="absolute pointer-events-none z-20 bg-cyan-600/90"
                        style={{
                          top: `${debugValues.leg_lower_right.top}%`,
                          right: `${debugValues.leg_lower_right.right}%`,
                          width: `${debugValues.leg_lower_right.width}%`,
                          height: `${debugValues.leg_lower_right.height}%`,
                          borderRadius: "50% 50% 55% 45%",
                          transform: `rotate(${debugValues.leg_lower_right.rotate}deg)`,
                          boxShadow: "inset 0 0 15px rgba(0, 255, 255, 0.3)",
                        }}
                      ></div>
                    </>
                  )}
              </div>
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
              <Button
                onClick={() => {
                  handleArrayUpdate("problemAreas", "Peito", true)
                }}
                variant="outline"
                className="border-2 border-cyan-600 bg-transparent hover:bg-cyan-600/30 text-cyan-300"
              >
                Peito
              </Button>
              <Button
                onClick={() => {
                  handleArrayUpdate("problemAreas", "Braços", true)
                }}
                variant="outline"
                className="border-2 border-cyan-600 bg-transparent hover:bg-cyan-600/30 text-cyan-300"
              >
                Braços
              </Button>
              <Button
                onClick={() => {
                  handleArrayUpdate("problemAreas", "Barriga", true)
                }}
                variant="outline"
                className="border-2 border-cyan-600 bg-transparent hover:bg-cyan-600/30 text-cyan-300"
              >
                Barriga
              </Button>
              <Button
                onClick={() => {
                  handleArrayUpdate("problemAreas", "Pernas", true)
                }}
                variant="outline"
                className="border-2 border-cyan-600 bg-transparent hover:bg-cyan-600/30 text-cyan-300"
              >
                Pernas
              </Button>
              <Button
                onClick={() => {
                  handleArrayUpdate("problemAreas", "Tudo", true)
                }}
                variant="outline"
                className="border-2 border-cyan-600 bg-transparent hover:bg-cyan-600/30 text-cyan-300"
              >
                Tudo
              </Button>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como é a sua dieta atualmente?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "saudavel", label: "Saudável e equilibrada" },
                { value: "pouco-saudavel", label: "Pouco saudável, mas tento comer bem" },
                { value: "restritiva", label: "Restritiva ou com muitas restrições" },
                { value: "nao-sei", label: "Não sei / Não tenho uma dieta específica" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("diet", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.diet === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.diet === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.diet === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Com que frequência você consome doces?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "raramente", label: "Raramente (menos de 1 vez por semana)" },
                { value: "moderadamente", label: "Moderadamente (1-3 vezes por semana)" },
                { value: "frequentemente", label: "Frequentemente (4-6 vezes por semana)" },
                { value: "diariamente", label: "Diariamente (ou quase todos os dias)" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    handleArrayUpdate("sugarFrequency", option.value, !quizData.sugarFrequency.includes(option.value))
                    // Check if this is the only selected option, if so, proceed. Otherwise, allow multiple selections.
                    if (quizData.sugarFrequency.length === 0 || quizData.sugarFrequency.length === 1) {
                      // If it was the first or only selected, proceed.
                      setTimeout(() => nextStep(), 300)
                    }
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.sugarFrequency.includes(option.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.sugarFrequency.includes(option.value)
                          ? "border-lime-500 bg-lime-500"
                          : "border-white/30"
                      }`}
                    >
                      {quizData.sugarFrequency.includes(option.value) && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 9:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Com que frequência você consome bebidas alcoólicas?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "raramente", label: "Raramente (menos de 1 vez por mês)" },
                { value: "socialmente", label: "Socialmente (1-3 vezes por mês)" },
                { value: "frequentemente", label: "Frequentemente (1-3 vezes por semana)" },
                { value: "diariamente", label: "Diariamente (ou quase todos os dias)" },
                { value: "nunca", label: "Nunca bebo álcool" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("alcoholFrequency", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.alcoholFrequency === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.alcoholFrequency === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.alcoholFrequency === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 10:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quantos litros de água você bebe por dia?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "menos-1", label: "Menos de 1 litro" },
                { value: "1-2", label: "1 a 2 litros" },
                { value: "2-3", label: "2 a 3 litros" },
                { value: "mais-3", label: "Mais de 3 litros" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("waterIntake", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.waterIntake === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.waterIntake === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.waterIntake === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 11:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quantos anos você tem?</h2>
            </div>
            <div className="max-w-xs mx-auto">
              <Input
                type="number"
                placeholder="Sua idade"
                value={quizData.age === 0 ? "" : quizData.age}
                onChange={(e) => {
                  const age = Number.parseInt(e.target.value)
                  updateQuizData("age", isNaN(age) ? 0 : age)
                }}
                className="text-center text-2xl py-6 px-4 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500"
                min="1"
                max="100"
              />
            </div>
          </div>
        )

      case 12:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual a sua altura?</h2>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Input
                type="text" // Changed to text to allow for input like "1,75"
                placeholder="Ex: 175"
                value={quizData.height}
                onChange={(e) => updateQuizData("height", e.target.value)}
                className="text-center text-2xl py-6 px-4 w-32 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => updateQuizData("heightUnit", "cm")}
                  variant={quizData.heightUnit === "cm" ? "default" : "outline"}
                  className={`rounded-full ${
                    quizData.heightUnit === "cm" ? "bg-lime-500 text-black" : "border-white/20"
                  }`}
                >
                  cm
                </Button>
                <Button
                  onClick={() => updateQuizData("heightUnit", "inches")}
                  variant={quizData.heightUnit === "inches" ? "default" : "outline"}
                  className={`rounded-full ${
                    quizData.heightUnit === "inches" ? "bg-lime-500 text-black" : "border-white/20"
                  }`}
                >
                  in
                </Button>
              </div>
            </div>
          </div>
        )

      case 13:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual o seu peso atual?</h2>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Input
                type="number"
                placeholder="Ex: 70"
                value={quizData.weight}
                onChange={(e) => updateQuizData("weight", e.target.value)}
                className="text-center text-2xl py-6 px-4 w-32 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500"
                min="1"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => updateQuizData("weightUnit", "kg")}
                  variant={quizData.weightUnit === "kg" ? "default" : "outline"}
                  className={`rounded-full ${
                    quizData.weightUnit === "kg" ? "bg-lime-500 text-black" : "border-white/20"
                  }`}
                >
                  kg
                </Button>
                <Button
                  onClick={() => updateQuizData("weightUnit", "lbs")}
                  variant={quizData.weightUnit === "lbs" ? "default" : "outline"}
                  className={`rounded-full ${
                    quizData.weightUnit === "lbs" ? "bg-lime-500 text-black" : "border-white/20"
                  }`}
                >
                  lbs
                </Button>
              </div>
            </div>
          </div>
        )

      case 14:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual o seu peso alvo?</h2>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Input
                type="number"
                placeholder="Ex: 65"
                value={quizData.targetWeight}
                onChange={(e) => updateQuizData("targetWeight", e.target.value)}
                className="text-center text-2xl py-6 px-4 w-32 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500"
                min="1"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => updateQuizData("weightUnit", "kg")}
                  variant={quizData.weightUnit === "kg" ? "default" : "outline"}
                  className={`rounded-full ${
                    quizData.weightUnit === "kg" ? "bg-lime-500 text-black" : "border-white/20"
                  }`}
                >
                  kg
                </Button>
                <Button
                  onClick={() => updateQuizData("weightUnit", "lbs")}
                  variant={quizData.weightUnit === "lbs" ? "default" : "outline"}
                  className={`rounded-full ${
                    quizData.weightUnit === "lbs" ? "bg-lime-500 text-black" : "border-white/20"
                  }`}
                >
                  lbs
                </Button>
              </div>
            </div>
            <p className="text-center text-gray-400 text-sm">
              Você pode atingir seu objetivo em aproximadamente {calculateTimeToGoal()}
            </p>
            <button
              onClick={() => {
                setShowTimeCalculation(true)
              }}
              className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Entendi o Prazo
            </button>
          </div>
        )

      case 15:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como você avalia sua experiência com treino de força?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "iniciante", label: "Sou iniciante, nunca treinei" },
                { value: "intermediario", label: "Treino há alguns meses/anos, mas com pausas" },
                { value: "avancado", label: "Treino consistentemente há anos" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("experience", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.experience === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.experience === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.experience === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 16:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como você se sente em relação ao cardio?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "nao-gosto", label: "Não gosto muito, acho chato" },
                { value: "toleravel", label: "É tolerável, faço quando preciso" },
                { value: "gosto", label: "Gosto, me sinto bem fazendo" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateExercisePreference("cardio", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.exercisePreferences.cardio === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.exercisePreferences.cardio === option.value
                          ? "border-lime-500 bg-lime-500"
                          : "border-white/30"
                      }`}
                    >
                      {quizData.exercisePreferences.cardio === option.value && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 17:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Como você se sente em relação ao treino de força?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "nao-gosto", label: "Não gosto muito, acho pesado" },
                { value: "toleravel", label: "É tolerável, faço quando preciso" },
                { value: "gosto", label: "Gosto, sinto que me fortalece" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateExercisePreference("pullups", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.exercisePreferences.pullups === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.exercisePreferences.pullups === option.value
                          ? "border-lime-500 bg-lime-500"
                          : "border-white/30"
                      }`}
                    >
                      {quizData.exercisePreferences.pullups === option.value && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 18:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Como você se sente em relação à flexibilidade e mobilidade?
              </h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "nao-gosto", label: "Não gosto, acho lento e entediante" },
                { value: "toleravel", label: "É tolerável, mas não é minha prioridade" },
                { value: "gosto", label: "Gosto, sinto que melhora meu desempenho" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateExercisePreference("yoga", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.exercisePreferences.yoga === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.exercisePreferences.yoga === option.value
                          ? "border-lime-500 bg-lime-500"
                          : "border-white/30"
                      }`}
                    >
                      {quizData.exercisePreferences.yoga === option.value && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 19:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Você já teve algum problema ou lesão relacionada a treinos?
              </h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "lesao-joelho", label: "Lesão no joelho" },
                { value: "dor-costas", label: "Dor nas costas" },
                { value: "lesao-ombro", label: "Lesão no ombro" },
                { value: "tendinite", label: "Tendinite" },
                { value: "nenhum", label: "Nenhum problema anterior" },
              ].map((problem) => (
                <button
                  key={problem.value}
                  onClick={() => {
                    const isAlreadySelected = quizData.previousProblems.includes(problem.value)
                    let newProblems = [...quizData.previousProblems]

                    if (problem.value === "nenhum") {
                      if (isAlreadySelected) {
                        newProblems = newProblems.filter((p) => p !== "nenhum") // Remove 'nenhum' if already selected
                      } else {
                        newProblems = ["nenhum"] // Select 'nenhum' and remove others
                      }
                    } else {
                      if (isAlreadySelected) {
                        newProblems = newProblems.filter((p) => p !== problem.value)
                      } else {
                        newProblems = newProblems.filter((p) => p !== "nenhum") // Remove 'nenhum' if other problems are selected
                        newProblems.push(problem.value)
                      }
                    }
                    updateQuizData("previousProblems", newProblems)

                    // Trigger motivation message if 'nenhum' was selected and we are moving forward
                    if (problem.value === "nenhum" && !isAlreadySelected && newProblems.length === 1) {
                      setShowMotivationMessage(true)
                    } else {
                      setShowMotivationMessage(false) // Hide message if conditions not met
                    }

                    // Proceed to next step only if not showing the motivation message
                    if (!showMotivationMessage) {
                      setTimeout(() => nextStep(), 300)
                    }
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.previousProblems.includes(problem.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.previousProblems.includes(problem.value)
                          ? "border-lime-500 bg-lime-500"
                          : "border-white/30"
                      }`}
                    >
                      {quizData.previousProblems.includes(problem.value) && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg text-white">{problem.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                // Manually trigger next step if motivation message is handled or not applicable
                if (!showMotivationMessage) {
                  nextStep()
                }
              }}
              disabled={!canProceed() || quizData.previousProblems.length === 0} // Disable if no problems selected
              className="w-full h-16 text-xl font-bold text-black bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        )

      case 20:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Tem mais algum objetivo em mente?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "melhorar-postura", label: "Melhorar minha postura" },
                { value: "aumentar-flexibilidade", label: "Aumentar minha flexibilidade" },
                { value: "reduzir-estresse", label: "Reduzir o estresse" },
                { value: "mais-energia", label: "Ter mais energia no dia a dia" },
                { value: "nenhum-adicional", label: "Não tenho outros objetivos no momento" },
              ].map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => {
                    handleArrayUpdate("additionalGoals", goal.value, !quizData.additionalGoals.includes(goal.value))
                    if (goal.value === "nenhum-adicional" && !quizData.additionalGoals.includes(goal.value)) {
                      // If 'nenhum-adicional' is selected, clear other selections and proceed
                      setTimeout(() => {
                        updateQuizData("additionalGoals", ["nenhum-adicional"])
                        nextStep()
                      }, 300)
                    } else if (!quizData.additionalGoals.includes(goal.value)) {
                      // If a new goal is selected and 'nenhum-adicional' was present, remove it
                      if (quizData.additionalGoals.includes("nenhum-adicional")) {
                        updateQuizData(
                          "additionalGoals",
                          quizData.additionalGoals.filter((g) => g !== "nenhum-adicional"),
                        )
                      }
                      setTimeout(() => nextStep(), 300)
                    } else {
                      // If unchecking a goal
                      setTimeout(() => nextStep(), 300)
                    }
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.additionalGoals.includes(goal.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.additionalGoals.includes(goal.value)
                          ? "border-lime-500 bg-lime-500"
                          : "border-white/30"
                      }`}
                    >
                      {quizData.additionalGoals.includes(goal.value) && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg text-white">{goal.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 21:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quanto tempo você pode dedicar aos treinos por semana?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "1-2", label: "1 a 2 horas" },
                { value: "2-3", label: "2 a 3 horas" },
                { value: "3-4", label: "3 a 4 horas" },
                { value: "4-5", label: "4 a 5 horas" },
                { value: "5+", label: "Mais de 5 horas" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("workoutTime", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.workoutTime === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.workoutTime === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.workoutTime === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 22:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais equipamentos você tem acesso para treinar?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { value: "academia", label: "Academia completa" },
                { value: "peso-corporal", label: "Apenas peso corporal" },
                { value: "halteres", label: "Halteres e pesos livres" },
                { value: "elastics", label: "Elásticos e bandas de resistência" },
                { value: "maquinas", label: "Máquinas de musculação" },
                { value: "cardio", label: "Equipamentos de cardio (esteira, bike)" },
              ].map((equipment) => (
                <button
                  key={equipment.value}
                  onClick={() =>
                    handleArrayUpdate("equipment", equipment.value, !quizData.equipment.includes(equipment.value))
                  }
                  className={`backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-center ${
                    quizData.equipment.includes(equipment.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base sm:text-lg text-white font-semibold">{equipment.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 23:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quantos dias por semana você quer treinar?</h2>
            </div>
            <div className="flex justify-center w-full">
              <div className="max-w-lg w-full px-4">
                <Slider
                  value={[quizData.trainingDaysPerWeek]}
                  onValueChange={(value) => {
                    updateQuizData("trainingDaysPerWeek", value[0])
                    updateQuizData("trainingDays", value[0].toString()) // Also update trainingDays as string
                  }}
                  max={7}
                  min={1}
                  step={1}
                  className="w-full h-2"
                />
                <div className="mt-4 flex justify-between text-gray-400 text-sm font-medium">
                  <span>1 dia</span>
                  <span>{quizData.trainingDaysPerWeek} dias</span>
                  <span>7 dias</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 24:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Prefere que o MadMuscles escolha os ingredientes para você?
              </h2>
              <p className="text-gray-300">
                Se você responder "Sim", pularemos algumas perguntas sobre preferências alimentares.
              </p>
            </div>
            <div className="flex justify-center gap-8">
              <Button
                onClick={() => {
                  updateQuizData("letMadMusclesChoose", true)
                  setTimeout(() => nextStep(), 300)
                }}
                variant="outline"
                className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
                  quizData.letMadMusclesChoose
                    ? "border-lime-500 bg-lime-500/10 text-lime-400"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("letMadMusclesChoose", false)
                  setTimeout(() => nextStep(), 300)
                }}
                variant="outline"
                className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
                  !quizData.letMadMusclesChoose
                    ? "border-lime-500 bg-lime-500/10 text-lime-400"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Não
              </Button>
            </div>
          </div>
        )

      case 25:
        if (quizData.letMadMusclesChoose) {
          // Skip food preferences if 'letMadMusclesChoose' is true
          return (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-white text-2xl">Pulando preferências alimentares...</p>
            </div>
          )
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais tipos de vegetais você prefere?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { value: "brócolis", label: "Brócolis" },
                { value: "espinafre", label: "Espinafre" },
                { value: "couve-flor", label: "Couve-flor" },
                { value: "cenoura", label: "Cenoura" },
                { value: "tomate", label: "Tomate" },
                { value: "pimentão", label: "Pimentão" },
                { value: "abobrinha", label: "Abobrinha" },
                { value: "batata-doce", label: "Batata doce" },
              ].map((veg) => (
                <button
                  key={veg.value}
                  onClick={() =>
                    handleArrayUpdate(
                      "foodPreferences.vegetables",
                      veg.value,
                      !quizData.foodPreferences.vegetables.includes(veg.value),
                    )
                  }
                  className={`backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-center ${
                    quizData.foodPreferences.vegetables.includes(veg.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base sm:text-lg text-white font-semibold">{veg.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 26:
        if (quizData.letMadMusclesChoose) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-white text-2xl">Pulando preferências alimentares...</p>
            </div>
          )
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais tipos de grãos você prefere?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { value: "arroz-integral", label: "Arroz integral" },
                { value: "quinoa", label: "Quinoa" },
                { value: "aveia", label: "Aveia" },
                { value: "batata-doce", label: "Batata doce" },
                { value: "mandioca", label: "Mandioca" },
                { value: "pão-integral", label: "Pão integral" },
              ].map((grain) => (
                <button
                  key={grain.value}
                  onClick={() =>
                    handleArrayUpdate(
                      "foodPreferences.grains",
                      grain.value,
                      !quizData.foodPreferences.grains.includes(grain.value),
                    )
                  }
                  className={`backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-center ${
                    quizData.foodPreferences.grains.includes(grain.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base sm:text-lg text-white font-semibold">{grain.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 27:
        if (quizData.letMadMusclesChoose) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-white text-2xl">Pulando preferências alimentares...</p>
            </div>
          )
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais tipos de carnes/proteínas você prefere?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { value: "frango", label: "Frango" },
                { value: "carne-vermelha", label: "Carne vermelha magra" },
                { value: "peixe", label: "Peixe (salmão, tilápia)" },
                { value: "ovos", label: "Ovos" },
                { value: "proteina-vegetal", label: "Proteína vegetal (tofu, lentilha)" },
                { value: "iogurte", label: "Iogurte natural/proteico" },
              ].map((meat) => (
                <button
                  key={meat.value}
                  onClick={() =>
                    handleArrayUpdate(
                      "foodPreferences.meats",
                      meat.value,
                      !quizData.foodPreferences.meats.includes(meat.value),
                    )
                  }
                  className={`backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-center ${
                    quizData.foodPreferences.meats.includes(meat.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base sm:text-lg text-white font-semibold">{meat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 28:
        if (quizData.letMadMusclesChoose) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-white text-2xl">Pulando preferências alimentares...</p>
            </div>
          )
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais tipos de frutas você prefere?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { value: "banana", label: "Banana" },
                { value: "maca", label: "Maçã" },
                { value: "laranja", label: "Laranja" },
                { value: "morango", label: "Morango" },
                { value: "mirtilo", label: "Mirtilo" },
                { value: "uva", label: "Uva" },
                { value: "abacaxi", label: "Abacaxi" },
                { value: "melancia", label: "Melancia" },
              ].map((fruit) => (
                <button
                  key={fruit.value}
                  onClick={() =>
                    handleArrayUpdate(
                      "foodPreferences.fruits",
                      fruit.value,
                      !quizData.foodPreferences.fruits.includes(fruit.value),
                    )
                  }
                  className={`backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-center ${
                    quizData.foodPreferences.fruits.includes(fruit.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base sm:text-lg text-white font-semibold">{fruit.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 29: // This step now handles Allergies
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Você tem alguma alergia ou restrição alimentar?</h2>
            </div>
            <div className="flex justify-center gap-8">
              <Button
                onClick={() => {
                  updateQuizData("allergies", "sim")
                  setTimeout(() => nextStep(), 300)
                }}
                variant="outline"
                className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
                  quizData.allergies === "sim"
                    ? "border-lime-500 bg-lime-500/10 text-lime-400"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("allergies", "nao")
                  // Clear allergy details if not allergic
                  updateQuizData("allergyDetails", "")
                  setTimeout(() => nextStep(), 300)
                }}
                variant="outline"
                className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
                  quizData.allergies === "nao"
                    ? "border-lime-500 bg-lime-500/10 text-lime-400"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Não
              </Button>
            </div>
          </div>
        )

      case 30: // This step now handles Allergy Details (if 'sim')
        if (quizData.allergies === "nao") {
          // Skip if not allergic
          return (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-white text-2xl">Pulando detalhes de alergia...</p>
            </div>
          )
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quais são suas alergias ou restrições?</h2>
              <p className="text-gray-300">Descreva brevemente.</p>
            </div>
            <div className="max-w-lg mx-auto">
              <Textarea
                placeholder="Ex: Intolerante à lactose, alérgico a amendoim"
                value={quizData.allergyDetails}
                onChange={(e) => updateQuizData("allergyDetails", e.target.value)}
                className="text-center text-xl py-6 px-4 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500 h-32"
              />
            </div>
          </div>
        )

      case 31: // This step now handles Wants Supplement
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Você tem interesse em suplementos?</h2>
            </div>
            <div className="flex justify-center gap-8">
              <Button
                onClick={() => {
                  updateQuizData("wantsSupplement", "sim")
                  setTimeout(() => nextStep(), 300)
                }}
                variant="outline"
                className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
                  quizData.wantsSupplement === "sim"
                    ? "border-lime-500 bg-lime-500/10 text-lime-400"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("wantsSupplement", "nao")
                  // Clear supplement details if not interested
                  updateQuizData("supplementType", "")
                  updateQuizData("recommendedSupplement", "")
                  setTimeout(() => nextStep(), 300)
                }}
                variant="outline"
                className={`rounded-full px-8 py-4 text-lg font-bold transition-all ${
                  quizData.wantsSupplement === "nao"
                    ? "border-lime-500 bg-lime-500/10 text-lime-400"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Não
              </Button>
            </div>
          </div>
        )

      case 32: // This step handles Supplement Type (if 'sim')
        if (quizData.wantsSupplement === "nao") {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-white text-2xl">Pulando informações sobre suplementos...</p>
            </div>
          )
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Que tipo de suplemento você busca?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "ganho-massa", label: "Ganho de massa muscular" },
                { value: "definicao", label: "Definição muscular" },
                { value: "energia", label: "Mais energia e disposição" },
                { value: "recuperacao", label: "Melhorar recuperação pós-treino" },
                { value: "emagrecimento", label: "Auxiliar no emagrecimento" },
                { value: "nao-sei", label: "Não sei, me surpreenda!" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("supplementType", option.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                  className={`w-full backdrop-blur-sm rounded-lg p-5 sm:p-6 cursor-pointer transition-all text-left ${
                    quizData.supplementType === option.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        quizData.supplementType === option.value ? "border-lime-500 bg-lime-500" : "border-white/30"
                      }`}
                    >
                      {quizData.supplementType === option.value && <div className="w-3 h-3 rounded-full bg-white" />}
                    </div>
                    <span className="text-base sm:text-lg text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 33: // This step handles the user's name
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual o seu nome?</h2>
              <p className="text-gray-300">Precisamos dele para personalizar seu plano.</p>
            </div>
            <div className="max-w-xs mx-auto">
              <Input
                type="text"
                placeholder="Seu nome"
                value={quizData.name}
                onChange={(e) => updateQuizData("name", e.target.value)}
                className="text-center text-2xl py-6 px-4 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500"
              />
            </div>
          </div>
        )

      case 34: // This step handles the user's email
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">E qual o seu melhor e-mail?</h2>
              <p className="text-gray-300">Enviaremos seu plano para lá.</p>
            </div>
            <div className="max-w-xs mx-auto">
              <Input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={quizData.email}
                onChange={(e) => updateQuizData("email", e.target.value)}
                className="text-center text-2xl py-6 px-4 bg-white/5 border-white/10 placeholder:text-white/50 focus:ring-lime-500"
              />
            </div>
          </div>
        )

      // </CHANGE>
      default:
        return <div className="text-white text-center">Carregando passo...</div>
    }
  }

  const renderStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Gênero"
      case 2:
        return "Tipo de Corpo"
      case 3:
        return "Objetivos"
      case 4:
        return "Mudança de Peso"
      case 5:
        return "Gordura Corporal"
      case 6:
        return "Área de Foco"
      case 7:
        return "Dieta Atual"
      case 8:
        return "Consumo de Doces"
      case 9:
        return "Consumo de Álcool"
      case 10:
        return "Hidratação"
      case 11:
        return "Idade"
      case 12:
        return "Altura"
      case 13:
        return "Peso Atual"
      case 14:
        return "Peso Alvo"
      case 15:
        return "Experiência com Treino"
      case 16:
        return "Preferência: Cardio"
      case 17:
        return "Preferência: Força"
      case 18:
        return "Preferência: Flexibilidade"
      case 19:
        return "Histórico de Lesões"
      case 20:
        return "Objetivos Adicionais"
      case 21:
        return "Tempo Disponível"
      case 22:
        return "Equipamentos"
      case 23:
        return "Dias de Treino"
      case 24:
        return "Preferências Alimentares"
      case 25:
        return quizData.letMadMusclesChoose ? "Informações Adicionais" : "Vegetais"
      case 26:
        return quizData.letMadMusclesChoose ? "Informações Adicionais" : "Grãos"
      case 27:
        return quizData.letMadMusclesChoose ? "Informações Adicionais" : "Carnes/Proteínas"
      case 28:
        return quizData.letMadMusclesChoose ? "Informações Adicionais" : "Frutas"
      case 29: // Allergies
        return quizData.letMadMusclesChoose ? "Informações Adicionais" : "Alergias"
      case 30: // Allergy Details
        return quizData.letMadMusclesChoose || quizData.allergies === "nao"
          ? "Informações Adicionais"
          : "Detalhes da Alergia"
      case 31: // Wants Supplement
        return quizData.letMadMusclesChoose ||
          quizData.allergies === "nao" ||
          (quizData.allergies === "sim" && quizData.allergyDetails === "")
          ? "Informações Adicionais"
          : "Interesse em Suplementos"
      case 32: // Supplement Type
        return quizData.letMadMusclesChoose ||
          quizData.allergies === "nao" ||
          (quizData.allergies === "sim" && quizData.allergyDetails === "") ||
          quizData.wantsSupplement === "nao"
          ? "Informações Adicionais"
          : "Tipo de Suplemento"
      case 33: // Name
        return quizData.letMadMusclesChoose ||
          quizData.allergies === "nao" ||
          (quizData.allergies === "sim" && quizData.allergyDetails === "") ||
          quizData.wantsSupplement === "nao" ||
          (quizData.wantsSupplement === "sim" && quizData.supplementType === "")
          ? "Seu Nome"
          : "Informações Adicionais"
      case 34: // Email
        return quizData.letMadMusclesChoose ||
          quizData.allergies === "nao" ||
          (quizData.allergies === "sim" && quizData.allergyDetails === "") ||
          quizData.wantsSupplement === "nao" ||
          (quizData.wantsSupplement === "sim" && quizData.supplementType === "") ||
          quizData.name === ""
          ? "Seu E-mail"
          : "Informações Adicionais"
      default:
        return "Continuando..."
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-lime-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${6 + Math.random() * 6}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.4 + 0.2,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10vh) translateX(5vw); }
          50% { transform: translateY(-20vh) translateX(-5vw); }
          75% { transform: translateY(-10vh) translateX(5vw); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}</style>

      <div className="relative z-10 max-w-3xl w-full bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 space-y-8">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          {currentStep > 1 && (
            <button onClick={prevStep} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-8 h-8" />
            </button>
          )}
          <div className="flex-grow text-center">
            <p className="text-gray-400 font-medium">
              Passo {currentStep} de {totalSteps}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{renderStepTitle()}</h1>
          </div>
          <button onClick={() => setDebugMode(!debugMode)} className="text-white/70 hover:text-white transition-colors">
            {debugMode ? (
              <X className="w-8 h-8 text-red-500" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Debug Panel */}
        {debugMode && (
          <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-xs">
            <h3 className="font-bold mb-2">Debug Mode</h3>
            <p>Current Step: {currentStep}</p>
            <p>Quiz Data (partial):</p>
            <pre className="overflow-x-auto">
              {JSON.stringify(
                {
                  gender: quizData.gender,
                  bodyType: quizData.bodyType,
                  goal: quizData.goal,
                  weight: quizData.weight,
                  height: quizData.height,
                  imc: quizData.imc,
                  trainingDaysPerWeek: quizData.trainingDaysPerWeek,
                  email: quizData.email,
                },
                null,
                2,
              )}
            </pre>
            <button onClick={copyDebugValues} className="mt-2 px-2 py-1 bg-blue-500 rounded">
              Copy Debug Values
            </button>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          {currentStep === totalSteps ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="group relative w-full h-16 text-xl font-bold"
            >
              <div className="relative px-16 py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full text-black shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                <span className="relative z-10">Finalizar</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              </div>
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed() || isSubmitting}
              className={`group relative w-full h-16 text-xl font-bold ${
                !canProceed() ? "bg-gray-600/50 cursor-not-allowed" : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <div
                className={`relative px-16 py-6 rounded-full shadow-lg transform transition-all duration-300
                  ${
                    !canProceed()
                      ? "from-gray-500 to-gray-600"
                      : "from-lime-400 to-lime-500 shadow-lime-500/50 hover:shadow-lime-500/70 hover:scale-[1.02]"
                  }`}
              >
                <span className="relative z-10">Continuar</span>
                <div
                  className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-300
                    ${!canProceed() ? "opacity-0" : "from-lime-300 to-lime-400 group-hover:opacity-100"}`}
                />
              </div>
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
