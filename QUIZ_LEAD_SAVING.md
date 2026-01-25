## Fluxo de Salvamento de Leads após o Quiz

### Resumo Executivo
A partir de agora, **quando um usuário completa o quiz (passo 30)**, todos os seus dados são salvos automaticamente como um **LEAD** na collection `leads` do Firebase Firestore.

---

## Arquitetura de Salvamento

### 1. **Fluxo no Quiz** (`/app/quiz/page.tsx`)

Quando o usuário clica em "Continuar" no passo 30:
1. A função `nextStep()` é acionada
2. Detecta que `currentStep === totalSteps` (30)
3. Chama a função `saveLead()`
4. A função `saveLead()`:
   - Coleta todos os dados do `quizData`
   - Faz uma chamada POST para `/api/save-lead`
   - Aguarda a confirmação
   - Redireciona para `/quiz/results`

\`\`\`javascript
const saveLead = async () => {
  // Coleta dados do quiz
  const response = await fetch("/api/save-lead", {
    method: "POST",
    body: JSON.stringify({
      uid: currentUser.uid,
      quizData: quizData,
      name: quizData.name,
      email: quizData.email,
    }),
  })
  
  // Redireciona para resultados
  router.push("/quiz/results")
}
\`\`\`

---

## 2. **API de Salvamento** (`/app/api/save-lead/route.ts`)

Esta rota recebe os dados do quiz e os salva em dois lugares:

### Collection `leads`
Documento salvo com ID = UID do usuário

\`\`\`javascript
{
  uid: "user123",
  name: "João Silva",
  email: "joao@example.com",
  // Dados físicos
  gender: "homem",
  age: 28,
  height: 180,
  currentWeight: 85,
  targetWeight: 75,
  bodyFat: 22,
  imc: 26.2,
  imcClassification: "Sobrepeso",
  imcStatus: "overweight",
  bodyType: "endomorfo",
  
  // Objetivos
  goals: ["perder-peso"],
  subGoal: "perder-peso-rapido",
  problemAreas: ["barriga", "costas"],
  
  // Nutrição
  diet: "moderada",
  allergies: "nao",
  sugarFrequency: ["raramente"],
  waterIntake: "2-3-litros",
  wantsSupplement: "sim",
  supplementType: "whey-protein",
  
  // Treino
  experience: "intermediario",
  trainingDaysPerWeek: 4,
  workoutTime: "45-60",
  equipment: ["gym"],
  exercisePreferences: {
    cardio: "gosto",
    pullups: "neutro",
    yoga: "gosto"
  },
  
  // Metadados
  status: "lead",
  source: "quiz",
  completedQuizAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
\`\`\`

### Collection `users`
Também atualiza o documento do usuário com os dados do quiz para referência:

\`\`\`javascript
{
  quizData: { /* todos os dados acima */ },
  quizCompletedAt: Timestamp,
  name: "João Silva",
  email: "joao@example.com"
}
\`\`\`

---

## 3. **Dados Salvos no Lead**

Todos esses campos são salvos automaticamente:

### Dados Pessoais
- `uid` - ID único do usuário
- `name` - Nome completo
- `email` - Email

### Dados Físicos
- `gender` - Gênero
- `age` - Idade
- `height` - Altura (em cm)
- `currentWeight` - Peso atual
- `targetWeight` - Peso objetivo
- `bodyFat` - Percentual de gordura
- `imc` - Índice de Massa Corporal
- `imcClassification` - Classificação (Abaixo do peso, Normal, Sobrepeso, Obesidade)
- `imcStatus` - Status (underweight, normal, overweight, obese)
- `bodyType` - Biótipo (ectomorfo, mesomorfo, endomorfo)

### Objetivos e Metas
- `goals` - Objetivos principais (perder peso, ganhar massa, melhorar saúde, etc)
- `subGoal` - Sub-objetivo específico
- `problemAreas` - Áreas problemáticas (barriga, costas, pernas, etc)
- `weightChangeType` - Tipo de mudança desejada
- `timeToGoal` - Prazo para atingir objetivo
- `previousProblems` - Problemas anteriores em treino
- `additionalGoals` - Objetivos adicionais

### Dados Nutricionais
- `diet` - Tipo de dieta
- `allergies` - Tem alergias? (sim/nao)
- `allergyDetails` - Detalhes das alergias
- `sugarFrequency` - Frequência de açúcar
- `waterIntake` - Ingestão de água
- `healthConditions` - Condições de saúde
- `foodPreferences` - Preferências alimentares (vegetais, grãos, ingredientes, carnes, frutas)
- `alcoholFrequency` - Frequência de álcool

### Dados de Suplementação
- `wantsSupplement` - Quer suplemento? (sim/nao)
- `supplementType` - Tipo de suplemento
- `recommendedSupplement` - Suplemento recomendado

### Dados de Treino
- `experience` - Nível de experiência (iniciante, intermediário, avançado)
- `equipment` - Equipamentos disponíveis (gym, dumbbells, bodyweight)
- `exercisePreferences` - Preferências de exercício
  - `cardio` - Preferência por cardio
  - `pullups` - Preferência por flexões/puxadas
  - `yoga` - Preferência por yoga/alongamento
- `trainingDaysPerWeek` - Dias de treino por semana
- `trainingDays` - Variação em string dos dias de treino
- `workoutTime` - Tempo disponível por sessão (15-30, 30-45, 45-60, 60+)
- `strengthTraining` - Preferência por treino de força
- `cardioFeeling` - Sensação sobre cardio
- `strengthFeeling` - Sensação sobre força
- `stretchingFeeling` - Sensação sobre alongamento

### Dados Adicionais
- `letMadMusclesChoose` - Permite que o app escolha
- `status` - Status atual ("lead")
- `source` - Origem ("quiz")
- `completedQuizAt` - Timestamp de conclusão do quiz
- `createdAt` - Timestamp de criação
- `updatedAt` - Timestamp de última atualização

---

## 4. **Estrutura de Collections no Firebase**

\`\`\`
Firestore Database
├── leads/
│   └── {uid}/
│       ├── uid: string
│       ├── name: string
│       ├── email: string
│       ├── age: number
│       ├── gender: string
│       ├── goals: array
│       └── ... (todos os campos acima)
│
├── users/
│   └── {uid}/
│       ├── quizData: { /* todos os dados do quiz */ }
│       ├── quizCompletedAt: timestamp
│       ├── name: string
│       ├── email: string
│       └── ... (outros dados do usuário)
│
├── payments/
│   └── {paymentId}/
│       └── ...
\`\`\`

---

## 5. **Fluxo de Dados Completo**

\`\`\`
QUIZ (passo 30)
    ↓
usuário clica "Continuar"
    ↓
nextStep() → currentStep === totalSteps
    ↓
saveLead()
    ↓
POST /api/save-lead
    ↓
Firebase Firestore
├── leads/{uid} ← NOVO LEAD SALVO
├── users/{uid} ← DADOS DO QUIZ ATUALIZADOS
    ↓
redirect → /quiz/results
\`\`\`

---

## 6. **Como Verificar se os Dados Foram Salvos**

### No Firebase Console
1. Abra [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto "Fitgoal"
3. Vá em **Firestore Database**
4. Procure pela collection **leads**
5. Você deve ver documentos com IDs dos usuários que completaram o quiz

### Via CLI
\`\`\`bash
firebase firestore:get leads/{uid}
\`\`\`

### No seu código
\`\`\`javascript
// Depois do quiz, você pode consultar:
const leadRef = doc(db, "leads", userUid)
const leadSnap = await getDoc(leadRef)
console.log("Lead data:", leadSnap.data())
\`\`\`

---

## 7. **Tratamento de Erros**

Se ocorrer um erro ao salvar o lead:
1. Uma mensagem é registrada no console: `[v0] SAVE_LEAD_ERROR`
2. **O usuário ainda é redirecionado para os resultados** (experiência não é afetada)
3. Os dados já foram salvos anteriormente (durante o quiz, no passo anterior)

---

## 8. **Próximos Passos**

Agora que os leads estão sendo salvos com todos os dados do quiz, você pode:

1. **Admin Dashboard**: Visualizar e gerenciar leads
2. **Email Marketing**: Enviar emails personalizados com base nos objetivos
3. **Follow-up**: Rastrear conversão de leads para clientes pagantes
4. **Analytics**: Analisar que tipo de pessoa completa o quiz
5. **Remarketing**: Segmentar usuários com base nos dados do quiz

---

## Sumário

✅ **Antes**: Apenas usuários pagantes eram salvos  
✅ **Agora**: Todos os usuários que completam o quiz são salvos como leads  
✅ **Dados**: 50+ campos de dados pessoais, físicos, nutricionais e de treino  
✅ **Localização**: Firebase Firestore em `leads/{uid}`  
✅ **Automático**: Sem ação manual necessária
