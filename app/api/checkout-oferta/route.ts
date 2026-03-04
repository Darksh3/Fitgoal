import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import crypto from "crypto"

export const runtime = "nodejs"

interface CheckoutOfertaRequest {
  email: string
  name: string
  cpf: string
  phone: string
  plan: "mensal" | "trimestral" | "semestral"
  paymentMethod: "pix" | "boleto"
}

const PLANS = {
  mensal: { price: 79, months: 1, name: "Mensal" },
  trimestral: { price: 189, months: 3, name: "Trimestral" },
  semestral: { price: 339, months: 6, name: "Semestral" },
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutOfertaRequest = await request.json()
    const { email, name, cpf, phone, plan, paymentMethod } = body

    if (!email || !name || !cpf || !phone || !plan || !paymentMethod) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    const planData = PLANS[plan]
    if (!planData) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
    }

    // 1. Create lead in Firestore
    const leadId = crypto.randomUUID()
    const leadRef = adminDb.collection("leads").doc(leadId)
    
    await leadRef.set({
      id: leadId,
      email,
      name,
      cpf: cpf.replace(/\D/g, ""),
      phone: phone.replace(/\D/g, ""),
      plan,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      source: "oferta",
      quizCompleted: false,
    })

    // 2. Create Asaas customer
    const asaasApiKey = process.env.ASAAS_API_KEY
    if (!asaasApiKey) {
      console.error("[v0] ASAAS_API_KEY not configured")
      return NextResponse.json({ error: "Erro na configuração de pagamento" }, { status: 500 })
    }

    const customerResponse = await fetch("https://api.asaas.com/v3/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
      }),
    })

    if (!customerResponse.ok) {
      console.error("[v0] Failed to create Asaas customer")
      return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
    }

    const customer = await customerResponse.json()
    const customerId = customer.id

    // 3. Create Asaas payment
    const paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        customerId,
        billingType: paymentMethod === "pix" ? "PIX" : "BOLETO",
        value: planData.price,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        description: `Fitgoal - Plano ${planData.name}`,
        externalReference: leadId,
        discount: { type: "FIXED", value: 0 },
      }),
    })

    if (!paymentResponse.ok) {
      const error = await paymentResponse.json()
      console.error("[v0] Failed to create Asaas payment:", error)
      return NextResponse.json({ error: "Erro ao criar pagamento" }, { status: 500 })
    }

    const payment = await paymentResponse.json()

    // 4. Update lead with payment info
    await leadRef.update({
      asaasPaymentId: payment.id,
      asaasCustomerId: customerId,
    })

    // 5. Return payment data based on method
    if (paymentMethod === "pix" && payment.pixQrCode) {
      return NextResponse.json({
        paymentId: payment.id,
        qrCode: payment.pixQrCode,
        copyPaste: payment.pixCopiaECola,
      })
    } else if (paymentMethod === "boleto" && payment.bankSlipUrl) {
      return NextResponse.json({
        paymentId: payment.id,
        url: payment.bankSlipUrl,
        barCode: payment.barCode,
      })
    }

    return NextResponse.json({ error: "Falha ao processar método de pagamento" }, { status: 500 })
  } catch (error) {
    console.error("[v0] Checkout oferta error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
