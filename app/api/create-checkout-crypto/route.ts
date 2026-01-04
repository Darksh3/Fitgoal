export async function POST(request: Request) {
  try {
    const { amount, currency, planType, userId } = await request.json()

    const nowPaymentsData = {
      price_amount: amount,
      price_currency: currency,
      pay_currency: "", // Deixar vazio para mostrar todas as opções
      order_id: `fitgoal_${userId}_${Date.now()}`,
      order_description: `Fitgoal ${planType} Plan Subscription`,
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true&payment=crypto`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/assinatura?canceled=true`,
    }

    const response = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify(nowPaymentsData),
    })

    const paymentData = await response.json()

    if (!response.ok) {
      throw new Error(paymentData.message || "Erro ao criar pagamento crypto")
    }

    return Response.json({
      paymentId: paymentData.payment_id,
      paymentUrl: paymentData.payment_url,
      paymentData,
    })
  } catch (error) {
    console.error("NOWPayments error:", error)
    return Response.json({ error: "Erro ao criar pagamento crypto" }, { status: 500 })
  }
}
