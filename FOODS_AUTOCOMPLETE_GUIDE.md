# Sistema de Autocomplete de Alimentos

## Visão Geral

O sistema agora possui um banco de dados de alimentos populares com suas macronutrientes (calorias, proteínas, carboidratos, gorduras). Quando o usuário adiciona um alimento na dieta, o sistema oferece sugestões baseadas no que ele digita.

## Como Funciona

### 1. Autocomplete no Modal de Adicionar Alimento
- Quando o usuário clica em "Adicionar Alimento" na página de dieta
- Um input com autocomplete aparece
- Ao digitar o nome de um alimento (mínimo 2 caracteres), o sistema busca no banco de dados
- Uma lista de sugestões aparece com os alimentos encontrados
- O usuário pode clicar ou usar as setas do teclado para selecionar
- Ao selecionar, as macros são preenchidas automaticamente
- O usuário pode editar as macros conforme necessário

### 2. Banco de Dados de Alimentos
- **Location**: Firestore collection `foods`
- **Campos por alimento**:
  - `name`: Nome do alimento
  - `nameLowercase`: Nome em minúsculas para buscas
  - `calories`: Calorias por 100g
  - `protein`: Proteína em gramas
  - `carbs`: Carboidratos em gramas
  - `fats`: Gorduras em gramas
  - `category`: Categoria (proteína, carboidrato, gordura, vegetal, fruta)

### 3. Alimentos Pré-Populados
O sistema vem com 40+ alimentos populares já cadastrados, incluindo:
- Proteínas: Frango, Ovos, Salmão, Tofu, etc
- Carboidratos: Arroz integral, Batata doce, Banana, Aveia, etc
- Gorduras saudáveis: Abacate, Amêndoas, Azeite de oliva, etc
- Vegetais: Brócolis, Cenoura, Espinafre, etc
- Frutas: Maçã, Laranja, Morango, etc

## APIs Disponíveis

### 1. GET `/api/foods/search?q=termo`
Busca alimentos por termo
```bash
GET /api/foods/search?q=frango
```
Retorna: Array de alimentos com macros

### 2. POST `/api/foods/init`
Inicializa o banco de dados de alimentos (executado automaticamente)
```bash
POST /api/foods/init
```
Retorna: Status de inicialização e contagem de alimentos

### 3. GET `/api/foods/init`
Verifica se o banco foi inicializado
```bash
GET /api/foods/init
```
Retorna: Contagem de alimentos e status

## Adicionando Novos Alimentos

Para adicionar novos alimentos ao banco de dados, edite o arquivo `/lib/populateFoods.ts` e adicione novos itens ao array `POPULAR_FOODS`:

```typescript
const POPULAR_FOODS = [
  {
    name: "Seu Alimento",
    calories: 100,
    protein: 10,
    carbs: 20,
    fats: 5,
    category: "proteína"
  },
  // ... mais alimentos
]
```

Então rode:
```bash
curl -X POST http://localhost:3000/api/foods/init
```

## Componentes Principais

### `FoodAutocomplete` Component
- **Location**: `/components/food-autocomplete.tsx`
- **Props**:
  - `value`: Valor do input
  - `onChange`: Callback para mudanças no input
  - `onSelectFood`: Callback quando um alimento é selecionado
  - `placeholder`: Texto placeholder
- **Features**:
  - Autocomplete com debounce
  - Navegação por teclado (setas + Enter)
  - Fecha ao clicar fora
  - Mostrar macros na sugestão

## Edição de Macros

Após selecionar um alimento, o usuário pode:
1. Manter as macros automáticas (100g como referência)
2. Editar qualquer valor (calorias, proteína, carbs, fats)
3. Ajustar para a quantidade que vai consumir

## Exemplo de Uso

1. Usuário acessa Dashboard > Dieta
2. Clica em "Adicionar Alimento"
3. Digita "fran" no campo de busca
4. Sistema sugere: "Frango peito"
5. Usuário clica em "Frango peito"
6. Campos são preenchidos: 165cal, 31g proteína, 0g carbs, 3.6g gordura
7. Usuário pode editar se necessário (ex: aumentar calorias se comeu 150g)
8. Clica "Adicionar" para confirmar

## Próximas Melhorias

- [ ] Adicionar opção para usuário criar alimentos personalizados
- [ ] Sincronizar alimentos favoritos do usuário
- [ ] Histórico de alimentos usados
- [ ] Integrar com APIs de banco de dados de nutrição (USDA, MyFitnessPal)
- [ ] Suporte a diferentes unidades (g, ml, porção, etc)
- [ ] Importar dados nutricionais de foto
