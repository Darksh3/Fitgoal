import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET() {
  // Verify admin authentication
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const snap = await adminDb.collection("leads").get()
    const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ leads })
  } catch (error) {
    console.error("[v0] Error fetching leads from Firestore:", error)
    return NextResponse.json({ error: "Erro ao carregar leads" }, { status: 500 })
  }
}
