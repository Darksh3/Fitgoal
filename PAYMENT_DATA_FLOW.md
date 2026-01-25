# 📊 Fluxo de Salvamento de Dados após Pagamento

## ❌ Problema Identificado

Após o pagamento ser confirmado, **os leads NÃO estavam sendo salvos** no Firebase Firestore. Somente os usuários (`users` collection) eram salvos.

---

## ✅ Solução Implementada

Adicionado código no arquivo `/app/api/handle-post-checkout/route.tsx` para **salvar também os leads** após o pagamento ser processado.

---

## 🔄 Fluxo Completo de Pagamento

### 1️⃣ **Webhook de Pagamento Recebido**

**Arquivos envolvidos:**
- `app/api/webhooks/stripe/route.ts` (para Stripe)
- `app/api/webhooks/asaas/route.ts` (para Asaas)
- `app/api/webhooks/nowpayments/route.ts` (para criptomoedas)

**O que acontece:**
```
Pagamento confirmado → Webhook recebido → Dispara processamento
```

---

### 2️⃣ **Processamento do Pagamento Background**

**Arquivo:** `app/api/webhooks/asaas/route.ts` (função `processPaymentBackground`)

**O que faz:**
1. ✅ Atualiza coleção `payments` com status
2. ✅ Recupera dados do lead se existir em `leads` collection
3. ✅ Chama `handle-post-checkout` com dados do pagamento

```javascript
// Dados recuperados do webhook ou do documento 'leads'
{
  userId,
  paymentId: payment.id,
  billingType: payment.billingType,
  customerName,
  customerEmail,
  customerPhone,
  customerCpf,
}
```

---

### 3️⃣ **Processamento Pós-Checkout**

**Arquivo:** `app/api/handle-post-checkout/route.tsx`

**O que faz (sequência):**

#### A. Recupera dados do cliente
- ✅ Email do webhook
- ✅ Nome do cliente
- ✅ Telefone e CPF (se fornecido)
- ✅ Dados do quiz/formulário

#### B. Autenticação & Usuário Firebase
- ✅ Cria/atualiza usuário em Firebase Auth
- ✅ Converte usuários anônimos em autenticados

#### C. **🆕 Agora TAMBÉM salva o Lead!**
- ✅ Cria documento em `leads` collection
- ✅ Marca como "customer" (não mais um lead)
- ✅ Registra data de conversão
- ✅ Inclui todos os dados do plano

---

## 📁 Estrutura de Dados no Firestore

### **Collection: `users`**
```javascript
users/{uid}
  ├── uid: string
  ├── name: string
  ├── email: string
  ├── quizData: object
  ├── quizAnswers: object
  ├── dietPlan: object
  ├── workoutPlan: object
  ├── subscriptionStatus: "active" | "inactive"
  ├── subscriptionExpiresAt: timestamp
  ├── planType: string
  ├── isPremium: boolean
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── ...
```

### **Collection: `leads` (🆕 Agora salvo após pagamento!)**
```javascript
leads/{uid}
  ├── uid: string                    // Mesmo ID do usuário
  ├── name: string
  ├── email: string
  ├── phone: string (nullable)
  ├── cpf: string (nullable)
  ├── status: "customer"             // Antes era "lead"
  ├── convertedAt: timestamp         // 🆕 Data de conversão
  ├── paymentDate: timestamp         // 🆕 Data do pagamento
  ├── planType: string
  ├── planName: string
  ├── subscriptionStatus: "active"
  ├── subscriptionExpiresAt: timestamp
  ├── source: "checkout"             // De onde veio
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

### **Collection: `payments`**
```javascript
payments/{paymentId}
  ├── paymentId: string
  ├── userId: string
  ├── status: "RECEIVED" | "CONFIRMED"
  ├── billingType: "PIX" | "CREDIT_CARD" | "CRYPTO"
  ├── value: number
  └── updatedAt: timestamp
```

---

## 🔀 Fluxo Passo a Passo

```
┌─────────────────────────────────────┐
│   Usuário Faz Pagamento             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Gateway (Stripe/Asaas/Crypto)     │
│   Confirma Pagamento                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Webhook Recebido                  │
│   /api/webhooks/{gateway}/route.ts  │
└────────────┬────────────────────────┘
             │
             ├──► ✅ Salva em payments collection
             │
             └──► Chama processPaymentBackground()
                      │
                      ├──► Recupera dados do lead (se existir)
                      │
                      └──► Chama /api/handle-post-checkout
                               │
                               ├──► ✅ Cria/Atualiza usuário em Auth
                               ├──► ✅ Salva em users collection
                               └──► ✅ Salva em leads collection (NOVO!)
                                    └──► Envia email de confirmação
```

---

## 🐛 O Que Estava Faltando

### **ANTES (Incompleto):**
```typescript
// Somente salvava user, não o lead
await userDocRef.set(userData, { merge: true })
// E pronto! Lead não era salvo.
```

### **DEPOIS (Completo):**
```typescript
// 1. Salva user
await userDocRef.set(userData, { merge: true })

// 2. 🆕 AGORA TAMBÉM SALVA O LEAD!
const leadData = {
  uid: finalUserUid,
  name: userName,
  email: userEmail,
  phone: customerPhone,
  cpf: customerCpf,
  status: "customer",      // Convertido de lead
  convertedAt: timestamp,
  paymentDate: timestamp,
  planType: planType,
  // ... outros dados
}
await adminDb.collection("leads").doc(finalUserUid).set(leadData, { merge: true })
```

---

## 📍 Arquivo Modificado

**`/app/api/handle-post-checkout/route.tsx`**

- **Linhas 361-383:** Salvamento original do usuário (user)
- **Linhas 385-420:** 🆕 **NOVO** - Salvamento do lead

---

## 🔍 Como Verificar se está Funcionando

### **No Firebase Console:**

1. **Acesse:** Console Firebase → seu projeto → Firestore Database

2. **Verifique Collection `users`:**
   - Procure pelo UID do usuário que pagou
   - Confirme que tem: `email`, `name`, `subscriptionStatus: "active"`

3. **Verifique Collection `leads`:**
   - Procure pelo mesmo UID
   - Confirme que tem:
     - ✅ `status: "customer"`
     - ✅ `convertedAt: [timestamp do pagamento]`
     - ✅ `paymentDate: [timestamp do pagamento]`
     - ✅ Todos os dados de contato

4. **Verifique Collection `payments`:**
   - Procure pelo `paymentId`
   - Confirme que tem: `status: "CONFIRMED"` ou `"RECEIVED"`

---

## 🛠️ Troubleshooting

### **Lead não está aparecendo?**

1. **Verifique o console:**
   - Procure por logs: `[v0] LEAD_SAVED` ou `[v0] LEAD_SAVE_ERROR`

2. **Verifique permissões Firestore:**
   - Acesse: Firestore → Rules
   - Confirme que o backend (Firebase Admin SDK) pode escrever em `leads`

3. **Verifique dados do webhook:**
   - Procure por: `[v0] WEBHOOK_BG - Processando para userId:`
   - Confirme que `userId` está sendo passado corretamente

### **Variáveis faltando?**

- `customerPhone` e `customerCpf` podem ser `null` - é normal!
- O importante é ter `email` e `uid`

---

## 🚀 Próximos Passos

### Verificações Recomendadas:

1. ✅ Fazer um pagamento de teste
2. ✅ Verificar console do navegador para erros
3. ✅ Verificar Firestore Console após 30 segundos
4. ✅ Confirmar que:
   - `users/{uid}` foi criado
   - `leads/{uid}` foi criado
   - `payments/{paymentId}` foi atualizado
5. ✅ Verificar email de confirmação

---

## 📞 Suporte

Se o lead ainda não estiver sendo salvo:

1. Verifique os logs do Firebase Cloud Functions
2. Procure por erros como: `LEAD_SAVE_ERROR`
3. Valide que o `finalUserUid` está correto
4. Confirme que a chave de autenticação do Firebase Admin está ativa
