import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage") || "all"
    const limit = parseInt(searchParams.get("limit") || "100")
    const daysAgo = parseInt(searchParams.get("daysAgo") || "0")

    console.log("[v0] ADMIN_LEADS - Fetching leads", { stage, limit, daysAgo })

    // Build query
    let query = adminDb.collection("leads")

    // Filter by stage
    if (stage !== "all") {
      query = query.where("stage", "==", stage)
    }

    // Filter by date range (last X days)
    if (daysAgo > 0) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - daysAgo)
      query = query.where("createdAt", ">=", dateFilter.toISOString())
    }

    // Try to order by createdAt descending
    try {
      query = query.orderBy("createdAt", "desc")
    } catch (orderError) {
      console.warn("[v0] ADMIN_LEADS - OrderBy failed, trying without ordering:", orderError)
      // Continue without ordering if there's an issue with composite indexes
    }

    const snapshot = await query.limit(limit).get()

    console.log("[v0] ADMIN_LEADS - Found", snapshot.size, "leads")

    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      leads,
      total: snapshot.size,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching leads from Firestore:", error)
    return NextResponse.json({ error: "Erro ao carregar leads", details: String(error) }, { status: 500 })
  }
}

