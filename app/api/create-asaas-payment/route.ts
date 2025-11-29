import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_API_URL = "https://api.asaas.com/v3"

export async function POST(req: Request) {
  try {
    const { email, name, cpf, phone, planType, paymentMethod, installments, clientUid } = await req.json()

    if (!email || !name || !cpf || !planType || !paymentMethod || !clientUid) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 })
    }

    if (!ASAAS_API_KEY) {
      console.error("ASAAS_API_KEY não configurada")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    // Mapeamento de planos para valores
    const planPrices: Record<string, number> = {
      mensal: 79.9,
      trimestral: 194.7,
      semestral: 299.4,
    }

    const amount = planPrices[planType]
    if (!amount) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
    }

    // Limpar CPF/CNPJ
    const cleanCpf = cpf.replace(/\D/g, "")
    const cleanPhone = phone.replace(/\D/g, "")

    // 1. Criar ou buscar cliente no Asaas
    const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cleanCpf,
        phone: cleanPhone,
        externalReference: clientUid,
      }),
    })

    const customerData = await customerResponse.json()

    if (!customerResponse.ok && customerData.errors?.[0]?.code !== "already_exists") {
      console.error("Erro ao criar cliente Asaas:", customerData)
      return NextResponse.json({ error: "Erro ao processar cliente" }, { status: 400 })
    }

    const customerId = customerData.id || customerData.errors?.[0]?.description?.match(/id: ([a-z0-9_]+)/)?.[1]

    if (!customerId) {
      return NextResponse.json({ error: "Erro ao obter ID do cliente" }, { status: 400 })
    }

    // 2. Criar cobrança (pagamento único ou assinatura)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3) // Vencimento em 3 dias

    const billingType = paymentMethod === "pix" ? "PIX" : paymentMethod === "boleto" ? "BOLETO" : "CREDIT_CARD"

    const paymentData: any = {
      customer: customerId,
      billingType,
      value: amount,
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Plano ${planType} - Fitgoal`,
      externalReference: clientUid,
    }

    // Se for cartão de crédito, adicionar parcelamento
    if (billingType === "CREDIT_CARD" && installments) {
      paymentData.installmentCount = installments
      paymentData.installmentValue = amount / installments
    }

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentData),
    })

    const paymentResult = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error("Erro ao criar cobrança Asaas:", paymentResult)
      return NextResponse.json({ error: "Erro ao criar cobrança" }, { status: 400 })
    }

    // 3. Retornar dados específicos do método de pagamento
    const response: any = {
      paymentId: paymentResult.id,
      customerId,
      status: paymentResult.status,
      value: amount,
    }

    if (billingType === "PIX") {
      response.pixQrCode = paymentResult.encodedImage
      response.pixCopyPaste = paymentResult.payload
    } else if (billingType === "BOLETO") {
      response.boletoUrl = paymentResult.bankSlipUrl
      response.boletoBarCode = paymentResult.identificationField
    }

    console.log("Cobrança Asaas criada:", {
      paymentId: paymentResult.id,
      customerId,
      billingType,
      amount,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Erro fatal na API Asaas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
