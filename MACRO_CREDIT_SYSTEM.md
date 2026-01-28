# Sistema de MacroCredit - Documentação

## Visão Geral

O **MacroCredit** é um sistema que mantém o balanço nutricional das refeições ao remover e substituir alimentos. Ele garante que a remoção de um alimento não reduza os macros totais planejados da refeição.

## Conceito Fundamental

### Regra Principal

Cada refeição possui um acumulador temporário chamado `macroCredit` que armazena os macros dos alimentos removidos, para serem aplicados ao próximo alimento adicionado ou substituído.

## Fluxo de Operação

### 1. Remoção de Alimento

Quando um usuário remove um alimento de uma refeição:

```
Ação: Clica em Remover (X) no alimento
↓
Sistema extrai os macros completos do alimento:
  - Calorias
  - Proteína
  - Carboidratos
  - Gordura
↓
Macros são ADICIONADOS ao macroCredit da refeição
↓
Alimento é removido da lista
↓
Estado é salvo no Firebase
```

**Exemplo:**
```
Refeição: Almoço
Alimento removido: Frango peito cozido (165 kcal, 31g proteína, 0g carbs, 3.6g gordura)

Resultado:
macroCredit = {
  calories: 165,
  protein: 31,
  carbs: 0,
  fats: 3.6
}
```

### 2. Substituição de Alimento

Quando um usuário substitui um alimento por outro na mesma refeição:

```
Ação: Clica em Substituir → Seleciona novo alimento da IA
↓
Sistema obtém o novo alimento da API
↓
Se macroCredit > 0:
  - Novo alimento recebe seus macros MAIS os macros do macroCredit
  - Macros são somados (não substituídos)
↓
Novo alimento é inserido no lugar do antigo
↓
macroCredit é RESETADO para ZERO
↓
Estado é salvo no Firebase
```

**Exemplo:**
```
Refeição: Almoço
Novo alimento sugerido: Salmão (206 kcal, 25.4g proteína, 0g carbs, 11g gordura)
macroCredit disponível: {calories: 165, protein: 31, carbs: 0, fats: 3.6}

Resultado do novo alimento:
{
  calories: 206 + 165 = 371,
  protein: 25.4 + 31 = 56.4g,
  carbs: 0 + 0 = 0g,
  fats: 11 + 3.6 = 14.6g
}

Após aplicação:
macroCredit = { calories: 0, protein: 0, carbs: 0, fats: 0 }
```

## Isolamento por Refeição

### Escopo

- **Válido APENAS** dentro da mesma refeição
- **NÃO** é compartilhado entre refeições diferentes
- **NÃO** é transferido entre dias

### Exemplo de Isolamento

```
Dia 1:
├─ Café da manhã
│  └─ macroCredit: {calories: 100, ...}
├─ Almoço
│  └─ macroCredit: {calories: 200, ...}  ← Independente!
└─ Jantar
   └─ macroCredit: {calories: 0, ...}     ← Isolado

Dia 2:
├─ Café da manhã
│  └─ macroCredit: {calories: 0, ...}  ← Resetado! Não carrega do dia anterior
```

## Componentes Técnicos

### 1. Tipo TypeScript (types.tsx)

```typescript
export interface Meal {
  name: string
  time: string
  foods: Food[]
  macroCredit?: {
    calories: number
    protein: number
    carbs: number
    fats: number
  }
}
```

### 2. Utilitários (lib/macroCreditUtils.ts)

#### `extractFoodMacros(food)`
Extrai macros de um alimento (objeto ou string)

#### `addToMacroCredit(meal, foodMacros)`
Adiciona macros ao macroCredit da refeição

#### `applyMacroCreditToFood(newFood, macroCredit)`
Aplica macros do crédito ao novo alimento

#### `resetMacroCredit(meal)`
Reseta o macroCredit para zero

#### `getMacroCreditDisplay(macroCredit)`
Formata o macroCredit para exibição

### 3. Componente Visual (components/macro-credit-display.tsx)

Exibe um badge com o macroCredit disponível em cada refeição:

```
Crédito de Macros Disponível
📊 165 kcal | 31g proteína | 0g carbs | 3.6g gordura

Mensagem: "Este crédito será aplicado ao próximo alimento 
que você adicionar ou substituir nesta refeição."
```

## Fluxo de Código

### Remoção: handleRemoveFood()

```typescript
1. Extrai macros do alimento: extractFoodMacros(foodToRemove)
2. Adiciona ao macroCredit: addToMacroCredit(meal, foodMacros)
3. Remove alimento da refeição
4. Salva no Firebase com novo macroCredit
```

### Substituição: handleReplaceFood()

```typescript
1. Chama API para obter novo alimento
2. Se macroCredit > 0:
   - Aplica macroCredit: applyMacroCreditToFood(newFood, macroCredit)
3. Insere novo alimento com macros aumentados
4. Reseta macroCredit: resetMacroCredit(meal)
5. Salva no Firebase
```

## Persistência no Firebase

O macroCredit é salvo junto com o dietPlan:

```
users/{uid}/
├─ dietPlan: {
│  ├─ meals: [
│  │  ├─ mealIndex: 0
│  │  ├─ name: "Almoço"
│  │  ├─ foods: [...]
│  │  └─ macroCredit: {
│  │     ├─ calories: 165
│  │     ├─ protein: 31
│  │     ├─ carbs: 0
│  │     └─ fats: 3.6
│  │  }
│  ]
│  }
```

## Estados Possíveis

### macroCredit = 0
- Nenhum crédito disponível
- Novo alimento não recebe bônus
- UI não exibe o badge

### macroCredit > 0
- Há crédito acumulado
- Próxima substituição vai recebê-lo
- UI exibe o badge com valores
- Ideal momento para substituir

## Casos de Uso

### Caso 1: Remover e depois Adicionar outro

```
Estado inicial:
Almoço: [Frango 165kcal, Arroz 130kcal]

Ação 1: Remove Frango
Resultado: macroCredit = {calories: 165, ...}
Almoço: [Arroz 130kcal]

Ação 2: Clica "Substituir" → Seleciona Salmão
Resultado: Salmão recebe 165kcal extras
Almoço: [Salmão 371kcal, Arroz 130kcal]
macroCredit = {calories: 0, ...}
```

### Caso 2: Múltiplas Remoções antes de Substituir

```
Estado inicial:
Almoço: [Frango 165kcal, Arroz 130kcal, Brócolis 34kcal]

Ação 1: Remove Frango
macroCredit = {calories: 165, ...}

Ação 2: Remove Arroz
macroCredit = {calories: 165 + 130 = 295, ...}

Ação 3: Substitui Brócolis por Salmão
Salmão recebe 295kcal extras
Resultado: Salmão 501kcal, macroCredit = 0
```

## Debug e Logging

O sistema registra todas as operações no console com `[v0]`:

```
[v0] Food removed. macroCredit added to meal: 0 {calories: 165, ...}
[v0] macroCredit applied to new food: {calories: 165, ...}
[v0] Food replacement completed with macroCredit applied and reset
```

## Considerações de Negócio

### Benefícios

- Mantém o planejamento nutricional intacto
- Evita perda de macros quando removem alimentos
- Incentiva substituições estratégicas
- Preserva o balanço da dieta

### Transparência para o Usuário

- Badge visual mostra o crédito disponível
- Mensagem clara sobre o que o crédito faz
- Aplicação automática ao substituir

## Limitações e Futuro

### Atuais
- macroCredit só aplica em substituições (não em adições manuais por enquanto)
- Resetado após cada substituição
- Isolado por refeição (by design)

### Possíveis Melhorias
- Permitir "carregar" macroCredit para próxima refeição com confirmação
- Histórico de aplicações de macroCredit
- Sugestões inteligentes baseadas em macroCredit disponível
- Notificações quando há macroCredit "desperdiçado" ao fim do dia
