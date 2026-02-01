# Sistema de Validação de Substituição de Alimentos

## Visão Geral

Implementação de validação de alimentos para substituição na dieta. Garante que:
1. **Não haja repetição** de alimentos já presentes na refeição
2. **Apenas alimentos simples** sejam sugeridos (sem composições)
3. **Fácil medição** de cada item

## Fluxo de Validação

\`\`\`
1. Usuário clica "Substituir" em um alimento
   ↓
2. Lista de alimentos da refeição é enviada à IA
   ↓
3. IA recebe instrução para:
   - Evitar alimentos já na refeição
   - Sugerir apenas simples e individuais
   ↓
4. Resposta da IA é validada no frontend
   ↓
5. Se inválida, mostra erro ou usa válidos
   ↓
6. Alimento é substituído com macroCredit aplicado
\`\`\`

## Validações Implementadas

### 1. Backend (API)

**Arquivo:** `/app/api/substitute-food/route.ts`

- Recebe `mealFoods` com lista de alimentos já na refeição
- Passa para prompt da IA as restrições:
  - NÃO REPITA alimentos presentes
  - NÃO SUGIRA compostos (ex: "iogurte com mel")
  - Prefira simples e individuais

### 2. Frontend (Validação)

**Arquivo:** `/lib/foodValidation.ts`

Funções principais:

\`\`\`typescript
// Extrai nome base do alimento
extractBaseFoodName("Banana (100g)") → "banana"

// Detecta alimentos compostos
isCompositeFood("Iogurte e mel") → true
isCompositeFood("Iogurte") → false

// Valida um alimento como substituto
validateSubstituteFood("Frango", existingFoods)
→ { valid: true/false, reason: "..." }

// Valida lista de sugestões da IA
validateAISuggestions(suggestions, existingFoods)
→ { valid, invalidFoods, validFoods }
\`\`\`

### 3. Detecção de Alimentos Compostos

Identifica padrões que indicam composição:
- "banana **e** mel" (palavra "e")
- "pão **com** queijo" (palavra "com")
- "frango **+** brócolis" (símbolo +)
- "frango, batata" (vírgula)

### 4. Detecção de Repetição

Extrai nome base e compara com existentes:
- "Banana (150g)" vs "Banana" → detecta como repetição
- "Maçã verde" vs "Maçã" → detecta como repetição

## Exemplo de Uso

### Cenário: Refeição com Frango + Arroz + Brócolis

\`\`\`
REFEIÇÃO: Almoço
ALIMENTOS PRESENTES:
- Frango (150g)
- Arroz (100g)
- Brócolis (100g)
\`\`\`

**Usuário clica substituir Frango:**

❌ **IA NÃO pode sugerir:**
- "Frango com limão" (composto)
- "Frango" (repetição)
- "Peixe e batata" (composto)

✅ **IA pode sugerir:**
- "Salmão (150g)"
- "Ovos (3 unidades)"
- "Carne vermelha (150g)"
- "Tofu (200g)"

**Validação Frontend:**
\`\`\`typescript
const suggestion = "Salmão"
const existing = ["Frango", "Arroz", "Brócolis"]

validateSubstituteFood(suggestion, existing)
// { valid: true } ✅
\`\`\`

## Mensagens de Erro

Quando alimento é inválido, o usuário vê:

\`\`\`
❌ "Iogurte e mel" é um alimento composto. 
Use alimentos simples e individuais (ex: iogurte, mel, frango - separados)

❌ "Frango" já está incluído nesta refeição. 
Escolha outro alimento.
\`\`\`

## Tratamento de Erro na Substituição

Se a IA sugerir alimentos inválidos:

1. **Se nenhum for válido:** Mostra erro ao usuário
2. **Se alguns forem válidos:** Usa os válidos e ignora inválidos (com log)

\`\`\`javascript
// Validar sugestões
const validation = validateAISuggestions(
  suggestions,
  dietPlan.meals[mealIndex].foods
)

if (!validation.valid) {
  console.warn("Alimentos inválidos:", validation.invalidFoods)
  if (validation.validFoods.length === 0) {
    setError("Nenhuma sugestão válida...")
    return
  }
  // Usar validFoods
}
\`\`\`

## Próximas Melhorias

- Cache de alimentos compostos mais comuns
- Sugestões de como separar alimentos (ex: "Prefira 'Iogurte' + 'Mel' em vez de 'Iogurte com Mel'")
- Analytics de alimentos bloqueados para melhorar prompt da IA
- Interface para usuário escolher entre múltiplas sugestões válidas

## Testes

Para testar localmente:

\`\`\`bash
# Teste 1: Alimento composto
validateSubstituteFood("Frango com brócolis", [])
// { valid: false, reason: "...é um alimento composto" }

# Teste 2: Repetição
validateSubstituteFood("Banana", ["Banana (100g)"])
// { valid: false, reason: "...já está incluído" }

# Teste 3: Válido
validateSubstituteFood("Maçã", ["Banana"])
// { valid: true }
\`\`\`

## Integração com MacroCredit

A validação funciona junto com o sistema de macroCredit:

\`\`\`
1. Usuário remove Frango → macroCredit com 165kcal
2. Substitui por Salmão → Validação
3. Se válido → Salmão recebe crédito (206 + 165kcal)
4. macroCredit reseta para 0
\`\`\`
