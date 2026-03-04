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
    const campaign = searchParams.get("campaign")
    const daysAgo = parseInt(searchParams.get("daysAgo") || "30")

    // Get all leads/events to calculate funnel
    let leadsQuery = adminDb.collection("leads")
    let paymentsQuery = adminDb.collection("payments")

    if (daysAgo > 0) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - daysAgo)
      const dateStr = dateFilter.toISOString()

      leadsQuery = leadsQuery.where("createdAt", ">=", dateStr)
      paymentsQuery = paymentsQuery.where("updatedAt", ">=", dateStr)
    }

    const [leadsSnapshot, paymentsSnapshot] = await Promise.all([
      leadsQuery.get(),
      paymentsQuery.get(),
    ])

    const leads = leadsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    const payments = paymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    // Filter by campaign if provided
    let filteredLeads = leads
    if (campaign) {
      filteredLeads = leads.filter((l: any) => l.utm_campaign === campaign)
    }

    // Calculate funnel stages
    const funnel = {
      total_leads: filteredLeads.length,
      quiz_started: filteredLeads.filter((l: any) => l.stage !== "novo").length,
      quiz_completed: filteredLeads.filter((l: any) => l.stage === "qualified" || l.hasPaid).length,
      checkout_started: filteredLeads.filter((l: any) => l.stage === "proposta").length,
      payment_completed: filteredLeads.filter((l: any) => l.hasPaid || l.stage === "cliente").length,
    }

    // Calculate conversion rates
    const conversions = {
      quiz_start_rate:
        funnel.total_leads > 0 ? ((funnel.quiz_started / funnel.total_leads) * 100).toFixed(1) : "0",
      quiz_completion_rate:
        funnel.quiz_started > 0
          ? ((funnel.quiz_completed / funnel.quiz_started) * 100).toFixed(1)
          : "0",
      checkout_rate:
        funnel.quiz_completed > 0
          ? ((funnel.checkout_started / funnel.quiz_completed) * 100).toFixed(1)
          : "0",
      payment_rate:
        funnel.checkout_started > 0
          ? ((funnel.payment_completed / funnel.checkout_started) * 100).toFixed(1)
          : "0",
    }

    // Calculate by campaign
    const campaigns: Record<
      string,
      {
        total: number
        paid: number
        rate: string
      }
    > = {}

    leads.forEach((lead: any) => {
      const camp = lead.utm_campaign || "organic"
      if (!campaigns[camp]) {
        campaigns[camp] = { total: 0, paid: 0, rate: "0" }
      }
      campaigns[camp].total++
      if (lead.hasPaid) {
        campaigns[camp].paid++
      }
      campaigns[camp].rate =
        campaigns[camp].total > 0
          ? ((campaigns[camp].paid / campaigns[camp].total) * 100).toFixed(1)
          : "0"
    })

    return NextResponse.json({
      funnel,
      conversions,
      campaigns: Object.entries(campaigns).map(([name, data]) => ({
        name,
        ...data,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error calculating funnel:", error)
    return NextResponse.json({ error: "Erro ao calcular funil" }, { status: 500 })
  }
}
