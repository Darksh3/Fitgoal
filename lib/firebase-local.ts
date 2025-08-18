"use client"

import React from "react"

interface User {
  uid: string
  email: string | null
  displayName: string | null
}

interface AuthState {
  currentUser: User | null
  loading: boolean
}

// Mock Firebase Auth
class MockAuth {
  private currentUser: User | null = null
  private listeners: ((user: User | null) => void)[] = []

  constructor() {
    // Check localStorage for demo mode or existing user
    if (typeof window !== "undefined") {
      const demoMode = localStorage.getItem("demoMode")
      const savedUser = localStorage.getItem("mockUser")

      if (demoMode === "true" || savedUser) {
        this.currentUser = savedUser
          ? JSON.parse(savedUser)
          : {
              uid: "demo-user-123",
              email: "demo@example.com",
              displayName: "Demo User",
            }
      }
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.listeners.push(callback)
    // Immediately call with current state
    setTimeout(() => callback(this.currentUser), 0)

    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) this.listeners.splice(index, 1)
    }
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    // Mock successful login
    const user: User = {
      uid: `user-${Date.now()}`,
      email,
      displayName: email.split("@")[0],
    }

    this.currentUser = user
    if (typeof window !== "undefined") {
      localStorage.setItem("mockUser", JSON.stringify(user))
    }

    this.listeners.forEach((listener) => listener(user))
    return { user }
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    return this.signInWithEmailAndPassword(email, password)
  }

  async signInAnonymously() {
    const user: User = {
      uid: `anonymous-${Date.now()}`,
      email: null,
      displayName: "Anonymous User",
    }

    this.currentUser = user
    if (typeof window !== "undefined") {
      localStorage.setItem("mockUser", JSON.stringify(user))
    }

    this.listeners.forEach((listener) => listener(user))
    return { user }
  }

  async sendPasswordResetEmail(email: string) {
    // Mock password reset - just log for demo purposes
    console.log(`[Firebase Mock] Password reset email sent to: ${email}`)
    return Promise.resolve()
  }

  async signOut() {
    this.currentUser = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("mockUser")
      localStorage.removeItem("demoMode")
    }
    this.listeners.forEach((listener) => listener(null))
  }

  get user() {
    return this.currentUser
  }
}

// Mock Firestore
class MockFirestore {
  private data: { [collection: string]: { [doc: string]: any } } = {}

  doc(collection: string, docId: string) {
    return {
      get: async () => {
        const docData = this.data[collection]?.[docId]
        return {
          exists: () => !!docData,
          data: () => docData,
          id: docId,
        }
      },
      set: async (data: any) => {
        if (!this.data[collection]) this.data[collection] = {}
        this.data[collection][docId] = { ...data, id: docId }

        // Also save to localStorage for persistence
        if (typeof window !== "undefined") {
          localStorage.setItem(`firestore_${collection}_${docId}`, JSON.stringify(data))
        }
      },
      update: async (data: any) => {
        if (!this.data[collection]) this.data[collection] = {}
        this.data[collection][docId] = { ...this.data[collection][docId], ...data }

        if (typeof window !== "undefined") {
          const existing = localStorage.getItem(`firestore_${collection}_${docId}`)
          const updated = existing ? { ...JSON.parse(existing), ...data } : data
          localStorage.setItem(`firestore_${collection}_${docId}`, JSON.stringify(updated))
        }
      },
    }
  }

  collection(name: string) {
    return {
      add: async (data: any) => {
        const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        if (!this.data[name]) this.data[name] = {}
        this.data[name][docId] = { ...data, id: docId }
        return { id: docId }
      },
      doc: (docId: string) => this.doc(name, docId),
    }
  }
}

// Create instances
const auth = new MockAuth()
const db = new MockFirestore()

// Firebase functions
export const onAuthStateChanged = (auth: MockAuth, callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback)
}

export const signInWithEmailAndPassword = (auth: MockAuth, email: string, password: string) => {
  return auth.signInWithEmailAndPassword(email, password)
}

export const createUserWithEmailAndPassword = (auth: MockAuth, email: string, password: string) => {
  return auth.createUserWithEmailAndPassword(email, password)
}

export const signOut = (auth: MockAuth) => {
  return auth.signOut()
}

export const sendPasswordResetEmail = (auth: MockAuth, email: string) => {
  return auth.sendPasswordResetEmail(email)
}

export const signInAnonymously = (auth: MockAuth) => {
  return auth.signInAnonymously()
}

// Firestore functions
export const doc = (db: MockFirestore, collection: string, docId: string) => {
  return db.doc(collection, docId)
}

export const getDoc = async (docRef: any) => {
  return docRef.get()
}

export const setDoc = async (docRef: any, data: any) => {
  return docRef.set(data)
}

export const updateDoc = async (docRef: any, data: any) => {
  return docRef.update(data)
}

export const collection = (db: MockFirestore, name: string) => {
  return db.collection(name)
}

export const onSnapshot = (docRef: any, callback: (doc: any) => void) => {
  // Mock implementation that calls callback immediately with current data
  const mockSnapshot = {
    exists: () => true,
    data: () => docRef.data || {},
    id: docRef.id || "mock-doc",
  }

  // Call callback immediately
  setTimeout(() => callback(mockSnapshot), 0)

  // Return unsubscribe function
  return () => {
    // Mock unsubscribe - no actual listener to remove
  }
}

// Export instances
export { auth, db }

// React hook for auth state
export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
