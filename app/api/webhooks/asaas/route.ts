import { NextResponse } from "next/server"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    console.log("[v0] WEBHOOK_RECEIVED - Webhook Asaas recebido com sucesso")
    const body = await request.json()
    const event = body.event
    const payment = body.payment

    console.log("[v0] WEBHOOK_BODY - Event:", event, "PaymentID:", payment?.id, "Status:", payment?.status)

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        const userId = payment?.externalReference

        console.log("[v0] WEBHOOK_PAYMENT - Pagamento confirmado:", {
          userId,
          paymentId: payment?.id,
          status: payment?.status,
          value: payment?.value,
          billingType: payment?.billingType,
        })

        // Ativar plano do usuário, gerar treinos e enviar email
        if (userId) {
          try {
            console.log("[v0] WEBHOOK_CALLING_POST_CHECKOUT - Chamando handle-post-checkout para", userId)
            
            // Buscar dados completos do pagamento da API Asaas para ter email, nome, etc
            let customerName = payment?.customer?.name
            let customerEmail = payment?.customer?.email
            let customerPhone = payment?.customer?.phone
            let customerCpf = payment?.customer?.cpf
            
            // Se não tiver os dados do cliente, tentar buscar da API
            if (!customerEmail && payment?.id) {
              try {
                console.log("[v0] WEBHOOK_FETCHING_PAYMENT_DATA - Buscando dados completos do pagamento:", payment.id)
                const paymentDataResponse = await fetch(`https://api.asaas.com/v3/payments/${payment.id}`, {
                  headers: {
                    "access_token": ASAAS_API_KEY,
                  },
                })
                
                if (paymentDataResponse.ok) {
                  const paymentData = await paymentDataResponse.json()
                  customerName = paymentData.customer?.name || payment?.customer?.name
                  customerEmail = paymentData.customer?.email || payment?.customer?.email
                  customerPhone = paymentData.customer?.phone || payment?.customer?.phone
                  customerCpf = paymentData.customer?.cpf || payment?.customer?.cpf
                  console.log("[v0] WEBHOOK_PAYMENT_DATA_FETCHED - Dados encontrados:", { customerName, customerEmail })
                } else {
                  console.warn("[v0] WEBHOOK_FETCH_ERROR - Erro ao buscar dados do pagamento")
                }
              } catch (fetchError) {
                console.error("[v0] WEBHOOK_FETCH_ERROR - Erro ao buscar payment data:", fetchError)
              }
            }
            
            const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/handle-post-checkout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                userId,
                paymentId: payment?.id,
                billingType: payment?.billingType,
                customerName,
                customerEmail,
                customerPhone,
                customerCpf,
              }),
            })

            if (!generateResponse.ok) {
              const errorText = await generateResponse.text()
              console.error("[v0] WEBHOOK_ERROR - Erro ao processar checkout após pagamento. Status:", generateResponse.status, "Erro:", errorText)
            } else {
              console.log("[v0] WEBHOOK_SUCCESS - Checkout processado com sucesso para:", userId)
            }
          } catch (error) {
            console.error("[v0] WEBHOOK_ERROR - Erro ao processar checkout:", error)
          }
        } else {
          console.warn("[v0] WEBHOOK_WARNING - userId não encontrado no externalReference")
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
    console.error("[v0] WEBHOOK_ERROR - Erro no webhook Asaas:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 400 })
  }
}
