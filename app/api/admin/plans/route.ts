import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limit = parseInt(searchParams.get("limit") || "100")

    let query = adminDb.collection("plans")

    // If userId provided, get only that user's plans
    if (userId) {
      query = query.where("userId", "==", userId)
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(limit).get()

    const plans = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      plans,
      total: snapshot.size,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching plans:", error)
    return NextResponse.json({ error: "Erro ao carregar planos" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { planId, status, notes } = body

    if (!planId) {
      return NextResponse.json({ error: "Plan ID é obrigatório" }, { status: 400 })
    }

    // Update plan with admin notes/flags
    await adminDb.collection("plans").doc(planId).update({
      adminStatus: status,
      adminNotes: notes,
      adminUpdatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, planId })
  } catch (error) {
    console.error("[v0] Error updating plan:", error)
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 })
  }
}
