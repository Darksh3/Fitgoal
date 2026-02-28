import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { feedbackId } = await request.json()

    if (!feedbackId) {
      return NextResponse.json(
        { error: "feedbackId é obrigatório" },
        { status: 400 }
      )
    }

    console.log("[v0] DELETE_FEEDBACK - Deletando feedback:", feedbackId)

    await admin.firestore().collection("feedback").doc(feedbackId).delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] DELETE_FEEDBACK - Erro:", error)
    return NextResponse.json(
      { error: "Erro ao deletar feedback" },
      { status: 500 }
    )
  }
}
