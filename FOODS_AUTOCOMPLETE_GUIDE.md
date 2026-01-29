# Guia de Banco de Alimentos com Autocomplete - TACO

## Visão Geral

Sistema de autocomplete de alimentos integrado ao dashboard de dieta. Os dados são baseados na **TACO (Tabela Brasileira de Composição de Alimentos)** da UNICAMP, garantindo precisão e confiabilidade dos valores nutricionais.

## Características

✓ Autocomplete em tempo real com 60+ alimentos TACO  
✓ Valores nutricionais por 100g (proteína, carboidratos, gorduras, calorias)  
✓ Auto-preenchimento de macros ao selecionar alimento  
✓ Edição livre de valores após seleção  
✓ Busca case-insensitive  
✓ Navegação por teclado (setas + Enter)  
✓ Organizado por categorias de alimentos

## Arquitetura

### Componentes

1. **`/components/food-autocomplete.tsx`**
   - Input com autocomplete
   - Busca em tempo real com debounce
   - Lista de sugestões com macros

2. **`/app/api/foods/search/route.ts`**
   - GET endpoint para buscar alimentos
   - Query: `?search=nome`

3. **`/app/api/foods/init/route.ts`**
   - Inicializa banco de dados TACO
   - Executa automaticamente na primeira abertura

4. **`/lib/populateFoods.ts`**
   - Array com 60+ alimentos TACO
   - Valores por 100g conforme TACO UNICAMP v2.2

### Firebase Collection

\`\`\`
Collection: foods
Documentos: {
  name: string (lowercase para busca),
  displayName: string (nome exibição),
  calories: number,
  protein: number (em gramas),
  carbs: number (em gramas),
  fats: number (em gramas),
  category: string,
  createdAt: timestamp
}
\`\`\`

## Dados TACO Inclusos (60+ alimentos)

### Carnes e Derivados (6)
- Frango peito cozido (165 cal, 31g proteína)
- Frango coxa cozida (209 cal, 26.2g proteína)
- Carne acém cozida (217 cal, 26.1g proteína)
- Carne alcatra cozida (271 cal, 25.9g proteína)
- Carne filé mignon cozida (234 cal, 27.8g proteína)
- Carne porco filé cozida (242 cal, 27g proteína)

### Ovos e Derivados (3)
- Ovo inteiro cozido (155 cal, 13g proteína)
- Ovo clara cozida (52 cal, 11g proteína)
- Ovo gema cozida (322 cal, 16g proteína)

### Pescados e Frutos do Mar (5)
- Salmão cozido (206 cal, 25.4g proteína)
- Atum enlatado em água (96 cal, 21.5g proteína)
- Tilápia cozida (128 cal, 26.2g proteína)
- Camarão cozido (99 cal, 21g proteína)
- Sardinha enlatada em óleo (208 cal, 25.4g proteína)

### Leguminosas (5)
- Feijão cozido (77 cal, 5.2g proteína)
- Lentilha cozida (116 cal, 8.9g proteína)
- Grão de bico cozido (134 cal, 8.9g proteína)
- Soja cozida (172 cal, 18.3g proteína)
- Feijão preto cozido (77 cal, 5.2g proteína)

### Lácteos (8)
- Leite integral (61 cal, 3.2g proteína)
- Leite desnatado (35 cal, 3.4g proteína)
- Leite semidesnatado (49 cal, 3.3g proteína)
- Iogurte natural integral (59 cal, 3.5g proteína)
- Iogurte desnatado (40 cal, 3.8g proteína)
- Queijo meia cura (389 cal, 25.4g proteína)
- Queijo mozzarela (280 cal, 28g proteína)
- Requeijão (236 cal, 10.2g proteína)

### Cereais e Derivados (9)
- Arroz branco cozido (130 cal, 2.7g proteína)
- Arroz integral cozido (111 cal, 2.6g proteína)
- Pão francês (290 cal, 8.9g proteína)
- Pão integral (247 cal, 9g proteína)
- Aveia em flocos crua (389 cal, 17g proteína)
- Macarrão cozido (131 cal, 4.4g proteína)
- Macarrão integral cozido (124 cal, 5.3g proteína)
- Batata cozida com pele (77 cal, 1.7g proteína)
- Batata doce cozida (86 cal, 1.6g proteína)

### Frutas (16)
- Banana (89 cal, 1.1g proteína)
- Maçã (52 cal, 0.3g proteína)
- Laranja (47 cal, 0.9g proteína)
- Tangerina (47 cal, 0.7g proteína)
- Uva roxa (67 cal, 0.6g proteína)
- Morango (32 cal, 0.7g proteína)
- Abacaxi (50 cal, 0.5g proteína)
- Melancia (30 cal, 0.6g proteína)
- Melão (34 cal, 0.8g proteína)
- Pêssego (39 cal, 0.9g proteína)
- Abacate (160 cal, 2g proteína)
- Pera (57 cal, 0.4g proteína)
- Manga (60 cal, 0.7g proteína)
- Mamão (43 cal, 0.5g proteína)
- Goiaba (68 cal, 0.7g proteína)
- Kiwi (61 cal, 0.8g proteína)

### Verduras e Hortaliças (15)
- Brócolis cozido (34 cal, 2.8g proteína)
- Couve crua (49 cal, 3.3g proteína)
- Espinafre cru (23 cal, 2.9g proteína)
- Alface crespa crua (15 cal, 1.2g proteína)
- Tomate cru (18 cal, 0.9g proteína)
- Cenoura crua (41 cal, 0.9g proteína)
- Cenoura cozida (35 cal, 0.7g proteína)
- Abóbora cozida (35 cal, 0.7g proteína)
- Couve-flor cozida (25 cal, 1.9g proteína)
- Abobrinha crua (21 cal, 1.5g proteína)
- Pepino cru (16 cal, 0.7g proteína)
- Pimentão cru (31 cal, 1g proteína)
- Cebola crua (40 cal, 1.1g proteína)
- Alho cru (149 cal, 6.3g proteína)
- Rúcula crua (25 cal, 2.6g proteína)

### Nozes e Sementes (8)
- Amendoim (567 cal, 25.8g proteína)
- Castanha de caju (553 cal, 18.2g proteína)
- Castanha do pará (656 cal, 14.3g proteína)
- Amêndoa (579 cal, 21g proteína)
- Sementes de girassol (584 cal, 20.8g proteína)
- Sementes de abóbora (559 cal, 24.7g proteína)
- Sementes de linhaça (534 cal, 18.3g proteína)
- Nozes (660 cal, 15.2g proteína)

### Gorduras e Óleos (4)
- Óleo de oliva (884 cal, 100g gordura)
- Azeite de oliva (884 cal, 100g gordura)
- Manteiga (717 cal, 81g gordura)
- Margarina (718 cal, 80g gordura)

### Bebidas e Condimentos (4)
- Café coado (0 cal)
- Chá preto coado (1 cal)
- Suco natural laranja (47 cal, 0.9g proteína)
- Mel (304 cal, 82g carboidratos)
- Açúcar refinado (387 cal, 100g carboidratos)
- Chocolate 70% cacau (598 cal, 7.8g proteína)

## Como Usar

### No Dashboard de Dieta

1. Abra "Dieta" → "Adicionar Alimento"
2. Digite o nome do alimento (mínimo 2 caracteres)
3. Veja sugestões da TACO aparecerem
4. Selecione com Enter ou mouse
5. Macros preenchem automaticamente (valores por 100g)
6. Edite conforme necessário (se comeu quantidade diferente de 100g)
7. Clique "Adicionar" para confirmar

### Exemplo Prático

\`\`\`
Usuário digita: "fran"

Sugestões TACO aparecem:
- Frango peito cozido (165 cal, 31g proteína, 0g carbs, 3.6g gordura)
- Frango coxa cozida (209 cal, 26.2g proteína, 0g carbs, 10.8g gordura)

Ao selecionar "Frango peito cozido":
- Nome: Frango peito cozido ✓
- Calorias: 165 ✓
- Proteína: 31g ✓
- Carboidratos: 0g ✓
- Gordura: 3.6g ✓

Se o usuário comeu 150g ao invés de 100g:
- Edita Calorias: 247 (165 * 1.5)
- Edita Proteína: 46.5 (31 * 1.5)
\`\`\`

## APIs Disponíveis

### GET /api/foods/search

Busca alimentos por termo.

\`\`\`
Query: ?search=termo
Exemplo: /api/foods/search?search=frango

Response:
{
  "success": true,
  "foods": [
    {
      "id": "doc-id",
      "displayName": "Frango peito cozido",
      "name": "frango peito cozido",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fats": 3.6,
      "category": "proteína"
    }
  ],
  "count": 1
}
\`\`\`

### GET /api/foods/init

Inicializa a base de dados TACO na primeira execução.

\`\`\`
Response:
{
  "success": true,
  "count": 60,
  "message": "Foods populated from TACO"
}
\`\`\`

## Adicionando Novos Alimentos TACO

Edite `/lib/populateFoods.ts` e adicione ao array `TACO_FOODS`:

\`\`\`typescript
{
  name: "Nome do alimento", 
  calories: 100,
  protein: 10.0,
  carbs: 15.0,
  fats: 5.0,
  category: "proteína" // ou "carboidrato", "gordura", "vegetal", "fruta"
}
\`\`\`

Após editar:
1. Delete a collection "foods" do Firebase Console
2. Reabra a página de Dieta (vai reinicializar automaticamente)

## Notas Importantes

- **Valores por 100g**: Todos os dados são por 100g do alimento conforme TACO
- **Modo de preparo**: Alguns alimentos indicam o preparo (cozido, cru, frito)
- **Edição livre**: Usuários podem editar qualquer valor após seleção
- **Sem conversão automática**: Sistema não converte automaticamente porções (ex: 1 xícara)
- **Referência TACO**: https://nepa.unicamp.br/publicacoes/tabela-taco-pdf/

## Próximas Melhorias Sugeridas

- Adicionar conversores de porção (xícara, colher, unidade)
- Alimentos favoritos por usuário
- Histórico de alimentos usados
- Mais alimentos da TACO (versão completa tem 600+)
- Filtrar por categoria
- Comparador de macros entre alimentos
