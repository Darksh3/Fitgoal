import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
})

export async function POST(req: Request) {
  try {
    const { email, planType, quizAnswers, clientUid } = await req.json()

    if (!email || !planType || !clientUid) {
      console.error("Missing required fields for Stripe checkout session:", {
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

    if (!process.env.NEXT_PUBLIC_URL) {
      console.error("NEXT_PUBLIC_URL environment variable is missing")
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
    }

    const isTestKey = process.env.STRIPE_SECRET_KEY!.startsWith("sk_test_")
    const isLiveKey = process.env.STRIPE_SECRET_KEY!.startsWith("sk_live_")
    console.log("DEBUG: Stripe environment info:", {
      keyType: isTestKey ? "TEST" : isLiveKey ? "LIVE" : "UNKNOWN",
      keyPrefix: process.env.STRIPE_SECRET_KEY!.substring(0, 12) + "...",
    })

    console.log("DEBUG: Dados recebidos para create-checkout-stripe:", {
      email,
      planType,
      clientUid,
      hasQuizAnswers: !!quizAnswers,
      supplementType: quizAnswers?.supplementType,
    })

    try {
      console.log(`DEBUG: Verificando se o price ID existe no Stripe: ${planType}`)
      const price = await stripe.prices.retrieve(planType)
      console.log(`DEBUG: Price encontrado: ${price.id} - ${price.nickname || "Sem nome"}`)
      console.log(`DEBUG: Price details:`, {
        id: price.id,
        active: price.active,
        currency: price.currency,
        type: price.type,
        livemode: price.livemode,
      })
    } catch (priceError: any) {
      console.error("ERRO: Price ID não encontrado no Stripe:", {
        priceId: planType,
        error: priceError.message,
        type: priceError.type,
        code: priceError.code,
      })
      return NextResponse.json(
        {
          error: `Price ID inválido: ${planType}. Verifique se este preço existe na sua conta Stripe.`,
        },
        { status: 400 },
      )
    }

    console.log("DEBUG: Criando sessão de checkout no Stripe...")

    const metadata: any = {
      clientUid: clientUid,
      planType: planType,
      email: email,
    }

    // Adicionar quizAnswers ao metadata se disponível
    if (quizAnswers) {
      try {
        // Stripe metadata tem limite de 500 caracteres por campo e 50 campos
        // Vamos serializar os dados essenciais
        metadata.quizAnswers = JSON.stringify(quizAnswers)
        console.log("DEBUG: quizAnswers adicionado ao metadata:", {
          supplementType: quizAnswers.supplementType,
          wantsSupplement: quizAnswers.wantsSupplement,
          metadataSize: metadata.quizAnswers.length,
        })
      } catch (serializeError) {
        console.error("ERRO: Falha ao serializar quizAnswers:", serializeError)
        // Continue sem quizAnswers no metadata - será recuperado do Firebase
      }
    }

    console.log("DEBUG: Metadata final:", {
      totalSize: JSON.stringify(metadata).length,
      fields: Object.keys(metadata),
    })

    const isMensalSubscription = planType === "price_1RajatPRgKqdJdqNnb9HQe17"
    const checkoutMode = isMensalSubscription ? "subscription" : "payment"

    console.log(
      `DEBUG: Modo de checkout: ${checkoutMode} (${isMensalSubscription ? "Mensal recorrente" : "Pagamento único"})`,
    )

    const paymentMethodOptions = isMensalSubscription
      ? undefined // Não oferece parcelamento para subscription
      : {
          card: {
            installments: {
              enabled: true,
            },
          },
        }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: planType,
          quantity: 1,
        },
      ],
      mode: checkoutMode,
      customer_email: email,
      payment_method_options: paymentMethodOptions,
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout`,
      metadata: metadata,
    })

    console.log(`DEBUG: Sessão de checkout Stripe criada com sucesso: ${session.id}`)
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("ERRO FATAL: Erro ao criar sessão de checkout Stripe:", {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      param: error.param,
      decline_code: error.decline_code,
      charge: error.charge,
      payment_intent: error.payment_intent,
      setup_intent: error.setup_intent,
      source: error.source,
      stack: error.stack,
    })

    let errorMessage = "Erro interno do servidor."

    if (error.type === "StripeInvalidRequestError") {
      if (error.code === "resource_missing") {
        errorMessage = `Price ID não encontrado: ${error.param}. Verifique se o preço existe na sua conta Stripe.`
      } else {
        errorMessage = `Erro na requisição Stripe: ${error.message}`
      }
    } else if (error.type === "StripeAuthenticationError") {
      errorMessage = "Erro de autenticação com Stripe. Verifique suas chaves de API."
    } else if (error.type === "StripePermissionError") {
      errorMessage = "Erro de permissão Stripe. Verifique as permissões da sua chave de API."
    } else if (error.type === "StripeRateLimitError") {
      errorMessage = "Muitas requisições para Stripe. Tente novamente em alguns segundos."
    } else if (error.type === "StripeConnectionError") {
      errorMessage = "Erro de conexão com Stripe. Verifique sua conexão de internet."
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
