"use client"

import { useState, useEffect } from "react"
// import Image from "next/image" // Import Image component

import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"

import { Input } from "@/components/ui/input"

import { Checkbox } from "@/components/ui/checkbox"

import { Slider } from "@/components/ui/slider"

import { Textarea } from "@/components/ui/textarea"

import { ArrowLeft, CheckCircle, X, Loader2, Dumbbell, Clock } from "lucide-react"

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
  letMadMusclesChoose: false,
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
    letMadMusclesChoose: false,
    foodPreferences: {
      vegetables: [],
      grains: [],
      ingredients: [],
      meats: [],
      fruits: [],
    },
    // </CHANGE>
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [showNutritionInfo, setShowNutritionInfo] = useState(false)
  const [showWaterCongrats, setShowWaterCongrats] = useState(false)
  const [showTimeCalculation, setShowTimeCalculation] = useState(false)
  const [showIMCResult, setShowIMCResult] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [totalSteps, setTotalSteps] = useState(27) // Updated totalSteps to 27
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
          setCurrentStep(27) // Move to email question
        }, 2500)
        return () => clearTimeout(timer)
      }
    }
  }, [showAnalyzingData, analyzingStep])
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
    const normalizedValue = key === "height" ? normalizeHeight(value) : value
    const newData = { ...quizData, [key]: normalizedValue }

    // </CHANGE> Used quizData.weight for IMC calculation
    if (key === "currentWeight" || key === "height" || key === "weight") {
      const weight = Number.parseFloat(
        key === "currentWeight"
          ? normalizedValue
          : quizData.currentWeight || (key === "weight" ? normalizedValue : "0"),
      )
      const height = Number.parseFloat(key === "height" ? normalizedValue : quizData.height || "0")

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
    if (currentStep === 1) {
      // Go to step 2 (body type) for all genders
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // From step 2 (Body Type), go to step 3 (Goals)
      setCurrentStep(3)
    } else if (currentStep === 3) {
      // From step 3 (Goals), transition to step 4
      setCurrentStep(4)
    } else if (currentStep === 4) {
      setCurrentStep(5)
    } else if (currentStep === 5) {
      // From step 5 (Problem Areas), go to step 6 (Diet)
      setCurrentStep(6)
    } else if (currentStep === 6) {
      // From step 6 (Diet), show Nutrition Info if not vegan/vegetarian
      if (quizData.diet !== "nao-sigo") {
        setShowNutritionInfo(true)
      } else {
        // If no diet selected, proceed to the next logical step (which would be step 7 - Sugar Frequency)
        setCurrentStep(7)
      }
    } else if (currentStep === 7) {
      // From step 7 (Sugar Frequency), check water intake
      if (quizData.waterIntake === "menos-2") {
        // If water intake is "less than 2 cups", show Water Congrats
        setShowWaterCongrats(true)
      } else {
        // Otherwise, proceed to the next step (step 8 - Age)
        setCurrentStep(8)
      }
    } else if (currentStep === 8) {
      // From step 8 (Age), calculate and show IMC result
      const heightValue = Number.parseFloat(quizData.height.replace(",", "."))
      const weightValue = Number.parseFloat(quizData.weight)

      if (Number.isNaN(heightValue) || Number.isNaN(weightValue) || heightValue <= 0 || weightValue <= 0) {
        console.error("Invalid height or weight for IMC calculation")
        setCurrentStep(9) // Skip to next step if values are invalid
        return
      }

      const { imc, classification, status } = calculateIMC(weightValue, heightValue)

      setQuizData((prev) => ({
        ...prev,
        imc: imc,
        imcClassification: classification,
        imcStatus: status,
      }))
      setShowIMCResult(true)
    } else if (currentStep === 9) {
      // From step 9 (IMC Result), calculate time to goal and show calculation
      const current = Number.parseFloat(quizData.weight)
      const target = Number.parseFloat(quizData.targetWeight)

      if (Number.isNaN(current) || Number.isNaN(target) || current <= 0 || target <= 0) {
        console.error("Invalid weight values for time calculation")
        setCurrentStep(10) // Skip to next step if invalid
        return
      }

      const weightDifference = Math.abs(current - target)
      const weeksNeeded = Math.ceil(weightDifference / 0.75) // Assuming 0.75kg/week loss/gain

      setQuizData((prev) => ({
        ...prev,
        timeToGoal: `${weeksNeeded} semanas`,
      }))
      setShowTimeCalculation(true)
    } else if (currentStep === 10) {
      // From step 10 (Time to Goal), proceed to step 11 (Experience)
      setCurrentStep(11)
    } else if (currentStep === 11) {
      // From step 11 (Experience), proceed to step 12 (Workout Time)
      setCurrentStep(12)
    } else if (currentStep === 12) {
      // From step 12 (Workout Time), proceed to step 13 (Equipment)
      setCurrentStep(13)
    } else if (currentStep === 13) {
      // From step 13 (Equipment), proceed to step 14 (Cardio Feeling)
      setCurrentStep(14)
    } else if (currentStep === 14) {
      // From step 14 (Cardio Feeling), proceed to step 15 (Strength Feeling)
      setCurrentStep(15)
    } else if (currentStep === 15) {
      // From step 15 (Strength Feeling), proceed to step 16 (Stretching Feeling)
      setCurrentStep(16)
    } else if (currentStep === 16) {
      // From step 16 (Stretching Feeling), proceed to step 17 (Previous Problems)
      setCurrentStep(17)
    } else if (currentStep === 17) {
      // From step 17 (Previous Problems), proceed to step 18 (Additional Goals)
      // If no previous problems were selected, show motivation message
      if (quizData.previousProblems.length === 0) {
        setShowMotivationMessage(true)
      }
      setCurrentStep(18)
    } else if (currentStep === 18) {
      // From step 18 (Additional Goals), proceed to step 19 (Food Preferences)
      setCurrentStep(19)
    } else if (currentStep === 19) {
      // From step 19 (Food Preferences), proceed to step 20 (Dietary Habits - now has Sugar Frequency)
      setCurrentStep(20)
    } else if (currentStep === 20) {
      // From step 20 (Dietary Habits), proceed to step 21 (Water Intake)
      setCurrentStep(21)
    } else if (currentStep === 21) {
      // From step 21 (Water Intake), show water congrats if conditions met
      if (quizData.waterIntake === "7-10" || quizData.waterIntake === "mais-10") {
        setShowWaterCongrats(true)
      } else {
        // Otherwise, proceed to step 22 (Allergies)
        setCurrentStep(22)
      }
    } else if (currentStep === 22) {
      // From step 22 (Allergies), check if user has allergies
      if (quizData.allergies === "sim") {
        // If yes, go to step 23 (Allergy Details)
        setCurrentStep(23)
      } else {
        // If no, skip step 23 and go directly to step 24 (Supplement)
        setCurrentStep(24)
      }
    } else if (currentStep === 23) {
      // From step 23 (Allergy Details), proceed to step 24 (Supplement)
      setCurrentStep(24)
    } else if (currentStep === 24) {
      // From step 24 (Supplement), check if user wants supplements
      if (quizData.wantsSupplement === "sim") {
        // If yes, go to step 25 (Training Days)
        setCurrentStep(25)
      } else {
        // If no, skip step 25 and go directly to step 26 (Name)
        setCurrentStep(26)
      }
    } else if (currentStep === 25) {
      // From step 25 (Training Days), proceed to step 26 (Name)
      setCurrentStep(26)
    } else if (currentStep === 26) {
      // From step 26 (Name), show the analyzing data screen
      setShowAnalyzingData(true)
      // The analyzing data screen will then transition to the next step
    } else if (currentStep < totalSteps) {
      // For all other steps, simply increment the current step
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      // Adjusted step numbers to match the new flow
      if (currentStep === 25 && quizData.allergies === "nao") {
        // If we are at step 25 (Supplement) and allergies was 'no' (which skipped step 23 to 24, then 24 to 25)
        // we need to go back to the allergies question (step 22).
        setCurrentStep(22)
      } else if (currentStep === 26 && quizData.wantsSupplement === "nao") {
        // If we are at step 26 (Name) and supplement was 'no' (which skipped step 25 to 26)
        // we need to go back to the supplement question (step 24).
        setCurrentStep(24)
      } else if (currentStep === 23 && quizData.allergies === "sim") {
        // If we are at step 23 (Allergy Details) and allergies was 'yes'
        // we need to go back to the allergies question (step 22).
        setCurrentStep(22)
      } else if (currentStep === 18 && quizData.previousProblems.length === 0) {
        // If we are at step 18 (Additional Goals) and motivation message was shown (meaning previousProblems was empty)
        // we need to go back to the previous problems question (step 17).
        setShowMotivationMessage(false) // Hide motivation message
        setCurrentStep(17)
      } else if (currentStep === 18 && showMotivationMessage) {
        // If motivation message is currently showing at step 18, hide it and go back to step 17.
        setShowMotivationMessage(false)
        setCurrentStep(17)
      } else if (currentStep === 22 && showCortisolMessage) {
        // If cortisol message is showing at step 22, hide it and go back to step 21.
        setShowCortisolMessage(false)
        setCurrentStep(21)
      } else {
        // For all other cases, simply decrement the step.
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

  // </CHANGE> Updated conditional rendering for cortisol message
  if (showCortisolMessage && currentStep === 21) {
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
              console.log("[v0] Got it button clicked, advancing to step 22")
              setShowCortisolMessage(false)
              setCurrentStep(22)
              // </CHANGE>
            }}
            className="w-full py-4 px-8 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white rounded-full font-semibold transition-all shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 text-lg"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }
  // </CHANGE>

  if (showMotivationMessage && currentStep === 18) {
    // Changed from 19 to 18 based on renumbering
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <h2 className="text-2xl font-bold text-white">Já percorremos metade do caminho!</h2>

          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-orange-500 flex items-center justify-center bg-orange-900/30">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              // The renderQuestion will handle showing case 19 (additional goals)
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all shadow-lg"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }
  // </CHANGE>

  if (showAnalyzingData) {
    const current = Number.parseFloat(quizData.weight)
    const target = Number.parseFloat(quizData.targetWeight)
    const weightDifference = Math.abs(current - target)
    const weeksNeeded = Math.ceil(weightDifference / 0.75)

    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <style jsx>{`
          .neon-loader {
            width: 90px;
            height: 90px;
            border: 6px solid rgba(0, 255, 255, 0.15);
            border-top-color: #00e1ff;
            border-radius: 50%;
            animation: spin 1.2s linear infinite, glow 1.5s ease-in-out infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @keyframes glow {
            0% { box-shadow: 0 0 6px #00e1ff; }
            50% { box-shadow: 0 0 16px #00e1ff; }
            100% { box-shadow: 0 0 6px #00e1ff; }
          }

          .animate-fade-text {
            animation: fadeText 1.8s ease-in-out;
          }

          @keyframes fadeText {
            0% { opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>

        <div className="flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-800">
          <div className="neon-loader" />

          {analyzingStep < messages.length ? (
            <p className="text-xl text-center font-medium text-white animate-fade-text max-w-md">
              {messages[analyzingStep]}
            </p>
          ) : (
            <div className="text-center space-y-2 animate-in fade-in duration-500">
              <p className="text-lg text-white/90 max-w-md">Baseado no seu perfil, você pode atingir seu objetivo em</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-8xl font-bold text-lime-400">{weeksNeeded}</span>
                <span className="text-3xl font-medium text-lime-400">semanas</span>
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }
  // </CHANGE>

  if (showLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-32 h-32 mx-auto relative">
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
          <h2 className="text-2xl font-bold">Analisando suas respostas...</h2>
          <p className="text-gray-300">Criando seu plano personalizado</p>
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

          <p className="text-gray-300 text-sm">Seu nível de hidratação está excelente — continue assim.</p>

          <button
            onClick={() => {
              setShowWaterCongrats(false)
              setCurrentStep(currentStep + 1)
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-8 rounded-2xl transition-colors text-base"
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
                  className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 sm:gap-4 ${
                    quizData.gender === gender.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10"
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
                  className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center justify-between ${
                    quizData.bodyType === type.value
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10"
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
                { value: "perder-peso", label: "Perder peso e queimar gordura", icon: "🔥" },
                { value: "ganhar-massa", label: "Ganhar massa muscular e definir o corpo", icon: "💪" },
                { value: "melhorar-saude", label: "Melhorar minha saúde, disposição e bem-estar", icon: "❤️" },
                { value: "aumentar-resistencia", label: "Aumentar a minha resistência física", icon: "🏋️" },
              ].map((goal) => (
                <div
                  key={goal.value}
                  className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center gap-4 ${
                    quizData.goal.includes(goal.value)
                      ? "border-2 border-lime-500 bg-lime-500/10"
                      : "border border-white/10"
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
          </div>
        )

      case 4:
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
          </div>
        )

      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual área você quer focar mais?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="flex items-start justify-center space-x-8">
              <div
                className={`relative bg-transparent ${quizData.gender === "mulher" ? "w-48 h-[400px]" : "w-64 h-auto"}`}
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
                    className={`rounded-lg p-6 cursor-pointer transition-all border-2 ${
                      quizData.problemAreas.includes(area)
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-white/5 backdrop-blur-sm border-white/10 text-white hover:border-emerald-500"
                    }`}
                    onClick={() => handleArrayUpdate("problemAreas", area, !quizData.problemAreas.includes(area))}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{area}</h3>
                      <div
                        className={`w-6 h-6 rounded border-2 ${
                          quizData.problemAreas.includes(area) ? "bg-white border-white" : "border-gray-400"
                        }`}
                      >
                        {quizData.problemAreas.includes(area) && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                      </div>
                    </div>
                  </div>
                ))}
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

      case 6:
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
                  className={`bg-white/5 backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 ${
                    quizData.diet === diet.value ? "border-2 border-lime-500 bg-lime-500/10" : "border border-white/10"
                  }`}
                  onClick={() => {
                    updateQuizData("diet", diet.value)
                    setTimeout(() => nextStep(), 300)
                  }}
                >
                  <span className="text-xl sm:text-2xl">{diet.icon}</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">{diet.label}</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">{diet.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-3 sm:pt-4">
              <div
                className={`bg-white/5 backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 ${
                  quizData.diet === "nao-sigo" ? "border-2 border-lime-500 bg-lime-500/10" : "border border-white/10"
                }`}
                onClick={() => {
                  updateQuizData("diet", "nao-sigo")
                  setTimeout(() => nextStep(), 300)
                }}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                <h3 className="text-base sm:text-lg font-bold text-white">Não, não sigo dieta</h3>
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Com que frequência você consome doces ou bebidas alcoólicas?
              </h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "esporadicamente", label: "Esporadicamente", icon: "🍷" },
                { value: "com-frequencia", label: "Com frequência", icon: "🍭" },
                { value: "todos-dias", label: "Todos os dias", icon: "🍰" },
                { value: "nao-consumo-alcool", label: "Não consumo álcool", icon: "🚫" },
                { value: "nao-consumo-doces", label: "Não consumo doces", icon: "❌" },
              ].map((freq) => (
                <div key={freq.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={freq.value}
                    checked={quizData.sugarFrequency.includes(freq.value)}
                    onCheckedChange={(checked) => handleArrayUpdate("sugarFrequency", freq.value, checked as boolean)}
                  />
                  <Label htmlFor={freq.value} className="text-white text-lg flex items-center space-x-2">
                    <span className="text-xl">{freq.icon}</span>
                    <span>{freq.label}</span>
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="max-w-md bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 md:px-16 py-4 md:py-6 rounded-full text-lg md:text-2xl"
              >
                Continuar
              </button>
            </div>
          </div>
        )

      case 8:
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
                value={quizData.age === 0 ? "" : quizData.age.toString()}
                onChange={(e) => updateQuizData("age", Number.parseInt(e.target.value) || 0)}
                className="w-full p-3 sm:p-4 text-lg sm:text-xl text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 font-bold focus:border-lime-500 focus:outline-none placeholder:text-gray-500"
                placeholder="Sua idade"
              />
            </div>
          </div>
        )

      case 9:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é a sua altura?</h2>
            </div>
            <div className="space-y-6">
              <div className="border-2 border-white/10 rounded-lg p-4 bg-white/5 backdrop-blur-sm focus-within:border-lime-500 transition-colors flex items-center justify-center relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={`Altura em metros (ex: 1.75 ou 1,75)`}
                  value={quizData.height}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^\d.,]/g, "")
                    setQuizData({ ...quizData, height: cleaned })
                  }}
                  onBlur={(e) => {
                    const normalized = normalizeHeight(e.target.value)
                    updateQuizData("height", normalized)
                  }}
                  className="bg-transparent border-0 text-white text-center text-6xl font-bold focus:outline-none focus:ring-0 [&::placeholder]:text-gray-400 placeholder:text-xl flex-1"
                />
                <span className="text-gray-400 text-2xl ml-4">cm</span>
              </div>
            </div>
          </div>
        )

      case 10:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu peso atual?</h2>
            </div>
            <div className="space-y-6">
              <div className="relative border-2 border-white/10 rounded-2xl p-6 bg-white/5 backdrop-blur-sm transition-all duration-300 focus-within:border-lime-500 flex items-center justify-between">
                <div className="flex-1 flex justify-center">
                  <Input
                    type="number"
                    placeholder="80"
                    value={quizData.weight}
                    onChange={(e) => updateQuizData("weight", e.target.value)}
                    min="1"
                    max="500"
                    step="0.1"
                    inputMode="decimal"
                    className="bg-transparent border-0 text-white text-center text-6xl font-bold focus:outline-none focus:ring-0 w-auto max-w-[200px] [&::placeholder]:text-gray-400"
                  />
                </div>
                <span className="text-gray-400 text-2xl font-bold ml-4">kg</span>
              </div>
            </div>
          </div>
        )

      case 11:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu objetivo de peso?</h2>
            </div>
            <div className="space-y-6">
              <div className="relative border-2 border-white/10 rounded-2xl p-6 bg-white/5 backdrop-blur-sm transition-all duration-300 focus-within:border-lime-500 flex items-center justify-between">
                <div className="flex-1 flex justify-center">
                  <Input
                    type="number"
                    placeholder="75"
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
                    className="bg-transparent border-0 text-white text-center text-6xl font-bold focus:outline-none focus:ring-0 w-auto max-w-[200px] [&::placeholder]:text-gray-400"
                  />
                </div>
                <span className="text-gray-400 text-2xl font-bold ml-4">kg</span>
              </div>
            </div>
          </div>
        )

      case 12:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual seu nível de experiência com treinamento de força?</h2>
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
                    nextStep()
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    quizData.strengthTraining === option.value
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

      case 13:
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
                { value: "love", label: "Amo cardio!" },
                { value: "neutral", label: "Posso fazer, mas não é minha prioridade" },
                { value: "avoid", label: "Prefiro evitar" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("cardioFeeling", option.value)
                    nextStep()
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    quizData.cardioFeeling === option.value
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-white/10 bg-white/5 hover:border-lime-500/50 backdrop-blur-sm"
                  }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 14:
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
                { value: "love", label: "Adoro flexões e exercícios de força!" },
                { value: "neutral", label: "Posso fazer, mas não é minha prioridade" },
                { value: "modify", label: "Preciso de modificações" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("strengthFeeling", option.value)
                    nextStep()
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    quizData.strengthFeeling === option.value
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-white/10 bg-white/5 hover:border-lime-500/50 backdrop-blur-sm"
                  }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 15:
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
                { value: "love", label: "Adoro alongar!" },
                { value: "neutral", label: "Posso fazer, mas não é minha prioridade" },
                { value: "skip", label: "Prefiro pular" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateQuizData("stretchingFeeling", option.value)
                    nextStep()
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    quizData.stretchingFeeling === option.value
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-white/10 bg-white/5 hover:border-lime-500/50 backdrop-blur-sm"
                  }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 16:
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
                { value: "no-motivation", label: "Falta de motivação", icon: "🎯" },
                { value: "no-plan", label: "Não tinha um plano claro", icon: "📅" },
                { value: "too-hard", label: "Meus treinos eram muito difíceis", icon: "🏋️" },
                { value: "bad-training", label: "Treinamento ruim", icon: "👤" },
                { value: "high-cholesterol", label: "Colesterol alto", icon: "❤️" },
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
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    quizData.previousProblems.includes(option.value)
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-white/10 bg-white/5 hover:border-lime-500/50 backdrop-blur-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-white text-left">{option.label}</span>
                    </div>
                    <div
                      className={`w-6 h-6 rounded border-2 ${
                        quizData.previousProblems.includes(option.value) ? "bg-white border-white" : "border-gray-400"
                      }`}
                    >
                      {quizData.previousProblems.includes(option.value) && (
                        <CheckCircle className="h-4 w-4 text-lime-500" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  updateQuizData("previousProblems", [])
                  console.log("[v0] 'Não tenho' clicked, advancing to motivation page")
                  nextStep()
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                  quizData.previousProblems.length === 0
                    ? "border-red-500 bg-red-500/10"
                    : "border-white/10 bg-white/5 hover:border-red-500/50 backdrop-blur-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">❌</span>
                  <span className="text-white text-left">Não, eu não tenho</span>
                </div>
                {quizData.previousProblems.length === 0 && (
                  <div className="w-6 h-6 rounded border-2 bg-white border-white">
                    <CheckCircle className="h-4 w-4 text-lime-500" />
                  </div>
                )}
              </button>
            </div>
            <Button
              onClick={() => {
                console.log("[v0] Continue button clicked on case 17, currentStep:", currentStep)
                console.log("[v0] Selected problems:", quizData.previousProblems)
                nextStep()
              }}
              className="group relative w-full max-w-md mx-auto overflow-hidden"
            >
              <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                <span className="relative z-10">Continuar</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              </div>
            </Button>
          </div>
        )

      case 17:
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
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  quizData.letMadMusclesChoose ? "bg-lime-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    quizData.letMadMusclesChoose ? "translate-x-7" : "translate-x-1"
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
                  {["Brócolis", "Couve-flor", "Cebola", "Pimentão", "Beringela", "Repolho", "Pepino", "Tomate"].map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() => {
                          const current = quizData.foodPreferences.vegetables
                          const updated = current.includes(item)
                            ? current.filter((i) => i !== item)
                            : [...current, item]
                          updateQuizData("foodPreferences", { ...quizData.foodPreferences, vegetables: updated })
                        }}
                        className={`px-4 py-2 rounded-full border-2 transition-all ${
                          quizData.foodPreferences.vegetables.includes(item)
                            ? "border-lime-500 bg-lime-500/20 text-white"
                            : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Grains */}
              <div>
                <h3 className="text-white font-bold mb-3">Grão</h3>
                <div className="flex flex-wrap gap-2">
                  {["Arroz", "Quinoa", "Cuscuz", "Grãos de painço", "Fubá", "Farinha"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.grains
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, grains: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${
                        quizData.foodPreferences.grains.includes(item)
                          ? "border-lime-500 bg-lime-500/20 text-white"
                          : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
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
                  {["Abacate", "Feijões", "Ovos", "Cogumelos", "Queijo tipo cottage", "Leite", "Leite vegetal"].map(
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
                        className={`px-4 py-2 rounded-full border-2 transition-all ${
                          quizData.foodPreferences.ingredients.includes(item)
                            ? "border-lime-500 bg-lime-500/20 text-white"
                            : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Meats and Fish - Optional */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold">Carnes e peixes</h3>
                  <span className="text-gray-400 text-sm">Opcional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Peru", "Carne bovina", "Frango", "Frutos do mar", "Carne de porco", "Peixe"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.meats
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, meats: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${
                        quizData.foodPreferences.meats.includes(item)
                          ? "border-lime-500 bg-lime-500/20 text-white"
                          : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
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
                      className={`px-4 py-2 rounded-full border-2 transition-all ${
                        quizData.foodPreferences.fruits.includes(item)
                          ? "border-lime-500 bg-lime-500/20 text-white"
                          : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
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
              <Button onClick={nextStep} className="group relative">
                <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                  <span className="relative z-10">Continuar</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                </div>
              </Button>
            </div>
          </div>
        )

      case 18:
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
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    quizData.equipment.includes(option.value)
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-white/10 bg-white/5 hover:border-lime-500/50 backdrop-blur-sm"
                  }`}
                >
                  <span className="text-white">{option.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={nextStep}
              disabled={quizData.equipment.length === 0}
              className="w-full py-6 px-12 rounded-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold text-lg transition-all shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 disabled:shadow-none"
            >
              Continuar
            </button>
          </div>
        )

      case 19:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu tempo disponível para treino?</h2>
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
                    nextStep()
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    quizData.workoutTime === option.value
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

      case 20:
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
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  quizData.letMadMusclesChoose ? "bg-lime-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    quizData.letMadMusclesChoose ? "translate-x-7" : "translate-x-1"
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
                  {["Brócolis", "Couve-flor", "Cebola", "Pimentão", "Beringela", "Repolho", "Pepino", "Tomate"].map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() => {
                          const current = quizData.foodPreferences.vegetables
                          const updated = current.includes(item)
                            ? current.filter((i) => i !== item)
                            : [...current, item]
                          updateQuizData("foodPreferences", { ...quizData.foodPreferences, vegetables: updated })
                        }}
                        className={`px-4 py-2 rounded-full border-2 transition-all ${
                          quizData.foodPreferences.vegetables.includes(item)
                            ? "border-lime-500 bg-lime-500/20 text-white"
                            : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Grains */}
              <div>
                <h3 className="text-white font-bold mb-3">Grão</h3>
                <div className="flex flex-wrap gap-2">
                  {["Arroz", "Quinoa", "Cuscuz", "Grãos de painço", "Fubá", "Farinha"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.grains
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, grains: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${
                        quizData.foodPreferences.grains.includes(item)
                          ? "border-lime-500 bg-lime-500/20 text-white"
                          : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
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
                  {["Abacate", "Feijões", "Ovos", "Cogumelos", "Queijo tipo cottage", "Leite", "Leite vegetal"].map(
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
                        className={`px-4 py-2 rounded-full border-2 transition-all ${
                          quizData.foodPreferences.ingredients.includes(item)
                            ? "border-lime-500 bg-lime-500/20 text-white"
                            : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Meats and Fish - Optional */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold">Carnes e peixes</h3>
                  <span className="text-gray-400 text-sm">Opcional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Peru", "Carne bovina", "Frango", "Frutos do mar", "Carne de porco", "Peixe"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const current = quizData.foodPreferences.meats
                        const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
                        updateQuizData("foodPreferences", { ...quizData.foodPreferences, meats: updated })
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all ${
                        quizData.foodPreferences.meats.includes(item)
                          ? "border-lime-500 bg-lime-500/20 text-white"
                          : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
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
                      className={`px-4 py-2 rounded-full border-2 transition-all ${
                        quizData.foodPreferences.fruits.includes(item)
                          ? "border-lime-500 bg-lime-500/20 text-white"
                          : "border-orange-500 bg-transparent text-white hover:bg-orange-500/10"
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
              <Button onClick={nextStep} className="group relative">
                <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                  <span className="relative z-10">Continuar</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                </div>
              </Button>
            </div>
          </div>
        )

      case 21:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Possui alergias ou restrições alimentares?</h2>
            </div>
            <div className="space-y-4">
              <div
                className={`bg-white/5 backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 ${
                  quizData.allergies === "sim" ? "border-2 border-lime-500 bg-lime-500/10" : "border border-white/10"
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
                className={`bg-white/5 backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-3 sm:space-x-4 ${
                  quizData.allergies === "nao" ? "border-2 border-lime-500 bg-lime-500/10" : "border border-white/10"
                }`}
                onClick={() => {
                  updateQuizData("allergies", "nao")
                  setCurrentStep(24) // Go to supplement question (case 24)
                }}
              >
                <X
                  className={`h-6 w-6 flex-shrink-0 ${quizData.allergies === "nao" ? "text-red-500" : "text-gray-500"}`}
                />
                <h3 className="text-lg font-bold text-white">Não, não possuo alergias ou restrições</h3>
              </div>
            </div>
          </div>
        )

      case 22:
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
                className="bg-white/5 backdrop-blur-sm border-white/20 text-white min-h-32"
              />
            </div>
            <div className="flex justify-center">
              <Button onClick={nextStep} className="group relative">
                <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                  <span className="relative z-10">Continuar</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                </div>
              </Button>
            </div>
          </div>
        )

      case 23:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Podemos adicionar algum suplemento à sua dieta?</h2>
              <p className="text-gray-300">Por exemplo: Hipercalórico, Whey Protein...</p>
            </div>

            {(() => {
              const isEctomorph = quizData.bodyType === "ectomorfo"
              const hasHighBodyFat = quizData.gender === "mulher" ? quizData.bodyFat > 30 : quizData.bodyFat > 20
              const hasBellyProblem = quizData.problemAreas.includes("Barriga")

              const recommendedSupplement =
                isEctomorph && !hasHighBodyFat && !hasBellyProblem ? "Hipercalórico" : "Whey Protein"

              return (
                <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-4 text-center">
                  <p className="text-lime-400 font-semibold">💡 Recomendamos: {recommendedSupplement}</p>
                </div>
              )
            })()}

            <div className="space-y-4">
              <button
                type="button"
                className={`w-full bg-white/5 backdrop-blur-sm rounded-lg p-6 transition-all flex items-center space-x-3 sm:space-x-4 border-2 hover:border-lime-400 cursor-pointer ${
                  quizData.wantsSupplement === "sim" ? "border-lime-500 bg-lime-500/10" : "border-white/10"
                }`}
                onClick={() => {
                  const isEctomorph = quizData.bodyType === "ectomorfo"
                  const hasHighBodyFat = quizData.gender === "mulher" ? quizData.bodyFat > 30 : quizData.bodyFat > 20
                  const hasBellyProblem = quizData.problemAreas.includes("Barriga")

                  let supplementType = "whey-protein"
                  if (isEctomorph && !hasHighBodyFat && !hasBellyProblem) {
                    supplementType = "hipercalorico"
                  }

                  updateQuizData("wantsSupplement", "sim")
                  updateQuizData("supplement", supplementType)
                  updateQuizData("supplementType", supplementType)
                  nextStep()
                }}
              >
                <CheckCircle
                  className={`h-6 w-6 flex-shrink-0 ${quizData.wantsSupplement === "sim" ? "text-lime-500" : "text-gray-500"}`}
                />
                <h3 className="text-lg font-bold text-white">Sim, quero adicionar suplementos</h3>
              </button>

              <button
                type="button"
                className={`w-full bg-white/5 backdrop-blur-sm rounded-lg p-6 transition-all flex items-center space-x-3 sm:space-x-4 border-2 hover:border-red-400 cursor-pointer ${
                  quizData.wantsSupplement === "nao" ? "border-red-500 bg-red-500/10" : "border-white/10"
                }`}
                onClick={() => {
                  updateQuizData("wantsSupplement", "nao")
                  updateQuizData("supplement", "nao")
                  updateQuizData("supplementType", "nao")
                  nextStep()
                }}
              >
                <X
                  className={`h-6 w-6 flex-shrink-0 ${quizData.wantsSupplement === "nao" ? "text-red-500" : "text-gray-500"}`}
                />
                <h3 className="text-lg font-bold text-white">Não, prefiro sem suplementos</h3>
              </button>
            </div>
          </div>
        )

      case 24:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Quantos dias você irá treinar por semana?</h2>
              <p className="text-gray-300">Selecione de 1 a 7 dias</p>
            </div>
            <div className="text-center space-y-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
                    <span className="text-white font-bold">{quizData.trainingDays} dias</span>
                  </div>
                  <div className="px-4">
                    <Slider
                      value={[Number.parseInt(quizData.trainingDays)]} // Ensure value is number for Slider
                      onValueChange={(value) => updateQuizData("trainingDays", value[0].toString())}
                      max={7}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-gray-400 text-sm mt-2">
                      <span>1 dia</span>
                      <span>7 dias</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <Button onClick={nextStep} disabled={!canProceed()} className="group relative disabled:opacity-50">
                  <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                    <span className="relative z-10">Continuar</span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )

      case 25:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Qual é o seu nome?</h2>
            </div>
            <div className="space-y-6">
              <div className="border-2 border-white/10 rounded-lg p-4 bg-white/5 backdrop-blur-sm focus-within:border-lime-500 transition-colors">
                <Input
                  type="text"
                  placeholder="Digite seu nome"
                  value={quizData.name}
                  onChange={(e) => updateQuizData("name", e.target.value)}
                  className="bg-transparent border-0 text-white text-center text-xl focus:outline-none [&::placeholder]:text-gray-400"
                />
              </div>
            </div>
          </div>
        )

      case 26:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Digite o seu e-mail</h2>
              {/* Changed placeholder to gray */}
              <p className="text-gray-400">Para receber seu plano personalizado</p>
            </div>
            <div className="space-y-6">
              <div className="border-2 border-white/10 rounded-lg p-4 bg-white/5 backdrop-blur-sm focus-within:border-lime-500 transition-colors">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={quizData.email}
                  onChange={(e) => updateQuizData("email", e.target.value)}
                  className="bg-transparent border-0 text-white text-center text-xl focus:outline-none [&::placeholder]:text-gray-400"
                />
              </div>
            </div>
          </div>
        )
      default:
        return <div>Passo não encontrado</div>
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!quizData.gender
      case 2:
        return !!quizData.bodyType
      case 3:
        return quizData.goal.length > 0
      case 4:
        return quizData.bodyFat >= 5 && quizData.bodyFat <= 45
      case 5:
        return quizData.problemAreas.length > 0
      case 6:
        return !!quizData.diet
      case 7:
        return quizData.sugarFrequency && quizData.sugarFrequency.length > 0
      case 8:
        return !!quizData.waterIntake // Assuming waterIntake is a required field now
      case 9:
        return !!quizData.age && quizData.age >= 16
      case 10:
        return !!quizData.height && Number.parseFloat(quizData.height.replace(",", ".")) > 0
      case 11:
        return !!quizData.weight && Number.parseFloat(quizData.weight) > 0
      case 12:
        return !!quizData.targetWeight && Number.parseFloat(quizData.targetWeight) > 0
      case 13:
        return !!quizData.strengthTraining
      case 14:
        return !!quizData.cardioFeeling
      case 15:
        return !!quizData.strengthFeeling
      case 16:
        return !!quizData.stretchingFeeling
      case 17: // Now relates to previousProblems
        return true // Always can proceed since "Não, eu não tenho" is an option
      case 18: // Now relates to additionalGoals (was case 19)
        return quizData.additionalGoals.length > 0
      case 19: // Equipment (was case 20)
        return quizData.equipment.length > 0
      case 20: // Workout time (was case 21)
        return quizData.workoutTime !== ""
      case 21: // Food preferences (was case 22)
        // Allow proceeding if toggle is on, or if some preferences are selected
        return (
          quizData.letMadMusclesChoose ||
          quizData.foodPreferences.vegetables.length > 0 ||
          quizData.foodPreferences.grains.length > 0 ||
          quizData.foodPreferences.ingredients.length > 0 ||
          quizData.foodPreferences.meats.length > 0 ||
          quizData.foodPreferences.fruits.length > 0
        )
      // </CHANGE>
      case 22: // Allergies question (was case 23)
        return !!quizData.allergies
      case 23: // Allergy details (was case 24)
        return quizData.allergyDetails.trim().length > 0
      case 24: // Supplement question (was case 25)
        return !!quizData.wantsSupplement
      case 25: // Training days (was case 26)
        return quizData.trainingDays !== "" && Number.parseInt(quizData.trainingDays) >= 1
      case 26: // Name (was case 27)
        return !!quizData.name && quizData.name.trim().length > 0
      case 27: // Email (was case 28)
        return !!quizData.email && quizData.email.includes("@")

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
              {currentStep} de {totalSteps}
            </p>
          </div>
          <div className="w-16" />
        </div>
        <div className="w-full bg-white/10 backdrop-blur-sm rounded-full h-2 mb-8">
          <div
            className="bg-lime-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="mb-8">{renderStep()}</div>
        {/* Updated the exclusion list based on the new step numbering and logic */}
        {![1, 2, 3, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].includes(currentStep) && (
          <div className="flex justify-center">
            {currentStep === 27 ? ( // This should be currentStep === 27 now
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl font-bold rounded-full disabled:opacity-50 shadow-2xl shadow-lime-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-lime-400"
              >
                <div className="relative px-12 md:px-20 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
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
              <Button onClick={nextStep} disabled={!canProceed()} className="group relative disabled:opacity-50">
                <div className="relative px-8 md:px-16 py-4 md:py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-lg md:text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300">
                  <span className="relative z-10">Continuar</span>

                  {/* Efeito de brilho animado */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-shine opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
