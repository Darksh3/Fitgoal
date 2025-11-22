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

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let initializationAttempted = false

function getFirebaseApp(): FirebaseApp | null {
  if (app) return app

  if (initializationAttempted) return null

  initializationAttempted = true

  const hasRequiredConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)

  if (!hasRequiredConfig) {
    console.warn("⚠️ Firebase configuration incomplete")
    return null
  }

  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    console.log("✅ Firebase app initialized")
    return app
  } catch (error) {
    console.error("❌ Error initializing Firebase app:", error)
    return null
  }
}

function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance

  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null

  try {
    authInstance = getAuth(firebaseApp)
    console.log("✅ Firebase Auth initialized")
    return authInstance
  } catch (error) {
    console.error("❌ Error initializing Firebase Auth:", error)
    return null
  }
}

function getFirebaseDb(): Firestore | null {
  if (dbInstance) return dbInstance

  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null

  try {
    dbInstance = getFirestore(firebaseApp)
    console.log("✅ Firestore initialized")
    return dbInstance
  } catch (error) {
    console.error("❌ Error initializing Firestore:", error)
    return null
  }
}

export const auth = getFirebaseAuth()
export const db = getFirebaseDb()
export { app, onAuthStateChanged }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const firebaseAuth = getFirebaseAuth()

    if (!firebaseAuth) {
      console.warn("⚠️ Firebase Auth not available")
      setLoading(false)
      return
    }

    try {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
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
