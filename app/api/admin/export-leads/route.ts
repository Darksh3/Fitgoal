import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"
import crypto from "crypto"

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex")
}

function convertToCSV(leads: any[], hashed: boolean = false): string {
  const headers = [
    "Email",
    "Nome",
    "Telefone",
    "Estágio",
    "Objetivo",
    "Experiência",
    "Campanha",
    "Fonte",
    "Data de Criação",
  ]

  const rows = leads.map((lead) => [
    hashed ? hashEmail(lead.email || "") : lead.email || "",
    lead.name || "",
    lead.phone || "",
    lead.stage || "novo",
    lead.goal || "",
    lead.experience || "",
    lead.utm_campaign || "",
    lead.utm_source || "",
    lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("pt-BR") : "",
  ])

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { leadIds = [], hashed = false } = body

    let query = adminDb.collection("leads")

    // If specific lead IDs provided, filter by them
    if (leadIds.length > 0) {
      query = query.where("__name__", "in", leadIds)
    }

    const snapshot = await query.get()
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Convert to CSV
    const csv = convertToCSV(leads, hashed)

    // Return as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="leads_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error exporting leads:", error)
    return NextResponse.json({ error: "Erro ao exportar leads" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const snapshot = await adminDb.collection("leads").get()
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Convert to CSV
    const csv = convertToCSV(leads, false)

    // Return as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="leads_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error exporting leads:", error)
    return NextResponse.json({ error: "Erro ao exportar leads" }, { status: 500 })
  }
}

