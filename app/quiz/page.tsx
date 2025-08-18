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
import { validateQuizData, sanitizeString } from "@/lib/validation"
import { handleError, handleFirebaseError } from "@/lib/error-handler"
import { ErrorBoundary } from "@/components/error-boundary"
import { BodyIllustration } from "@/components/body-illustration"
import { ExerciseIllustration } from "@/components/exercise-illustration"

interface QuizData {
  gender: string
  age?: number
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
  height: string
  heightUnit: string
  currentWeight: string
  targetWeight: string
  weightUnit: string
  timeToGoal: string
  name: string
  importantEvent: string
  eventDate: string
  workoutTime: string
  experience: string
  equipment: string[]
  trainingDaysPerWeek: number
  email?: string
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
  height: "",
  heightUnit: "cm",
  currentWeight: "",
  targetWeight: "",
  weightUnit: "kg",
  timeToGoal: "",
  name: "",
  importantEvent: "",
  eventDate: "",
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
  imc: 0, // Inicializa com valor padrão
  imcClassification: "", // Inicializa com valor padrão
  imcStatus: "", // Inicializa com valor padrão
  age: 0,
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
  const [totalSteps, setTotalSteps] = useState(25) // Increased from 24 to 25 to accommodate age question
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const updateQuizData = (field: keyof QuizData, value: any) => {
    setQuizData((prev) => ({ ...prev, [field]: value }))
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

  const calculateIMC = () => {
    const height = Number.parseFloat(quizData.height) / 100
    const weight = Number.parseFloat(quizData.currentWeight)
    if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) return { imc: 0, classification: "", status: "" }

    const imc = weight / (height * height)
    let classification = ""
    let status = ""

    if (imc < 18.5) {
      classification = "abaixo do peso"
      status = "Você está abaixo do peso ideal. É recomendado ganhar peso de forma saudável."
    } else if (imc >= 18.5 && imc < 25) {
      classification = "numa faixa saudável"
      status = "Parabéns! Você está numa faixa de peso saudável."
    } else if (imc >= 25 && imc < 30) {
      classification = "com sobrepeso"
      status = "Você está com sobrepeso. É recomendado perder peso para melhorar sua saúde."
    } else {
      classification = "com obesidade"
      status = "Você está com obesidade. É importante buscar orientação médica e nutricional."
    }

    return { imc: Math.round(imc * 10) / 10, classification, status }
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

      // Chama a API para gerar e salvar planos (a API salvará no Firestore)
      console.log("generateAndSavePlan: Chamando API /api/generate-plan...")
      const controller = new AbortController()
      // Aumentar o tempo limite para 120 segundos (2 minutos)
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.warn("generateAndSavePlan: Requisição para /api/generate-plan excedeu o tempo limite (120s).")
      }, 120000) // 120 segundos

      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizData: data, // Passa o quizData completo para a API
          userId: userId, // Passa userId para a API
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const result = await response.json()
        console.log("generateAndSavePlan: API /api/generate-plan response:", result)
        // A API agora é responsável por salvar dietPlan e workoutPlan no Firestore
        // Não é necessário salvá-los aqui novamente.
      } else {
        const errorData = await response.json()
        console.error("generateAndSavePlan: Erro da API /api/generate-plan:", {
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
      // Updated from step 10 to 11
      setCurrentStep(13) // Updated from 12 to 13
    } else if (currentStep === 14) {
      // Updated from step 13 to 14
      const timeToGoal = calculateTimeToGoal()
      updateQuizData("timeToGoal", timeToGoal)
      if (timeToGoal) {
        setShowTimeCalculation(true)
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else if (currentStep === 15) {
      // Updated from step 14 to 15
      if (quizData.importantEvent !== "nenhum") {
        setCurrentStep(16) // Updated from 15 to 16
      } else {
        setCurrentStep(17) // Updated from 16 to 17
      }
    } else if (currentStep === 16) {
      // Updated from step 15 to 16
      setCurrentStep(17) // Updated from 16 to 17
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      if (currentStep === 13 && quizData.allergies === "nao") {
        // Updated from step 12 to 13
        setCurrentStep(11) // Updated from 10 to 11
      } else if (currentStep === 16) {
        // Updated from step 15 to 16
        setCurrentStep(15) // Updated from 14 to 15
      } else if (currentStep === 17) {
        // Updated from step 16 to 17
        if (quizData.importantEvent !== "nenhum") {
          setCurrentStep(16) // Updated from 15 to 16
        } else {
          setCurrentStep(15) // Updated from 14 to 15
        }
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {}

    switch (currentStep) {
      case 1: // Gender
        if (!quizData.gender) {
          errors.gender = "Selecione seu gênero"
        }
        break
      case 2: // Age
        if (!quizData.age || quizData.age < 16 || quizData.age > 100) {
          errors.age = "Idade deve estar entre 16 e 100 anos"
        }
        break
      case 24: // Name
        if (!quizData.name?.trim()) {
          errors.name = "Nome é obrigatório"
        } else if (quizData.name.trim().length < 2) {
          errors.name = "Nome deve ter pelo menos 2 caracteres"
        }
        break
      case 25: // Email
        if (quizData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quizData.email)) {
          errors.email = "Email inválido"
        }
        break
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return
    }

    setIsSubmitting(true)

    try {
      const sanitizedData = {
        ...quizData,
        name: sanitizeString(quizData.name || ""),
        allergyDetails: sanitizeString(quizData.allergyDetails || ""),
        importantEvent: sanitizeString(quizData.importantEvent || ""),
      }

      const validation = validateQuizData(sanitizedData)
      if (!validation.success && validation.errors) {
        setValidationErrors(validation.errors)
        return
      }

      // Save to localStorage first (as backup)
      localStorage.setItem("quizData", JSON.stringify(sanitizedData))

      // Try to save to Firebase if user is authenticated
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid)
          await setDoc(
            userDocRef,
            {
              quizData: sanitizedData,
              updatedAt: new Date(),
              isSetupComplete: true,
            },
            { merge: true },
          )

          console.log("[v0] Quiz data saved to Firestore successfully")
        } catch (firebaseError) {
          handleFirebaseError(firebaseError, "Salvamento no Firebase")
          // Continue with localStorage data
        }
      }

      // Navigate to results
      router.push("/quiz/results")
    } catch (error) {
      handleError(error, "Finalização do quiz")
    } finally {
      setIsSubmitting(false)
    }
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
      case 14:
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
      case 15:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Você tem algum evento importante chegando?</h2>
            </div>
            <div className="space-y-4">
              {[
                { value: "ferias", label: "Férias", icon: "🏖️" },
                { value: "casamento", label: "Casamento", icon: "💒" },
                { value: "formatura", label: "Formatura", icon: "🎓" },
                { value: "aniversario", label: "Aniversário", icon: "🎂" },
                { value: "outro", label: "Outro evento", icon: "🎉" },
                { value: "nenhum", label: "Nenhum evento específico", icon: "📅" },
              ].map((event) => (
                <div
                  key={event.value}
                  className={`bg-gray-800 rounded-lg p-6 cursor-pointer transition-all flex items-center space-x-4 ${
                    quizData.importantEvent === event.value ? "border-2 border-lime-500" : "border border-gray-700"
                  }`}
                  onClick={() => updateQuizData("importantEvent", event.value)}
                >
                  <span className="text-2xl">{event.icon}</span>
                  <h3 className="text-lg font-bold text-white">{event.label}</h3>
                </div>
              ))}
            </div>
          </div>
        )
      case 16:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Quando é o seu evento?</h2>
            </div>
            <div className="space-y-6">
              <Input
                type="date"
                value={quizData.eventDate}
                onChange={(e) => updateQuizData("eventDate", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white text-center text-xl"
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
                { value: "15-30", label: "15-30 minutos" },
                { value: "30-45", label: "30-45 minutos" },
                { value: "45-60", label: "45-60 minutos" },
                { value: "mais-1h", label: "Mais de 1 hora" },
                { value: "flexivel", label: "Tempo flexível" },
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
      case 23: // NOVO PASSO: Dias de treino por semana (antigo 23)
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
      case 24: // NOVO PASSO: Qual é o seu nome? (antigo 22)
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
      case 25: // Antigo passo 24, agora 24 (último passo)
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

  const canProceed = () => {
    const isStepValid = () => {
      switch (currentStep) {
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
          return quizData.height !== ""
        case 11:
          return quizData.allergies !== ""
        case 12:
          return quizData.allergyDetails.trim() !== ""
        case 13:
          return quizData.currentWeight !== ""
        case 14:
          return quizData.targetWeight !== ""
        case 15:
          return quizData.importantEvent !== ""
        case 16:
          return quizData.eventDate !== ""
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
          return quizData.name.trim() !== ""
        case 25:
          return quizData.email?.trim() !== "" && quizData.email.includes("@")
        default:
          return false
      }
    }

    return isStepValid()
  }

  return (
    <ErrorBoundary>
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

          {Object.keys(validationErrors).length > 0 && (
            <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
              <h4 className="font-semibold mb-2">Erro de Validação:</h4>
              {Object.values(validationErrors).map((error, index) => (
                <p key={index} className="text-sm">
                  {error}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            {currentStep === totalSteps ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-4 text-lg rounded-full disabled:opacity-50"
              >
                {isSubmitting ? "Finalizando..." : "Finalizar Quiz"}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-4 text-lg rounded-full disabled:opacity-50"
              >
                Continuar
              </Button>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
