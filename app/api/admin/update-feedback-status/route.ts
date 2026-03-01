import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { feedbackId, status } = await request.json()

    if (!feedbackId || !status) {
      return NextResponse.json(
        { error: "feedbackId e status são obrigatórios" },
        { status: 400 }
      )
    }

    console.log("[v0] UPDATE_FEEDBACK_STATUS - Atualizando feedback:", feedbackId, "para status:", status)

    await admin
      .firestore()
      .collection("feedback")
      .doc(feedbackId)
      .update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] UPDATE_FEEDBACK_STATUS - Erro:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    )
  }
}
