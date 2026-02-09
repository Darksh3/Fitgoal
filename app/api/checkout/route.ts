import { NextRequest, NextResponse } from "next/server"

const ASAAS_API_URL = process.env.ASAAS_ENVIRONMENT === "production" 
  ? "https://api.asaas.com/v3" 
  : "https://sandbox.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { paymentMethod, formData, cardData, addressData, planKey, planName, planPrice, installments } = await req.json()

    // Validate required fields
    if (!paymentMethod || !formData || !planPrice) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Prepare customer data
    const customerData = {
      name: formData.name || "Cliente",
      email: formData.email,
      cpfCnpj: formData.cpf?.replace(/\D/g, ""),
      phone: formData.phone?.replace(/\D/g, ""),
      mobilePhone: formData.phone?.replace(/\D/g, ""),
    }

    // Create customer first
    const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access-token": ASAAS_API_KEY!,
      },
      body: JSON.stringify(customerData),
    })

    let customerId = ""

    if (customerRes.ok) {
      const customer = await customerRes.json()
      customerId = customer.id
    } else {
      // Se falhar, tenta buscar pelo email
      const listRes = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(formData.email)}`, {
        headers: { "access-token": ASAAS_API_KEY! },
      })
      if (listRes.ok) {
        const list = await listRes.json()
        if (list.data && list.data.length > 0) {
          customerId = list.data[0].id
        }
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 400 })
    }

    // Create payment based on method
    if (paymentMethod === "pix") {
      return await createPixPayment(customerId, planPrice, planName)
    } else if (paymentMethod === "boleto") {
      return await createBoletoPayment(customerId, planPrice, planName, addressData)
    } else if (paymentMethod === "card") {
      return await createCardPayment(customerId, planPrice, planName, cardData, installments)
    }

    return NextResponse.json({ error: "Método de pagamento inválido" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Erro em checkout:", error)
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 })
  }
}

async function createPixPayment(customerId: string, amount: string, description: string) {
  const response = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": ASAAS_API_KEY!,
    },
    body: JSON.stringify({
      customer: customerId,
      value: parseFloat(amount),
      description: `FitGoal - ${description}`,
      billingType: "PIX",
      dueDate: new Date().toISOString().split("T")[0],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error: "Erro ao criar Pix" }, { status: 400 })
  }

  const payment = await response.json()

  // Get Pix QR Code
  const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/qrCode`, {
    headers: { "access-token": ASAAS_API_KEY! },
  })

  if (qrRes.ok) {
    const qr = await qrRes.json()
    return NextResponse.json({
      paymentId: payment.id,
      qrCode: qr.encodedImage,
      copyPaste: qr.payload,
    })
  }

  return NextResponse.json({ paymentId: payment.id, qrCode: "", copyPaste: "" })
}

async function createBoletoPayment(customerId: string, amount: string, description: string, addressData: any) {
  const response = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": ASAAS_API_KEY!,
    },
    body: JSON.stringify({
      customer: customerId,
      value: parseFloat(amount),
      description: `FitGoal - ${description}`,
      billingType: "BOLETO",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 3 days from now
      postalCode: addressData?.postalCode || "",
      addressNumber: addressData?.addressNumber || "",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error: "Erro ao criar Boleto" }, { status: 400 })
  }

  const payment = await response.json()
  return NextResponse.json({
    paymentId: payment.id,
    barCode: payment.barCode,
    url: payment.bankSlipUrl,
  })
}

async function createCardPayment(
  customerId: string,
  amount: string,
  description: string,
  cardData: any,
  installments: number
) {
  const response = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": ASAAS_API_KEY!,
    },
    body: JSON.stringify({
      customer: customerId,
      value: parseFloat(amount),
      description: `FitGoal - ${description}`,
      billingType: "CREDIT_CARD",
      creditCard: {
        holderName: cardData.holderName,
        number: cardData.number?.replace(/\D/g, ""),
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        ccv: cardData.ccv,
      },
      installmentCount: installments,
      installmentValue: (parseFloat(amount) / installments).toFixed(2),
      postalCode: cardData.addressData?.postalCode || "",
      addressNumber: cardData.addressData?.addressNumber || "",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error: "Erro ao processar cartão" }, { status: 400 })
  }

  const payment = await response.json()
  return NextResponse.json({
    paymentId: payment.id,
    status: payment.status,
  })
}
