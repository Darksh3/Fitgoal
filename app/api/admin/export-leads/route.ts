import { NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET() {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = getFirebaseAdmin().firestore()

    // Buscar todos os leads
    const leadsSnapshot = await adminDb.collection("leads").get()
    const leads = leadsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        uid: doc.id,
        email: data.email || "",
        name: data.name || "",
        age: data.age || "",
        gender: data.gender || "",
        currentWeight: data.currentWeight || "",
        targetWeight: data.targetWeight || "",
        goal: data.goals || "",
        bodyType: data.bodyType || "",
        experience: data.experience || "",
        trainingDaysPerWeek: data.trainingDaysPerWeek || "",
        allergies: data.allergyDetails || "",
        createdAt: data.createdAt || "",
        status: data.status || "novo",
      }
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error("[v0] ERROR fetching leads export:", error)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}
