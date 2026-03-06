# Webhook Security - Asaas

## Overview
O webhook do Asaas (`/api/webhooks/asaas`) agora valida automaticamente todas as requisições usando um token secreto para proteger contra webhooks falsificados.

## Configuração

### 1. Gerar Token Secreto
Você pode usar qualquer string aleatória forte como token. Sugestões:
- Use o gerador de tokens: https://randomkeygen.com
- Copie um token de "CodeIgniter Encryption Keys" (128 bits)
- Exemplo: `a7f3d9e2b4c1f6a8d5e9c3b7f1a4d8e2`

### 2. Configurar no Vercel
1. Vá em **Settings > Environment Variables**
2. Adicione: `ASAAS_WEBHOOK_TOKEN` = `seu_token_aqui`
3. Redeploy seu projeto

### 3. Configurar no Painel Asaas
1. Acesse https://app.asaas.com (seu painel Asaas)
2. Vá em **Configurações > Integrações > Webhooks**
3. Clique em **Editar** no webhook de pagamentos (ou crie um novo)
4. **URL do Webhook:** `https://fitgoal.com.br/api/webhooks/asaas`
5. **Token de Acesso/Autenticação:** Cole o mesmo token que adicionou no Vercel
6. Selecione os eventos:
   - ✓ PAYMENT_CONFIRMED (pagamento confirmado)
   - ✓ PAYMENT_RECEIVED (pagamento recebido)
   - ✓ PAYMENT_OVERDUE (pagamento vencido)
   - ✓ PAYMENT_DELETED (pagamento deletado)
   - ✓ PAYMENT_RESTORED (pagamento restaurado)
7. Clique em **Salvar**

## Como Funciona

### Fluxo de Validação
```
1. Webhook é enviado pelo Asaas para seu endpoint
2. Servidor extrai o token do header "asaas-access-token"
3. Token é comparado com ASAAS_WEBHOOK_TOKEN (env var)
4. Se match: processa o pagamento
5. Se não match: retorna 401 Unauthorized
```

### Headers Aceitos
O webhook valida o token em qualquer um desses headers:
- `asaas-access-token`: `seu_token_aqui`
- `authorization`: `Bearer seu_token_aqui`

### Logs de Segurança
Todos os webhooks são logados no console com informações de validação:
- `[v0] Webhook token validado com sucesso` - Token correto
- `[v0] Webhook rejeitado: token inválido ou ausente` - Token errado/faltando
- `[v0] ASAAS_WEBHOOK_TOKEN não configurado` - Token não está na env var

## Teste Seguro

### Testar com Curl (localmente)
```bash
# Com token correto
curl -X POST https://fitgoal.com.br/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: seu_token_aqui" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "status": "CONFIRMED",
      "value": 79.90,
      "externalReference": "user_uid_123"
    }
  }'

# Sem token (deve retornar 401)
curl -X POST https://fitgoal.com.br/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Testar no Painel Asaas
1. No painel Asaas, vá para Webhooks
2. Clique em "Teste" ou "Send Test"
3. Verifique os logs do Vercel (Deployments > Logs)
4. Procure por `Webhook token validado com sucesso`

## Segurança Adicionada

✅ **Autenticação obrigatória** - Webhooks sem token são rejeitados (401)
✅ **Proteção contra falsificação** - Apenas Asaas conhece o token secreto
✅ **Logging de eventos** - Toda tentativa é registrada
✅ **Idempotência** - Webhooks duplicados não causam duplicação de dados
✅ **Validação de payload** - Estrutura do webhook é validada antes de processar

## Troubleshooting

### "Webhook rejeitado: token inválido"
- Verifique se o `ASAAS_WEBHOOK_TOKEN` está configurado no Vercel
- Confirme que o token no Vercel é idêntico ao do painel Asaas
- Confirme que o token não tem espaços extras
- Faça redeploy após alterar a env var

### "ASAAS_WEBHOOK_TOKEN não configurado"
- Adicione a variável no Vercel Settings > Environment Variables
- Redeploy o projeto
- Este aviso não impede webhooks, mas deixa o sistema vulnerável

### Webhook não chegando
- Verifique se a URL está correta: `https://fitgoal.com.br/api/webhooks/asaas`
- Confirme que o webhook está habilitado no painel Asaas
- Teste o webhook manualmente no painel ("Send Test")
- Verifique os logs do Vercel para erros

## Documentação Oficial
- Asaas Webhooks: https://docs.asaas.com/webhooks
- Asaas Payment Events: https://docs.asaas.com/reference/payment-events
