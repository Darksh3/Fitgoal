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
    const type = searchParams.get("type") || "leads" // "leads" ou "users"
    const format = searchParams.get("format") || "list" // "list" ou "csv"

    console.log("[v0] EXPORT_EMAILS - Fetching emails for:", type)

    let emails: string[] = []

    if (type === "leads") {
      const leadsSnapshot = await adminDb.collection("leads").get()
      emails = leadsSnapshot.docs
        .map((doc) => doc.data().email)
        .filter((email) => email && typeof email === "string")
        .sort()
    } else if (type === "users") {
      const usersSnapshot = await adminDb.collection("users").get()
      emails = usersSnapshot.docs
        .map((doc) => doc.data().email)
        .filter((email) => email && typeof email === "string")
        .sort()
    }

    // Remove duplicates
    emails = [...new Set(emails)]

    console.log("[v0] EXPORT_EMAILS - Found", emails.length, "emails")

    if (format === "csv") {
      // Return as CSV
      const csv = emails.join("\n")
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="emails_${type}_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // Return as JSON list
    return NextResponse.json({
      emails,
      total: emails.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error exporting emails:", error)
    return NextResponse.json(
      { error: "Erro ao exportar emails", details: String(error) },
      { status: 500 }
    )
  }
}
