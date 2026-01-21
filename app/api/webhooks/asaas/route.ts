import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || "production"
const ASAAS_API_URL = ASAAS_ENVIRONMENT === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"

export async function POST(request: Request) {
  try {
    console.log("[v0] WEBHOOK_RECEIVED - Webhook Asaas recebido")
    const body = await request.json()
    const event = body.event
    const paymentId = body.id // O Asaas envia o ID em "id", não em "payment.id"

    console.log("[v0] WEBHOOK_EVENT - Event:", event, "PaymentID:", paymentId)

    // Se for um evento de pagamento, buscar dados completos
    if ((event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") && paymentId) {
      try {
        console.log("[v0] WEBHOOK_FETCHING - Buscando dados do pagamento do Asaas:", paymentId)
        
        const fetchResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
          headers: {
            "accept": "application/json",
            "access_token": ASAAS_API_KEY,
          },
        })

        if (!fetchResponse.ok) {
          console.error("[v0] WEBHOOK_FETCH_FAILED - Status:", fetchResponse.status)
          return NextResponse.json({ received: true }, { status: 200 })
        }

        const payment = await fetchResponse.json()
        console.log("[v0] WEBHOOK_PAYMENT_FETCHED - Dados do pagamento:", {
          id: payment.id,
          status: payment.status,
          externalReference: payment.externalReference,
        })

        // ATUALIZAR FIRESTORE COM OS DADOS DO PAGAMENTO
        if (payment.id) {
          try {
            console.log("[v0] WEBHOOK_UPDATING - Atualizando Firestore para paymentId:", payment.id)
            
            const updateData: any = {
              paymentId: payment.id,
              status: payment.status,
              billingType: payment.billingType,
              value: payment.value,
              updatedAt: new Date(),
            }

            // Se houver externalReference (que é o userId), adicionar
            if (payment.externalReference) {
              updateData.userId = payment.externalReference
              console.log("[v0] WEBHOOK_USERID - userId encontrado:", payment.externalReference)
            }

            await adminDb.collection("payments").doc(payment.id).set(updateData, { merge: true })
            console.log("[v0] WEBHOOK_UPDATED_SUCCESS - Status atualizado para:", payment.status)
          } catch (error) {
            console.error("[v0] WEBHOOK_FIRESTORE_ERROR - Erro ao atualizar Firestore:", error)
          }
        }

        // DISPARAR PROCESSAMENTO EM BACKGROUND SE STATUS FOR RECEBIDO
        if ((payment.status === "RECEIVED" || payment.status === "CONFIRMED") && payment.externalReference) {
          console.log("[v0] WEBHOOK_BACKGROUND_START - Disparando processamento em background")
          processPaymentBackground(payment).catch(err => {
            console.error("[v0] WEBHOOK_BACKGROUND_ERROR - Erro em background:", err)
          })
        }
      } catch (error) {
        console.error("[v0] WEBHOOK_FETCH_ERROR - Erro ao buscar pagamento:", error)
      }
    }

    // RETORNAR IMEDIATAMENTE PARA NÃO DAR TIMEOUT
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] WEBHOOK_ERROR - Erro geral:", error)
    return NextResponse.json({ error: "Erro" }, { status: 500 })
  }
}

// FUNÇÃO PARA PROCESSAR EM BACKGROUND
async function processPaymentBackground(payment: any) {
  try {
    const userId = payment.externalReference
    console.log("[v0] WEBHOOK_BG_START - userId:", userId, "paymentId:", payment.id)

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
          console.log("[v0] WEBHOOK_BG_LEAD_FOUND - Email obtido do lead")
        }
      } catch (error) {
        console.error("[v0] WEBHOOK_BG_LEAD_ERROR - Erro ao buscar lead:", error)
      }
    }

    try {
      console.log("[v0] WEBHOOK_BG_POST_CHECKOUT - Chamando handle-post-checkout")
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
      console.log("[v0] WEBHOOK_BG_POST_CHECKOUT_RESPONSE - Status:", response.status)
    } catch (error) {
      console.error("[v0] WEBHOOK_BG_POST_CHECKOUT_ERROR - Erro:", error)
    }
  } catch (error) {
    console.error("[v0] WEBHOOK_BG_FATAL_ERROR - Erro fatal em background:", error)
  }
}
