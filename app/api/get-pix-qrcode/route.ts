import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || "production"
const ASAAS_API_URL = ASAAS_ENVIRONMENT === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get("paymentId")

    console.log("[v0] get-pix-qrcode - Buscando QR Code para paymentId:", paymentId)
    console.log("[v0] get-pix-qrcode - Environment:", ASAAS_ENVIRONMENT)
    console.log("[v0] get-pix-qrcode - API URL:", ASAAS_API_URL)

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId é obrigatório" }, { status: 400 })
    }

    if (!ASAAS_API_KEY) {
      console.error("[v0] get-pix-qrcode - ASAAS_API_KEY não configurada!")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    let pixResult: any = null
    let lastError: any = null
    const maxRetries = 3
    const retryDelay = 2000 // 2 segundos entre tentativas

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[v0] get-pix-qrcode - Tentativa ${attempt} de ${maxRetries}`)

      try {
        const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            access_token: ASAAS_API_KEY,
          },
        })

        console.log(`[v0] get-pix-qrcode - Tentativa ${attempt} - Status:`, pixResponse.status)

        pixResult = await pixResponse.json()
        console.log(`[v0] get-pix-qrcode - Tentativa ${attempt} - Resposta:`, JSON.stringify(pixResult, null, 2))

        if (pixResponse.ok && pixResult.encodedImage) {
          console.log("[v0] get-pix-qrcode - QR Code obtido com sucesso!")
          break
        }

        // Se não obteve sucesso, guarda o erro e tenta novamente
        lastError = pixResult

        if (attempt < maxRetries) {
          console.log(`[v0] get-pix-qrcode - Aguardando ${retryDelay}ms antes da próxima tentativa...`)
          await delay(retryDelay)
        }
      } catch (fetchError: any) {
        console.error(`[v0] get-pix-qrcode - Erro na tentativa ${attempt}:`, fetchError.message)
        lastError = fetchError

        if (attempt < maxRetries) {
          await delay(retryDelay)
        }
      }
    }

    // Verifica se conseguiu obter o QR Code
    if (!pixResult?.encodedImage) {
      console.error("[v0] get-pix-qrcode - Falhou após todas as tentativas:", lastError)
      return NextResponse.json(
        {
          error: "Erro ao buscar QR code após múltiplas tentativas",
          details: lastError,
        },
        { status: 400 },
      )
    }

    const response = {
      encodedImage: pixResult.encodedImage,
      payload: pixResult.payload,
      qrCodeUrl: pixResult.qrCodeUrl,
      allFields: pixResult,
    }

    console.log("[v0] QR Code obtido com sucesso - encodedImage presente:", !!pixResult.encodedImage)
    console.log("[v0] Payload (primeiros 50 chars):", pixResult.payload?.substring(0, 50) + "...")

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[v0] get-pix-qrcode - Erro fatal:", error.message || error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
