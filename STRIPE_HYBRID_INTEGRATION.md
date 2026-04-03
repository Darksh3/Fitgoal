# Integração Híbrida: Stripe (Cartão) + Asaas (PIX)

## Arquivos criados nesta integração

| Arquivo | Descrição |
|---|---|
| `app/api/create-stripe-payment-intent/route.ts` | API que cria o PaymentIntent no Stripe |
| `components/stripe-card-form.tsx` | Formulário de cartão via Stripe Elements (sem CPF/CEP) |
| `app/checkout/stripe-embedded-checkout.tsx` | Componente orquestrador do fluxo de cartão |
| `app/api/webhooks/stripe/route.ts` | Webhook atualizado para tratar `payment_intent.succeeded` |
| `package.json` | Adicionado `@stripe/react-stripe-js` e `@stripe/stripe-js` |

---

## Variáveis de ambiente necessárias

Adicione no Vercel (Settings > Environment Variables):

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> O `STRIPE_SECRET_KEY` já existia no projeto. Verifique se está configurado.
>
> ---
>
> ## Como configurar o Webhook no Stripe Dashboard
>
> 1. Acesse https://dashboard.stripe.com/webhooks
> 2. 2. Clique em "Add endpoint"
>    3. 3. URL: `https://seudominio.com/api/webhooks/stripe`
>       4. 4. Eventos a selecionar:
>          5.    - `payment_intent.succeeded`
>                -    - `payment_intent.payment_failed`
>                     -    - `checkout.session.completed` (já existia)
>                          -    - `customer.subscription.deleted` (já existia)
>                               - 5. Copie o "Signing secret" e adicione como `STRIPE_WEBHOOK_SECRET` no Vercel
>                                
>                                 6. ---
>                                
>                                 7. ## Integração no checkout/page.tsx
>                                
>                                 8. ### Passo 1 - Adicionar o import no topo do arquivo
>
> ```tsx
> import { StripeEmbeddedCheckout } from "./stripe-embedded-checkout"
> ```
>
> ### Passo 2 - Localizar onde o formulário de cartão é exibido
>
> Procure no código por onde `paymentMethod === "credit_card"` é verificado
> e o formulário antigo do Asaas é renderizado (campos de CPF, CEP, endereço, etc).
>
> ### Passo 3 - Substituir o bloco de cartão
>
> **ANTES (Asaas cartão):**
> ```tsx
> {paymentMethod === "credit_card" && (
>   // formulário antigo com holderName, cpfCnpj, postalCode, addressNumber...
>   <form onSubmit={handleCardPayment}>
>     ...campos CPF, CEP, endereço...
>   </form>
> )}
> ```
>
> **DEPOIS (Stripe):**
> ```tsx
> {paymentMethod === "credit_card" && (
>   <StripeEmbeddedCheckout
>     amount={totalAmount}           // valor total em R$ (ex: 59.90)
>     planType={selectedPlan}        // ex: "mensal", "trimestral"
>     clientUid={clientUid}          // uid do usuário Firebase anônimo
>     customerEmail={formData.email} // email do usuário
>     customerName={formData.name}   // nome do usuário
>     orderBumps={orderBumps}        // { ebook: boolean, protocolo: boolean }
>   />
> )}
> ```
>
> ### Passo 4 - PIX continua igual (sem mudança)
>
> O fluxo de PIX continua usando o Asaas exatamente como antes:
> ```tsx
> {paymentMethod === "pix" && (
>   // seu fluxo PIX atual com QR code do Asaas — não muda nada
> )}
> ```
>
> ---
>
> ## Fluxo completo após a integração
>
> ```
> Usuário seleciona método
>         |
>    +----|----+
>    |         |
>   PIX      Cartão
>    |         |
> Asaas     Stripe
>    |         |
> Webhook   Webhook
> Asaas     Stripe
>    |         |
>    +----+----+
>         |
> handle-post-checkout
> (email, Firebase, planos, pixels)
>         |
>      /success
> ```
>
> ---
>
> ## O que foi preservado
>
> - Todo o fluxo de PIX via Asaas: sem mudança
> - - O `handle-post-checkout` é o mesmo para os dois gateways
>   - - Os eventos de Meta CAPI e TikTok continuam funcionando
>     - - O Firestore registra pagamentos de ambos os gateways na collection `payments`
>       - - O campo `gateway` indica a origem: `"stripe"` ou `"asaas"`
>        
>         - ---
>
> ## Teste local com Stripe CLI
>
> ```bash
> # Instale o Stripe CLI
> stripe listen --forward-to localhost:3000/api/webhooks/stripe
>
> # Simule um pagamento bem-sucedido
> stripe trigger payment_intent.succeeded
> ```
>
> Use o cartão de teste: `4242 4242 4242 4242`, validade `12/34`, CVV `123`
> 
