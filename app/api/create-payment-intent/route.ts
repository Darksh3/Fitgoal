import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
})

export async function POST(req: Request) {
  try {
    const { email, planType, clientUid } = await req.json()

    if (!email || !planType || !clientUid) {
      console.error("Missing required fields for Payment Intent:", {
        email: !!email,
        planType: !!planType,
        clientUid: !!clientUid,
      })
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY environment variable is missing")
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
    }

    console.log("DEBUG: Creating Payment Intent for subscription:", {
      email,
      planType,
      clientUid,
    })

    // Verify price exists
    try {
      const price = await stripe.prices.retrieve(planType)
      console.log(`DEBUG: Price found: ${price.id} - ${price.nickname || "No name"}`)
    } catch (priceError: any) {
      console.error("ERROR: Price ID not found in Stripe:", {
        priceId: planType,
        error: priceError.message,
      })
      return NextResponse.json({ error: `Invalid price ID: ${planType}` }, { status: 400 })
    }

    // Create or retrieve customer
    let customer
    try {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
        console.log(`DEBUG: Found existing customer: ${customer.id}`)
      } else {
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            clientUid: clientUid,
          },
        })
        console.log(`DEBUG: Created new customer: ${customer.id}`)
      }
    } catch (customerError: any) {
      console.error("ERROR: Failed to create/retrieve customer:", customerError.message)
      return NextResponse.json({ error: "Failed to process customer" }, { status: 500 })
    }

    // Create Setup Intent for future payments (subscription)
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        clientUid: clientUid,
        planType: planType,
        email: email,
      },
    })

    console.log(`DEBUG: Setup Intent created: ${setupIntent.id}`)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
    })
  } catch (error: any) {
    console.error("FATAL ERROR: Failed to create Payment Intent:", {
      message: error.message,
      type: error.type,
      code: error.code,
    })

    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
