import * as admin from "firebase-admin"

// Verifica se o app já foi inicializado para evitar erros em hot-reloads
if (!admin.apps.length) {
  try {
    // A chave da conta de serviço deve ser passada como uma string JSON
    // obtida da variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    
    if (!serviceAccountKey) {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY não está definida. Firebase Admin não será inicializado.")
      // Não lançar erro - permitir que a aplicação continue sem Firebase em tempo de build
    } else {
      const serviceAccount = JSON.parse(serviceAccountKey)

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Se você tiver um databaseURL para Realtime Database, adicione aqui
        // databaseURL: "https://<YOUR_DATABASE_NAME>.firebaseio.com"
      })
      console.log("Firebase Admin SDK initialized successfully.")
    }
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error)
    // Não lançar erro durante build - a aplicação pode continuar
  }
}

const db = admin.firestore()

export { db }
