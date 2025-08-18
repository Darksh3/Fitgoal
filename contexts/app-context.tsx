"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react"
import type { User } from "firebase/auth"
import { auth, db } from "@/lib/firebaseClient"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { safeLocalStorage } from "@/lib/performance-utils"

// Types
interface QuizData {
  gender?: string
  age?: number
  name?: string
  bodyType?: string
  goal?: string[]
  currentWeight?: string
  targetWeight?: string
  timeToGoal?: string
  workoutTime?: string
  experience?: string
  trainingDaysPerWeek?: number
  equipment?: string[]
  allergies?: string
  allergyDetails?: string
  eventDate?: string
}

interface DietPlan {
  title?: string
  calories?: string
  protein?: string
  carbs?: string
  fats?: string
  totalDailyCalories?: number
  totalProtein?: number
  totalCarbs?: number
  totalFats?: number
  meals?: any[]
  tips?: string[]
}

interface WorkoutPlan {
  days?: any[]
  weeklySchedule?: string
  tips?: string[]
}

interface ProgressData {
  consecutiveDays: number
  completedWorkouts: number
  goalsAchieved: number
  totalGoals: number
  overallProgress: number
  caloriesConsumed: number
  caloriesTarget: number
  proteins: number
  carbs: number
  fats: number
}

interface AppState {
  // Auth state
  user: User | null
  isAuthenticated: boolean
  authLoading: boolean

  // User data
  quizData: QuizData | null
  dietPlan: DietPlan | null
  workoutPlan: WorkoutPlan | null
  progressData: ProgressData

  // UI state
  isDemoMode: boolean
  isGeneratingPlans: boolean

  // Error state
  error: string | null

  // Loading states
  loadingQuizData: boolean
  loadingPlans: boolean
}

type AppAction =
  | { type: "SET_AUTH_LOADING"; payload: boolean }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_QUIZ_DATA"; payload: QuizData | null }
  | { type: "SET_DIET_PLAN"; payload: DietPlan | null }
  | { type: "SET_WORKOUT_PLAN"; payload: WorkoutPlan | null }
  | { type: "SET_PROGRESS_DATA"; payload: Partial<ProgressData> }
  | { type: "SET_DEMO_MODE"; payload: boolean }
  | { type: "SET_GENERATING_PLANS"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING_QUIZ_DATA"; payload: boolean }
  | { type: "SET_LOADING_PLANS"; payload: boolean }
  | { type: "RESET_STATE" }

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
  quizData: null,
  dietPlan: null,
  workoutPlan: null,
  progressData: {
    consecutiveDays: 0,
    completedWorkouts: 0,
    goalsAchieved: 0,
    totalGoals: 18,
    overallProgress: 0,
    caloriesConsumed: 0,
    caloriesTarget: 2200,
    proteins: 0,
    carbs: 0,
    fats: 0,
  },
  isDemoMode: false,
  isGeneratingPlans: false,
  error: null,
  loadingQuizData: false,
  loadingPlans: false,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_AUTH_LOADING":
      return { ...state, authLoading: action.payload }

    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        authLoading: false,
      }

    case "SET_QUIZ_DATA":
      return { ...state, quizData: action.payload, loadingQuizData: false }

    case "SET_DIET_PLAN":
      return { ...state, dietPlan: action.payload }

    case "SET_WORKOUT_PLAN":
      return { ...state, workoutPlan: action.payload }

    case "SET_PROGRESS_DATA":
      return {
        ...state,
        progressData: { ...state.progressData, ...action.payload },
      }

    case "SET_DEMO_MODE":
      return { ...state, isDemoMode: action.payload }

    case "SET_GENERATING_PLANS":
      return { ...state, isGeneratingPlans: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "SET_LOADING_QUIZ_DATA":
      return { ...state, loadingQuizData: action.payload }

    case "SET_LOADING_PLANS":
      return { ...state, loadingPlans: action.payload }

    case "RESET_STATE":
      return { ...initialState, authLoading: false }

    default:
      return state
  }
}

// Context
const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
  actions: {
    loadUserData: () => Promise<void>
    generatePlans: () => Promise<void>
    updateProgressData: (data: Partial<ProgressData>) => void
    setError: (error: string | null) => void
    signOut: () => Promise<void>
    enterDemoMode: () => void
    exitDemoMode: () => void
  }
} | null>(null)

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch({ type: "SET_USER", payload: user })

      if (user) {
        await loadUserData(user)
      } else {
        // Check for demo mode
        const demoMode = safeLocalStorage.getItem("demoMode")
        if (demoMode === "true") {
          dispatch({ type: "SET_DEMO_MODE", payload: true })
          loadDemoData()
        }
      }
    })

    return unsubscribe
  }, [])

  // Load user data from Firestore
  const loadUserData = async (user?: User) => {
    const currentUser = user || state.user
    if (!currentUser || !db) return

    dispatch({ type: "SET_LOADING_QUIZ_DATA", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })

    try {
      const userDocRef = doc(db, "users", currentUser.uid)
      const docSnap = await getDoc(userDocRef)

      if (docSnap.exists()) {
        const data = docSnap.data()

        if (data.quizData) {
          dispatch({ type: "SET_QUIZ_DATA", payload: data.quizData })
        }

        if (data.dietPlan) {
          dispatch({ type: "SET_DIET_PLAN", payload: data.dietPlan })
        }

        if (data.workoutPlan) {
          dispatch({ type: "SET_WORKOUT_PLAN", payload: data.workoutPlan })
        }

        // Auto-generate plans if missing
        if (data.quizData && (!data.dietPlan || !data.workoutPlan)) {
          await generatePlans()
        }
      } else {
        // Fallback to localStorage
        loadLocalStorageData()
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      dispatch({ type: "SET_ERROR", payload: "Erro ao carregar dados do usuário" })
      loadLocalStorageData()
    } finally {
      dispatch({ type: "SET_LOADING_QUIZ_DATA", payload: false })
    }
  }

  // Load data from localStorage
  const loadLocalStorageData = () => {
    const savedQuizData = safeLocalStorage.getItem("quizData")
    if (savedQuizData) {
      try {
        const quizData = JSON.parse(savedQuizData)
        dispatch({ type: "SET_QUIZ_DATA", payload: quizData })
      } catch (error) {
        console.error("Error parsing localStorage quiz data:", error)
      }
    }

    const savedProgress = safeLocalStorage.getItem("userProgress")
    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress)
        dispatch({ type: "SET_PROGRESS_DATA", payload: progressData })
      } catch (error) {
        console.error("Error parsing localStorage progress data:", error)
      }
    }
  }

  // Load demo data
  const loadDemoData = () => {
    const savedQuizData = safeLocalStorage.getItem("quizData")
    if (savedQuizData) {
      try {
        const quizData = JSON.parse(savedQuizData)
        dispatch({ type: "SET_QUIZ_DATA", payload: quizData })
      } catch (error) {
        console.error("Error parsing demo quiz data:", error)
      }
    }
  }

  // Generate plans
  const generatePlans = async () => {
    if (!state.user && !state.isDemoMode) return

    dispatch({ type: "SET_GENERATING_PLANS", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })

    try {
      const response = await fetch("/api/generate-plans-on-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: state.user?.uid,
          quizData: state.quizData,
        }),
      })

      if (response.ok) {
        // Reload user data to get the generated plans
        if (state.user) {
          await loadUserData()
        }
      } else {
        const errorData = await response.json()
        dispatch({ type: "SET_ERROR", payload: errorData.error || "Erro ao gerar planos" })
      }
    } catch (error) {
      console.error("Error generating plans:", error)
      dispatch({ type: "SET_ERROR", payload: "Erro ao gerar planos" })
    } finally {
      dispatch({ type: "SET_GENERATING_PLANS", payload: false })
    }
  }

  // Update progress data
  const updateProgressData = (data: Partial<ProgressData>) => {
    dispatch({ type: "SET_PROGRESS_DATA", payload: data })

    // Save to localStorage
    const updatedProgress = { ...state.progressData, ...data }
    safeLocalStorage.setItem("userProgress", JSON.stringify(updatedProgress))
  }

  // Set error
  const setError = (error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error })
  }

  // Sign out
  const signOut = async () => {
    try {
      if (state.isDemoMode) {
        safeLocalStorage.removeItem("demoMode")
        safeLocalStorage.removeItem("quizData")
        dispatch({ type: "SET_DEMO_MODE", payload: false })
      } else {
        await auth.signOut()
      }
      dispatch({ type: "RESET_STATE" })
    } catch (error) {
      console.error("Error signing out:", error)
      dispatch({ type: "SET_ERROR", payload: "Erro ao fazer logout" })
    }
  }

  // Enter demo mode
  const enterDemoMode = () => {
    dispatch({ type: "SET_DEMO_MODE", payload: true })
    safeLocalStorage.setItem("demoMode", "true")
    loadDemoData()
  }

  // Exit demo mode
  const exitDemoMode = () => {
    dispatch({ type: "SET_DEMO_MODE", payload: false })
    safeLocalStorage.removeItem("demoMode")
    safeLocalStorage.removeItem("quizData")
    dispatch({ type: "RESET_STATE" })
  }

  const actions = {
    loadUserData: () => loadUserData(),
    generatePlans,
    updateProgressData,
    setError,
    signOut,
    enterDemoMode,
    exitDemoMode,
  }

  return <AppContext.Provider value={{ state, dispatch, actions }}>{children}</AppContext.Provider>
}

// Hook
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}

// Convenience hooks
export function useAuth() {
  const { state } = useApp()
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    authLoading: state.authLoading,
    isDemoMode: state.isDemoMode,
  }
}

export function useUserData() {
  const { state, actions } = useApp()
  return {
    quizData: state.quizData,
    dietPlan: state.dietPlan,
    workoutPlan: state.workoutPlan,
    progressData: state.progressData,
    loadingQuizData: state.loadingQuizData,
    loadingPlans: state.loadingPlans,
    isGeneratingPlans: state.isGeneratingPlans,
    loadUserData: actions.loadUserData,
    generatePlans: actions.generatePlans,
    updateProgressData: actions.updateProgressData,
  }
}

export function useAppError() {
  const { state, actions } = useApp()
  return {
    error: state.error,
    setError: actions.setError,
  }
}
