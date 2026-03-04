import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log("[v0] ADMIN_SEGMENTS - Fetching segments data")

    // Get all leads to segment
    const leadsSnapshot = await adminDb.collection("leads").get()
    const leads = leadsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    console.log("[v0] ADMIN_SEGMENTS - Found", leads.length, "leads")

    // Segment by stage
    const byStage: Record<string, number> = {}
    leads.forEach((lead: any) => {
      const stage = lead.stage || "unknown"
      byStage[stage] = (byStage[stage] || 0) + 1
    })

    // Segment by campaign
    const byCampaign: Record<string, number> = {}
    leads.forEach((lead: any) => {
      const campaign = lead.utm_campaign || "organic"
      byCampaign[campaign] = (byCampaign[campaign] || 0) + 1
    })

    // Segment by payment status
    const byPaymentStatus = {
      paid: leads.filter((l: any) => l.hasPaid || l.stage === "cliente").length,
      unpaid: leads.filter((l: any) => !l.hasPaid && l.stage !== "cliente").length,
    }

    // Segment by source
    const bySource: Record<string, number> = {}
    leads.forEach((lead: any) => {
      const source = lead.utm_source || "direct"
      bySource[source] = (bySource[source] || 0) + 1
    })

    return NextResponse.json({
      total_leads: leads.length,
      segments: {
        by_stage: byStage,
        by_campaign: byCampaign,
        by_payment_status: byPaymentStatus,
        by_source: bySource,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error calculating segments:", error)
    return NextResponse.json({ error: "Erro ao calcular segmentos", details: String(error) }, { status: 500 })
  }
}
