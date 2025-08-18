import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-nowpayments-sig")

    // Verificar assinatura do webhook
    const expectedSignature = crypto
      .createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET!)
      .update(body)
      .digest("hex")

    if (signature !== expectedSignature) {
      return Response.json({ error: "Invalid signature" }, { status: 401 })
    }

    const paymentData = JSON.parse(body)

    switch (paymentData.payment_status) {
      case "finished":
        console.log("Pagamento crypto confirmado:", {
          orderId: paymentData.order_id,
          amount: paymentData.price_amount,
          currency: paymentData.price_currency,
          cryptoCurrency: paymentData.pay_currency,
        })

        // Extrair userId do order_id
        const userId = paymentData.order_id.split("_")[1]

        // Ativar assinatura do usuário
        // await activateUserSubscription(userId, 'premium')
        break

      case "failed":
        console.log("Pagamento crypto falhou:", paymentData.order_id)
        break

      default:
        console.log("Status de pagamento crypto:", paymentData.payment_status)
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("NOWPayments webhook error:", error)
    return Response.json({ error: "Webhook error" }, { status: 400 })
  }
}
