# Resumo: Leads e Users Collections

## ✅ AGORA SERÁ CRIADO AUTOMATICAMENTE

### **Quando?**
- **Passo 30 do Quiz** - Quando o usuário clica "Continuar"

### **Onde?**
- **`leads/{uid}`** - Documento novo com UID do usuário
- **`users/{uid}`** - Actualiza com dados do quiz

### **O Que Será Salvo?**

#### Collection: `leads/{uid}` (50+ campos)
```javascript
{
  uid: "user-123",
  name: "João Silva",
  email: "joao@email.com",
  gender: "homem",
  age: 28,
  height: 1.80,
  currentWeight: 85,
  targetWeight: 75,
  bodyType: "endomorfo",
  goals: ["emagrecer", "definir"],
  experience: "intermediário",
  status: "lead",           // ← NOVO STATUS
  completedQuizAt: <timestamp>,
  createdAt: <timestamp>,
  // ... mais 40+ campos
}
```

#### Collection: `users/{uid}` (já salva)
```javascript
{
  uid: "user-123",
  email: "joao@email.com",
  name: "João Silva",
  quizData: { ...todos os 50+ dados },
  quizCompletedAt: <timestamp>,
  // ... outros dados
}
```

---

## 🎯 O Que é um Dashboard Admin?

É uma **página administrativa** (`/admin/leads`) onde você pode:

### 📊 **Visualizar**
- ✅ Todos os leads em uma tabela
- ✅ Detalhes completos de cada lead
- ✅ Histórico de contatos

### 🔍 **Filtrar**
- ✅ Por objetivo (emagrecer, ganhar, definir)
- ✅ Por experiência (iniciante, intermediário, avançado)
- ✅ Por IMC (baixo peso, normal, sobrepeso, obeso)
- ✅ Por biótipo (ectomorfo, mesomorfo, endomorfo)
- ✅ Por idade, gênero, etc.

### 📧 **Gerenciar**
- ✅ Mudar status (lead → contacted → customer)
- ✅ Adicionar anotações
- ✅ Enviar emails

### 📈 **Analisar**
- ✅ Total de leads
- ✅ Taxa de conversão
- ✅ Leads por objetivo
- ✅ Gráficos e relatórios

### 💾 **Exportar**
- ✅ Para Excel/CSV
- ✅ Para CRM (Mailchimp, EmailGo, etc)

---

## 🏗️ Estrutura do Admin Dashboard

```
/admin/leads                    ← Lista todos os leads
  ├── Tabela com 50+ leads
  ├── Filtros avançados
  ├── Busca por nome/email
  └── Clique em um lead → vai para

/admin/leads/[uid]              ← Detalhe de 1 lead
  ├── Informações pessoais
  ├── Respostas completas do quiz
  ├── Status atual
  ├── Anotações
  └── Botão mudar status

/admin/analytics                ← Gráficos e dados
  ├── Total de leads
  ├── Leads por objetivo
  ├── Taxa de conversão
  └── Gráficos
```

---

## 💡 Exemplo Prático

### **Você (Admin) Quer Enviar Email para Iniciantes que Querem Emagrecer**

1. Acessa `/admin/leads`
2. Clica em "Filtros"
3. Seleciona:
   - Goal: "Emagrecer"
   - Experience: "Iniciante"
4. Sistema mostra: **47 leads**
5. Clica "Exportar"
6. Baixa CSV com emails
7. Copia emails para Mailchimp
8. Envia campanha de email

---

## 🚀 Próximas Fases

### **✅ Fase 1: Sistema de Leads** (FEITO ✓)
- Quiz captura dados
- Leads salvos no Firestore
- Status "lead" inicial

### **📋 Fase 2: Dashboard Admin** (PRÓXIMA)
- Página `/admin/leads`
- Listar e filtrar leads
- Ver detalhes

### **📧 Fase 3: Email Marketing**
- Integração Mailchimp
- Segmentação
- Envio em massa

### **💰 Fase 4: Conversão**
- Rastrear pagamentos
- Status "customer"
- Taxa de conversão

---

## 📊 Dados Que Você Terá

| Dado | Tipo | Uso |
|------|------|-----|
| name + email | String | Contato direto |
| goals | Array | Segmentação |
| experience | String | Nível de intervenção |
| bodyType | String | Tipo de treino |
| imc | Number | Urgência do caso |
| age | Number | Público-alvo |
| equipment | Array | Plano adaptado |
| healthConditions | Array | Contraindicações |

---

## 🎯 Benefícios Imediatos

1. **Conhecer seu público** - 50+ dados por pessoa
2. **Segmentar vendas** - Grupos específicos
3. **Medir ROI** - Leads que viraram clientes
4. **Automatizar** - Emails por segmentação
5. **Escalar** - Repetir o que funciona

---

## ✨ Próximo Passo

Você quer que eu implemente o **Dashboard Admin** agora?

Se sim, ele terá:
- ✅ Página `/admin/leads` com tabela
- ✅ Filtros por objetivo, experiência, IMC, biótipo
- ✅ Busca por nome/email
- ✅ Ver detalhes completos de cada lead
- ✅ Mudar status do lead
- ✅ Estatísticas básicas

**Tempo estimado: 2-3 horas**

Ou prefere testar primeiro o sistema de leads capturando alguns leads reais?
