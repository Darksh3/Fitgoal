# Fluxo Completo: Quiz → Leads → Admin Dashboard

## 🔄 Fluxo de Dados Passo a Passo

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1️⃣  USUÁRIO ACESSA /quiz                                       │
│     └─ Inicia o quiz (30 passos)                                │
│                                                                  │
│  2️⃣  CADA RESPOSTA É SALVA                                      │
│     └─ Firestore → users/{uid}/quizData                         │
│     └─ Salva em tempo real a cada passo                         │
│                                                                  │
│  3️⃣  PASSO 30 - FINAL DO QUIZ                                  │
│     └─ Usuário clica "CONTINUAR"                                │
│     └─ Dispara a função saveLead()                              │
│                                                                  │
│  4️⃣  API PROCESSA O LEAD                                        │
│     └─ POST /api/save-lead                                      │
│     └─ Coleta todos os 50+ dados do quiz                        │
│     └─ Prepara objeto leadData com tudo                         │
│                                                                  │
│  5️⃣  FIREBASE FIRESTORE SALVA                                   │
│     ├─ Firestore → leads/{uid}                                  │
│     │  (novo documento de lead criado!)                         │
│     └─ Firestore → users/{uid}/quizData                         │
│        (referência para consultas rápidas)                      │
│                                                                  │
│  6️⃣  REDIRECIONA PARA RESULTADOS                                │
│     └─ /quiz/results                                            │
│     └─ Mostra plano personalizado                               │
│                                                                  │
│  7️⃣  LEAD APARECE NO ADMIN DASHBOARD                            │
│     └─ /admin/leads                                             │
│     └─ Admin pode ver, filtrar e gerenciar                      │
│                                                                  │
│  8️⃣  OPCIONAL: PAGAMENTO                                        │
│     └─ Se pagar: lead status vira "customer"                    │
│     └─ Dados salvos em users e em payment/lead records          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Estrutura de Collections no Firebase

```
Firebase Firestore
│
├── 📁 users/                          (usuários do sistema)
│   ├── 📄 user-uid-1/
│   │   ├── uid: "user-uid-1"
│   │   ├── email: "joao@email.com"
│   │   ├── name: "João Silva"
│   │   ├── createdAt: timestamp
│   │   ├── quizData: { ...50+ dados }    ← Salvo da API /save-lead
│   │   ├── quizCompletedAt: timestamp
│   │   └── ... outros dados
│   │
│   └── 📄 user-uid-2/
│       └── ... (próximo usuário)
│
├── 📁 leads/                          (leads capturados do quiz)
│   ├── 📄 user-uid-1/
│   │   ├── uid: "user-uid-1"
│   │   ├── name: "João Silva"
│   │   ├── email: "joao@email.com"
│   │   ├── gender: "homem"
│   │   ├── age: 28
│   │   ├── height: 1.80
│   │   ├── currentWeight: 85
│   │   ├── targetWeight: 75
│   │   ├── imc: 26.2
│   │   ├── bodyType: "endomorfo"
│   │   ├── goals: ["emagrecer", "definir"]
│   │   ├── experience: "intermediário"
│   │   ├── status: "lead"              ← Status inicial
│   │   ├── source: "quiz"
│   │   ├── completedQuizAt: timestamp
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── ... 40+ outros campos
│   │
│   └── 📄 user-uid-2/
│       └── ... (próximo lead)
│
└── 📁 payments/                       (histórico de pagamentos)
    ├── 📄 payment-001/
    │   ├── uid: "user-uid-1"
    │   ├── amount: 99.00
    │   ├── status: "paid"
    │   ├── paidAt: timestamp
    │   └── ...
    │
    └── 📄 payment-002/
        └── ...
```

---

## 🎯 Dados Específicos Salvos como Lead

### Informações Pessoais
- ✅ uid
- ✅ name
- ✅ email
- ✅ gender
- ✅ age

### Medidas Físicas
- ✅ height
- ✅ currentWeight
- ✅ targetWeight
- ✅ bodyFat
- ✅ imc
- ✅ imcClassification
- ✅ bodyType

### Objetivos e Preferências
- ✅ goals (array: ["emagrecer", "ganhar", "definir", etc])
- ✅ subGoal
- ✅ problemAreas (array)
- ✅ additionalGoals (array)

### Nutrição e Dieta
- ✅ diet
- ✅ allergies
- ✅ allergyDetails
- ✅ sugarFrequency (array)
- ✅ waterIntake
- ✅ wantsSupplement
- ✅ supplementType
- ✅ foodPreferences (objeto)
- ✅ alcoholFrequency

### Saúde
- ✅ healthConditions (array)
- ✅ previousProblems (array)

### Treino e Exercício
- ✅ experience
- ✅ equipment (array)
- ✅ exercisePreferences (objeto)
- ✅ trainingDaysPerWeek
- ✅ trainingDays
- ✅ workoutTime
- ✅ strengthTraining
- ✅ cardioFeeling
- ✅ strengthFeeling
- ✅ stretchingFeeling
- ✅ letMadMusclesChoose

### Metadata
- ✅ status: "lead"
- ✅ source: "quiz"
- ✅ completedQuizAt
- ✅ createdAt
- ✅ updatedAt

---

## 🔐 Permissões no Firestore (RLS)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Leads - apenas admin pode ler
    match /leads/{document=**} {
      allow read: if request.auth.uid == 'admin-uid' || 
                     request.auth.token.admin == true;
      allow create: if request.auth != null;  // Qualquer usuário pode criar
      allow update: if request.auth.token.admin == true;  // Apenas admin atualiza
      allow delete: if request.auth.token.admin == true;  // Apenas admin deleta
    }
    
    // Users - cada um lê apenas seus dados
    match /users/{userId} {
      allow read: if request.auth.uid == userId || 
                     request.auth.token.admin == true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## 💾 Exemplo Real de um Lead Salvo

```json
{
  "uid": "user-12345",
  "name": "João Silva",
  "email": "joao@email.com",
  "gender": "homem",
  "age": 28,
  "height": 1.80,
  "currentWeight": 85,
  "targetWeight": 75,
  "bodyFat": 22,
  "imc": 26.2,
  "imcClassification": "sobrepeso",
  "imcStatus": "acima do peso",
  "bodyType": "endomorfo",
  "goals": ["emagrecer", "definir"],
  "subGoal": "aumentar autoestima",
  "problemAreas": ["barriga", "flanco", "costas"],
  "diet": "flexível",
  "allergies": false,
  "allergyDetails": null,
  "sugarFrequency": ["às vezes"],
  "waterIntake": "4-5 litros",
  "healthConditions": [],
  "wantsSupplement": true,
  "supplementType": ["whey", "creatina"],
  "weightChangeType": "perder",
  "timeToGoal": "3-4 meses",
  "experience": "intermediário",
  "equipment": ["dumbbells", "barra", "esteira"],
  "trainingDaysPerWeek": 4,
  "trainingDays": "seg, ter, qui, sab",
  "workoutTime": "1-1.5h",
  "strengthTraining": "gosto",
  "cardioFeeling": "não gosto muito",
  "stretchingFeeling": "indiferente",
  "previousProblems": [],
  "additionalGoals": ["melhorar saúde", "dormir melhor"],
  "foodPreferences": {
    "proteínas": ["frango", "ovos", "peixe"],
    "carboidratos": ["arroz", "batata doce"],
    "gorduras": ["azeite", "abacate"]
  },
  "alcoholFrequency": "uma vez por semana",
  "letMadMusclesChoose": false,
  "status": "lead",
  "source": "quiz",
  "completedQuizAt": "2026-01-25T14:30:00Z",
  "createdAt": "2026-01-25T14:30:00Z",
  "updatedAt": "2026-01-25T14:30:00Z"
}
```

---

## 🔍 Queries Úteis para o Admin Dashboard

### 1. Buscar todos os leads
```typescript
const allLeads = await db.collection('leads').get()
```

### 2. Buscar leads por objetivo (emagrecer)
```typescript
const losingWeight = await db
  .collection('leads')
  .where('goals', 'array-contains', 'emagrecer')
  .get()
```

### 3. Buscar leads iniciantes
```typescript
const beginners = await db
  .collection('leads')
  .where('experience', '==', 'iniciante')
  .get()
```

### 4. Buscar leads com sobrepeso
```typescript
const overweight = await db
  .collection('leads')
  .where('imcClassification', '==', 'sobrepeso')
  .get()
```

### 5. Buscar leads por tipo de corpo
```typescript
const endomorphs = await db
  .collection('leads')
  .where('bodyType', '==', 'endomorfo')
  .get()
```

### 6. Buscar leads dos últimos 7 dias
```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
const recentLeads = await db
  .collection('leads')
  .where('completedQuizAt', '>=', sevenDaysAgo)
  .orderBy('completedQuizAt', 'desc')
  .get()
```

### 7. Contar leads por objetivo
```typescript
const countByGoal = {}
const allLeads = await db.collection('leads').get()
allLeads.forEach(doc => {
  doc.data().goals?.forEach(goal => {
    countByGoal[goal] = (countByGoal[goal] || 0) + 1
  })
})
```

---

## 🎯 Status do Lead

O campo `status` pode ter os seguintes valores:

| Status | Significado | Ação |
|--------|-------------|------|
| `lead` | Novo lead do quiz | Enviar boas-vindas/email |
| `contacted` | Admin entrou em contato | Aguardar resposta |
| `interested` | Demonstrou interesse | Preparar proposta |
| `customer` | Virou cliente (pagou) | Onboarding completo |
| `paused` | Pausou temporariamente | Reativar depois |
| `inactive` | Não respondeu/desistiu | Reengajamento |

---

## ✅ Fluxo Pronto para Usar

Agora você tem:
1. ✅ **Quiz funcional** - Captura 50+ dados
2. ✅ **API de lead** - Salva tudo no Firestore
3. ✅ **Collections estruturadas** - users e leads
4. ✅ **Dados completos** - Tudo que precisa para vender

Próximo passo: Implementar o Admin Dashboard para visualizar e gerenciar esses leads.
