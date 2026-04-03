import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, admin } from "@/lib/firebaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
    const body = await request.text()
    const sig = request.headers.get("stripe-signature")

  if (!sig) {
        console.error("[stripe-webhook] stripe-signature header ausente")
        return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
        event = stripe.webhooks.constructEvent(
                body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET!
              )
  } catch (err: any) {
        console.error("[stripe-webhook] Erro na verificação da assinatura:", err.message)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`[stripe-webhook] Evento recebido: ${event.type}`)

  switch (event.type) {
          // =========================================================
      // PAGAMENTO ÚNICO (Payment Intent) — usado pelo híbrido cartão
      // =========================================================
    case "payment_intent.succeeded": {
            const intent = event.data.object as Stripe.PaymentIntent
            console.log("[stripe-webhook] payment_intent.succeeded:", intent.id)

            // 1. Atualizar status no Firestore
            try {
                      await adminDb.collection("payments").doc(intent.id).set(
                        {
                                      status: "CONFIRMED",
                                      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
                                      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                                )
                      console.log("[stripe-webhook] Payment doc atualizado:", intent.id)
            } catch (err) {
                      console.error("[stripe-webhook] Erro ao atualizar Firestore:", err)
            }

            // 2. Chamar o handle-post-checkout (mesmo fluxo do Asaas)
            const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_URL
            if (appUrl) {
                      const clientUid = intent.metadata?.clientUid || null
                      const customerEmail = intent.metadata?.customerEmail || null
                      const customerName = intent.metadata?.customerName || null
                      const planType = intent.metadata?.planType || null
                      let orderBumps: any = {}
                                try {
                                            orderBumps = JSON.parse(intent.metadata?.orderBumps || "{}")
                                } catch {}

              const payload = {
                          userId: clientUid,
                          paymentId: intent.id,
                          customerName: customerName,
                          customerEmail: customerEmail,
                          value: intent.amount / 100,
                          planType: planType,
                          orderBumps: orderBumps,
                          gateway: "stripe",
              }

              console.log("[stripe-webhook] Chamando handle-post-checkout com payload:", payload)

              try {
                          const res = await fetch(`${appUrl}/api/handle-post-checkout`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(payload),
                          })
                          if (!res.ok) {
                                        const errText = await res.text()
                                        console.error("[stripe-webhook] handle-post-checkout retornou erro:", res.status, errText)
                          } else {
                                        console.log("[stripe-webhook] handle-post-checkout executado com sucesso")
                          }
              } catch (fetchErr) {
                          console.error("[stripe-webhook] Erro ao chamar handle-post-checkout:", fetchErr)
              }
            } else {
                      console.warn("[stripe-webhook] APP_URL/NEXT_PUBLIC_URL não configurado")
            }

            break
    }

    case "payment_intent.payment_failed": {
            const intent = event.data.object as Stripe.PaymentIntent
            console.log("[stripe-webhook] payment_intent.payment_failed:", intent.id)
            try {
                      await adminDb.collection("payments").doc(intent.id).set(
                        {
                                      status: "DECLINED",
                                      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                                )
            } catch (err) {
                      console.error("[stripe-webhook] Erro ao marcar pagamento como falho:", err)
            }
            break
    }

      // =========================================================
      // CHECKOUT SESSION (fluxo antigo com redirect — mantido)
      // =========================================================
    case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session
            const userId = session.metadata?.userId
            const planType = session.metadata?.planType
            console.log("[stripe-webhook] checkout.session.completed:", { userId, planType })

            if (userId) {
                      try {
                                  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/generate-plans-on-demand`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ userId }),
                                  })
                                  console.log("[stripe-webhook] Geração de planos acionada para userId:", userId)
                      } catch (err) {
                                  console.error("[stripe-webhook] Erro ao acionar geração de planos:", err)
                      }
            }
            break
    }

    case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription
            console.log("[stripe-webhook] Assinatura cancelada:", subscription.id)
            break
    }

    default:
            console.log(`[stripe-webhook] Evento não tratado: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

export async function GET() {
    return NextResponse.json({ status: "stripe webhook active" }, { status: 200 })
}
