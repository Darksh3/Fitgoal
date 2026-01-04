# Configuração do Asaas

## Passo 1: Obter a chave de API

1. Acesse [https://www.asaas.com](https://www.asaas.com) e faça login na sua conta
2. Vá em **Configurações** → **Integrações** → **API**
3. Copie sua chave de API (começa com `$aact_prod_` ou `$aact_test_`)

## Passo 2: Adicionar variável de ambiente

Adicione a seguinte variável de ambiente no seu projeto Vercel ou arquivo `.env.local`:

```
ASAAS_API_KEY=sua_chave_aqui
```

**Importante:** 
- Use a chave de **sandbox** (`$aact_test_`) para testes
- Use a chave de **produção** (`$aact_prod_`) apenas quando estiver pronto para receber pagamentos reais

## Passo 3: Configurar Webhook

Para receber notificações de pagamento em tempo real:

1. No painel do Asaas, vá em **Configurações** → **Integrações** → **Webhooks**
2. Adicione a URL do webhook: `https://seu-dominio.com/api/webhooks/asaas`
3. Selecione os eventos:
   - `PAYMENT_RECEIVED` - Pagamento recebido
   - `PAYMENT_CONFIRMED` - Pagamento confirmado
   - `PAYMENT_OVERDUE` - Pagamento vencido
   - `PAYMENT_DELETED` - Pagamento cancelado

## Métodos de Pagamento Disponíveis

- **Pix**: Pagamento instantâneo com QR Code
- **Boleto**: Vencimento em 3 dias úteis
- **Cartão de Crédito**: Parcelamento em até 6x sem juros

## Testando em Sandbox

Quando estiver usando a chave de sandbox, você pode usar os seguintes dados para testar:

### Cartão de Crédito (Aprovado)
- Número: `5162306219378829`
- Validade: qualquer data futura
- CVV: `318`
- Nome: qualquer nome

### Cartão de Crédito (Recusado)
- Número: `5311719273716021`
- Validade: qualquer data futura
- CVV: `842`
- Nome: qualquer nome

### Pix e Boleto
Em sandbox, os pagamentos via Pix e Boleto não são processados automaticamente. Você precisará marcar manualmente como pago no painel do Asaas para testar o fluxo completo.

## Documentação Oficial

Para mais informações, consulte a [Documentação da API do Asaas](https://docs.asaas.com/reference/introducao)
