import * as admin from "firebase-admin"

// Verifica se o Firebase Admin SDK já foi inicializado
if (!admin.apps.length) {
  try {
    // Tenta inicializar com as credenciais do ambiente Vercel
    // A variável FIREBASE_SERVICE_ACCOUNT_KEY deve conter o JSON da chave de serviço
    // Se for base64-encoded (comum em Vercel), o JSON.parse() ainda funcionará após a decodificação.
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
      // Se falhar, tenta parsear diretamente como JSON (para desenvolvimento local ou se já for JSON puro)
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
const auth = admin.auth()

// Exporta todas as instâncias necessárias
export { adminDb, auth, admin, admin as firebaseAdmin, adminDb as db }
