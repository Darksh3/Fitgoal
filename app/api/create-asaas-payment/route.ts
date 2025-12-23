import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_API_URL =
  process.env.NODE_ENV === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/v3"

export async function POST(req: Request) {
  try {
    const { email, name, cpf, phone, planType, paymentMethod, installments, clientUid } = await req.json()

    console.log("[v0] create-asaas-payment - Dados recebidos:", {
      email,
      name,
      cpf,
      phone,
      planType,
      paymentMethod,
      clientUid,
    })
    console.log("[v0] create-asaas-payment - Environment:", { env: process.env.NODE_ENV, apiUrl: ASAAS_API_URL })

    if (!email || !name || !cpf || !planType || !paymentMethod || !clientUid) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 })
    }

    if (!ASAAS_API_KEY) {
      console.error("ASAAS_API_KEY não configurada")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    console.log("[v0] create-asaas-payment - API Key verificação:", {
      keyExists: !!ASAAS_API_KEY,
      keyLength: ASAAS_API_KEY?.length || 0,
      keyFirstChars: ASAAS_API_KEY?.substring(0, 5) + "***" || "N/A",
    })

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
    const cleanPhone = phone ? phone.replace(/\D/g, "") : ""

    console.log("[v0] create-asaas-payment - Dados limpos:", { cleanCpf, cleanPhone })

    // 1. Criar ou buscar cliente no Asaas
    const customerData: any = {
      name,
      email,
      cpfCnpj: cleanCpf,
      externalReference: clientUid,
    }

    // Only add phone if provided
    if (cleanPhone) {
      customerData.phone = cleanPhone
    }

    console.log("[v0] create-asaas-payment - Criando cliente com dados:", customerData)

    const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(customerData),
    })

    console.log("[v0] create-asaas-payment - Requisição enviada:", {
      url: `${ASAAS_API_URL}/customers`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY ? `${ASAAS_API_KEY.substring(0, 10)}...` : "N/A",
      },
    })

    const customerResult = await customerResponse.json()

    console.log("[v0] create-asaas-payment - Status da resposta:", customerResponse.status)
    console.log(
      "[v0] create-asaas-payment - Headers da resposta:",
      Object.fromEntries(customerResponse.headers.entries()),
    )
    console.log("[v0] create-asaas-payment - Corpo da resposta completo:", JSON.stringify(customerResult, null, 2))

    let customerId = null

    if (customerResponse.ok) {
      // Cliente criado com sucesso
      customerId = customerResult.id
      console.log("[v0] create-asaas-payment - Cliente criado com sucesso:", customerId)
    } else if (customerResult.errors?.[0]?.code === "already_exists") {
      // Cliente já existe, buscar por CPF
      console.log("[v0] create-asaas-payment - Cliente já existe, buscando por CPF...")

      const searchResponse = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cleanCpf}`, {
        headers: {
          access_token: ASAAS_API_KEY,
        },
      })

      const searchResult = await searchResponse.json()
      console.log("[v0] create-asaas-payment - Resultado da busca:", searchResult)

      if (searchResponse.ok && searchResult.data?.[0]?.id) {
        customerId = searchResult.data[0].id
        console.log("[v0] create-asaas-payment - Cliente encontrado:", customerId)
      }
    } else {
      // Erro ao criar cliente
      console.error("[v0] create-asaas-payment - Erro ao criar cliente:", customerResult)
      return NextResponse.json(
        {
          error: `Erro ao processar cliente: ${customerResult.errors?.[0]?.description || "Erro desconhecido"}`,
        },
        { status: 400 },
      )
    }

    if (!customerId) {
      console.error("[v0] create-asaas-payment - Não foi possível obter ID do cliente")
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
