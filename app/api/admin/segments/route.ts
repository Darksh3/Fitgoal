import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log("[v0] ADMIN_SEGMENTS - Fetching leads for segmentation")

    const leadsSnapshot = await adminDb.collection("leads").get()

    const leads = leadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] ADMIN_SEGMENTS - Found", leads.length, "leads")

    // Segment by stage
    const segments: Record<string, any> = {
      novo: { count: 0, leads: [] },
      qualified: { count: 0, leads: [] },
      proposta: { count: 0, leads: [] },
      cliente: { count: 0, leads: [] },
      inativo: { count: 0, leads: [] },
    }

    leads.forEach((lead: any) => {
      const stage = lead.stage || "novo"
      if (stage in segments) {
        segments[stage].count++
        segments[stage].leads.push({
          id: lead.id,
          email: lead.email,
          name: lead.name,
          stage: lead.stage,
          createdAt: lead.createdAt,
          lastInteraction: lead.lastInteraction,
        })
      }
    })

    // Segment by utm_campaign
    const campaignSegments: Record<string, any> = {}

    leads.forEach((lead: any) => {
      const campaign = lead.utm_campaign || "organic"
      if (!campaignSegments[campaign]) {
        campaignSegments[campaign] = { count: 0, leads: [] }
      }
      campaignSegments[campaign].count++
      campaignSegments[campaign].leads.push({
        id: lead.id,
        email: lead.email,
        name: lead.name,
        stage: lead.stage,
      })
    })

    // Segment by hasPaid
    const paidSegments = {
      paid: { count: leads.filter((l: any) => l.hasPaid).length },
      unpaid: { count: leads.filter((l: any) => !l.hasPaid).length },
    }

    return NextResponse.json({
      stageSegments: Object.entries(segments).map(([stage, data]) => ({
        stage,
        ...data,
      })),
      campaignSegments: Object.entries(campaignSegments).map(([campaign, data]) => ({
        campaign,
        ...data,
      })),
      paymentSegments: paidSegments,
      totalLeads: leads.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error calculating segments:", error)
    return NextResponse.json({ error: "Erro ao calcular segmentos", details: String(error) }, { status: 500 })
  }
}
