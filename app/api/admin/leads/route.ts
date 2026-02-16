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
    const daysAgo = parseInt(searchParams.get("daysAgo") || "30")

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

    // Order and limit
    const snapshot = await query.orderBy("createdAt", "desc").limit(limit).get()

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
    return NextResponse.json({ error: "Erro ao carregar leads" }, { status: 500 })
  }
}

