import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const isAdmin = true // TODO: Add admin auth check

    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const filters = await request.json()
    console.log("[v0] FILTER_LEADS - Applying filters:", filters)

    let leadsSnapshot = await adminDb.collection("leads").get()
    let leads = leadsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    console.log("[v0] FILTER_LEADS - Starting with", leads.length, "leads")

    // Apply age filter
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      const ageMin = filters.ageMin || 0
      const ageMax = filters.ageMax || 150
      leads = leads.filter((lead: any) => {
        const age = parseInt(lead.age)
        return age >= ageMin && age <= ageMax
      })
      console.log("[v0] FILTER_LEADS - After age filter:", leads.length, "leads")
    }

    // Apply gender filter
    if (filters.gender && filters.gender.length > 0) {
      leads = leads.filter((lead: any) => filters.gender.includes(lead.gender))
      console.log("[v0] FILTER_LEADS - After gender filter:", leads.length, "leads")
    }

    // Apply weight filter
    if (filters.weightMin !== undefined || filters.weightMax !== undefined) {
      const weightMin = filters.weightMin || 0
      const weightMax = filters.weightMax || 200
      leads = leads.filter((lead: any) => {
        const weight = parseFloat(lead.weight)
        return weight >= weightMin && weight <= weightMax
      })
      console.log("[v0] FILTER_LEADS - After weight filter:", leads.length, "leads")
    }

    // Apply body type filter
    if (filters.bodyType && filters.bodyType.length > 0) {
      leads = leads.filter((lead: any) => filters.bodyType.includes(lead.bodyType))
      console.log("[v0] FILTER_LEADS - After body type filter:", leads.length, "leads")
    }

    // Apply objectives filter (at least one must match)
    if (filters.objectives && filters.objectives.length > 0) {
      leads = leads.filter((lead: any) => {
        const leadObjectives = lead.objectives || []
        return filters.objectives.some((obj: string) => leadObjectives.includes(obj))
      })
      console.log("[v0] FILTER_LEADS - After objectives filter:", leads.length, "leads")
    }

    // Apply training experience filter
    if (filters.trainingExperience && filters.trainingExperience.length > 0) {
      leads = leads.filter((lead: any) => filters.trainingExperience.includes(lead.trainingExperience))
      console.log("[v0] FILTER_LEADS - After experience filter:", leads.length, "leads")
    }

    // Apply IMC filter
    if (filters.imcMin !== undefined || filters.imcMax !== undefined) {
      const imcMin = filters.imcMin || 0
      const imcMax = filters.imcMax || 100
      leads = leads.filter((lead: any) => {
        const imc = lead.bodyComposition?.imc || lead.imc
        return imc >= imcMin && imc <= imcMax
      })
      console.log("[v0] FILTER_LEADS - After IMC filter:", leads.length, "leads")
    }

    // Apply payment status filter
    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      leads = leads.filter((lead: any) => filters.paymentStatus.includes(lead.status))
      console.log("[v0] FILTER_LEADS - After payment status filter:", leads.length, "leads")
    }

    // Calculate statistics for filtered results
    const stats = {
      totalCount: leads.length,
      avgAge: leads.length > 0 ? Math.round(leads.reduce((sum: number, lead: any) => sum + parseInt(lead.age), 0) / leads.length) : 0,
      genderDistribution: calculateDistribution(leads, "gender"),
      avgWeight: leads.length > 0 ? Math.round(leads.reduce((sum: number, lead: any) => sum + parseFloat(lead.weight), 0) / leads.length) : 0,
    }

    return NextResponse.json({
      leads: leads.slice(0, 100), // Return first 100 for display
      stats,
      totalFiltered: leads.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error filtering leads:", error)
    return NextResponse.json({ error: "Erro ao filtrar leads", details: String(error) }, { status: 500 })
  }
}

function calculateDistribution(leads: any[], field: string): any {
  const distribution: any = {}
  leads.forEach((lead: any) => {
    const value = lead[field] || "não informado"
    distribution[value] = (distribution[value] || 0) + 1
  })
  return distribution
}
