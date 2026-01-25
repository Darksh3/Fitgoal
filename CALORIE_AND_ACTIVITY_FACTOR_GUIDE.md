# Guia: Fator de Atividade e Cálculo de Calorias/Macros para IA

## 📍 Localização dos Cálculos

### 1. **Cálculo do Fator de Atividade**
**Arquivo:** `/lib/calorieCalculator.ts` - Função `calculateScientificCalories()`

**Linhas 85-100: Fator de Atividade Base**
\`\`\`typescript
let baseActivityMultiplier
const trainingDaysNum = Number.parseInt(String(trainingDaysPerWeek))
if (trainingDaysNum <= 1) {
    baseActivityMultiplier = 1.2    // Sedentário
} else if (trainingDaysNum <= 3) {
    baseActivityMultiplier = 1.375  // Levemente ativo
} else if (trainingDaysNum <= 5) {
    baseActivityMultiplier = 1.55   // Moderadamente ativo
} else if (trainingDaysNum <= 6) {
    baseActivityMultiplier = 1.725  // Muito ativo
} else {
    baseActivityMultiplier = 1.9    // Extremamente ativo
}
\`\`\`

### 2. **Ajuste do Fator por Somatótipo (Biotipo)**
**Linhas 102-108: Multiplicador de Atividade Ajustado**
\`\`\`typescript
let activityMultiplier = baseActivityMultiplier
if (bodyType.toLowerCase() === "ectomorfo") {
    activityMultiplier = baseActivityMultiplier * 1.05  // +5%
} else if (bodyType.toLowerCase() === "endomorfo") {
    activityMultiplier = baseActivityMultiplier * 0.95  // -5%
}
\`\`\`

### 3. **Cálculo da Taxa Metabólica Basal (TMB)**
**Linhas 70-78: Fórmula de Mifflin-St Jeor**
\`\`\`typescript
const isFemale = gender.toLowerCase().includes("fem") || gender.toLowerCase().includes("mulher")

// TMB (Mifflin-St Jeor)
let tmb
if (isFemale) {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161
} else {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5
}
\`\`\`

### 4. **Cálculo Final de Calorias (TDEE)**
**Linhas 110-111: Total Daily Energy Expenditure**
\`\`\`typescript
let tdee = tmb * activityMultiplier
let metabolicAdjustment = 1.0

// Ajustes adicionais por somatótipo (linhas 112-119)
if (bodyType.toLowerCase() === "ectomorfo") {
    metabolicAdjustment = isFemale ? 1.12 : 1.15  // Metabolismo mais rápido
} else if (bodyType.toLowerCase() === "endomorfo") {
    metabolicAdjustment = isFemale ? 0.92 : 0.95  // Metabolismo mais lento
}

tdee = tdee * metabolicAdjustment
\`\`\`

---

## 📊 Fluxo Completo: Da Requisição do Cliente até a IA

### **Etapa 1: Cliente Completa o Quiz**
Dados coletados em `/app/quiz/page.tsx`:
- `currentWeight` (peso atual)
- `height` (altura)
- `age` (idade)
- `gender` (gênero)
- `trainingDaysPerWeek` (dias de treino)
- `bodyType` (somatótipo: ectomorfo, mesomorfo, endomorfo)
- `targetWeight` (peso alvo)
- `timeToGoal` (prazo para atingir objetivo)
- `wantsSupplement` (deseja suplemento?)
- `supplementType` (whey ou hipercalórico)

### **Etapa 2: Salvamento de Dados**
Dados salvos em Firestore via `/app/api/handle-post-checkout/route.tsx`

### **Etapa 3: Cálculo Científico de Calorias**
**Arquivo:** `/app/api/generate-plans-on-demand/route.ts` - Linhas 1020-1450

\`\`\`typescript
// Linha 1027: Usa a função calculateScientificCalories
const dailyCalories = Math.round(data.calorieGoal)

// Linhas 1040-1100: Calcula macronutrientes baseado nas calorias
const protein = Math.round((dailyCalories * 0.3) / 4)  // 30% das calorias
const carbs = Math.round((dailyCalories * 0.45) / 4)   // 45% das calorias
const fats = Math.round((dailyCalories * 0.25) / 9)    // 25% das calorias
\`\`\`

### **Etapa 4: Ajustes por Objetivo**
**Linhas 1120-1300: Ajustes calóricos baseado em:**
- Diferença entre peso atual e alvo
- Prazo para atingir objetivo
- Tipo de objetivo (perda, ganho ou manutenção)
- Somatótipo (ectomorfo, mesomorfo, endomorfo)

**Exemplos:**
\`\`\`typescript
// Ganho de peso (bulking)
if (weightDifference > 0.5) {
    // Ectomorfo: +600-700 kcal (ganha massa fácil)
    // Endomorfo: +300-400 kcal (ganha gordura facilmente)
    // Mesomorfo: +400-500 kcal (balanced)
}

// Perda de peso (cutting)
if (weightDifference < -0.5) {
    // Ectomorfo: -400 kcal (pouco espaço para deficit)
    // Endomorfo: -600 kcal (pode fazer deficit maior)
    // Mesomorfo: -500 kcal (balanced)
}
\`\`\`

### **Etapa 5: Tratamento de Suplementação**
**Linhas 1050-1055: Se cliente quer suplemento**
\`\`\`typescript
const supplementCalories = (quizData.supplementType === "hipercalorico") ? 615 : 119
const caloriesForMeals = dailyCalories - supplementCalories

// Macros do suplemento
// Hipercalórico: 615 kcal, 37g proteína, 108g carbs, 3.7g gorduras
// Whey Protein: 119 kcal, 24g proteína, 2.3g carbs, 1.5g gorduras
\`\`\`

---

## 🤖 Envio para a IA (OpenAI)

### **Arquivo:** `/app/api/generate-plans-on-demand/route.ts`

### **Linhas 580-650: Prompt com Calorias e Macros**

A IA recebe um prompt detalhado com:

\`\`\`typescript
// Linha 585: Calorias totais
"Valor científico TOTAL: ${savedCalcs.finalCalories} kcal"

// Linhas 630-645: Distribuição de macros
"MACROS TOTAIS:
- Calorias: ${savedCalcs.finalCalories} kcal
- Proteínas: ${savedCalcs.protein}g (30%)
- Carboidratos: ${savedCalcs.carbs}g (45%)
- Gorduras: ${savedCalcs.fats}g (25%)"

// Linhas 620-660: Regras críticas para a IA
"🎯 REGRAS OBRIGATÓRIAS:
1. A soma das REFEIÇÕES deve atingir EXATAMENTE os valores acima
2. NÃO faça sua própria distribuição de macros - use os valores fornecidos
3. Distribua os macros proporcionalmente entre as refeições
4. Cada refeição deve contribuir para atingir os totais especificados"
\`\`\`

### **Linhas 678-716: JSON Enviado à IA**

\`\`\`json
{
  "totalDailyCalories": "2378 kcal",
  "totalProtein": "713g",
  "totalCarbs": "1071g",
  "totalFats": "265g",
  "meals": [
    {
      "name": "Café da Manhã",
      "totalCalories": 595,
      "foods": []
    }
  ],
  "supplements": [
    {
      "name": "Hipercalórico Growth",
      "quantity": "170g",
      "calories": 615,
      "protein": 37,
      "carbs": 108,
      "fats": 3.7
    }
  ]
}
\`\`\`

---

## 🔄 Resumo do Fluxo

\`\`\`
1️⃣ QUIZ
   └─ trainingDaysPerWeek, bodyType, currentWeight, height, age, gender

2️⃣ TMB (Taxa Metabólica Basal)
   └─ Fórmula Mifflin-St Jeor

3️⃣ FATOR DE ATIVIDADE
   └─ trainingDaysPerWeek → 1.2 a 1.9
   └─ Ajustado por somatótipo (±5%)

4️⃣ TDEE (Gasto Calórico Diário)
   └─ TMB × Fator Atividade × Ajuste Metabólico

5️⃣ CALORIAS FINAIS
   └─ TDEE ± Ajuste por Objetivo (ganho, perda ou manutenção)
   └─ Com limites de segurança

6️⃣ DISTRIBUIÇÃO DE MACROS
   └─ Proteína: 30% (1.2 g/kg para ganho, 1.6-2.2 g/kg para perda)
   └─ Carboidratos: 45% (baseado em objetivo)
   └─ Gorduras: 25% (mínimo 0.8 g/kg, especialmente para mulheres)

7️⃣ IA GERA PLANO
   └─ Cria refeições que somam exatamente as calorias/macros calculadas
   └─ Respeita restrições (alergias, dieta, equipamentos)
   └─ Prioriza alimentos brasileiros acessíveis
\`\`\`

---

## 📌 Variáveis-Chave no Cálculo

| Variável | Fonte | Uso |
|----------|-------|-----|
| `trainingDaysPerWeek` | Quiz | Determina fator de atividade (1.2-1.9) |
| `bodyType` | Quiz | ±5% no fator + ajuste metabólico (12-15% a 92-95%) |
| `currentWeight` | Quiz | TMB, cálculos de proteína (g/kg) |
| `height` | Quiz | TMB (fórmula Mifflin-St Jeor) |
| `age` | Quiz | TMB |
| `gender` | Quiz | Fórmula TMB diferenciada, limites mínimos de calorias |
| `targetWeight` | Quiz | Determina se é ganho/perda/manutenção |
| `timeToGoal` | Quiz | Define velocidade de mudança de peso |
| `wantsSupplement` | Quiz | Subtrai calorias do suplemento do total das refeições |

---

## 🎯 Onde Modificar

Se precisar mudar:
- **Fator de atividade base**: Linhas 85-100 em `/lib/calorieCalculator.ts`
- **Ajuste por somatótipo**: Linhas 102-108 em `/lib/calorieCalculator.ts`
- **Distribuição de macros**: Linhas 1040-1100 em `/app/api/generate-plans-on-demand/route.ts`
- **Regras para a IA**: Linhas 580-660 em `/app/api/generate-plans-on-demand/route.ts`
- **Limites de segurança**: Linhas 190-210 em `/lib/calorieCalculator.ts`
