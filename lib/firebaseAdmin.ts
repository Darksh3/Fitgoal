import * as admin from "firebase-admin"

// Inicializa Firebase Admin somente quando houver chave de serviço disponível
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

  if (serviceAccountKey) {
    try {
      let serviceAccount: admin.ServiceAccount

      try {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, "base64").toString("utf8"))
      } catch (error) {
        serviceAccount = JSON.parse(serviceAccountKey)
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log("Firebase Admin SDK inicializado com sucesso.")
    } catch (error) {
      console.error("Erro ao inicializar Firebase Admin SDK:", error)
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY não está definida. O Firebase Admin não será inicializado.")
  }
}

const adminDb = admin.apps.length > 0 ? admin.firestore() : null
const auth = admin.apps.length > 0 ? admin.auth() : null

export function getFirebaseAdmin() {
  return admin
}

export { adminDb, auth, admin, admin as firebaseAdmin, adminDb as db }

