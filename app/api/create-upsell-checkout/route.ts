import Stripe from "stripe"
import { NextResponse } from "next/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// ID do produto de upsell no Stripe. Você precisará criar este produto no seu Dashboard do Stripe.
// Ex: 'prod_XYZ123'
const UPSELL_PRODUCT_ID = process.env.STRIPE_UPSELL_PRODUCT_ID || "prod_PLACEHOLDER_UPSELL_ID" // Crie este produto no Stripe e adicione o ID aqui ou como ENV

export async function POST(req: Request) {
  try {
    const { userId } = await req.json() // Você pode passar o userId do frontend se quiser associar a compra

    if (!UPSELL_PRODUCT_ID || UPSELL_PRODUCT_ID === "prod_PLACEHOLDER_UPSELL_ID") {
      console.error(
        "STRIPE_UPSELL_PRODUCT_ID não configurado. Por favor, crie um produto de upsell no Stripe e defina a variável de ambiente STRIPE_UPSELL_PRODUCT_ID.",
      )
      return NextResponse.json({ error: "Upsell product not configured." }, { status: 500 })
    }

    // Buscar o preço do produto de upsell
    const product = await stripe.products.retrieve(UPSELL_PRODUCT_ID, {
      expand: ["default_price"],
    })

    if (!product || !product.default_price) {
      console.error(`Produto de upsell com ID ${UPSELL_PRODUCT_ID} não encontrado ou sem preço padrão.`)
      return NextResponse.json({ error: "Upsell product or price not found." }, { status: 500 })
    }

    const priceId = (product.default_price as Stripe.Price).id

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // Para uma compra única (não assinatura)
      success_url: `${process.env.NEXT_PUBLIC_URL}/success-upsell?session_id={CHECKOUT_SESSION_ID}`, // Crie uma página de sucesso para o upsell se necessário
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/success`, // Volta para a página de sucesso principal se cancelar
      metadata: {
        userId: userId || "unknown", // Associe o userId à sessão de checkout
        productType: "upsell_consultoria_premium",
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Erro ao criar sessão de checkout de upsell:", error)
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
