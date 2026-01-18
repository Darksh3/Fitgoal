import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 })
    }

    console.log("[v0] CHECK_PAYMENT_STATUS - Verificando status do pagamento:", paymentId)

    // Busca o pagamento na coleção de pagamentos do Firebase
    const paymentsRef = adminDb.collection("payments")
    const snapshot = await paymentsRef.where("paymentId", "==", paymentId).limit(1).get()

    if (snapshot.empty) {
      console.log("[v0] CHECK_PAYMENT_STATUS - Pagamento não encontrado:", paymentId)
      return NextResponse.json({ status: "NOT_FOUND" })
    }

    const paymentData = snapshot.docs[0].data()
    const status = paymentData.status || "PENDING"

    console.log("[v0] CHECK_PAYMENT_STATUS - Status encontrado:", { paymentId, status })

    return NextResponse.json({ status, paymentData })
  } catch (error) {
    console.error("[v0] CHECK_PAYMENT_STATUS_ERROR:", error)
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 })
  }
}
