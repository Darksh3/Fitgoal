import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const sig = request.headers.get("stripe-signature")!

    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.metadata?.userId as string | undefined
        const planType = session.metadata?.planType as string | undefined

        console.log("Pagamento Stripe confirmado:", {
          userId: userId,
          planType: planType,
          customerId: session.customer,
          subscriptionId: session.subscription,
          mode: session.mode, // Log do modo de pagamento
        })

        // Ativar assinatura do usuário (se necessário, você pode ter uma função para isso)
        // await activateUserSubscription(userId, planType)

        // *** NOVO: Acionar a geração do plano pela IA após o pagamento ***
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
              const errorData = await generateResponse.json()
              console.error("Erro ao acionar geração de planos:", errorData)
              // Você pode querer logar isso em um sistema de monitoramento de erros
            } else {
              console.log("Geração de planos acionada com sucesso para o usuário:", userId)
            }
          } catch (generateError) {
            console.error("Erro ao fazer fetch para generate-plans-on-demand:", generateError)
          }
        } else {
          console.warn("userId não encontrado na sessão do Stripe. Geração de planos não acionada.")
        }
        // *** FIM DO NOVO ***

        break

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log("Pagamento único confirmado:", {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          customer: paymentIntent.customer,
        })
        break

      case "customer.subscription.deleted":
        const subscription = event.data.object as Stripe.Subscription
        console.log("Assinatura cancelada:", subscription.id)
        // await deactivateUserSubscription(subscription.metadata?.userId)
        break

      default:
        console.log(`Evento não tratado: ${event.type}`)
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ error: "Webhook error" }, { status: 400 })
  }
}
