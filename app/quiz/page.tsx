"use client"

import { useState, useEffect } from "react"
// import Image from "next/image" // Import Image component

import { Button } from "@/components/ui/button"

import { useRouter } from "next/navigation"

import { db, auth } from "@/lib/firebaseClient"

import { doc, setDoc, getDoc } from "firebase/firestore"

import { onAuthStateChanged, signInAnonymously } from "firebase/auth"

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
          setCurrentStep(25) // Move to step 25 (allergies)
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
      // This case is now related to Supplement Interest (step 26).
      // The original code had a condition here for allergies, which is now handled in step 24.
      // If the intention was to always advance after the cortisol message, this should be handled by the render logic.
      // For now, assuming we simply advance.
      setCurrentStep(currentStep + 1)
      return
    }
    // </CHANGE>

    if (currentStep === 18) {
      // This case 18 is now about previous problems
      console.log("[v0] Advancing from step 18, checking for motivation message logic...")
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

    if (currentStep === 24 && quizData.allergies === "nao") {
      // This condition is now handled within the step 24 rendering logic by directly setting the next step.
      // If this block is reached, it means the user selected "nao" for allergies.
      // The logic to skip to 26 (Supplement Interest) is already implemented in the button's onClick handler.
      // So, no action needed here, just advance normally if this block is not removed.
      // However, the `nextStep` should be called from the UI handler.
      // If this block remains, it implies that `nextStep` is called regardless of the UI interaction, which is not ideal.
      // Assuming the UI handler for the 'nao' button is correct, this `if` can be removed.
      // For safety, if it's intended to be a fallback, let's advance the step.
      // But the direct jump to 26 in the UI is preferred.
      // Let's comment it out for clarity, relying on the UI handler.
      // setCurrentStep(currentStep + 1)
      // </CHANGE>
    } else if (currentStep === 25 && quizData.allergies === "sim") {
      // This step is for allergy details. If allergies is 'sim', we proceed to the next step.
      // If allergies is 'nao', case 24 already jumped to case 26.
      // This if block might be redundant if the UI handler manages the flow correctly.
      // Let's assume the UI handler for the 'Continue' button at case 25 handles the progression.
      // If the 'Continue' button is pressed, `nextStep()` is called.
      // The current step is 25. We want to go to case 26.
      // This block might be intended to skip if there are no allergies, but that's handled in step 24.
      // For now, let's assume `nextStep` will correctly advance to 26.
      // If the user *did* fill in allergy details, `nextStep` would normally advance to the next step.
      // If they skipped it (which shouldn't be possible if `canProceed` is correct), this might be a fallback.
      // Based on the structure, it seems the `nextStep()` call from the UI is sufficient.
      // If this were meant to manually set the step, it should be `setCurrentStep(26)`.
      // For now, we'll let the general `nextStep` logic handle it.
    } else if (currentStep === 26 && quizData.wantsSupplement === "nao") {
      // Step 26 is supplement interest. If 'nao', we skip supplement details (case 26 handles this by setting currentStep to 27).
      setCurrentStep(27) // Skip supplement recommendation and go to step 27 (name)
    } else if (currentStep === 27 && quizData.wantsSupplement === "nao") {
      // </CHANGE>
      setCurrentStep(28) // Skip supplement details and go to name (case 28)
    } else if (currentStep === 14 && quizData.weight !== "" && quizData.targetWeight !== "") {
      // Original was step 15, now step 14 (weight related)
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
      // The API call is now triggered in handleSubmit, not here.
      // The UI will automatically advance to the next step after the animation is done.
      // </CHANGE>
    } else if (currentStep === 27 && quizData.name.trim() !== "") {
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
      if (currentStep === 26 && quizData.allergies === "nao") {
        // If we are at supplement interest question (case 26) and allergies was 'no' (case 24, which jumps to 26)
        // We need to go back to the allergies question (case 24).
        setCurrentStep(24) // Go back to allergies question
      } else if (currentStep === 28 && quizData.wantsSupplement === "nao") {
        // If we are at name question (case 28) and supplement interest was 'no' (case 26, which jumps to 27)
        // We need to go back to the supplement interest question (case 26).
        setCurrentStep(26)
      } else if (currentStep === 27 && quizData.wantsSupplement === "sim") {
        // If we are at supplement recommendation (case 27) and supplement interest was 'yes' (case 26)
        // We need to go back to the supplement interest question (case 26).
        setCurrentStep(26)
      } else if (currentStep === 25 && quizData.allergies === "sim") {
        // If we are at allergy details (case 25) and allergies was 'yes' (case 24)
        // We need to go back to the allergies question (case 24).
        setCurrentStep(24) // Go back to allergies question
      } else if (currentStep === 19 && quizData.additionalGoals.length === 0) {
        // If we are at the additional goals page (now case 19) and user selected none,
        // and if we are navigating back from this page, we should go back to the previous problem page (case 18)
        setShowMotivationMessage(false) // Hide motivation message if it was shown
        setCurrentStep(18)
      } else if (currentStep === 19 && showMotivationMessage) {
        // If motivation message was shown, go back to previous step before motivation message
        setShowMotivationMessage(false)
        // The logic to show motivation message is now tied to previousProblems being empty.
        // So if we are at step 19 (additional goals) and motivation message was shown, it means we came from step 18
        // where previousProblems was empty. So we should go back to step 18.
        setCurrentStep(18)
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
  // </CHANGE>

  if (showQuickResults) {
    const musclePointsStr = musclePoints.map((p) => `${p.x},${p.y}`).join(" ")
    const fatPointsStr = fatPoints.map((p) => `${p.x},${p.y}`).join(" ")

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-5xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold">Apenas 2 semanas para o primeiro resultado</h1>
            <p className="text-gray-400 text-lg">Prevemos que você verá melhorias até o final da 2ª semana</p>
          </div>

          <div className="relative w-full h-[323px] bg-gradient-to-br from-blue-950/50 via-purple-950/30 to-blue-950/50 rounded-3xl p-8 backdrop-blur-sm border border-blue-800/40">
            <div className="relative w-full h-full">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-12 flex flex-col justify-between text-xs text-gray-400">
                <span>Alto</span>
                <span>Baixo</span>
              </div>

              {/* X-axis labels - Adjusted sizing */}
              <div className="absolute bottom-0 left-16 right-0 flex justify-between text-xs text-gray-400 px-4">
                <span>Baixo</span>
                <span>1 Mês</span>
                <span>2 Meses</span>
                <span>3 Meses</span>
              </div>

              {/* SVG Chart with animated gradient lines */}
              <svg
                className="absolute left-16 top-4 right-4 bottom-12"
                viewBox="0 0 400 300"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="muscleLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#84cc16", stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="fatLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: "#7c3aed", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
                  </linearGradient>

                  <marker
                    id="arrowMuscle"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill="#84cc16" />
                  </marker>
                  <marker
                    id="arrowFat"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill="#ec4899" />
                  </marker>

                  {/* Glow filters */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Muscle mass line (going up) */}
                <polyline
                  points={musclePointsStr}
                  fill="none"
                  stroke="url(#muscleLine)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  markerEnd="url(#arrowMuscle)"
                  style={{
                    strokeDasharray: 500,
                    strokeDashoffset: 500,
                    animation: "drawLine 6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                  }}
                />

                {/* Body fat line (going down) */}
                <polyline
                  points={fatPointsStr}
                  fill="none"
                  stroke="url(#fatLine)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  markerEnd="url(#arrowFat)"
                  style={{
                    strokeDasharray: 500,
                    strokeDashoffset: 500,
                    animation: "drawLine 6s cubic-bezier(0.4, 0, 0.2, 1) forwards 0.2s",
                  }}
                />

                {debugChart && (
                  <>
                    {/* Vertical grid lines */}
                    <line x1="100" y1="0" x2="100" y2="300" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
                    <line x1="200" y1="0" x2="200" y2="300" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
                    <line x1="300" y1="0" x2="300" y2="300" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />

                    {/* Horizontal grid lines */}
                    <line x1="0" y1="100" x2="400" y2="100" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
                    <line x1="0" y1="200" x2="400" y2="200" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />

                    {/* Muscle points visualization */}
                    {musclePoints.map((point, idx) => (
                      <circle key={`m-${idx}`} cx={point.x} cy={point.y} r="4" fill="#06b6d4" opacity="0.8" />
                    ))}

                    {/* Fat points visualization */}
                    {fatPoints.map((point, idx) => (
                      <circle key={`f-${idx}`} cx={point.x} cy={point.y} r="4" fill="#ec4899" opacity="0.8" />
                    ))}
                  </>
                )}

                {/* Horizontal grid lines */}
                <line x1="0" y1="100" x2="400" y2="100" stroke="#ffffff" strokeWidth="0.5" opacity="0.15" />
                <line x1="0" y1="200" x2="400" y2="200" stroke="#ffffff" strokeWidth="0.5" opacity="0.15" />
              </svg>
            </div>
          </div>

          {/* Footer text */}
          <div className="text-center text-sm text-gray-500">
            <p>*Baseado em dados de 1,3 milhões de treinos</p>
          </div>

          <button
            onClick={() => {
              setShowQuickResults(false)
              setCurrentStep(6)
            }}
            className="w-full h-16 text-xl font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-300 rounded-xl shadow-lg transition-all duration-300"
          >
            Continuar
          </button>
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-lg">
          {/* Animated Checkmark */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-lime-400 flex items-center justify-center shadow-2xl animate-pulse">
              <svg
                className="w-16 h-16 text-white animate-bounceIn"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold">Missão Cumprida!</h2>
          <p className="text-lg text-gray-300">
            Seu questionário foi enviado com sucesso. Em breve, você receberá seu plano personalizado.
          </p>

          <Button
            onClick={() => {
              router.push("/") // Redirect to homepage or dashboard
            }}
            className="group relative"
          >
            <div className="relative px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full font-bold text-white text-xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <span className="relative z-10">Ir para Dashboard</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300" />
            </div>
          </Button>
        </div>

        <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0.5); opacity: 0; }
            60% { transform: scale(1.2); }
            80% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-bounceIn {
            animation: bounceIn 1.5s ease-out forwards;
          }
        `}</style>
      </div>
    )
  }

  // Render question based on currentStep
  const renderQuestion = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual o seu gênero?</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  updateQuizData("gender", "homem")
                  nextStep()
                }}
                variant={quizData.gender === "homem" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Homem
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("gender", "mulher")
                  nextStep()
                }}
                variant={quizData.gender === "mulher" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Mulher
              </Button>
            </div>
          </div>
        )
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual seu tipo de corpo?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["ectomorfo", "mesomorfo", "endomorfo"].map((type) => (
                <Button
                  key={type}
                  onClick={() => {
                    updateQuizData("bodyType", type)
                    nextStep()
                  }}
                  variant={quizData.bodyType === type ? "default" : "outline"}
                  className="h-32 flex flex-col items-center justify-center text-lg capitalize"
                >
                  <BodyIllustration type={type} gender={quizData.gender} className="w-24 h-24 mb-2" />
                  {type}
                </Button>
              ))}
            </div>
          </div>
        )
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual seu principal objetivo?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { value: "perder-peso", label: "Perder Peso", icon: "/images/slim-body-icon.webp" },
                { value: "ganhar-massa", label: "Ganhar Massa", icon: "/images/body-icon.webp" },
                { value: "melhorar-saude", label: "Melhorar Saúde", icon: "/images/better-health-icon.webp" },
                { value: "aumentar-energia", label: "Aumentar Energia", icon: "/images/training-icon.webp" },
                { value: "definir-musculos", label: "Definir Músculos", icon: "/images/calories-icon.webp" },
              ].map((goal) => (
                <Button
                  key={goal.value}
                  onClick={() => {
                    handleArrayUpdate("goal", goal.value, true)
                    if (quizData.goal.length === 0) {
                      // Only advance if this is the first goal selected
                      nextStep()
                    }
                  }}
                  variant={quizData.goal.includes(goal.value) ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center text-lg"
                >
                  <img src={goal.icon || "/placeholder.svg"} alt={goal.label} className="w-10 h-10 mb-2" />
                  {goal.label}
                </Button>
              ))}
            </div>
          </div>
        )
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Detalhe seu objetivo principal</h2>
            <div className="flex flex-col gap-4">
              {quizData.goal.includes("perder-peso") && (
                <div>
                  <label className="block text-lg mb-2">Quanto peso você deseja perder?</label>
                  <input
                    type="text"
                    placeholder="Ex: 5kg"
                    value={quizData.subGoal}
                    onChange={(e) => updateQuizData("subGoal", e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {quizData.goal.includes("ganhar-massa") && (
                <div>
                  <label className="block text-lg mb-2">Quanto de massa você deseja ganhar?</label>
                  <input
                    type="text"
                    placeholder="Ex: 3kg"
                    value={quizData.subGoal}
                    onChange={(e) => updateQuizData("subGoal", e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {quizData.goal.includes("melhorar-saude") && (
                <div>
                  <label className="block text-lg mb-2">O que significa 'melhorar saúde' para você?</label>
                  <input
                    type="text"
                    placeholder="Ex: Mais energia, dormir melhor"
                    value={quizData.subGoal}
                    onChange={(e) => updateQuizData("subGoal", e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {quizData.goal.includes("aumentar-energia") && (
                <div>
                  <label className="block text-lg mb-2">Como você descreveria sua energia atual?</label>
                  <input
                    type="text"
                    placeholder="Ex: Muito baixa, preciso de um impulso"
                    value={quizData.subGoal}
                    onChange={(e) => updateQuizData("subGoal", e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {quizData.goal.includes("definir-musculos") && (
                <div>
                  <label className="block text-lg mb-2">Qual parte do corpo você mais deseja definir?</label>
                  <input
                    type="text"
                    placeholder="Ex: Abdômen, braços"
                    value={quizData.subGoal}
                    onChange={(e) => updateQuizData("subGoal", e.target.value)}
                    className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <Button onClick={nextStep} className="mt-4">
              Próximo
            </Button>
          </div>
        )
      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual o seu percentual de gordura corporal?</h2>
            <div className="flex items-center justify-center gap-4">
              <input
                type="range"
                min="5"
                max="50"
                value={quizData.bodyFat}
                onChange={(e) => updateQuizData("bodyFat", Number(e.target.value))}
                className="w-64 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-2xl font-bold">{quizData.bodyFat}%</span>
            </div>
            <p className="text-center text-gray-400 mt-2">(Se não souber, pode estimar. Um valor médio é 15-20%)</p>
            <Button onClick={nextStep} className="mt-8">
              Próximo
            </Button>
          </div>
        )
      case 6:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Você tem alguma restrição alimentar?</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  updateQuizData("diet", "sim")
                  nextStep()
                }}
                variant={quizData.diet === "sim" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("diet", "nao")
                  nextStep()
                }}
                variant={quizData.diet === "nao" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Não
              </Button>
            </div>
          </div>
        )
      case 7:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Como você descreveria sua dieta atual?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Comida de verdade", "Industrializada", "Low Carb", "Vegetariana", "Vegana", "Variada"].map(
                (dietType) => (
                  <Button
                    key={dietType}
                    onClick={() => {
                      updateQuizData("diet", dietType)
                      nextStep()
                    }}
                    variant={quizData.diet === dietType ? "default" : "outline"}
                    className="h-20 text-lg"
                  >
                    {dietType}
                  </Button>
                ),
              )}
            </div>
          </div>
        )
      case 8:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Com que frequência você consome doces?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Diariamente", "Algumas vezes por semana", "Raramente", "Nunca"].map((frequency) => (
                <Button
                  key={frequency}
                  onClick={() => {
                    handleArrayUpdate("sugarFrequency", frequency, true)
                    if (quizData.sugarFrequency.length === 0) {
                      nextStep()
                    }
                  }}
                  variant={quizData.sugarFrequency.includes(frequency) ? "default" : "outline"}
                  className="h-20 text-lg"
                >
                  {frequency}
                </Button>
              ))}
            </div>
          </div>
        )
      case 9:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Quantos litros de água você bebe por dia?</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {["0-1 litro", "1-2 litros", "2-3 litros", "Mais de 3 litros"].map((intake) => (
                <Button
                  key={intake}
                  onClick={() => {
                    updateQuizData("waterIntake", intake)
                    nextStep()
                  }}
                  variant={quizData.waterIntake === intake ? "default" : "outline"}
                  className="h-16 text-lg"
                >
                  {intake}
                </Button>
              ))}
            </div>
          </div>
        )
      case 10:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Você tem alguma alergia ou intolerância alimentar?</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  updateQuizData("allergies", "sim")
                  nextStep()
                }}
                variant={quizData.allergies === "sim" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("allergies", "nao")
                  nextStep()
                }}
                variant={quizData.allergies === "nao" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Não
              </Button>
            </div>
          </div>
        )
      case 11:
        // This is where the conditional logic for 'no' allergies to skip to step 13 (or further) would be handled.
        // For now, assuming we always proceed to allergy details if 'sim'.
        if (quizData.allergies === "nao") {
          // Skip to step 13 (or the next relevant step after allergy details)
          // The actual step number might need adjustment based on the final flow.
          // Let's assume for now it skips to step 13, which might be `wantsSupplement`.
          setCurrentStep(13) // Skipping directly to supplement interest
          return null // Prevent rendering for this step
        }
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Quais são suas alergias ou intolerâncias?</h2>
            <textarea
              placeholder="Ex: Glúten, lactose, nozes..."
              value={quizData.allergyDetails}
              onChange={(e) => updateQuizData("allergyDetails", e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
            <Button onClick={nextStep} className="mt-4">
              Próximo
            </Button>
          </div>
        )
      case 12:
        // This is a placeholder for potential additional health conditions or conditions related to allergies.
        // If this step isn't strictly necessary or can be combined, it can be removed or merged.
        // Based on the flow, it seems like it might be related to health conditions.
        // Assuming it's related to general health conditions that might impact diet or training.
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Você possui alguma condição de saúde relevante?</h2>
            <textarea
              placeholder="Ex: Diabetes, hipertensão, problemas cardíacos..."
              value={quizData.healthConditions.join(", ")} // Join array for display
              onChange={(e) =>
                updateQuizData(
                  "healthConditions",
                  e.target.value.split(",").map((s) => s.trim()),
                )
              }
              rows={4}
              className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
            <Button onClick={nextStep} className="mt-4">
              Próximo
            </Button>
          </div>
        )

      case 13: // Updated step number for Supplement Interest
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Você tem interesse em suplementos?</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  updateQuizData("wantsSupplement", "sim")
                  nextStep()
                }}
                variant={quizData.wantsSupplement === "sim" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  updateQuizData("wantsSupplement", "nao")
                  nextStep()
                }}
                variant={quizData.wantsSupplement === "nao" ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Não
              </Button>
            </div>
          </div>
        )
      case 14: // Updated step number
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual seu peso atual?</h2>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                placeholder="Ex: 70"
                value={quizData.currentWeight}
                onChange={(e) => updateQuizData("currentWeight", e.target.value)}
                className="w-32 p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <select
                value={quizData.weightUnit}
                onChange={(e) => updateQuizData("weightUnit", e.target.value)}
                className="p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
            <Button onClick={nextStep} className="mt-8">
              Próximo
            </Button>
          </div>
        )
      case 15: // Updated step number
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual seu peso desejado?</h2>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                placeholder="Ex: 65"
                value={quizData.targetWeight}
                onChange={(e) => updateQuizData("targetWeight", e.target.value)}
                className="w-32 p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <select
                value={quizData.weightUnit}
                onChange={(e) => updateQuizData("weightUnit", e.target.value)}
                className="p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
            <Button onClick={nextStep} className="mt-8">
              Próximo
            </Button>
          </div>
        )
      case 16:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual sua altura?</h2>
            <div className="flex items-center justify-center gap-2">
              <input
                type="text" // Use text to allow normalization of input like 1,75 or 1.75
                placeholder="Ex: 175"
                value={quizData.height}
                onChange={(e) => updateQuizData("height", e.target.value)}
                className="w-32 p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <select
                value={quizData.heightUnit}
                onChange={(e) => updateQuizData("heightUnit", e.target.value)}
                className="p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="ft">ft</option>
              </select>
            </div>
            <Button onClick={nextStep} className="mt-8">
              Próximo
            </Button>
          </div>
        )
      case 17:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual a sua experiência com treinos?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Iniciante", "Intermediário", "Avançado"].map((experience) => (
                <Button
                  key={experience}
                  onClick={() => {
                    updateQuizData("experience", experience)
                    nextStep()
                  }}
                  variant={quizData.experience === experience ? "default" : "outline"}
                  className="h-20 text-lg"
                >
                  {experience}
                </Button>
              ))}
            </div>
          </div>
        )
      case 18:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Você já teve problemas com treinos anteriores?</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  handleArrayUpdate("previousProblems", "lesoes", true)
                  nextStep()
                }}
                variant={quizData.previousProblems.includes("lesoes") ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Lesões
              </Button>
              <Button
                onClick={() => {
                  handleArrayUpdate("previousProblems", "falta-motivacao", true)
                  nextStep()
                }}
                variant={quizData.previousProblems.includes("falta-motivacao") ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Falta de Motivação
              </Button>
              <Button
                onClick={() => {
                  handleArrayUpdate("previousProblems", "nao-tive", true)
                  nextStep()
                }}
                variant={quizData.previousProblems.includes("nao-tive") ? "default" : "outline"}
                className="w-full md:w-48 h-16 text-lg"
              >
                Não tive
              </Button>
            </div>
          </div>
        )
      case 19: // Previously 22, now step 19 (Additional Goals)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Você tem outros objetivos?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Melhorar flexibilidade", "Reduzir estresse", "Aumentar performance", "Prevenir lesões", "Nenhum"].map(
                (goal) => (
                  <Button
                    key={goal}
                    onClick={() => {
                      if (goal === "Nenhum") {
                        updateQuizData("additionalGoals", ["nenhum"])
                      } else {
                        // Remove "nenhum" if other goals are selected
                        const currentGoals = quizData.additionalGoals.filter((g) => g !== "nenhum")
                        if (currentGoals.includes(goal)) {
                          updateQuizData(
                            "additionalGoals",
                            currentGoals.filter((g) => g !== goal),
                          )
                        } else {
                          updateQuizData("additionalGoals", [...currentGoals, goal])
                        }
                      }
                    }}
                    variant={quizData.additionalGoals.includes(goal) ? "default" : "outline"}
                    className="h-20 text-lg"
                  >
                    {goal}
                  </Button>
                ),
              )}
            </div>
            <Button onClick={nextStep} className="mt-8">
              Próximo
            </Button>
          </div>
        )

      case 20: // Previously 23, now step 20 (Workout Time)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Quanto tempo você pode dedicar aos treinos por dia?</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {["15-30 minutos", "30-45 minutos", "45-60 minutos", "60+ minutos"].map((time) => (
                <Button
                  key={time}
                  onClick={() => {
                    updateQuizData("workoutTime", time)
                    nextStep()
                  }}
                  variant={quizData.workoutTime === time ? "default" : "outline"}
                  className="h-16 text-lg"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        )
      case 21: // Previously 24, now step 21 (Equipment)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual equipamento você tem acesso?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Peso corporal", "Halteres", "Barra e anilhas", "Elásticos", "Máquinas de academia", "Outro"].map(
                (item) => (
                  <Button
                    key={item}
                    onClick={() => handleArrayUpdate("equipment", item, !quizData.equipment.includes(item))}
                    variant={quizData.equipment.includes(item) ? "default" : "outline"}
                    className={`h-20 text-lg ${quizData.equipment.includes(item) ? "border-lime-500" : ""}`}
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <Button onClick={nextStep} className="mt-8">
              Próximo
            </Button>
          </div>
        )
      case 22: // Previously 25, now step 22 (Training Days Per Week)
        // This step needs to be skipped if Cortisol message was shown, and it already moved the currentStep.
        // So, render the content for this step.
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Quantos dias por semana você pretende treinar?</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <Button
                  key={days}
                  onClick={() => {
                    updateQuizData("trainingDaysPerWeek", days)
                    nextStep()
                  }}
                  variant={quizData.trainingDaysPerWeek === days ? "default" : "outline"}
                  className="h-16 text-lg"
                >
                  {days} dia(s)
                </Button>
              ))}
            </div>
          </div>
        )

      case 23: // Previously 26, now step 23 (Cardio Preference)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Como você se sente em relação ao cardio?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Adoro", "Gosto", "Neutro", "Não gosto muito", "Odeio"].map((feeling) => (
                <Button
                  key={feeling}
                  onClick={() => {
                    updateExercisePreference("cardio", feeling)
                    nextStep()
                  }}
                  variant={quizData.exercisePreferences.cardio === feeling ? "default" : "outline"}
                  className="h-20 text-lg"
                >
                  {feeling}
                </Button>
              ))}
            </div>
          </div>
        )
      case 24: // Previously 27, now step 24 (Pullups/Strength Preference)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Como você se sente em relação a treinos de força (ex: barra fixa)?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Adoro", "Gosto", "Neutro", "Não gosto muito", "Odeio"].map((feeling) => (
                <Button
                  key={feeling}
                  onClick={() => {
                    updateExercisePreference("pullups", feeling)
                    nextStep()
                  }}
                  variant={quizData.exercisePreferences.pullups === feeling ? "default" : "outline"}
                  className="h-20 text-lg"
                >
                  {feeling}
                </Button>
              ))}
            </div>
          </div>
        )
      case 25: // Previously 28, now step 25 (Yoga/Stretching Preference)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Como você se sente em relação a alongamentos e yoga?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["Adoro", "Gosto", "Neutro", "Não gosto muito", "Odeio"].map((feeling) => (
                <Button
                  key={feeling}
                  onClick={() => {
                    updateExercisePreference("yoga", feeling)
                    nextStep()
                  }}
                  variant={quizData.exercisePreferences.yoga === feeling ? "default" : "outline"}
                  className="h-20 text-lg"
                >
                  {feeling}
                </Button>
              ))}
            </div>
          </div>
        )
      case 26: // Previously 29, now step 26 (Email)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Qual seu melhor e-mail para contato?</h2>
            <input
              type="email"
              placeholder="exemplo@email.com"
              value={quizData.email}
              onChange={(e) => updateQuizData("email", e.target.value)}
              className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={nextStep} className="mt-4">
              Próximo
            </Button>
          </div>
        )
      case 27: // Previously 30, now step 27 (Name)
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Como você gostaria de ser chamado(a)?</h2>
            <input
              type="text"
              placeholder="Seu nome"
              value={quizData.name}
              onChange={(e) => updateQuizData("name", e.target.value)}
              className="w-full p-3 border border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={nextStep} className="mt-4">
              Finalizar
            </Button>
          </div>
        )

      default:
        return <div>Error: Unknown step</div>
    }
  }

  // Determine if the "Next" button should be enabled
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return quizData.gender !== ""
      case 2:
        return quizData.bodyType !== ""
      case 3:
        return quizData.goal.length > 0
      case 4:
        return quizData.subGoal !== ""
      case 5:
        return quizData.bodyFat > 0
      case 6:
        return quizData.diet !== ""
      case 7:
        return quizData.diet !== "" // Assuming diet is selected in step 6 and reused here
      case 8:
        return quizData.sugarFrequency.length > 0
      case 9:
        return quizData.waterIntake !== ""
      case 10:
        return quizData.allergies !== ""
      case 11:
        return quizData.allergies === "nao" || quizData.allergyDetails !== ""
      case 12:
        return true // Assuming this step is optional or always proceeds
      case 13: // Updated step number
        return quizData.wantsSupplement !== ""
      case 14: // Updated step number
        return quizData.currentWeight !== ""
      case 15: // Updated step number
        return quizData.targetWeight !== ""
      case 16: // Updated step number
        return quizData.height !== ""
      case 17:
        return quizData.experience !== ""
      case 18:
        return quizData.previousProblems.length > 0
      case 19: // Previously 22, now step 19
        return quizData.additionalGoals.length > 0
      case 20: // Previously 23, now step 20
        return quizData.workoutTime !== ""
      case 21: // Previously 24, now step 21
        return quizData.equipment.length > 0
      case 22: // Previously 25, now step 22
        return quizData.trainingDaysPerWeek > 0
      case 23: // Previously 26, now step 23
        return quizData.exercisePreferences.cardio !== ""
      case 24: // Previously 27, now step 24
        return quizData.exercisePreferences.pullups !== ""
      case 25: // Previously 28, now step 25
        return quizData.exercisePreferences.yoga !== ""
      case 26: // Previously 29, now step 26
        return quizData.email !== "" && quizData.email.includes("@")
      case 27: // Previously 30, now step 27
        return quizData.name !== ""
      default:
        return true
    }
  }

  if (showNutritionInfo) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <style>{`
          @keyframes pulseGlow {
            0%, 100% { 
              opacity: 0.6;
              filter: drop-shadow(0 0 15px rgba(6, 182, 212, 0.4));
            }
            50% { 
              opacity: 1;
              filter: drop-shadow(0 0 30px rgba(6, 182, 212, 0.8));
            }
          }
        `}</style>

        <div className="max-w-2xl w-full space-y-8">
          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-green-500 h-full w-4/5 rounded-full" />
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm uppercase tracking-wider">ANALISANDO SEU CORPO — 81% CONCLUÍDO</p>
          </div>

          <div className="flex justify-center">
            <div
              className="w-48 h-48 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 35%, #3b82f6 0%, #06b6d4 40%, #10b981 100%)",
                boxShadow: "0 0 60px rgba(6, 182, 212, 0.5), 0 0 100px rgba(16, 185, 129, 0.3)",
                animation: "pulseGlow 10s ease-in-out infinite",
              }}
            />
          </div>

          {/* Title */}
          <div className="space-y-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              SEU MAIOR
              <br />
              GARGALO
              <br />
              NÃO É O TREINO
            </h2>
            <p className="text-gray-300 text-base">Nutrição influencia 81% do seu resultado</p>
          </div>

          {/* Insight Cards */}
          <div className="space-y-3">
            <div className="flex items-start space-x-4 border border-gray-700/50 rounded-2xl p-5 bg-gray-800/30 backdrop-blur-sm">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-7 w-7 rounded-full border-2 border-green-500">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-white text-sm">Seu corpo não recebe calorias suficientes para crescer</p>
            </div>

            <div className="flex items-start space-x-4 border border-gray-700/50 rounded-2xl p-5 bg-gray-800/30 backdrop-blur-sm">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-7 w-7 rounded-full border-2 border-green-500">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-white text-sm">A ingestão de proteína hoje limita sua recuperação muscular</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => {
              setShowNutritionInfo(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white font-bold text-lg py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-lg"
          >
            DESTRAVAR MEUS RESULTADOS
          </button>

          {/* Footer text */}
          <p className="text-center text-gray-500 text-xs">Leva menos de 1 minuto</p>
        </div>
      </div>
    )
  }

  // Render question based on currentStep
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center p-4 pt-20">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm uppercase tracking-wide">
            Passo {currentStep} de {totalSteps}
          </p>
        </div>

        {renderQuestion()}

        <div className="mt-8 flex justify-between">
          <Button
            onClick={prevStep}
            variant="ghost"
            className="text-gray-300 hover:text-white disabled:text-gray-600"
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          {currentStep === 27 ? ( // Last step before submission
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting} // Disable if cannot proceed or is submitting
              className="bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 text-gray-900 font-bold py-3 px-8 rounded-full shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:bg-none disabled:shadow-none"
            >
              {isSubmitting ? "Enviando..." : "Finalizar e Gerar Plano"}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
            >
              Próximo
            </Button>
          )}
        </div>
      </div>

      {/* Debug Controls (Optional) */}
      {debugMode && (
        <div className="fixed top-4 right-4 bg-gray-800 p-4 rounded-lg border border-gray-700 z-50">
          <button onClick={() => setDebugChart(!debugChart)} className="text-white mb-2">
            Toggle Chart Points
          </button>
          <button onClick={copyDebugValues} className="text-white">
            Copy Debug Values
          </button>
          {/* Add more debug controls here if needed */}
        </div>
      )}
    </main>
  )
}
