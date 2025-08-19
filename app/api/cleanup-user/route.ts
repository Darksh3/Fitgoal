import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    console.log(`[CLEANUP] Iniciando limpeza completa para email: ${email}`)

    // 1. Buscar usuário no Firebase Auth
    let authUser = null
    try {
      authUser = await adminAuth.getUserByEmail(email)
      console.log(`[CLEANUP] Usuário encontrado no Auth: ${authUser.uid}`)
    } catch (error) {
      console.log(`[CLEANUP] Usuário não encontrado no Auth: ${error}`)
    }

    // 2. Limpar dados do Firestore
    const collections = ["users", "leads"]

    for (const collectionName of collections) {
      try {
        if (authUser) {
          // Deletar por UID
          const docRef = adminDb.collection(collectionName).doc(authUser.uid)
          const doc = await docRef.get()
          if (doc.exists) {
            await docRef.delete()
            console.log(`[CLEANUP] Documento deletado: ${collectionName}/${authUser.uid}`)
          }
        }

        // Buscar e deletar por email
        const querySnapshot = await adminDb.collection(collectionName).where("email", "==", email).get()

        for (const doc of querySnapshot.docs) {
          await doc.ref.delete()
          console.log(`[CLEANUP] Documento deletado por email: ${collectionName}/${doc.id}`)
        }

        // Buscar por quizData.email também
        const quizQuerySnapshot = await adminDb.collection(collectionName).where("quizData.email", "==", email).get()

        for (const doc of quizQuerySnapshot.docs) {
          await doc.ref.delete()
          console.log(`[CLEANUP] Documento deletado por quizData.email: ${collectionName}/${doc.id}`)
        }
      } catch (error) {
        console.error(`[CLEANUP] Erro ao limpar coleção ${collectionName}:`, error)
      }
    }

    // 3. Deletar usuário do Firebase Auth
    if (authUser) {
      try {
        await adminAuth.deleteUser(authUser.uid)
        console.log(`[CLEANUP] Usuário deletado do Auth: ${authUser.uid}`)
      } catch (error) {
        console.error(`[CLEANUP] Erro ao deletar usuário do Auth:`, error)
      }
    }

    // 4. Limpar dados do Stripe (se existir)
    try {
      // Buscar customer no Stripe por email e deletar
      // Isso seria implementado se necessário
      console.log(`[CLEANUP] Limpeza do Stripe seria feita aqui se necessário`)
    } catch (error) {
      console.error(`[CLEANUP] Erro na limpeza do Stripe:`, error)
    }

    console.log(`[CLEANUP] Limpeza completa finalizada para: ${email}`)

    return NextResponse.json({
      success: true,
      message: "Limpeza completa realizada com sucesso",
      details: {
        authUserFound: !!authUser,
        authUserDeleted: !!authUser,
        collectionsCleared: collections,
      },
    })
  } catch (error) {
    console.error("[CLEANUP] Erro na limpeza:", error)
    return NextResponse.json({ error: "Erro interno na limpeza", details: error.message }, { status: 500 })
  }
}
