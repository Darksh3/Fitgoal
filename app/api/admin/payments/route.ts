import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

interface Payment {
  id: string
  asaasPaymentId?: string
  leadId?: string
  userId?: string
  status: string
  value: number
  billingType?: string
  customerEmail?: string
  customerName?: string
  confirmedDate?: string
  createdAt?: string
  updatedAt?: string
  description?: string
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100")
    const daysAgo = parseInt(searchParams.get("daysAgo") || "30")

    let query = adminDb.collection("payments")

    // Filter by status if provided
    if (status && status !== "all") {
      query = query.where("status", "==", status)
    }

    // Filter by date range
    if (daysAgo > 0) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - daysAgo)
      query = query.where("updatedAt", ">=", dateFilter.toISOString())
    }

    const snapshot = await query.orderBy("updatedAt", "desc").limit(limit).get()

    const payments: Payment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Payment[]

    // Calculate summary stats
    const stats = {
      total: payments.length,
      confirmed: payments.filter((p) => p.status === "CONFIRMED").length,
      pending: payments.filter((p) => p.status === "PENDING").length,
      failed: payments.filter((p) => p.status === "OVERDUE" || p.status === "FAILED").length,
      totalValue: payments
        .filter((p) => p.status === "CONFIRMED")
        .reduce((sum, p) => sum + (p.value || 0), 0),
    }

    return NextResponse.json({
      payments,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching payments:", error)
    return NextResponse.json({ error: "Erro ao carregar pagamentos" }, { status: 500 })
  }
}
