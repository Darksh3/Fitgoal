import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
})

export async function POST(req: Request) {
  try {
    const { customerId, paymentMethodId, priceId, clientUid } = await req.json()

    if (!customerId || !paymentMethodId || !priceId || !clientUid) {
      console.error("Missing required fields for subscription creation:", {
        customerId: !!customerId,
        paymentMethodId: !!paymentMethodId,
        priceId: !!priceId,
        clientUid: !!clientUid,
      })
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    console.log("DEBUG: Creating subscription:", {
      customerId,
      paymentMethodId,
      priceId,
      clientUid,
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

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        clientUid: clientUid,
        priceId: priceId,
      },
    })

    console.log(`DEBUG: Subscription created: ${subscription.id}`)

    // Handle different subscription statuses
    if (subscription.status === "active") {
      // Subscription is active, process success
      console.log("DEBUG: Subscription is active, processing success")

      // Call post-checkout handler to create user and save data
      try {
        const postCheckoutResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/handle-post-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: subscription.id,
            subscription_id: subscription.id,
            customer_id: customerId,
            client_uid: clientUid,
          }),
        })

        if (!postCheckoutResponse.ok) {
          console.error("Post-checkout processing failed")
        }
      } catch (postError) {
        console.error("Error calling post-checkout handler:", postError)
      }

      return NextResponse.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: null,
      })
    } else if (subscription.status === "incomplete") {
      // Payment requires action
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice
      const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent

      return NextResponse.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: paymentIntent.client_secret,
        requiresAction: true,
      })
    } else {
      // Subscription failed
      console.error("Subscription creation failed:", subscription.status)
      return NextResponse.json({ error: "Subscription creation failed." }, { status: 400 })
    }
  } catch (error: any) {
    console.error("FATAL ERROR: Failed to create subscription:", {
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
