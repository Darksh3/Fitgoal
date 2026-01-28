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
    const dietDoc = await adminDb.collection("users").doc(userId).collection("diet").doc("current").get()
    const diet = dietDoc.exists ? dietDoc.data() : null

    return NextResponse.json({ diet })
  } catch (error) {
    console.error("[v0] Error fetching diet:", error)
    return NextResponse.json({ error: "Erro ao carregar dieta" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { userId, dietData } = await request.json()

    await adminDb.collection("users").doc(userId).collection("diet").doc("current").set(dietData, { merge: true })

    return NextResponse.json({ success: true, message: "Dieta atualizada" })
  } catch (error) {
    console.error("[v0] Error updating diet:", error)
    return NextResponse.json({ error: "Erro ao atualizar dieta" }, { status: 500 })
  }
}
