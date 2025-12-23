import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_API_URL =
  process.env.NODE_ENV === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/v3"

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

    const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pix/qrcode`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
    })

    console.log("[v0] get-pix-qrcode - Status:", pixResponse.status)
    console.log("[v0] get-pix-qrcode - Headers:", Object.fromEntries(pixResponse.headers.entries()))

    const pixResult = await pixResponse.json()

    console.log("[v0] get-pix-qrcode - Resposta completa:", JSON.stringify(pixResult, null, 2))
    console.log("[v0] get-pix-qrcode - Campos disponíveis:", Object.keys(pixResult))

    if (!pixResponse.ok) {
      console.error("[v0] get-pix-qrcode - Erro:", pixResult)
      return NextResponse.json({ error: "Erro ao buscar QR code" }, { status: 400 })
    }

    const response = {
      encodedImage: pixResult.encodedImage,
      qrCode: pixResult.qrCode,
      dict: pixResult.dict,
      payload: pixResult.payload,
      // Retornar todos os campos para debug
      allFields: pixResult,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[v0] get-pix-qrcode - Erro fatal:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
