import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || "production"
const ASAAS_API_URL = ASAAS_ENVIRONMENT === "sandbox" ? "https://sandbox.asaas.com/v3" : "https://api.asaas.com/v3"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId é obrigatório" }, { status: 400 })
    }

    if (!ASAAS_API_KEY) {
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
    })

    console.log("[v0] get-pix-qrcode - Status da resposta:", pixResponse.status)

    const pixResult = await pixResponse.json()

    console.log("[v0] get-pix-qrcode - Resposta do QR code:", JSON.stringify(pixResult, null, 2))

    if (!pixResponse.ok) {
      console.error("[v0] get-pix-qrcode - Erro ao buscar QR code:", pixResult)
      return NextResponse.json({ error: "Erro ao buscar QR code" }, { status: 400 })
    }

    const response = {
      encodedImage: pixResult.encodedImage,
      payload: pixResult.payload,
      qrCodeUrl: pixResult.qrCodeUrl,
      allFields: pixResult,
    }

    console.log("[v0] QR Code obtido com sucesso - encodedImage:", !!pixResult.encodedImage)
    console.log("[v0] Payload:", pixResult.payload?.substring(0, 50) + "...")

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[v0] get-pix-qrcode - Erro fatal:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
