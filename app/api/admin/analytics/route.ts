import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export async function GET(request: NextRequest) {
  try {
    const isAdmin = true // TODO: Add admin auth check

    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log("[v0] ANALYTICS - Fetching lead demographics")

    const leadsSnapshot = await adminDb.collection("leads").get()
    const leads = leadsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    console.log("[v0] ANALYTICS - Found", leads.length, "leads")

    if (leads.length === 0) {
      return NextResponse.json({
        stats: {
          totalLeads: 0,
          ageStats: { average: 0, min: 0, max: 0, distribution: [] },
          genderDistribution: {},
          weightStats: { average: 0, min: 0, max: 0, distribution: [] },
          imcDistribution: {},
          bodyTypeDistribution: {},
          objectivesDistribution: {},
          experienceDistribution: {},
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Calculate age statistics
    const ages = leads
      .map((lead: any) => parseInt(lead.age))
      .filter((age: number) => !isNaN(age) && age > 0)
    const ageAverage = ages.length > 0 ? Math.round(ages.reduce((a: number, b: number) => a + b, 0) / ages.length) : 0
    const ageMin = ages.length > 0 ? Math.min(...ages) : 0
    const ageMax = ages.length > 0 ? Math.max(...ages) : 0

    // Age distribution ranges
    const ageDistribution = {
      "18-25": ages.filter((a: number) => a >= 18 && a <= 25).length,
      "26-35": ages.filter((a: number) => a >= 26 && a <= 35).length,
      "36-45": ages.filter((a: number) => a >= 36 && a <= 45).length,
      "46-55": ages.filter((a: number) => a >= 46 && a <= 55).length,
      "56+": ages.filter((a: number) => a >= 56).length,
    }

    // Gender distribution
    const genderDistribution: any = {}
    leads.forEach((lead: any) => {
      const gender = lead.gender || "não informado"
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1
    })

    // Weight statistics
    const weights = leads
      .map((lead: any) => parseFloat(lead.weight))
      .filter((weight: number) => !isNaN(weight) && weight > 0)
    const weightAverage = weights.length > 0 ? Math.round(weights.reduce((a: number, b: number) => a + b, 0) / weights.length) : 0
    const weightMin = weights.length > 0 ? Math.min(...weights) : 0
    const weightMax = weights.length > 0 ? Math.max(...weights) : 0

    // Weight distribution ranges (kg)
    const weightDistribution = {
      "40-60kg": weights.filter((w: number) => w >= 40 && w <= 60).length,
      "61-80kg": weights.filter((w: number) => w >= 61 && w <= 80).length,
      "81-100kg": weights.filter((w: number) => w >= 81 && w <= 100).length,
      "101-120kg": weights.filter((w: number) => w >= 101 && w <= 120).length,
      "120+kg": weights.filter((w: number) => w > 120).length,
    }

    // IMC distribution
    const imcDistribution: any = {}
    leads.forEach((lead: any) => {
      const imc = lead.bodyComposition?.imc || lead.imc
      if (imc) {
        const imcCategory =
          imc < 18.5 ? "Abaixo do peso" : imc < 25 ? "Peso normal" : imc < 30 ? "Sobrepeso" : "Obeso"
        imcDistribution[imcCategory] = (imcDistribution[imcCategory] || 0) + 1
      }
    })

    // Body type distribution
    const bodyTypeDistribution: any = {}
    leads.forEach((lead: any) => {
      const bodyType = lead.bodyType || "não informado"
      bodyTypeDistribution[bodyType] = (bodyTypeDistribution[bodyType] || 0) + 1
    })

    // Objectives distribution
    const objectivesDistribution: any = {}
    leads.forEach((lead: any) => {
      const objectives = lead.objectives || []
      objectives.forEach((obj: string) => {
        objectivesDistribution[obj] = (objectivesDistribution[obj] || 0) + 1
      })
    })

    // Experience distribution
    const experienceDistribution: any = {}
    leads.forEach((lead: any) => {
      const experience = lead.trainingExperience || "não informado"
      experienceDistribution[experience] = (experienceDistribution[experience] || 0) + 1
    })

    return NextResponse.json({
      stats: {
        totalLeads: leads.length,
        ageStats: {
          average: ageAverage,
          min: ageMin,
          max: ageMax,
          distribution: ageDistribution,
        },
        genderDistribution,
        weightStats: {
          average: weightAverage,
          min: weightMin,
          max: weightMax,
          distribution: weightDistribution,
        },
        imcDistribution,
        bodyTypeDistribution,
        objectivesDistribution,
        experienceDistribution,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error calculating analytics:", error)
    return NextResponse.json({ error: "Erro ao calcular estatísticas", details: String(error) }, { status: 500 })
  }
}
