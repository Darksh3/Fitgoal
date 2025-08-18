import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "quiz_completed"
    const limitCount = Number.parseInt(searchParams.get("limit") || "100")
    const daysAgo = Number.parseInt(searchParams.get("daysAgo") || "30")

    if (!db) {
      return new Response(JSON.stringify({ error: "Firebase not initialized" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Calcular data limite
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - daysAgo)

    const leadsRef = collection(db, "leads")
    const q = query(
      leadsRef,
      where("status", "==", status),
      where("createdAt", ">=", dateLimit.toISOString()),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)
    const leads: any[] = []

    querySnapshot.forEach((doc) => {
      leads.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return new Response(
      JSON.stringify({
        success: true,
        leads,
        count: leads.length,
        filters: { status, daysAgo, limitCount },
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    console.error("Error fetching leads:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
