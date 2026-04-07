import { NextResponse } from "next/server"
import Stripe from "stripe"
import { admin } from "@/lib/firebaseAdmin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
})

export async function POST(req: Request) {
    try {
          const {
                  amount,
                  planType,
                  clientUid,
                  orderBumps,
                  description,
                  customerEmail,
                  customerName,
          } = await req.json()

      if (!amount) {
              return NextResponse.json({ error: "Valor obrigatório" }, { status: 400 })
      }

      if (!process.env.STRIPE_SECRET_KEY) {
              return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
      }

      // Criar PaymentIntent no Stripe (em centavos)
      const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(parseFloat(amount) * 100),
              currency: "brl",
              description: description || `Plano ${planType} - Fitgoal`,
              receipt_email: customerEmail || undefined,
              metadata: {
                        clientUid: clientUid || "",
                        planType: planType || "",
                        customerEmail: customerEmail || "",
                        customerName: customerName || "",
                        orderBumps: JSON.stringify(orderBumps || {}),
              },
              automatic_payment_methods: {
                        enabled: true,
                        allow_redirects: "never",
              },
      })

      // Registrar no Firestore (mesmo padrão do Asaas), se o Firebase Admin estiver inicializado
      try {
              if (admin.apps.length > 0) {
                      const db = admin.firestore()
                      await db
                        .collection("payments")
                        .doc(paymentIntent.id)
                        .set({
                                    stripePaymentIntentId: paymentIntent.id,
                                    paymentId: paymentIntent.id,
                                    userId: clientUid || null,
                                    leadId: clientUid || null,
                                    planType: planType || null,
                                    billingType: "CREDIT_CARD",
                                    gateway: "stripe",
                                    amount: parseFloat(amount),
                                    value: parseFloat(amount),
                                    status: "PENDING",
                                    source: "checkout",
                                    customerEmail: customerEmail || null,
                                    customerName: customerName || null,
                                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                    orderBumps: orderBumps || {},
                        })
              } else {
                      console.warn("Firebase Admin não inicializado. Pulando registro de pagamento no Firestore.")
              }
      } catch (firestoreErr) {
              console.error("[stripe-pi] Firestore warning:", firestoreErr)
              // Não falha o request — o webhook vai atualizar depois
      }

      return NextResponse.json({
              clientSecret: paymentIntent.client_secret,
              paymentIntentId: paymentIntent.id,
      })
    } catch (error: any) {
          console.error("[stripe-pi] Erro ao criar PaymentIntent:", error)
          return NextResponse.json(
            { error: error.message || "Erro interno ao criar pagamento" },
            { status: 500 }
                )
    }
}
