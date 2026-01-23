import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    console.log("[v0] WEBHOOK_RECEIVED - Webhook Asaas recebido")
    const body = await request.json()
    const event = body.event
    const payment = body.payment

    console.log("[v0] WEBHOOK_EVENT - Event:", event, "PaymentID:", payment?.id, "Status:", payment?.status)

// 1) Atualiza Firestore rapidamente (sincrono e curto)
    if (payment?.id && payment?.status) {
      try {
        console.log("[v0] WEBHOOK_UPDATING_PAYMENT - Atualizando Firestore")

        await adminDb.collection("payments").doc(payment.id).set(
          {
            paymentId: payment.id,
            userId: payment?.externalReference || null, // externalReference = seu userId
            status: payment.status,
            billingType: payment.billingType,
            value: payment.value,
            updatedAt: new Date(),
          },
          { merge: true },
        )

        console.log("[v0] WEBHOOK_UPDATED - Firestore atualizado com status:", payment.status)
      } catch (error) {
        console.error("[v0] WEBHOOK_FIRESTORE_ERROR - Erro:", error)
      }
    }

    // 2) Dispara processamento "em background" (sem await)
    if (payment?.status === "RECEIVED" || payment?.status === "CONFIRMED") {
      const userId = payment?.externalReference

      if (userId && payment?.id) {
        console.log("[v0] WEBHOOK_BG_START - Disparando processamento async")

        processPaymentBackground(payment, userId).catch((err) => {
          console.error("[v0] WEBHOOK_BG_ERROR - Erro:", err)
        })
      } else {
        console.warn("[v0] WEBHOOK_BG_SKIP - Sem userId ou payment.id")
      }
    }

    // 3) Retorna OK IMEDIATO (evita 408 / penalização)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] WEBHOOK_ERROR - Erro:", error)
    return NextResponse.json({ error: "Erro" }, { status: 500 })
  }
}

// FUNÇÃO FORA DO HANDLER (importante!)
async function processPaymentBackground(payment: any, userId: string) {
  try {
    console.log("[v0] WEBHOOK_BG - Processando para userId:", userId)

    // Idempotência simples: evita processar o mesmo pagamento múltiplas vezes
    // (Asaas pode reenviar webhooks)
    const jobId = `asaas_${payment.id}_${payment.status}`
    const jobRef = adminDb.collection("webhookJobs").doc(jobId)
    const jobSnap = await jobRef.get()
    if (jobSnap.exists) {
      console.log("[v0] WEBHOOK_BG - Job já processado, pulando:", jobId)
      return
    }
    await jobRef.set({ createdAt: new Date(), paymentId: payment.id, status: payment.status, userId }, { merge: true })

    let customerName = payment?.customer?.name
    let customerEmail = payment?.customer?.email
    let customerPhone = payment?.customer?.phone
    let customerCpf = payment?.customer?.cpf

    // Se não veio email no payload, busca em leads
    if (!customerEmail) {
      try {
        const leadDocSnap = await adminDb.collection("leads").doc(userId).get()
        if (leadDocSnap.exists) {
          const leadData = leadDocSnap.data()
          customerName = customerName || leadData?.name
          customerEmail = leadData?.email
          customerPhone = customerPhone || leadData?.phone
          customerCpf = customerCpf || leadData?.cpf
          console.log("[v0] WEBHOOK_BG - Lead encontrado")
        }
      } catch (error) {
        console.error("[v0] WEBHOOK_BG_LEAD_ERROR - Erro ao buscar lead:", error)
      }
    }

    console.log("[v0] WEBHOOK_BG - Chamando handle-post-checkout")
    const baseUrl = process.env.APP_URL
    if (!baseUrl) throw new Error("APP_URL is missing in env")

    const response = await fetch(`${baseUrl}/api/handle-post-checkout`, {
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

    console.log("[v0] WEBHOOK_BG - handle-post-checkout status:", response.status)
  } catch (error) {
    console.error("[v0] WEBHOOK_BG_FATAL_ERROR - Erro fatal:", error)
  }
}
