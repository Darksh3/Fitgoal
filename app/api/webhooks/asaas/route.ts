import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

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
            
            // Primeiramente, tentar obter dados do payment do Asaas
            let customerName = payment?.customer?.name
            let customerEmail = payment?.customer?.email
            let customerPhone = payment?.customer?.phone
            let customerCpf = payment?.customer?.cpf
            
            console.log("[v0] WEBHOOK_ASAAS_CUSTOMER_DATA - Dados do Asaas:", { customerName, customerEmail, customerPhone, customerCpf })
            
            // Se não tiver email no Asaas, buscar lead do Firebase
            if (!customerEmail) {
              try {
                console.log("[v0] WEBHOOK_FETCHING_LEAD_DATA - Email não encontrado no Asaas, buscando do Firebase:", userId)
                const leadDocRef = adminDb.collection("leads").doc(userId)
                const leadDocSnap = await leadDocRef.get()
                
                // Firebase Admin SDK usa .exists (propriedade), não .exists() (função)
                if (leadDocSnap.exists) {
                  const leadData = leadDocSnap.data()
                  // Usar dados do Firebase para preencher os vazios
                  customerName = customerName || leadData?.name
                  customerEmail = leadData?.email // Usar do Firebase pois Asaas não tem
                  customerPhone = customerPhone || leadData?.phone
                  customerCpf = customerCpf || leadData?.cpf
                  console.log("[v0] WEBHOOK_LEAD_DATA_FOUND - Dados complementados do lead:", { customerName, customerEmail })
                } else {
                  console.warn("[v0] WEBHOOK_LEAD_NOT_FOUND - Lead não encontrado no Firebase para userId:", userId)
                }
              } catch (firebaseError) {
                console.error("[v0] WEBHOOK_FIREBASE_ERROR - Erro ao buscar lead do Firebase:", firebaseError)
              }
            }
            
            console.log("[v0] WEBHOOK_FINAL_CUSTOMER_DATA - Dados finais para enviar:", { customerName, customerEmail, customerPhone, customerCpf })
            
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
