import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/firebaseAdmin"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET_FEEDBACK - Buscando todos os feedbacks")

    const feedbacksSnapshot = await admin
      .firestore()
      .collection("feedback")
      .orderBy("createdAt", "desc")
      .get()

    const feedbacks = feedbacksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] GET_FEEDBACK - Total de feedbacks:", feedbacks.length)

    return NextResponse.json(feedbacks)
  } catch (error: any) {
    console.error("[v0] GET_FEEDBACK - Erro:", error)
    return NextResponse.json({ error: "Erro ao buscar feedbacks" }, { status: 500 })
  }
}
