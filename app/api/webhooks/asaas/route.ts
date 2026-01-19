import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    console.log("[v0] WEBHOOK_RECEIVED - Webhook Asaas recebido com sucesso")
    const body = await request.json()
    const event = body.event
    const payment = body.payment

    console.log("[v0] WEBHOOK_EVENT_RECEIVED - Evento recebido:", event)
    console.log("[v0] WEBHOOK_PAYMENT_ID - Payment ID:", payment?.id)
    console.log("[v0] WEBHOOK_PAYMENT_STATUS - Status:", payment?.status)
    console.log("[v0] WEBHOOK_PAYMENT_FULL - Payment object:", JSON.stringify(payment, null, 2))

    // Atualizar QUALQUER evento de pagamento
    if (payment?.id && payment?.status) {
      try {
        console.log("[v0] WEBHOOK_UPDATING_PAYMENT - Atualizando pagamento no Firestore")
        await adminDb.collection("payments").doc(payment.id).set({
          paymentId: payment.id,
          status: payment.status,
          billingType: payment.billingType,
          value: payment.value,
          updatedAt: new Date(),
        }, { merge: true })
        console.log("[v0] WEBHOOK_PAYMENT_UPDATED - Pagamento atualizado:", payment.id, "Status:", payment.status)
      } catch (error) {
        console.error("[v0] WEBHOOK_UPDATE_ERROR - Erro ao atualizar Firestore:", error)
      }
    }

    // Se pagamento foi recebido/confirmado, processar
    if (payment?.status === "RECEIVED" || payment?.status === "CONFIRMED") {
      const userId = payment?.externalReference

      if (userId) {
        try {
          console.log("[v0] WEBHOOK_PROCESSING - Processando pagamento para userId:", userId)
          
          let customerName = payment?.customer?.name
          let customerEmail = payment?.customer?.email
          let customerPhone = payment?.customer?.phone
          let customerCpf = payment?.customer?.cpf
          
          if (!customerEmail) {
            try {
              const leadDocSnap = await adminDb.collection("leads").doc(userId).get()
              if (leadDocSnap.exists) {
                const leadData = leadDocSnap.data()
                customerName = customerName || leadData?.name
                customerEmail = leadData?.email
                customerPhone = customerPhone || leadData?.phone
                customerCpf = customerCpf || leadData?.cpf
              }
            } catch (error) {
              console.error("[v0] WEBHOOK_LEAD_ERROR - Erro ao buscar lead:", error)
            }
          }
          
          try {
            console.log("[v0] WEBHOOK_CALLING_POST_CHECKOUT - Chamando handle-post-checkout")
            const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/handle-post-checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                userId,
                paymentId: payment.id,
                billingType: payment.billingType,
                customerName,
                customerEmail,
                customerPhone,
                customerCpf,
              }),
            })
            console.log("[v0] WEBHOOK_POST_CHECKOUT_RESPONSE - Status:", response.status)
          } catch (error) {
            console.error("[v0] WEBHOOK_POST_CHECKOUT_ERROR - Erro:", error)
          }
        } catch (error) {
          console.error("[v0] WEBHOOK_PROCESS_ERROR - Erro ao processar:", error)
        }
      }
    }

    // Handle other events
    switch (event) {
      case "PAYMENT_OVERDUE":
        console.log("Pagamento vencido:", payment?.id)
        break

      case "PAYMENT_DELETED":
        console.log("Pagamento cancelado:", payment?.id)
        break

      default:
        console.log(`Evento não tratado: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] WEBHOOK_FATAL_ERROR - Erro crítico:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }
}
