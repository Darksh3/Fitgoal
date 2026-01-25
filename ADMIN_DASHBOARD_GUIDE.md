# Admin Dashboard - O Que É e Como Implementar

## 📊 O Que é um Dashboard Admin?

É uma **página administrativa privada** onde você (dono do negócio) pode gerenciar todos os leads capturados pelo quiz. Basicamente é um **CRM visual** integrado na sua aplicação.

---

## 🎯 Funcionalidades Principais de um Dashboard Admin

### 1. **Visualizar Todos os Leads**
- Listar todos os leads capturados
- Ver nome, email, objetivo, experiência, biótipo, etc
- Ordenação e busca

```
┌─────────────────────────────────────────────┐
│ Admin Dashboard - Leads                     │
├─────────────────────────────────────────────┤
│ 🔍 Buscar por nome/email                    │
│ 🔽 Filtrar por objetivo, experiência, IMC  │
│                                             │
│ ID    | Nome      | Email        | Objetivo│
├───────┼───────────┼──────────────┼─────────┤
│ u-001 | João      | joao@email   | Emagrecer│
│ u-002 | Maria     | maria@email  | Ganhar  │
│ u-003 | Pedro     | pedro@email  | Definir │
└─────────────────────────────────────────────┘
```

### 2. **Filtrar e Segmentar Leads**
- Por objetivo (emagrecer, ganhar massa, definir, etc)
- Por experiência (iniciante, intermediário, avançado)
- Por IMC (baixo peso, normal, sobrepeso, obeso)
- Por biótipo (ectomorfo, mesomorfo, endomorfo)
- Por idade, gênero, etc

```javascript
// Exemplo: Buscar leads que querem emagrecer e são iniciantes
const leavesToEmailBlackFriday = await db
  .collection('leads')
  .where('goals', 'array-contains', 'emagrecer')
  .where('experience', '==', 'iniciante')
  .get()

// Enviar email para essa segmentação específica
```

### 3. **Gerenciar Status do Lead**
- **lead** → Lead novo do quiz
- **contacted** → Já foi contatado
- **interested** → Demonstrou interesse
- **customer** → Virou cliente (completou pagamento)
- **paused** → Pausado
- **inactive** → Inativo

### 4. **Ver Detalhes Completos de Cada Lead**
- Todas as 50+ respostas do quiz
- Data que completou o quiz
- Histórico de contatos
- Status atual
- Anotações do vendedor

### 5. **Exportar Dados**
- Exportar para CSV/Excel
- Integração com Mailchimp, EmailGo, etc
- Enviar massa de emails

### 6. **Análises e Relatórios**
- Total de leads
- Taxa de conversão (lead → cliente)
- Leads por objetivo
- Leads por experiência
- E muito mais

---

## 📁 Estrutura de um Dashboard Admin

```
app/
├── admin/
│   ├── layout.tsx              (layout protegido)
│   ├── page.tsx                (página principal do dashboard)
│   ├── leads/
│   │   ├── page.tsx            (listar todos os leads)
│   │   └── [id]/page.tsx       (ver detalhe de um lead)
│   ├── analytics/
│   │   └── page.tsx            (gráficos e relatórios)
│   └── settings/
│       └── page.tsx            (configurações)
│
├── components/
│   ├── admin/
│   │   ├── leads-table.tsx     (tabela de leads)
│   │   ├── lead-filters.tsx    (filtros)
│   │   ├── lead-detail.tsx     (detalhe de um lead)
│   │   └── admin-stats.tsx     (estatísticas)
│
└── api/
    └── admin/
        ├── leads/
        │   ├── route.ts        (GET todos os leads)
        │   └── [id]/route.ts   (GET/PUT um lead específico)
        └── analytics/route.ts  (dados para gráficos)
```

---

## 🔐 Proteção e Segurança

O dashboard deve ser **protegido** para que apenas admins possam acessar:

```typescript
// middleware.ts ou em /app/admin/layout.tsx
const isAdmin = currentUser.role === 'admin'
if (!isAdmin) {
  redirect('/auth')
}
```

---

## 💾 Dados que Você Terá Disponível

| Campo | Tipo | Uso |
|-------|------|-----|
| uid | string | ID único do lead |
| name | string | Nome completo |
| email | string | Email para contato |
| gender | string | Gênero (homem/mulher) |
| age | number | Idade |
| goals | array | Objetivos (emagrecer, ganhar, etc) |
| experience | string | Experiência em treinos |
| bodyType | string | Biótipo (ecto/meso/endomorfo) |
| imc | number | Índice de Massa Corporal |
| completedQuizAt | timestamp | Quando completou o quiz |
| status | string | Status atual do lead |
| source | string | De onde veio (quiz) |

---

## 🚀 Próximas Fases

### **Fase 1: Dashboard Básico** (Recomendado começar aqui)
- ✅ Listar todos os leads
- ✅ Ver detalhes de cada lead
- ✅ Buscar por nome/email
- ✅ Filtro básico por objetivo

### **Fase 2: Funcionalidades Avançadas**
- ✅ Múltiplos filtros simultâneos
- ✅ Mudar status dos leads
- ✅ Adicionar anotações
- ✅ Exportar para CSV

### **Fase 3: Integrações e Automações**
- ✅ Enviar emails em massa
- ✅ Integração com Mailchimp
- ✅ Webhooks para CRM externo
- ✅ API para parceiros

### **Fase 4: Analytics e IA**
- ✅ Dashboard de conversão
- ✅ Gráficos e relatórios
- ✅ Previsões com IA
- ✅ Insights automáticos

---

## 📊 Exemplo de Query para o Dashboard

```typescript
// app/api/admin/leads/route.ts

export async function GET(request: NextRequest) {
  const adminDb = getFirebaseAdmin().firestore()
  
  // Buscar todos os leads com status "lead"
  const leadsQuery = await adminDb
    .collection('leads')
    .where('status', '==', 'lead')
    .orderBy('completedQuizAt', 'desc')
    .limit(100)
    .get()

  const leads = leadsQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return NextResponse.json({
    success: true,
    totalLeads: leads.length,
    leads: leads
  })
}
```

---

## 🎨 Componentes Necessários

### 1. **Tabela de Leads**
```tsx
<LeadsTable 
  leads={leads}
  onRowClick={(lead) => setSelectedLead(lead)}
/>
```

### 2. **Filtros**
```tsx
<LeadFilters 
  onFilter={(filters) => fetchLeads(filters)}
/>
```

### 3. **Detalhe do Lead**
```tsx
<LeadDetail 
  lead={selectedLead}
  onStatusChange={(newStatus) => updateLead(newStatus)}
/>
```

### 4. **Estatísticas**
```tsx
<AdminStats 
  totalLeads={123}
  conversionRate={15}
  averageAge={28}
/>
```

---

## ⏱️ Tempo para Implementar

- **Dashboard Básico (Fase 1)**: 2-3 horas
- **Com Filtros (Fase 2)**: +3-4 horas
- **Com Integrações (Fase 3)**: +4-5 horas

---

## ✨ Benefícios

1. **Gerenciar Vendas**: Você vê todos os leads em tempo real
2. **Segmentar Público**: Enviar mensagens específicas para cada tipo
3. **Medir ROI**: Saber quantos leads viraram clientes
4. **Automação**: Enviar emails automáticos para grupos específicos
5. **Análises**: Entender melhor seu público-alvo

---

## 🎯 Recomendação

Comece com o **Dashboard Básico (Fase 1)**, que já resolve 90% dos seus problemas. Depois adicione as integrações conforme necessário.

Quer que eu implemente o Dashboard Básico agora?
