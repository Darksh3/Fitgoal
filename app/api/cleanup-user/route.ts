import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const email = body?.email
    const userId = body?.userId

    if (!email && !userId) {
      return NextResponse.json({ error: "Email ou userId é obrigatório" }, { status: 400 })
    }

    console.log(`[CLEANUP] Iniciando cleanup. email=${email ?? "N/A"} userId=${userId ?? "N/A"}`)

    // 1) Buscar usuário no Firebase Auth (prioriza userId, depois email)
    let authUser: any = null

    if (userId) {
      try {
        authUser = await adminAuth.getUser(userId)
        console.log(`[CLEANUP] Usuário encontrado no Auth por userId: ${authUser.uid}`)
      } catch (error) {
        console.log(`[CLEANUP] Usuário não encontrado no Auth por userId: ${error}`)
      }
    }

    if (!authUser && email) {
      try {
        authUser = await adminAuth.getUserByEmail(email)
        console.log(`[CLEANUP] Usuário encontrado no Auth por email: ${authUser.uid}`)
      } catch (error) {
        console.log(`[CLEANUP] Usuário não encontrado no Auth por email: ${error}`)
      }
    }

    // 2) Limpar dados do Firestore
    const collections = ["users", "leads"]

    for (const collectionName of collections) {
      try {
        // a) deletar por UID (se tiver)
        const uidToDelete = authUser?.uid || userId
        if (uidToDelete) {
          const docRef = adminDb.collection(collectionName).doc(uidToDelete)
          const doc = await docRef.get()
          if (doc.exists) {
            await docRef.delete()
            console.log(`[CLEANUP] Documento deletado por UID: ${collectionName}/${uidToDelete}`)
          }
        }

        // b) deletar por email (se tiver)
        if (email) {
          const querySnapshot = await adminDb.collection(collectionName).where("email", "==", email).get()
          for (const doc of querySnapshot.docs) {
            await doc.ref.delete()
            console.log(`[CLEANUP] Documento deletado por email: ${collectionName}/${doc.id}`)
          }

          const quizQuerySnapshot = await adminDb
            .collection(collectionName)
            .where("quizData.email", "==", email)
            .get()

          for (const doc of quizQuerySnapshot.docs) {
            await doc.ref.delete()
            console.log(`[CLEANUP] Documento deletado por quizData.email: ${collectionName}/${doc.id}`)
          }
        }
      } catch (error) {
        console.error(`[CLEANUP] Erro ao limpar coleção ${collectionName}:`, error)
      }
    }

    // 3) Deletar usuário do Firebase Auth (se achou)
    if (authUser) {
      try {
        await adminAuth.deleteUser(authUser.uid)
        console.log(`[CLEANUP] Usuário deletado do Auth: ${authUser.uid}`)
      } catch (error) {
        console.error(`[CLEANUP] Erro ao deletar usuário do Auth:`, error)
      }
    }

    console.log(`[CLEANUP] Finalizado. email=${email ?? "N/A"} userId=${userId ?? "N/A"}`)

    return NextResponse.json({
      success: true,
      message: "Limpeza completa realizada com sucesso",
      details: {
        authUserFound: !!authUser,
        authUserDeleted: !!authUser,
        collectionsCleared: collections,
        usedUid: authUser?.uid || userId || null,
        usedEmail: email || null,
      },
    })
  } catch (error: any) {
    console.error("[CLEANUP] Erro na limpeza:", error)
    return NextResponse.json({ error: "Erro interno na limpeza", details: error.message }, { status: 500 })
  }
}
