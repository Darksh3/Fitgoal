import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, feedbackText } = await request.json()

    if (!userId || !feedbackText) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      )
    }

    console.log("[v0] SUBMIT_FEEDBACK - Recebendo feedback de:", email)

    // Buscar dados do usuário no Firestore para pegar o nome e telefone
    const userDocRef = admin.firestore().collection("users").doc(userId)
    const userDocSnap = await userDocRef.get()
    const userData = userDocSnap.data() || {}
    const userName = userData.name || email || "Usuário"
    const userPhone = userData.phone || userData.personalData?.phone || null

    // Salvar feedback na coleção 'feedback'
    const feedbackData = {
      userId,
      email,
      userName,
      userPhone,
      feedbackText,
      status: "new", // new, read, archived
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const feedbackRef = await admin
      .firestore()
      .collection("feedback")
      .add(feedbackData)

    console.log("[v0] SUBMIT_FEEDBACK - Feedback salvo com ID:", feedbackRef.id)

    return NextResponse.json({
      success: true,
      feedbackId: feedbackRef.id,
    })
  } catch (error: any) {
    console.error("[v0] SUBMIT_FEEDBACK - Erro:", error)
    return NextResponse.json(
      { error: "Erro ao enviar feedback" },
      { status: 500 }
    )
  }
}
