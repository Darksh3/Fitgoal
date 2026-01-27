import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || "production"
const ASAAS_API_URL = ASAAS_ENVIRONMENT === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"

export async function POST(req: Request) {
  try {
    const { paymentId, creditCard, creditCardHolderInfo } = await req.json()

    if (!paymentId || !creditCard || !creditCardHolderInfo) {
      return NextResponse.json({ error: "Dados do cartão ausentes" }, { status: 400 })
    }

    if (!ASAAS_API_KEY) {
      return NextResponse.json({ error: "Erro de configuração" }, { status: 500 })
    }

    // Processar pagamento com cartão de crédito
    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/payWithCreditCard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        creditCard: {
          holderName: creditCard.holderName,
          number: creditCard.number,
          expiryMonth: creditCard.expiryMonth,
          expiryYear: creditCard.expiryYear,
          ccv: creditCard.ccv,
        },
        creditCardHolderInfo: {
          name: creditCardHolderInfo.name,
          email: creditCardHolderInfo.email,
          cpfCnpj: creditCardHolderInfo.cpfCnpj,
          postalCode: creditCardHolderInfo.postalCode,
          addressNumber: creditCardHolderInfo.addressNumber,
          phone: creditCardHolderInfo.phone,
        },
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("Erro ao processar cartão Asaas:", result)
      return NextResponse.json(
        { error: result.errors?.[0]?.description || "Erro ao processar pagamento" },
        { status: 400 },
      )
    }

    console.log("Pagamento com cartão processado:", {
      paymentId,
      status: result.status,
    })

    return NextResponse.json({
      success: true,
      status: result.status,
      paymentId: result.id,
    })
  } catch (error: any) {
    console.error("Erro ao processar cartão:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
