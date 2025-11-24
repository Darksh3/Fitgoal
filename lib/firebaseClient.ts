"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, onAuthStateChanged, type User, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { useEffect, useState } from "react"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined

function initializeFirebase() {
  // Se já inicializou, retornar instâncias existentes
  if (app && authInstance && dbInstance) {
    return { app, auth: authInstance, db: dbInstance }
  }

  // Verificar configuração
  const hasRequiredConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)

  if (!hasRequiredConfig) {
    console.warn("⚠️ Firebase configuration incomplete")
    return { app: undefined, auth: undefined, db: undefined }
  }

  try {
    // Inicializar app se ainda não existe
    if (!app) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
      console.log("✅ Firebase app initialized")
    }

    // Inicializar Auth se ainda não existe
    if (!authInstance && app) {
      authInstance = getAuth(app)
      console.log("✅ Firebase Auth initialized")
    }

    // Inicializar Firestore se ainda não existe
    if (!dbInstance && app) {
      dbInstance = getFirestore(app)
      console.log("✅ Firestore initialized")
    }

    return { app, auth: authInstance, db: dbInstance }
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error)
    return { app: undefined, auth: undefined, db: undefined }
  }
}

// Criar um Proxy para inicialização lazy
const createLazyProxy = <T extends object>(getter: () => T | undefined, name: string): T => {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = getter()
      if (!instance) {
        throw new Error(`${name} is not initialized. Make sure Firebase configuration is correct.`)
      }
      return (instance as any)[prop]
    },
  })
}

// Exportar proxies que inicializam sob demanda
export const auth = createLazyProxy(() => {
  const { auth } = initializeFirebase()
  return auth
}, "Firebase Auth")

export const db = createLazyProxy(() => {
  const { db } = initializeFirebase()
  return db
}, "Firestore")

export { app, onAuthStateChanged }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const { auth: authInstance } = initializeFirebase()

      if (!authInstance) {
        console.warn("⚠️ Firebase Auth not available")
        setLoading(false)
        return
      }

      const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
        setUser(currentUser)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error("❌ Error in auth listener:", error)
      setLoading(false)
    }
  }, [])

  return { user, loading }
}
