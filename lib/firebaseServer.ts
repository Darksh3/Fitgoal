import * as admin from "firebase-admin"

// Verifica se o app já foi inicializado para evitar erros em hot-reloads
if (!admin.apps.length) {
  try {
    // A chave da conta de serviço deve ser passada como uma string JSON
    // obtida da variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Se você tiver um databaseURL para Realtime Database, adicione aqui
      // databaseURL: "https://<YOUR_DATABASE_NAME>.firebaseio.com"
    })
    console.log("Firebase Admin SDK initialized successfully.")
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error)
    // É importante que o erro seja visível para depuração
    throw new Error("Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY.")
  }
}

const db = admin.firestore()

export { db }
