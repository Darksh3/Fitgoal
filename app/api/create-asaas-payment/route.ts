import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || "production"
const ASAAS_API_URL = ASAAS_ENVIRONMENT === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"

export async function POST(req: Request) {
  console.log("[v0] === API CREATE-ASAAS-PAYMENT STARTED ===")

  try {
    console.log("[v0] Step 1: Parsing request body...")
    const body = await req.json()
    console.log("[v0] Step 1 DONE - Body parsed:", JSON.stringify(body, null, 2))

    const { email, name, cpf, phone, planType, paymentMethod, installments, clientUid, description } = body

    console.log("[v0] Step 2: Validating required fields...")
    console.log("[v0] clientUid received:", clientUid)
    if (!email || !name || !cpf || !planType || !paymentMethod) {
      console.log("[v0] Step 2 FAILED - Missing fields:", {
        email: !email ? "MISSING" : "OK",
        name: !name ? "MISSING" : "OK",
        cpf: !cpf ? "MISSING" : "OK",
        planType: !planType ? "MISSING" : "OK",
        paymentMethod: !paymentMethod ? "MISSING" : "OK",
      })
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 })
    }
    console.log("[v0] Step 2 DONE - All required fields present")

    console.log("[v0] Step 3: Checking API Key...")
    if (!ASAAS_API_KEY) {
      console.error("[v0] Step 3 FAILED - ASAAS_API_KEY não configurada")
      return NextResponse.json({ error: "Erro de configuração do servidor - API Key ausente" }, { status: 500 })
    }
    console.log("[v0] Step 3 DONE - API Key exists, length:", ASAAS_API_KEY.length)

    console.log("[v0] Step 4: Getting plan price...")
    const planPrices: Record<string, number> = {
      mensal: 79.9,
      trimestral: 199.8,
      semestral: 359.7,
    }

    const amount = planPrices[planType]
    if (!amount) {
      console.log("[v0] Step 4 FAILED - Invalid plan type:", planType)
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
    }
    console.log("[v0] Step 4 DONE - Plan price:", amount)

    console.log("[v0] Step 5: Cleaning CPF and phone...")
    const cleanCpf = cpf.replace(/\D/g, "")
    const cleanPhone = phone ? phone.replace(/\D/g, "") : ""
    console.log("[v0] Step 5 DONE - Clean CPF:", cleanCpf, "Clean Phone:", cleanPhone)

    // 1. Criar ou buscar cliente no Asaas
    console.log("[v0] Step 6: Creating customer in Asaas...")
    const customerData: any = {
      name,
      email,
      cpfCnpj: cleanCpf,
    }

    if (cleanPhone) {
      customerData.phone = cleanPhone
    }

    if (clientUid) {
      customerData.externalReference = clientUid
    }

    console.log("[v0] Step 6 - Customer data to send:", JSON.stringify(customerData, null, 2))
    console.log("[v0] Step 6 - API URL:", `${ASAAS_API_URL}/customers`)

    const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(customerData),
    })

    console.log("[v0] Step 6 - Customer response status:", customerResponse.status)

    const customerResult = await customerResponse.json()
    console.log("[v0] Step 6 - Customer response body:", JSON.stringify(customerResult, null, 2))

    let customerId = null

    if (customerResponse.ok) {
      customerId = customerResult.id
      console.log("[v0] Step 6 DONE - Customer created with ID:", customerId)
    } else if (customerResult.errors?.[0]?.code === "invalid_cpfCnpj") {
      console.log("[v0] Step 6 FAILED - Invalid CPF/CNPJ")
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 })
    } else if (
      customerResult.errors?.some((e: any) => e.code === "invalid_cpfCnpj" || e.description?.includes("já existe"))
    ) {
      // Cliente já existe, buscar por CPF
      console.log("[v0] Step 6b: Customer already exists, searching by CPF...")

      const searchResponse = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cleanCpf}`, {
        headers: {
          access_token: ASAAS_API_KEY,
        },
      })

      const searchResult = await searchResponse.json()
      console.log("[v0] Step 6b - Search result:", JSON.stringify(searchResult, null, 2))

      if (searchResponse.ok && searchResult.data?.[0]?.id) {
        customerId = searchResult.data[0].id
        console.log("[v0] Step 6b DONE - Customer found with ID:", customerId)
      }
    } else {
      // Erro ao criar cliente
      console.error("[v0] Step 6 FAILED - Error creating customer:", JSON.stringify(customerResult, null, 2))
      return NextResponse.json(
        {
          error: `Erro ao processar cliente: ${customerResult.errors?.[0]?.description || customerResult.errors?.[0]?.code || "Erro desconhecido"}`,
          details: customerResult.errors,
        },
        { status: 400 },
      )
    }

    if (!customerId) {
      console.error("[v0] Step 6 FINAL FAILED - Could not obtain customer ID")
      return NextResponse.json({ error: "Erro ao obter ID do cliente" }, { status: 400 })
    }

    // 2. Criar cobrança
    console.log("[v0] Step 7: Creating payment...")
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)

    const billingType = paymentMethod === "pix" ? "PIX" : paymentMethod === "boleto" ? "BOLETO" : "CREDIT_CARD"

    const paymentData: any = {
      customer: customerId,
      billingType,
      value: amount,
      dueDate: dueDate.toISOString().split("T")[0],
      description: description || `Plano ${planType} - Fitgoal Fitness`,
    }

    if (billingType === "CREDIT_CARD" && installments) {
      paymentData.installmentCount = installments
      paymentData.installmentValue = amount / installments
    }

    if (clientUid) {
      paymentData.externalReference = clientUid
    }

    console.log("[v0] Step 7 - Payment data to send:", JSON.stringify(paymentData, null, 2))

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentData),
    })

    console.log("[v0] Step 7 - Payment response status:", paymentResponse.status)

    const paymentResult = await paymentResponse.json()
    console.log("[v0] Step 7 - Payment response body:", JSON.stringify(paymentResult, null, 2))

    if (!paymentResponse.ok) {
      console.error("[v0] Step 7 FAILED - Error creating payment:", JSON.stringify(paymentResult, null, 2))
      return NextResponse.json(
        {
          error: paymentResult.errors?.[0]?.description || "Erro ao criar cobrança",
          details: paymentResult.errors,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Step 7 DONE - Payment created with ID:", paymentResult.id)

    // SALVAR NO FIRESTORE IMEDIATAMENTE
    console.log("[v0] Step 7.5: Saving payment to Firestore...")
    try {
      const paymentDocData = {
        paymentId: paymentResult.id,
        userId: clientUid || null,
        status: paymentResult.status,
        billingType: billingType,
        value: amount,
        customerId: customerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      await adminDb.collection("payments").doc(paymentResult.id).set(paymentDocData, { merge: true })
      console.log("[v0] Step 7.5 DONE - Payment saved to Firestore with status:", paymentResult.status)
    } catch (firebaseError) {
      console.error("[v0] Step 7.5 WARNING - Error saving to Firestore (non-blocking):", firebaseError)
      // Não interromper o fluxo se Firestore falhar
    }

    // 3. Retornar dados específicos do método de pagamento
    console.log("[v0] Step 8: Preparing response...")
    const response: any = {
      paymentId: paymentResult.id,
      customerId,
      status: paymentResult.status,
      value: amount,
    }

    if (billingType === "PIX") {
      response.pixQrCode = paymentResult.encodedImage || paymentResult.qrCode
      response.pixCopyPaste = paymentResult.payload
    } else if (billingType === "BOLETO") {
      response.boletoUrl = paymentResult.bankSlipUrl
      response.boletoBarCode = paymentResult.identificationField
    }

    console.log("[v0] Step 8 DONE - Final response:", JSON.stringify(response, null, 2))
    console.log("[v0] === API CREATE-ASAAS-PAYMENT COMPLETED SUCCESSFULLY ===")

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[v0] === API CREATE-ASAAS-PAYMENT FATAL ERROR ===")
    console.error("[v0] Error name:", error.name)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
