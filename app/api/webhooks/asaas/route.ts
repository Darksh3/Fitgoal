import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    console.log("[v0] WEBHOOK_RECEIVED - Webhook Asaas recebido")
    const body = await request.json()
    const event = body.event
    const payment = body.payment

    console.log("[v0] WEBHOOK_EVENT - Event:", event, "PaymentID:", payment?.id, "Status:", payment?.status)
    console.log("[v0] WEBHOOK_DATA - Full payment object:", JSON.stringify(payment, null, 2))

    // Tentar extrair userId de várias fontes possíveis
    let userId = payment?.externalReference || payment?.customer?.id || null
    
    // Se temos um customer object, buscar do Firestore
    if (!userId && payment?.customer) {
      try {
        const customerEmail = payment.customer.email
        if (customerEmail) {
          console.log("[v0] WEBHOOK_SEARCHING_USER - Buscando usuário por email:", customerEmail)
          const userSnap = await adminDb.collection("users")
            .where("email", "==", customerEmail)
            .limit(1)
            .get()
          
          if (!userSnap.empty) {
            userId = userSnap.docs[0].id
            console.log("[v0] WEBHOOK_USER_FOUND - Usuário encontrado por email:", userId)
          }
        }
      } catch (searchError) {
        console.warn("[v0] WEBHOOK_SEARCH_ERROR - Erro ao buscar usuário:", searchError)
      }
    }

    // ATUALIZAR FIRESTORE IMEDIATAMENTE (rápido, síncrono)
    if (payment?.id && payment?.status) {
      try {
        console.log("[v0] WEBHOOK_UPDATING_PAYMENT - Atualizando Firestore com userId:", userId)
        const paymentData: any = {
          paymentId: payment.id,
          status: payment.status,
          billingType: payment.billingType,
          value: payment.value,
          updatedAt: new Date(),
          asaasData: payment, // Armazenar todos os dados do Asaas para debug
        }
        
        // Apenas adicionar userId se não for null
        if (userId) {
          paymentData.userId = userId
        }
        
        await adminDb.collection("payments").doc(payment.id).set(paymentData, { merge: true })
        console.log("[v0] WEBHOOK_UPDATED - Firestore atualizado com status:", payment.status)
      } catch (error) {
        console.error("[v0] WEBHOOK_FIRESTORE_ERROR - Erro:", error)
      }
    }

    // DISPARAR PROCESSAMENTO EM BACKGROUND (sem await, sem bloquear a resposta)
    if (payment?.status === "RECEIVED" || payment?.status === "CONFIRMED") {
      if (userId) {
        console.log("[v0] WEBHOOK_BACKGROUND_START - Processamento iniciado em background para userId:", userId)
        // Disparar sem await
        processPaymentBackground(payment, userId).catch(err => {
          console.error("[v0] WEBHOOK_BACKGROUND_CATCH - Erro capturado:", err)
        })
      } else {
        console.warn("[v0] WEBHOOK_NO_USERID - Não foi possível encontrar userId, pulando processamento em background")
      }
    }

    // RETORNAR IMEDIATAMENTE PARA NÃO DAR TIMEOUT
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] WEBHOOK_ERROR - Erro:", error)
    return NextResponse.json({ error: "Erro" }, { status: 500 })
  }
}

// FUNÇÃO PARA PROCESSAR EM BACKGROUND
async function processPaymentBackground(payment: any, userId: string) {
  try {
    console.log("[v0] WEBHOOK_BG - Processando para userId:", userId)
    
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
          console.log("[v0] WEBHOOK_BG - Lead encontrado")
        }
      } catch (error) {
        console.error("[v0] WEBHOOK_BG_LEAD_ERROR - Erro ao buscar lead:", error)
      }
    }
    
    try {
      console.log("[v0] WEBHOOK_BG - Chamando handle-post-checkout")
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
      console.log("[v0] WEBHOOK_BG - handle-post-checkout status:", response.status)
    } catch (error) {
      console.error("[v0] WEBHOOK_BG_POST_CHECKOUT_ERROR - Erro:", error)
    }
  } catch (error) {
    console.error("[v0] WEBHOOK_BG_FATAL_ERROR - Erro fatal:", error)
  }
}
