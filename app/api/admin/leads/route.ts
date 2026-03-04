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
    const daysAgo = parseInt(searchParams.get("daysAgo") || "0") // Default to 0 (no date filter)

    console.log("[v0] ADMIN_LEADS - Fetching leads", { stage, limit, daysAgo })

    // Build query
    let query = adminDb.collection("leads")

    // Filter by stage
    if (stage !== "all") {
      query = query.where("stage", "==", stage)
      console.log("[v0] ADMIN_LEADS - Filtering by stage:", stage)
    }

    // Filter by date range (last X days) - ONLY if daysAgo > 0
    if (daysAgo > 0) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - daysAgo)
      const dateStr = dateFilter.toISOString()
      query = query.where("createdAt", ">=", dateStr)
      console.log("[v0] ADMIN_LEADS - Filtering by date from:", dateStr)
    }

    // Try to order by createdAt descending
    try {
      query = query.orderBy("createdAt", "desc")
    } catch (orderError) {
      console.warn("[v0] ADMIN_LEADS - OrderBy failed, trying without ordering:", orderError)
    }

    const snapshot = await query.limit(limit).get()

    console.log("[v0] ADMIN_LEADS - Found", snapshot.size, "leads")

    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Log first lead to see structure
    if (leads.length > 0) {
      console.log("[v0] ADMIN_LEADS - Sample lead:", leads[0])
    }

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

