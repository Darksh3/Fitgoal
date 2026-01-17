import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const event = body.event

    console.log("Webhook Asaas recebido:", event)

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        const payment = body.payment
        const userId = payment.externalReference

        console.log("Pagamento Asaas confirmado:", {
          userId,
          paymentId: payment.id,
          value: payment.value,
          billingType: payment.billingType,
        })

        // Ativar plano do usuário e gerar treinos
        if (userId) {
          try {
            const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/generate-plans-on-demand`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId }),
            })

            if (!generateResponse.ok) {
              console.error("Erro ao gerar planos após pagamento")
            } else {
              console.log("Planos gerados com sucesso para:", userId)
            }
          } catch (error) {
            console.error("Erro ao acionar geração de planos:", error)
          }
        }
        break

      case "PAYMENT_OVERDUE":
        console.log("Pagamento vencido:", body.payment.id)
        break

      case "PAYMENT_DELETED":
        console.log("Pagamento cancelado:", body.payment.id)
        break

      default:
        console.log(`Evento não tratado: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erro no webhook Asaas:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 400 })
  }
}
