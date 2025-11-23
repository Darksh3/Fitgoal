import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
})

export async function POST(req: Request) {
  try {
    const { customerId, paymentMethodId, priceId, clientUid, installments = 1 } = await req.json()

    if (!customerId || !paymentMethodId || !priceId || !clientUid) {
      console.error("Missing required fields for payment creation:", {
        customerId: !!customerId,
        paymentMethodId: !!paymentMethodId,
        priceId: !!priceId,
        clientUid: !!clientUid,
      })
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    const validInstallments = Math.min(Math.max(1, installments), 6)

    // Mapeamento de priceId para valores e durações
    const planDetails: { [key: string]: { amount: number; duration: number; name: string } } = {
      price_1RajatPRgKqdJdqNnb9HQe17: { amount: 9790, duration: 30, name: "Plano Premium Mensal" }, // R$ 97,90
      price_1SPs2cPRgKqdJdqNbiXZYLhI: { amount: 14790, duration: 90, name: "Plano Trimestral" }, // R$ 147,90
      price_1SPrzGPRgKqdJdqNNLfhAYNo: { amount: 29490, duration: 180, name: "Plano Semestral" }, // R$ 294,90
      price_1RajgKPRgKqdJdqNnhxim8dd: { amount: 29990, duration: 365, name: "Plano Premium Anual" }, // R$ 299,90
      price_1RdpDTPRgKqdJdqNrvZccKxj: { amount: 100, duration: 365, name: "Plano Anual Teste" }, // R$ 1,00 (teste)
    }

    const plan = planDetails[priceId]
    if (!plan) {
      return NextResponse.json({ error: "Invalid price ID." }, { status: 400 })
    }

    console.log("DEBUG: Creating one-time payment with installments:", {
      customerId,
      paymentMethodId,
      priceId,
      clientUid,
      amount: plan.amount,
      installments: validInstallments,
      duration: plan.duration,
    })

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // Criar Payment Intent com parcelamento (suportado para pagamentos únicos)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: "brl",
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      payment_method_types: ["card"],
      // Parcelamento suportado em pagamentos únicos
      payment_method_options: {
        card: {
          installments: {
            enabled: true,
            plan: {
              count: validInstallments,
              interval: "month",
              type: "fixed_count",
            },
          },
        },
      },
      metadata: {
        clientUid: clientUid,
        priceId: priceId,
        planName: plan.name,
        planDuration: plan.duration.toString(),
        installments: validInstallments.toString(),
      },
    })

    console.log(`DEBUG: Payment Intent created: ${paymentIntent.id}, status: ${paymentIntent.status}`)

    // Verificar status do pagamento
    if (paymentIntent.status === "succeeded") {
      console.log("DEBUG: Payment succeeded, processing success")

      // Chamar o webhook para processar pós-pagamento
      try {
        const postCheckoutResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/handle-post-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            customer_id: customerId,
            client_uid: clientUid,
            plan_duration: plan.duration,
            price_id: priceId,
          }),
        })

        if (!postCheckoutResponse.ok) {
          console.error("Post-checkout processing failed")
        }
      } catch (postError) {
        console.error("Error calling post-checkout handler:", postError)
      }

      return NextResponse.json({
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: null,
      })
    } else if (paymentIntent.status === "requires_action") {
      // Pagamento requer ação (3D Secure)
      return NextResponse.json({
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        requiresAction: true,
      })
    } else {
      console.error("Payment creation failed:", paymentIntent.status)
      return NextResponse.json({ error: "Payment creation failed." }, { status: 400 })
    }
  } catch (error: any) {
    console.error("FATAL ERROR: Failed to create payment:", {
      message: error.message,
      type: error.type,
      code: error.code,
    })

    let errorMessage = "Internal server error."

    if (error.type === "StripeInvalidRequestError") {
      errorMessage = `Stripe error: ${error.message}`
    } else if (error.type === "StripeCardError") {
      errorMessage = `Card error: ${error.message}`
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
