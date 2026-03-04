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
    const limit = parseInt(searchParams.get("limit") || "100")
    const daysAgo = parseInt(searchParams.get("daysAgo") || "30")

    console.log("[v0] ADMIN_FEEDBACK - Fetching feedback", { limit, daysAgo })

    let query: any = adminDb.collection("feedback")

    // Filter by date range if provided
    if (daysAgo > 0) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - daysAgo)
      query = query.where("createdAt", ">=", dateFilter.toISOString())
    }

    // Try to order by createdAt descending
    try {
      query = query.orderBy("createdAt", "desc")
    } catch (orderError) {
      console.warn("[v0] ADMIN_FEEDBACK - OrderBy failed, trying without ordering:", orderError)
    }

    const snapshot = await query.limit(limit).get()

    console.log("[v0] ADMIN_FEEDBACK - Found", snapshot.size, "feedback items")

    const feedback = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      feedback,
      total: snapshot.size,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching feedback:", error)
    return NextResponse.json({ error: "Erro ao carregar feedback", details: String(error) }, { status: 500 })
  }
}
