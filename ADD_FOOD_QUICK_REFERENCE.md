# Incluir Alimento - Quick Reference

## Para o Usuário

### Como Usar
1. Veja a refeição na qual quer incluir
2. Clique no botão **verde "+ Incluir"** ao lado de qualquer alimento
3. Digite o nome do alimento (ex: "Batata inglesa")
4. Clique "Analisar" ou pressione Enter
5. Aguarde resposta:
   - ✅ Verde = Alimento adicionado com sucesso
   - ❌ Vermelho = Alimento não encaixa

### Exemplos de Resposta

**Aceito:**
\`\`\`
✅ "Sim, é possível! Batata inglesa adicionado com sucesso!"
\`\`\`

**Rejeitado - Insalubre:**
\`\`\`
❌ "Infelizmente esse alimento não encaixa. 
    Escolha algo mais saudável!"
\`\`\`

**Rejeitado - Composto:**
\`\`\`
❌ "Infelizmente esse alimento não encaixa. 
    Alimento composto não é permitido"
\`\`\`

**Rejeitado - Não cabe nos macros:**
\`\`\`
❌ "Infelizmente esse alimento não encaixa"
\`\`\`

## Para o Developer

### Arquivos

| Arquivo | O quê |
|---------|--------|
| `/app/api/add-food-to-meal/route.ts` | Endpoint que verifica com IA |
| `/app/dashboard/dieta/page.tsx` | UI + Handler (handleAddFoodToMeal) |

### Estados Adicionados

\`\`\`typescript
const [addingFood, setAddingFood] = useState(null) // Modal aberto?
const [addFoodInput, setAddFoodInput] = useState("") // Texto digitado
const [addFoodMessage, setAddFoodMessage] = useState(null) // Resposta IA
\`\`\`

### Handler Principal

\`\`\`typescript
handleAddFoodToMeal(mealIndex, foodIndex)
  1. Valida input
  2. Chama API /add-food-to-meal
  3. Se sucesso: Adiciona alimento + reseta macroCredit
  4. Se erro: Mostra mensagem
\`\`\`

### Fluxo de Dados

\`\`\`
User Input
    ↓
handleAddFoodToMeal()
    ↓
POST /api/add-food-to-meal
    ↓
IA (gpt-4o mini)
    ↓
Resposta {canAdd, food, message}
    ↓
Frontend Processa
    ↓
Adiciona à Refeição ou Mostra Erro
\`\`\`

## Validações

### Hard Block (Sempre Rejeitados)
- Refrigerantes
- Frituras
- Ultra-processados
- Álcool

### Soft Checks (Analisados)
- É alimento composto?
- Cabe nos macros?
- É saudável?

## Testing

### Casos Válidos (Devem passar)
- "Banana"
- "Frango"
- "Arroz"
- "Batata inglesa"
- "Ovos"

### Casos Inválidos (Devem falhar)
- "Refrigerante" → Insalubre
- "Iogurte com mel" → Composto
- "Pizza" → Insalubre/composto

---

**Status:** Pronto para uso ✅
**Última atualização:** 2024
**Integração:** MacroCredit, Firebase
