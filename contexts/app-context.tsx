"use client"

import type React from "react"
import { createContext, useReducer, useEffect, useCallback, useMemo, useContext, type ReactNode } from "react"
import { auth, db, onAuthStateChanged, type User, doc, getDoc, setDoc, onSnapshot } from "@/lib/firebase-local"
import { safeLocalStorage } from "@/lib/performance-utils"
import { errorHandler } from "@/lib/error-handler"

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
  completedAt?: string
  version?: number
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
  generatedAt?: string
  version?: number
}

interface WorkoutPlan {
  days?: any[]
  weeklySchedule?: string
  tips?: string[]
  generatedAt?: string
  version?: number
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
  lastUpdated?: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: number
}

interface AppState {
  // Auth state
  user: User | null
  isAuthenticated: boolean
  authLoading: boolean

  // User data with caching
  quizData: QuizData | null
  dietPlan: DietPlan | null
  workoutPlan: WorkoutPlan | null
  progressData: ProgressData

  // Cache management
  cache: Map<string, CacheEntry<any>>
  lastSyncTime: number

  // UI state
  isDemoMode: boolean
  isGeneratingPlans: boolean
  isOnline: boolean

  // Error state
  error: string | null
  retryCount: number

  // Loading states
  loadingQuizData: boolean
  loadingPlans: boolean
  syncing: boolean

  // Real-time subscriptions
  subscriptions: Map<string, () => void>
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
  | { type: "SET_ONLINE_STATUS"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING_QUIZ_DATA"; payload: boolean }
  | { type: "SET_LOADING_PLANS"; payload: boolean }
  | { type: "SET_SYNCING"; payload: boolean }
  | { type: "UPDATE_CACHE"; payload: { key: string; data: any; version?: number } }
  | { type: "CLEAR_CACHE" }
  | { type: "SET_LAST_SYNC_TIME"; payload: number }
  | { type: "INCREMENT_RETRY_COUNT" }
  | { type: "RESET_RETRY_COUNT" }
  | { type: "ADD_SUBSCRIPTION"; payload: { key: string; unsubscribe: () => void } }
  | { type: "REMOVE_SUBSCRIPTION"; payload: string }
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
  cache: new Map(),
  lastSyncTime: 0,
  isDemoMode: false,
  isGeneratingPlans: false,
  isOnline: true,
  error: null,
  retryCount: 0,
  loadingQuizData: false,
  loadingPlans: false,
  syncing: false,
  subscriptions: new Map(),
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
      return {
        ...state,
        quizData: action.payload,
        loadingQuizData: false,
        cache: action.payload
          ? new Map(state.cache).set("quizData", {
              data: action.payload,
              timestamp: Date.now(),
              version: action.payload.version || 1,
            })
          : state.cache,
      }

    case "SET_DIET_PLAN":
      return {
        ...state,
        dietPlan: action.payload,
        cache: action.payload
          ? new Map(state.cache).set("dietPlan", {
              data: action.payload,
              timestamp: Date.now(),
              version: action.payload.version || 1,
            })
          : state.cache,
      }

    case "SET_WORKOUT_PLAN":
      return {
        ...state,
        workoutPlan: action.payload,
        cache: action.payload
          ? new Map(state.cache).set("workoutPlan", {
              data: action.payload,
              timestamp: Date.now(),
              version: action.payload.version || 1,
            })
          : state.cache,
      }

    case "SET_PROGRESS_DATA":
      const updatedProgress = { ...state.progressData, ...action.payload, lastUpdated: new Date().toISOString() }
      return {
        ...state,
        progressData: updatedProgress,
        cache: new Map(state.cache).set("progressData", {
          data: updatedProgress,
          timestamp: Date.now(),
          version: 1,
        }),
      }

    case "SET_ONLINE_STATUS":
      return { ...state, isOnline: action.payload }

    case "SET_SYNCING":
      return { ...state, syncing: action.payload }

    case "UPDATE_CACHE":
      const newCache = new Map(state.cache)
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now(),
        version: action.payload.version || 1,
      })
      return { ...state, cache: newCache }

    case "CLEAR_CACHE":
      return { ...state, cache: new Map() }

    case "SET_LAST_SYNC_TIME":
      return { ...state, lastSyncTime: action.payload }

    case "INCREMENT_RETRY_COUNT":
      return { ...state, retryCount: state.retryCount + 1 }

    case "RESET_RETRY_COUNT":
      return { ...state, retryCount: 0 }

    case "ADD_SUBSCRIPTION":
      const newSubscriptions = new Map(state.subscriptions)
      newSubscriptions.set(action.payload.key, action.payload.unsubscribe)
      return { ...state, subscriptions: newSubscriptions }

    case "REMOVE_SUBSCRIPTION":
      const updatedSubscriptions = new Map(state.subscriptions)
      const unsubscribe = updatedSubscriptions.get(action.payload)
      if (unsubscribe) {
        unsubscribe()
        updatedSubscriptions.delete(action.payload)
      }
      return { ...state, subscriptions: updatedSubscriptions }

    case "RESET_STATE":
      // Clean up subscriptions
      state.subscriptions.forEach((unsubscribe) => unsubscribe())
      return { ...initialState, authLoading: false }

    default:
      return state
  }
}

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
    syncData: () => Promise<void>
    getCachedData: <T>(key: string) => T | null
    invalidateCache: (key?: string) => void
    subscribeToUserData: () => void
    unsubscribeFromUserData: () => void
  }
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: "SET_ONLINE_STATUS", payload: true })
      if (state.user) {
        syncData()
      }
    }

    const handleOffline = () => {
      dispatch({ type: "SET_ONLINE_STATUS", payload: false })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [state.user])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch({ type: "SET_USER", payload: user })

      if (user) {
        await loadUserData(user)
        subscribeToUserData(user)
      } else {
        unsubscribeFromUserData()
        const demoMode = safeLocalStorage.getItem("demoMode")
        if (demoMode === "true") {
          dispatch({ type: "SET_DEMO_MODE", payload: true })
          loadDemoData()
        }
      }
    })

    return unsubscribe
  }, [])

  const loadUserData = useCallback(
    async (user?: User) => {
      const currentUser = user || state.user
      if (!currentUser || !db) return

      dispatch({ type: "SET_LOADING_QUIZ_DATA", payload: true })
      dispatch({ type: "SET_ERROR", payload: null })

      try {
        // Check cache first
        const cachedQuizData = getCachedData<QuizData>("quizData")
        const cachedDietPlan = getCachedData<DietPlan>("dietPlan")
        const cachedWorkoutPlan = getCachedData<WorkoutPlan>("workoutPlan")

        // Use cached data if available and recent (less than 5 minutes old)
        const cacheAge = Date.now() - (state.cache.get("quizData")?.timestamp || 0)
        if (cachedQuizData && cacheAge < 5 * 60 * 1000) {
          dispatch({ type: "SET_QUIZ_DATA", payload: cachedQuizData })
          if (cachedDietPlan) dispatch({ type: "SET_DIET_PLAN", payload: cachedDietPlan })
          if (cachedWorkoutPlan) dispatch({ type: "SET_WORKOUT_PLAN", payload: cachedWorkoutPlan })
          dispatch({ type: "SET_LOADING_QUIZ_DATA", payload: false })
          return
        }

        const userDocRef = doc(db, "users", currentUser.uid)
        const docSnap = await getDoc(userDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()

          if (data.quizData) {
            dispatch({ type: "SET_QUIZ_DATA", payload: { ...data.quizData, version: data.quizData.version || 1 } })
          }

          if (data.dietPlan) {
            dispatch({ type: "SET_DIET_PLAN", payload: { ...data.dietPlan, version: data.dietPlan.version || 1 } })
          }

          if (data.workoutPlan) {
            dispatch({
              type: "SET_WORKOUT_PLAN",
              payload: { ...data.workoutPlan, version: data.workoutPlan.version || 1 },
            })
          }

          dispatch({ type: "SET_LAST_SYNC_TIME", payload: Date.now() })
          dispatch({ type: "RESET_RETRY_COUNT" })

          // Auto-generate plans if missing
          if (data.quizData && (!data.dietPlan || !data.workoutPlan)) {
            await generatePlans()
          }
        } else {
          loadLocalStorageData()
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        errorHandler.handleError(error, "Loading user data")

        dispatch({ type: "INCREMENT_RETRY_COUNT" })

        // Exponential backoff retry
        if (state.retryCount < 3) {
          setTimeout(() => loadUserData(currentUser), Math.pow(2, state.retryCount) * 1000)
        } else {
          loadLocalStorageData()
        }
      } finally {
        dispatch({ type: "SET_LOADING_QUIZ_DATA", payload: false })
      }
    },
    [state.user, state.cache, state.retryCount],
  )

  const subscribeToUserData = useCallback(
    (user: User) => {
      if (!db) return

      const userDocRef = doc(db, "users", user.uid)
      const unsubscribe = onSnapshot(
        userDocRef,
        (doc) => {
          if (doc.exists()) {
            const data = doc.data()

            // Only update if data has changed (version check)
            if (data.quizData && (!state.quizData || data.quizData.version > (state.quizData.version || 0))) {
              dispatch({ type: "SET_QUIZ_DATA", payload: data.quizData })
            }

            if (data.dietPlan && (!state.dietPlan || data.dietPlan.version > (state.dietPlan.version || 0))) {
              dispatch({ type: "SET_DIET_PLAN", payload: data.dietPlan })
            }

            if (
              data.workoutPlan &&
              (!state.workoutPlan || data.workoutPlan.version > (state.workoutPlan.version || 0))
            ) {
              dispatch({ type: "SET_WORKOUT_PLAN", payload: data.workoutPlan })
            }
          }
        },
        [state.quizData, state.dietPlan, state.workoutPlan],
      )

      dispatch({ type: "ADD_SUBSCRIPTION", payload: { key: "userData", unsubscribe } })
    },
    [state.quizData, state.dietPlan, state.workoutPlan],
  )

  const unsubscribeFromUserData = useCallback(() => {
    dispatch({ type: "REMOVE_SUBSCRIPTION", payload: "userData" })
  }, [])

  const syncData = useCallback(async () => {
    if (!state.user || !db || !state.isOnline) return

    dispatch({ type: "SET_SYNCING", payload: true })

    try {
      const userDocRef = doc(db, "users", state.user.uid)

      // Prepare data for sync with version increment
      const syncData: any = {}

      if (state.quizData) {
        syncData.quizData = { ...state.quizData, version: (state.quizData.version || 0) + 1 }
      }

      if (state.progressData.lastUpdated) {
        syncData.progressData = state.progressData
      }

      if (Object.keys(syncData).length > 0) {
        await setDoc(userDocRef, syncData, { merge: true })
        dispatch({ type: "SET_LAST_SYNC_TIME", payload: Date.now() })
      }
    } catch (error) {
      console.error("Sync error:", error)
      errorHandler.handleError(error, "Data synchronization")
    } finally {
      dispatch({ type: "SET_SYNCING", payload: false })
    }
  }, [state.user, state.quizData, state.progressData, state.isOnline])

  const getCachedData = useCallback(
    <T,>(key: string): T | null => {
      const cached = state.cache.get(key)
      if (!cached) return null

      // Check if cache is still valid (1 hour)
      const isValid = Date.now() - cached.timestamp < 60 * 60 * 1000
      return isValid ? cached.data : null
    },
    [state.cache],
  )

  const invalidateCache = useCallback(
    (key?: string) => {
      if (key) {
        const newCache = new Map(state.cache)
        newCache.delete(key)
        dispatch({ type: "UPDATE_CACHE", payload: { key: "temp", data: null } })
      } else {
        dispatch({ type: "CLEAR_CACHE" })
      }
    },
    [state.cache],
  )

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

  const actions = useMemo(
    () => ({
      loadUserData: () => loadUserData(),
      generatePlans,
      updateProgressData,
      setError,
      signOut,
      enterDemoMode,
      exitDemoMode,
      syncData,
      getCachedData,
      invalidateCache,
      subscribeToUserData: () => subscribeToUserData(state.user!),
      unsubscribeFromUserData,
    }),
    [loadUserData, state.user],
  )

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
