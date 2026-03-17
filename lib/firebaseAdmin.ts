import * as admin from "firebase-admin"

// Nota: Este arquivo é mantido apenas para compatibilidade com código legado.
// Use /lib/firebase-admin.ts para novas implementações.

// Verifica se o Firebase Admin SDK já foi inicializado
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (!serviceAccountKey) {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY não está definida. Firebase Admin não será inicializado.")
      // Não lançar erro - permitir que a aplicação continue sem Firebase em tempo de build
    } else {
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
          return
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log("Firebase Admin SDK inicializado com sucesso.")
    }
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin SDK:", error)
  }
}

const adminDb = admin.firestore()
const auth = admin.auth()

// Função para obter a instância do Firebase Admin
export function getFirebaseAdmin() {
  return admin
}

// Exporta todas as instâncias necessárias
export { adminDb, auth, admin, admin as firebaseAdmin, adminDb as db }
