# Funcionalidade: Incluir Alimento na Refeição

## Visão Geral

Sistema inteligente que permite o usuário **incluir um novo alimento** na refeição de forma assistida pela IA. A IA verifica se o alimento:
- É saudável e apropriado
- Encaixa nos macros disponíveis (macroCredit)
- Não é uma composição (alimento composto)

## Como Funciona

### Fluxo do Usuário

1. **Abrir refeição** → Clica em "Incluir" ao lado de qualquer alimento
2. **Digita nome** → Ex: "Batata inglesa", "Banana", "Frango"
3. **Analisa IA** → Verifica se é viável
4. **Resultado**:
   - ✅ Sim, é possível → Alimento adicionado com quantidade automática
   - ❌ Não encaixa → Mostra motivo específico

### Estados Possíveis de Resposta

#### Aceito (✅ Sim, é possível)
\`\`\`
Alimento: Batata inglesa
Quantidade: 150g
Calorias: 120 kcal
Resposta: "Sim, é possível! Batata inglesa adicionado com sucesso!"
\`\`\`

#### Rejeitado - Não Saudável (❌)
\`\`\`
Alimento: Refrigerante de cola
Resposta: "Infelizmente esse alimento não encaixa. 
          Escolha algo mais saudável!"
\`\`\`

#### Rejeitado - Não Encaixa
\`\`\`
Alimento: Bife com batata frita
Resposta: "Infelizmente esse alimento não encaixa. 
          Alimento composto não é permitido"
\`\`\`

## Arquivos Criados/Modificados

### Novo Endpoint
- **`/app/api/add-food-to-meal/route.ts`** (129 linhas)
  - Recebe nome do alimento
  - Valida com IA se é viável
  - Retorna alimento com macros calculados

### Dashboard
- **`/app/dashboard/dieta/page.tsx`** modificado
  - Novo estado: `addingFood`, `addFoodInput`, `addFoodMessage`
  - Novo handler: `handleAddFoodToMeal()`
  - Novo botão: "Incluir" (verde, ao lado de Substituir)
  - Novo modal: Input + Resposta da IA

## Validações da IA

### Verificações Automáticas

1. **Alimentos Proibidos (Hard Block)**
   - Refrigerantes açucarados
   - Frituras
   - Alimentos ultra-processados
   - Bebidas alcoólicas

2. **Alimentos Compostos (Rejeitados)**
   - "Iogurte com mel"
   - "Pão com queijo"
   - "Frango com brócolis"
   - Qualquer coisa com "e", "com", "+", vírgula

3. **Macros (Verificação)**
   - Valida se o alimento cabe nos macros disponíveis (macroCredit)
   - Se não caber, retorna: "Infelizmente esse alimento não encaixa"

### Lógica de Resposta da IA

\`\`\`
Se alimento é ruim/composto/ultra-processado
  → Retorna canAdd: false com motivo
Senão se alimento cabe nos macros
  → Retorna canAdd: true + alimento com quantidade
Senão
  → Retorna canAdd: false com motivo "não encaixa"
\`\`\`

## Integração com MacroCredit

Quando um alimento é incluído com sucesso:
1. IA calcula quantidade que encaixa no macroCredit
2. Alimento é adicionado à refeição
3. MacroCredit é resetado para 0

### Exemplo

\`\`\`
Refeição: Café da Manhã
MacroCredit: 150 kcal, 10g proteína

Usuário quer incluir: "Banana"
→ IA: Tá bom, vou usar 1 banana (89 kcal, 1.1g proteína)
→ Refeição atualizada
→ MacroCredit resetado para 0
\`\`\`

## UI/UX

### Botão
- **Cor**: Verde (diferente de Substituir/Remover)
- **Ícone**: Plus ("+")
- **Posição**: Entre Remover (vermelho) e Substituir (azul)

### Modal
- **Input**: Campo de texto com placeholder
- **Enter**: Confirma ação
- **Resposta**: Mensagem colorida (verde sucesso / vermelho erro)
- **Dica**: "💡 A IA analisará se o alimento encaixa nos macros da sua refeição"

### Estados
- **Esperando**: Input vazio, botão "Analisar" ativo
- **Analisando**: Input com texto, botão "Analisar"
- **Sucesso**: Mostra mensagem verde, aguarda 2s e fecha
- **Erro**: Mostra mensagem vermelha, usuário pode tentar outro alimento

## API Endpoint

### POST `/api/add-food-to-meal`

**Request:**
\`\`\`json
{
  "foodName": "Batata inglesa",
  "mealContext": "Almoço",
  "mealFoods": ["Frango", "Arroz", "Brócolis"],
  "availableMacros": {
    "calories": 150,
    "protein": 10,
    "carbs": 20,
    "fats": 5
  },
  "userPreferences": {}
}
\`\`\`

**Response - Sucesso:**
\`\`\`json
{
  "success": true,
  "canAdd": true,
  "message": "Sim, é possível!",
  "food": {
    "name": "Batata inglesa",
    "quantity": "150g",
    "calories": 120,
    "protein": "2g",
    "carbs": "25g",
    "fats": "0.1g",
    "reason": "Encaixa perfeitamente nos macros"
  }
}
\`\`\`

**Response - Erro:**
\`\`\`json
{
  "success": true,
  "canAdd": false,
  "message": "Infelizmente esse alimento não encaixa",
  "reason": "unhealthy"
}
\`\`\`

## Fluxo Técnico Completo

1. Usuário clica "Incluir"
2. Modal abre com input
3. Usuário digita alimento
4. Clica "Analisar" ou pressiona Enter
5. Frontend chama `/api/add-food-to-meal`
6. IA valida:
   - É alimento bom/simples?
   - Cabe nos macros disponíveis?
7. IA retorna decisão + detalhes
8. Frontend processa:
   - Se sucesso: Adiciona alimento, reseta macroCredit, fecha modal
   - Se erro: Mostra mensagem, usuário pode tentar outro
9. Alimento adicionado à refeição
10. Salva no Firebase

## Próximas Melhorias

- [ ] Sugestões de alimentos populares enquanto digita
- [ ] Histórico de alimentos incluídos com sucesso
- [ ] Permitir ajustar quantidade manualmente após IA sugerir
- [ ] Multi-select de alimentos para incluir vários de uma vez
- [ ] Rating de alimentos (usual/incomum/novo)
