import * as admin from "firebase-admin"

// Verifica se o Firebase Admin SDK já foi inicializado
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (!serviceAccountKey) {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY não está definida nas variáveis de ambiente.")
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined.")
    }

    let serviceAccount: admin.ServiceAccount

    try {
      // Tenta decodificar de base64 (comum em ambientes de deploy como Vercel)
      serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, "base64").toString("utf8"))
    } catch (e) {
      // Se falhar, tenta parsear diretamente como JSON
      try {
        serviceAccount = JSON.parse(serviceAccountKey)
      } catch (parseError) {
        console.error("Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY:", parseError)
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido ou não está em base64.")
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log("Firebase Admin SDK inicializado com sucesso.")
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin SDK:", error)
  }
}

const adminDb = admin.firestore()
const adminAuth = admin.auth()

export {
  adminDb,
  adminAuth as auth,
  admin,
  // Alias para compatibilidade
  adminDb as db,
}

if (typeof window !== "undefined") {
  throw new Error("firebase-admin deve ser usado apenas no servidor!")
}
