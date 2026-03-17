import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin SDK only if service account key is available
const apps = getApps()
let app
let adminAuth
let adminDb

if (apps.length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey)
      
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
      
      adminAuth = getAuth(app)
      adminDb = getFirestore(app)
    } catch (error) {
      console.error("Erro ao inicializar Firebase Admin SDK:", error)
    }
  }
} else {
  app = apps[0]
  adminAuth = getAuth(app)
  adminDb = getFirestore(app)
}

// Export admin instances (may be undefined if not initialized)
export { adminAuth, adminDb }
