import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin SDK
const apps = getApps()
let app

if (apps.length === 0) {
  // Parse the service account key from environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}")

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
} else {
  app = apps[0]
}

// Export admin instances
export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
