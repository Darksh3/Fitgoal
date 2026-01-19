import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log("[v0] WEBHOOK_TEST - Webhook de teste recebido")
    console.log("[v0] WEBHOOK_TEST_BODY - Body:", JSON.stringify(body, null, 2))
    
    return NextResponse.json({ 
      received: true,
      message: "Webhook de teste recebido com sucesso",
      bodyReceived: body,
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] WEBHOOK_TEST_ERROR - Erro:", error)
    return NextResponse.json({ 
      error: "Erro ao receber webhook de teste",
    }, { status: 500 })
  }
}
