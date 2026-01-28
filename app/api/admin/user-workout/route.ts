import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: Request) {
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 })
  }

  try {
    const workoutDoc = await adminDb.collection("users").doc(userId).collection("workout").doc("current").get()
    const workout = workoutDoc.exists ? workoutDoc.data() : null

    return NextResponse.json({ workout })
  } catch (error) {
    console.error("[v0] Error fetching workout:", error)
    return NextResponse.json({ error: "Erro ao carregar treino" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { userId, workoutData } = await request.json()

    await adminDb.collection("users").doc(userId).collection("workout").doc("current").set(workoutData, { merge: true })

    return NextResponse.json({ success: true, message: "Treino atualizado" })
  } catch (error) {
    console.error("[v0] Error updating workout:", error)
    return NextResponse.json({ error: "Erro ao atualizar treino" }, { status: 500 })
  }
}
