"use client"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"

import { Input } from "@/components/ui/input"

import { Checkbox } from "@/components/ui/checkbox"

import { Slider } from "@/components/ui/slider"

import { Textarea } from "@/components/ui/textarea"

import { ArrowLeft, CheckCircle, Droplets, X, ThumbsUp, ThumbsDown, Meh } from "lucide-react"

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

export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [quizData, setQuizData] = useState<QuizData>(initialQuizData)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showNutritionInfo, setShowNutritionInfo] = useState(false)
  const [showWaterCongrats, setShowWaterCongrats] = useState(false)
  const [showTimeCalculation, setShowTimeCalculation] = useState(false)
  const [showIMCResult, setShowIMCResult] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [totalSteps, setTotalSteps] = useState(24)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)

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
    const newData = { ...quizData, [key]: value }

    if (key === "currentWeight" || key === "height") {
      const weight = Number.parseFloat(key === "currentWeight" ? value : newData.currentWeight)
      const height = Number.parseFloat(key === "height" ? value : newData.height)

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
      return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/5069027231916993985__1_-removebg-preview-meirS7AMEWh0XiARXP09Dhmcm3HBpL.png"
    }
    return "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/5073348832305196416-removebg-preview-c2B0IQxyCy9PETajQazkUsY1uKc79s.png"
  }

  const getBodyTypeImageForFocus = () => {
    const isWoman = quizData.gender === "mulher"
    const bodyType = quizData.bodyType
    if (!bodyType) return getBodyImage(quizData.gender)

    switch (bodyType) {
      case "ectomorfo":
        return isWoman ? "/images/female-ectomorph-real-new.png" : "/images/male-ectomorph-real-new.png"
      case "mesomorfo":
        return isWoman ? "/images/female-mesomorph-real-new.png" : "/images/male-mesomorph-real-new.png"
      case "endomorfo":
        return isWoman ? "/images/female-endomorph-real-new.png" : "/images/male-endomorph-real-new.png"
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
    setShowLoading(true)
    if (!currentUser || !currentUser.uid) {
      console.error("handleSubmit: No user ID available. Cannot save quiz data or generate plans.")
      alert("Erro: Não foi possível identificar o usuário. Tente novamente.")
      setShowLoading(false)
      return
    }

    try {
      const { imc, classification, status } = calculateIMC(
        Number.parseFloat(quizData.currentWeight),
        Number.parseFloat(quizData.height),
      )
      // Atualiza quizData com os resultados do IMC antes de enviar para a API
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

      const saved = await generateAndSavePlan(updatedQuizData, currentUser.uid) // Passa os dados atualizados
      console.log("handleSubmit: generateAndSavePlan retornou:", saved)

      if (!saved) {
        alert("Erro ao gerar seu plano. Tente novamente.")
        return
      }

      if (imc > 0) {
        setShowIMCResult(true)
      } else {
        setShowSuccess(true)
      }
    } catch (error) {
      console.error("handleSubmit: Erro no handleSubmit:", error)
      alert("Erro inesperado. Tente novamente.")
    } finally {
      console.log("handleSubmit: Finalizando, definindo showLoading para false.")
      setShowLoading(false)
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
        return gender === "female" ? "/images/female-ectomorph-real-new.png" : "/images/male-ectomorph-real-new.png"
      }
      if (type === "ectomorfo") {
        return gender === "female" ? "/images/female-ectomorfo-real-new.png" : "/images/male-ectomorfo-real-new.png"
      }
      if (type === "mesomorfo") {
        return gender === "female" ? "/images/female-mesomorfo-real-new.png" : "/images/male-mesomorfo-real-new.png"
      }
      if (type === "endomorfo") {
        return gender === "female" ? "/images/female-endomorfo-real-new.png" : "/images/male-endomorfo-real-new.png"
      }
      return gender === "female" ? "/images/female-ectomorfo-real-new.png" : "/images/male-ectomorfo-real-new.png"
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
          return isWoman ? "/images/female-cardio-real.png" : "/images/male-cardio-real.png"
        case "pullups":
          return isWoman ? "/images/female-pullup-real.png" : "/images/male-pullup-real.png"
        case "yoga":
          return isWoman ? "/images/female-stretching-real.png" : "/images/male-stretching-real.png"
        default:
          return isWoman ? "/images/female-cardio-real.png" : "/images/male-cardio-real.png"
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

  if (showIMCResult) {
    const { imc, classification, status } = calculateIMC(
      Number.parseFloat(quizData.currentWeight),
      Number.parseFloat(quizData.height),
    )
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <BodyIllustration className="w-48 h-64 mx-auto" gender={quizData.gender === "mulher" ? "female" : "male"} />
          <h2 className="text-3xl font-bold">Resultado do seu IMC</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-300 text-lg mb-4">
              Calculamos o seu IMC e ele é de <span className="text-lime-400 font-bold">{imc}</span>
            </p>
            <p className="text-white text-xl mb-4">
              Você está <span className="text-lime-400 font-bold">{classification}</span>
            </p>
            <p className="text-gray-300 text-sm">{status}</p>
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
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-shine opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Button>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-white mb-2">Seu plano de treino personalizado está pronto!</h2>
          </div>
          <Button
            onClick={() => {
              setShowSuccess(false)
              // Removendo parâmetros da URL para manter limpa
              router.push("/quiz/results")
            }}
            className="w-full bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white py-6 px-8 text-xl font-bold rounded-full shadow-2xl shadow-lime-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-lime-400"
          >
            Ver Resultados
          </Button>
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
          <p className="text-gray-300 text-lg">Para obter os maiores ganhos em massa muscular e força, você precisa:</p>
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual o seu gênero?</h2>
            </div>
            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
              {[
                { value: "homem", label: "Homem", icon: "/images/male-gender-icon.png" },
                { value: "mulher", label: "Mulher", icon: "/images/female-gender-icon.png" },
              ].map((gender) => (
                <div
                  key={gender.value}
                  className="text-center space-y-4 cursor-pointer"
                  onClick={() => updateQuizData("gender", gender.value)}
                >
                  <div className="flex justify-center items-center h-40">
                    <img
                      src={gender.icon || "/placeholder.svg"}
                      alt={gender.label}
                      className="w-24 h-24 object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div
                    className={`bg-gray-800 rounded-lg p-4 transition-all ${
                      quizData.gender === gender.value ? "border-2 border-lime-500" : "border border-gray-700"
                    }`}
                  >
                    <h3 className="text-xl font-bold text-white">{gender.label}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual a sua idade?</h2>
            </div>
            <div className="max-w-md mx-auto">
              <input
                type="number"
                min="16"
                max="80"
                value={quizData.age || ""}
                onChange={(e) => updateQuizData("age", Number.parseInt(e.target.value) || 0)}
                className="w-full p-4 text-xl text-center bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-lime-500 focus:outline-none"
                placeholder="Digite sua idade"
              />
            </div>
          </div>
        )
      case 3:
        const getBodyTypeImage = (type: string) => {
          const isWoman = quizData.gender === "mulher"
          switch (type) {
            case "ectomorfo":
              return isWoman ? "/images/female-ectomorph-real-new.png" : "/images/male-ectomorph-real-new.png"
            case "mesomorfo":
              return isWoman ? "/images/female-mesomorph-real-new.png" : "/images/male-mesomorph-real-new.png"
            case "endomorfo":
              return isWoman ? "/images/female-endomorph-real-new.png" : "/images/male-endomorph-real-new.png"
            default:
              return "/placeholder.svg"
          }
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual o seu tipo de Corpo?</h2>
            </div>
            <div className="space-y-6">
              {[
                { value: "ectomorfo", label: "Ectomorfo", desc: "Corpo magro, dificuldade para ganhar peso" },
                { value: "mesomorfo", label: "Mesomorfo", desc: "Corpo atlético, facilidade para ganhar músculos" },
                { value: "endomorfo", label: "Endomorfo", desc: "Corpo mais largo, tendência a acumular gordura" },
              ].map((type) => (
                <div
                  key={type.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                    quizData.bodyType === type.value ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => updateQuizData("bodyType", type.value)}
                >
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{type.label}</h3>
                    <p className="text-gray-400 text-lg">{type.desc}</p>
                  </div>
                  <div className="flex-shrink-0 ml-6">
                    <img
                      src={getBodyTypeImage(type.value) || "/placeholder.svg"}
                      alt={`${type.label} body type`}
                      className="w-32 h-48 object-contain"
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
      case 4:
        const getGoalIcon = (goalValue: string) => {
          switch (goalValue) {
            case "perder-peso":
              return "/images/calories-icon.png"
            case "ganhar-massa":
              return quizData.gender === "mulher" ? "/images/slim-body-icon.png" : "/images/body-icon.png"
            case "melhorar-saude":
              return "/images/better-health-icon.png"
            case "aumentar-resistencia":
              return "/images/training-icon.png"
            default:
              return "/placeholder.svg"
          }
        }
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Quais são os seus objetivos?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-4">
              {[
                { value: "perder-peso", label: "Perder peso e queimar gordura" },
                { value: "ganhar-massa", label: "Ganhar massa muscular e definir o corpo" },
                { value: "melhorar-saude", label: "Melhorar minha saúde, disposição e bem-estar" },
                { value: "aumentar-resistencia", label: "Aumentar a minha resistência física e condicionamento" },
              ].map((goal) => (
                <div
                  key={goal.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                    quizData.goal.includes(goal.value) ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => handleArrayUpdate("goal", goal.value, !quizData.goal.includes(goal.value))}
                >
                  <h3 className="text-xl font-bold text-white">{goal.label}</h3>
                  <img
                    src={getGoalIcon(goal.value) || "/placeholder.svg"}
                    alt={goal.label}
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Escolha o seu nível de gordura corporal</h2>
            </div>
            <div className="text-center space-y-8">
              <BodyIllustration
                className="w-32 h-40 mx-auto"
                gender={quizData.gender === "mulher" ? "female" : "male"}
              />
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-full px-4 py-2 inline-block">
                  <span className="text-white font-bold">{quizData.bodyFat}%</span>
                </div>
                <div className="px-4">
                  <Slider
                    value={[quizData.bodyFat]}
                    onValueChange={(value) => updateQuizData("bodyFat", value[0])}
                    max={45}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-gray-400 text-sm mt-2">
                    <span>5-9%</span>
                    <span>{">40%"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 6:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual área você quer focar mais?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="flex items-center justify-center space-x-8">
              <div className="relative">
                <img
                  src={getBodyTypeImageForFocus() || "/placeholder.svg"}
                  alt={`Corpo ${quizData.gender === "mulher" ? "feminino" : "masculino"} ${quizData.bodyType}`}
                  className="w-64 h-auto object-contain"
                />
                {quizData.problemAreas.includes("Peito") && (
                  <div
                    className="absolute bg-orange-500/70 rounded-lg animate-pulse"
                    style={{
                      top: "22%",
                      left: "35%",
                      width: "30%",
                      height: "18%",
                    }}
                  />
                )}
                {quizData.problemAreas.includes("Braços") && (
                  <>
                    <div
                      className="absolute bg-orange-500/70 rounded-lg animate-pulse"
                      style={{
                        top: "20%",
                        left: "15%",
                        width: "15%",
                        height: "35%",
                      }}
                    />
                    <div
                      className="absolute bg-orange-500/70 rounded-lg animate-pulse"
                      style={{
                        top: "20%",
                        right: "15%",
                        width: "15%",
                        height: "35%",
                      }}
                    />
                  </>
                )}
                {quizData.problemAreas.includes("Barriga") && (
                  <div
                    className="absolute bg-orange-500/70 rounded-lg animate-pulse"
                    style={{
                      top: "40%",
                      left: "32%",
                      width: "36%",
                      height: "25%",
                    }}
                  />
                )}
                {quizData.problemAreas.includes("Pernas") && (
                  <>
                    <div
                      className="absolute bg-orange-500/70 rounded-lg animate-pulse"
                      style={{
                        top: "65%",
                        left: "28%",
                        width: "18%",
                        height: "35%",
                      }}
                    />
                    <div
                      className="absolute bg-orange-500/70 rounded-lg animate-pulse"
                      style={{
                        top: "65%",
                        right: "28%",
                        width: "18%",
                        height: "35%",
                      }}
                    />
                  </>
                )}
                {quizData.problemAreas.includes("Corpo inteiro") && (
                  <div
                    className="absolute bg-orange-500/50 rounded-lg animate-pulse"
                    style={{
                      top: "15%",
                      left: "15%",
                      width: "70%",
                      height: "80%",
                    }}
                  />
                )}
              </div>
              <div className="space-y-4 flex-1 max-w-sm">
                {["Peito", "Braços", "Barriga", "Pernas", "Corpo inteiro"].map((area) => (
                  <div
                    key={area}
                    className={`rounded-lg p-4 cursor-pointer transition-all border-2 ${
                      quizData.problemAreas.includes(area)
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-white hover:border-orange-500"
                    }`}
                    onClick={() => handleArrayUpdate("problemAreas", area, !quizData.problemAreas.includes(area))}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{area}</h3>
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          quizData.problemAreas.includes(area) ? "bg-white border-white" : "border-gray-400"
                        }`}
                      >
                        {quizData.problemAreas.includes(area) && <CheckCircle className="h-4 w-4 text-orange-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 7:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Você segue alguma dessas dietas?</h2>
            </div>
            <div className="space-y-4">
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
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                    quizData.diet === diet.value ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => updateQuizData("diet", diet.value)}
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
                  quizData.diet === "nao-sigo" ? "border-2 border-lime-500" : "border border-gray-700"
                }`}
                onClick={() => updateQuizData("diet", "nao-sigo")}
              >
                <h3 className="text-lg font-bold text-white">Não, não sigo nenhuma dessas dietas</h3>
                <X className="h-6 w-6 text-lime-500" />
              </div>
            </div>
          </div>
        )
      case 8:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">
                Com qual frequência você consome doces ou bebidas alcoólicas?
              </h2>
              <p className="text-gray-300">Selecione todas que se aplicam</p>
            </div>
            <div className="space-y-3">
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
          </div>
        )
      case 9:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Quantidade diária de água</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "menos-2", label: "Menos de 2 copos", desc: "até 0,5 l", icon: Droplets },
                { value: "2-6", label: "2-6 copos", desc: "0,5-1,5 l", icon: Droplets },
                { value: "7-10", label: "7-10 copos", desc: "1,5-2,5 l", icon: Droplets },
                { value: "mais-10", label: "Mais de 10 copos", desc: "mais de 2,5 l", icon: Droplets },
              ].map((water) => (
                <div
                  key={water.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all ${
                    quizData.waterIntake === water.value ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => updateQuizData("waterIntake", water.value)}
                >
                  <div className="flex items-center space-x-4">
                    <water.icon className="h-6 w-6 text-blue-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{water.label}</h3>
                      <p className="text-gray-400 text-sm">{water.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 10:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual é a sua altura?</h2>
            </div>
            <div className="space-y-6">
              <Input
                type="number"
                placeholder={`Altura, cm`}
                value={quizData.height}
                onChange={(e) => updateQuizData("height", e.target.value)}
                className="bg-transparent border-0 border-b-2 border-gray-600 text-white text-center text-xl rounded-none focus:border-lime-500"
              />
            </div>
          </div>
        )
      case 11:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Possui alergias ou restrições alimentares?</h2>
            </div>
            <div className="space-y-4">
              <div
                className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                  quizData.allergies === "sim" ? "border-2 border-lime-500" : "border border-gray-700"
                }`}
                onClick={() => updateQuizData("allergies", "sim")}
              >
                <h3 className="text-lg font-bold text-white">Sim, possuo alergias ou restrições</h3>
                <CheckCircle
                  className={`h-6 w-6 ${quizData.allergies === "sim" ? "text-lime-500" : "text-gray-500"}`}
                />
              </div>
              <div
                className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center justify-between ${
                  quizData.allergies === "nao" ? "border-2 border-lime-500" : "border border-gray-700"
                }`}
                onClick={() => updateQuizData("allergies", "nao")}
              >
                <h3 className="text-lg font-bold text-white">Não, não possuo alergias ou restrições</h3>
                <X className={`h-6 w-6 ${quizData.allergies === "nao" ? "text-lime-500" : "text-gray-500"}`} />
              </div>
            </div>
          </div>
        )
      case 12:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Quais são suas alergias ou restrições alimentares?</h2>
              <p className="text-gray-300">Descreva suas alergias, intolerâncias ou restrições alimentares</p>
            </div>
            <div className="space-y-6">
              <Textarea
                placeholder="Ex: Alergia a amendoim, intolerância à lactose, não como carne vermelha..."
                value={quizData.allergyDetails}
                onChange={(e) => updateQuizData("allergyDetails", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 min-h-32"
              />
            </div>
          </div>
        )

      case 13:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Podemos adicionar algum suplemento à sua dieta?</h2>
              <p className="text-gray-300">Por exemplo: Hipercalórico, Whey Protein...</p>
            </div>
            <div className="space-y-4">
              <button
                type="button"
                className={`w-full bg-gray-800 rounded-lg p-6 transition-all flex items-center justify-between border-2 hover:border-lime-400 ${
                  quizData.wantsSupplement === "sim" ? "border-lime-500" : "border-gray-700"
                }`}
                onClick={() => {
                  updateQuizData("wantsSupplement", "sim")
                  // Determine supplement type based on body type, body fat, and problem areas
                  const isEctomorph = quizData.bodyType === "ectomorfo"
                  const hasHighBodyFat = quizData.gender === "mulher" ? quizData.bodyFat > 30 : quizData.bodyFat > 20
                  const hasBellyProblem = quizData.problemAreas.includes("Barriga")

                  let supplementType = "whey-protein"
                  if (isEctomorph && !hasHighBodyFat && !hasBellyProblem) {
                    supplementType = "hipercalorico"
                  }

                  updateQuizData("supplementType", supplementType)
                }}
              >
                <h3 className="text-lg font-bold text-white">Sim, pode adicionar</h3>
                <CheckCircle
                  className={`h-6 w-6 ${quizData.wantsSupplement === "sim" ? "text-lime-500" : "text-gray-500"}`}
                />
              </button>
              <button
                type="button"
                className={`w-full bg-gray-800 rounded-lg p-6 transition-all flex items-center justify-between border-2 hover:border-lime-400 ${
                  quizData.wantsSupplement === "nao" ? "border-lime-500" : "border-gray-700"
                }`}
                onClick={() => {
                  updateQuizData("wantsSupplement", "nao")
                  updateQuizData("supplementType", "")
                }}
              >
                <h3 className="text-lg font-bold text-white">Não, prefiro sem suplementos</h3>
                <X className={`h-6 w-6 ${quizData.wantsSupplement === "nao" ? "text-lime-500" : "text-gray-500"}`} />
              </button>
            </div>
            {/* </CHANGE> */}
            {quizData.wantsSupplement === "sim" && quizData.supplementType && (
              <div className="bg-lime-500/10 border border-lime-500 rounded-lg p-4 text-center">
                <p className="text-lime-400 font-semibold">
                  Recomendamos:{" "}
                  {quizData.supplementType === "hipercalorico" ? "Hipercalórico Growth" : "Whey Protein Growth"}
                </p>
                <p className="text-gray-300 text-sm mt-2">
                  {quizData.supplementType === "hipercalorico"
                    ? "Ideal para ganho de massa muscular e atingir suas calorias diárias"
                    : "Ideal para atingir suas metas de proteína e manter a massa muscular"}
                </p>
              </div>
            )}
          </div>
        )
      // </CHANGE>

      case 14:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual é o seu peso atual?</h2>
            </div>
            <div className="space-y-6">
              <Input
                type="number"
                placeholder={`Peso atual, kg`}
                value={quizData.currentWeight}
                onChange={(e) => updateQuizData("currentWeight", e.target.value)}
                className="bg-transparent border-0 border-b-2 border-gray-600 text-white text-center text-xl rounded-none focus:border-lime-500"
              />
            </div>
          </div>
        )
      case 15:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual é o seu objetivo de peso?</h2>
            </div>
            <div className="space-y-6">
              <Input
                type="number"
                placeholder={`Peso alvo, kg`}
                value={quizData.targetWeight}
                onChange={(e) => updateQuizData("targetWeight", e.target.value)}
                className="bg-transparent border-0 border-b-2 border-gray-600 text-white text-center text-xl rounded-none focus:border-lime-500"
              />
            </div>
          </div>
        )
      case 16:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual é o seu nome?</h2>
            </div>
            <div className="space-y-6">
              <Input
                type="text"
                placeholder="Digite seu nome"
                value={quizData.name}
                onChange={(e) => updateQuizData("name", e.target.value)}
                className="bg-transparent border-0 border-b-2 border-gray-600 text-white text-center text-xl rounded-none focus:border-lime-500"
              />
            </div>
          </div>
        )
      case 17:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Quanto tempo você tem para treinar?</h2>
            </div>
            <div className="space-y-4 max-w-2xl mx-auto">
              {[
                { value: "30min", label: "30 minutos" },
                { value: "45min", label: "45 minutos" },
                { value: "1hora", label: "1 hora" },
                { value: "mais-1h", label: "Mais de 1 hora" },
              ].map((time) => (
                <div
                  key={time.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all border ${
                    quizData.workoutTime === time.value
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                  onClick={() => updateQuizData("workoutTime", time.value)}
                >
                  <h3 className="text-lg font-medium text-white text-center">{time.label}</h3>
                </div>
              ))}
            </div>
          </div>
        )
      case 18:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Qual é sua experiência com exercícios?</h2>
            </div>
            <div className="space-y-4 max-w-2xl mx-auto">
              {[
                { value: "iniciante", label: "Iniciante - Nunca treinei" },
                { value: "basico", label: "Básico - Treino ocasionalmente" },
                { value: "intermediario", label: "Intermediário - Treino regularmente" },
                { value: "avancado", label: "Avançado - Treino há anos" },
              ].map((level) => (
                <div
                  key={level.value}
                  className={`rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                    quizData.experience === level.value
                      ? "bg-teal-600/80 border border-teal-500"
                      : "bg-teal-800/40 border border-teal-700/50 hover:bg-teal-700/50"
                  }`}
                  onClick={() => updateQuizData("experience", level.value)}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      quizData.experience === level.value ? "border-white bg-white" : "border-teal-300"
                    }`}
                  >
                    {quizData.experience === level.value && <div className="w-3 h-3 rounded-full bg-teal-600" />}
                  </div>
                  <h3 className="text-lg font-medium text-white">{level.label}</h3>
                </div>
              ))}
            </div>
          </div>
        )
      case 19:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Que equipamentos você tem acesso?</h2>
              <p className="text-gray-300">Selecione todos que se aplicam</p>
            </div>
            <div className="space-y-3">
              {[
                { value: "academia", label: "Academia completa", icon: "🏋️" },
                { value: "halteres", label: "Halteres", icon: "🏋️‍♀️" },
                { value: "barras", label: "Barras para exercícios", icon: "🤸" },
                { value: "elasticos", label: "Elásticos/Faixas", icon: "🎯" },
                { value: "esteira", label: "Esteira", icon: "🏃" },
                { value: "bicicleta", label: "Bicicleta ergométrica", icon: "🚴" },
                { value: "nenhum", label: "Apenas peso corporal", icon: "🤲" },
              ].map((equipment) => (
                <div key={equipment.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={equipment.value}
                    checked={quizData.equipment.includes(equipment.value)}
                    onCheckedChange={(checked) => handleArrayUpdate("equipment", equipment.value, checked as boolean)}
                  />
                  <Label htmlFor={equipment.value} className="text-white text-lg flex items-center space-x-2">
                    <span className="text-xl">{equipment.icon}</span>
                    <span>{equipment.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )
      case 20:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Como você se sente sobre exercícios cardiovasculares?</h2>
            </div>
            <div className="flex items-center justify-center space-x-8">
              <ExerciseIllustration type="cardio" className="w-64 h-64" />
              <div className="space-y-4 flex-1 max-w-sm">
                {[
                  { value: "amo", label: "Amo cardio!", icon: ThumbsUp, color: "text-green-500" },
                  { value: "neutro", label: "É ok para mim", icon: Meh, color: "text-yellow-500" },
                  { value: "odeio", label: "Odeio cardio", icon: ThumbsDown, color: "text-red-500" },
                ].map((pref) => (
                  <div
                    key={pref.value}
                    className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                      quizData.exercisePreferences.cardio === pref.value
                        ? "border-2 border-lime-500"
                        : "border border-gray-700"
                    }`}
                    onClick={() => updateExercisePreference("cardio", pref.value)}
                  >
                    <pref.icon className={`h-6 w-6 ${pref.color}`} />
                    <h3 className="text-lg font-bold text-white">{pref.label}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 21:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Como você se sente sobre flexões e exercícios de força?</h2>
            </div>
            <div className="flex items-center justify-center space-x-8">
              <ExerciseIllustration type="pullups" className="w-64 h-64" />
              <div className="space-y-4 flex-1 max-w-sm">
                {[
                  { value: "amo", label: "Amo exercícios de força!", icon: ThumbsUp, color: "text-green-500" },
                  { value: "neutro", label: "É ok para mim", icon: Meh, color: "text-yellow-500" },
                  { value: "odeio", label: "Prefiro evitar", icon: ThumbsDown, color: "text-red-500" },
                ].map((pref) => (
                  <div
                    key={pref.value}
                    className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                      quizData.exercisePreferences.pullups === pref.value
                        ? "border-2 border-lime-500"
                        : "border border-gray-700"
                    }`}
                    onClick={() => updateExercisePreference("pullups", pref.value)}
                  >
                    <pref.icon className={`h-6 w-6 ${pref.color}`} />
                    <h3 className="text-lg font-bold text-white">{pref.label}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 22:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Como você se sente sobre yoga e alongamento?</h2>
            </div>
            <div className="flex items-center justify-center space-x-8">
              <ExerciseIllustration type="yoga" className="w-64 h-64" />
              <div className="space-y-4 flex-1 max-w-sm">
                {[
                  { value: "amo", label: "Amo yoga/alongamento!", icon: ThumbsUp, color: "text-green-500" },
                  { value: "neutro", label: "É ok para mim", icon: Meh, color: "text-yellow-500" },
                  { value: "odeio", label: "Prefiro evitar", icon: ThumbsDown, color: "text-red-500" },
                ].map((pref) => (
                  <div
                    key={pref.value}
                    className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                      quizData.exercisePreferences.yoga === pref.value
                        ? "border-2 border-lime-500"
                        : "border border-gray-700"
                    }`}
                    onClick={() => updateExercisePreference("yoga", pref.value)}
                  >
                    <pref.icon className={`h-6 w-6 ${pref.color}`} />
                    <h3 className="text-lg font-bold text-white">{pref.label}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 23:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Quantos dias você irá treinar por semana?</h2>
              <p className="text-gray-300">Selecione de 1 a 7 dias</p>
            </div>
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-full px-4 py-2 inline-block">
                  <span className="text-white font-bold">{quizData.trainingDaysPerWeek} dias</span>
                </div>
                <div className="px-4">
                  <Slider
                    value={[quizData.trainingDaysPerWeek]}
                    onValueChange={(value) => updateQuizData("trainingDaysPerWeek", value[0])}
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
          </div>
        )
      case 24:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Digite o seu e-mail</h2>
              <p className="text-gray-300">Para receber seu plano personalizado</p>
            </div>
            <div className="space-y-6">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={quizData.email}
                onChange={(e) => updateQuizData("email", e.target.value)}
                className="bg-transparent border-0 border-b-2 border-gray-600 text-white text-center text-xl rounded-none focus:border-lime-500"
              />
            </div>
          </div>
        )
      default:
        return <div>Passo não encontrado</div>
    }
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return quizData.gender !== ""
      case 2:
        return quizData.age > 0 && quizData.age >= 16 && quizData.age <= 80
      case 3:
        return quizData.bodyType !== ""
      case 4:
        return quizData.goal.length > 0
      case 5:
        return quizData.bodyFat > 0
      case 6:
        return quizData.problemAreas.length > 0
      case 7:
        return quizData.diet !== ""
      case 8:
        return quizData.sugarFrequency.length > 0
      case 9:
        return quizData.waterIntake !== ""
      case 10:
        return quizData.height !== "" && Number.parseFloat(quizData.height) > 0
      case 11:
        return quizData.allergies !== ""
      case 12:
        return quizData.allergyDetails.trim() !== ""
      case 13:
        return quizData.wantsSupplement !== ""
      case 14:
        return quizData.currentWeight !== "" && Number.parseFloat(quizData.currentWeight) > 0
      case 15:
        return quizData.targetWeight !== "" && Number.parseFloat(quizData.targetWeight) > 0
      case 16:
        return quizData.name.trim() !== ""
      case 17:
        return quizData.workoutTime !== ""
      case 18:
        return quizData.experience !== ""
      case 19:
        return quizData.equipment.length > 0
      case 20:
        return quizData.exercisePreferences.cardio !== ""
      case 21:
        return quizData.exercisePreferences.pullups !== ""
      case 22:
        return quizData.exercisePreferences.yoga !== ""
      case 23:
        return quizData.trainingDaysPerWeek >= 1 && quizData.trainingDaysPerWeek <= 7
      case 24:
        return quizData.email.trim() !== "" && quizData.email.includes("@")
      default:
        return true
    }
  }

  const canProceed = () => {
    return isStepValid(currentStep)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
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
        <div className="w-full bg-gray-700 rounded-full h-2 mb-8">
          <div
            className="bg-lime-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="mb-8">{renderStep()}</div>
        <div className="flex justify-center">
          {currentStep === totalSteps ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || !currentUser}
              className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white px-12 py-6 text-xl font-bold rounded-full disabled:opacity-50 shadow-2xl shadow-lime-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-lime-400"
            >
              Finalizar Quiz
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()} className="group relative disabled:opacity-50">
              {/* Botão principal */}
              <div className="relative px-20 py-6 bg-gradient-to-r from-lime-400 to-lime-500 rounded-full font-bold text-gray-900 text-2xl shadow-2xl hover:shadow-lime-500/50 transform hover:scale-105 transition-all duration-300 disabled:hover:scale-100 disabled:shadow-none">
                <span className="relative z-10">Continuar</span>

                {/* Efeito de brilho animado */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-shine opacity-0 group-hover:opacity-100 transition-opacity group-disabled:opacity-0" />
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
