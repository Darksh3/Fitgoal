import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"

export async function POST(req: Request) {
  try {
    const { userId, status, paymentData } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (db) {
      const leadDocRef = doc(db, "leads", userId)

      // Verificar se o documento existe
      const leadDoc = await getDoc(leadDocRef)

      if (leadDoc.exists()) {
        // Atualizar status do lead
        await updateDoc(leadDocRef, {
          status: status || "payment_completed",
          hasPaid: true,
          paidAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          paymentData: paymentData || null,
        })

        console.log("Lead status updated:", userId)

        return new Response(JSON.stringify({ success: true, message: "Lead status updated" }), {
          headers: { "Content-Type": "application/json" },
        })
      } else {
        return new Response(JSON.stringify({ error: "Lead not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
    } else {
      return new Response(JSON.stringify({ error: "Firebase not initialized" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error: any) {
    console.error("Error updating lead status:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
