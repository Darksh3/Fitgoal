import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin SDK
const apps = getApps()
let app

if (apps.length === 0) {
  console.log("[v0] Initializing Firebase Admin SDK...")

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error("[v0] FIREBASE_SERVICE_ACCOUNT_KEY is missing!")
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required")
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("[v0] NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing!")
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is required")
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    console.log("[v0] Service account parsed successfully, project:", serviceAccount.project_id)

    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })

    console.log("[v0] Firebase Admin initialized successfully")
  } catch (error) {
    console.error("[v0] Failed to initialize Firebase Admin:", error)
    throw new Error(
      "Failed to initialize Firebase Admin SDK: " + (error instanceof Error ? error.message : "Unknown error"),
    )
  }
} else {
  app = apps[0]
  console.log("[v0] Using existing Firebase Admin app")
}

// Export admin instances
export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)

console.log("[v0] Firebase Admin exports ready:", { adminAuth: !!adminAuth, adminDb: !!adminDb })
