## Sistema de Autocomplete de Alimentos - TACO

Implementação completa com 60+ alimentos da Tabela Brasileira de Composição de Alimentos (TACO).

### O que foi criado:

#### 1. Componentes
- `components/food-autocomplete.tsx` - Input com autocomplete em tempo real
- `app/api/foods/search/route.ts` - API para buscar alimentos
- `app/api/foods/init/route.ts` - API para inicializar DB
- `lib/populateFoods.ts` - Lista de 60+ alimentos TACO com macros

#### 2. Modificações no Dashboard
- Integração do FoodAutocomplete no modal de adicionar alimento
- Auto-inicialização do banco TACO ao abrir a página
- Auto-preenchimento de macros ao selecionar alimento

#### 3. Documentação
- `FOODS_AUTOCOMPLETE_GUIDE.md` - Guia completo com todas as funcionalidades

### Como Testar:

1. **Abra a página de Dieta**
   - A API de inicialização rodará automaticamente
   - 60+ alimentos TACO serão populados no Firestore

2. **Clique em "Adicionar Alimento"**
   - O modal aparecerá com o novo input de autocomplete

3. **Digite um alimento**
   - Exemplos: "frango", "arroz", "banana", "tomate"
   - Veja sugestões aparecerem com macros

4. **Selecione um alimento**
   - Use mouse ou teclado (setas + Enter)
   - As macros preenchem automaticamente
   - Você pode editar se necessário

5. **Clique Adicionar**
   - O alimento é adicionado à refeição

### Dados TACO Inclusos:

- 6 Carnes e derivados
- 3 Ovos e derivados  
- 5 Pescados e frutos do mar
- 5 Leguminosas
- 8 Lácteos
- 9 Cereais e derivados
- 16 Frutas
- 15 Verduras e hortaliças
- 8 Nozes e sementes
- 4 Gorduras e óleos
- 4 Bebidas e condimentos

**Total: 60+ alimentos com valores por 100g conforme TACO UNICAMP v2.2**

### Referências:

- TACO Official: https://nepa.unicamp.br/
- TACO Online: https://www.tabelatacoonline.com.br/

### Próximas Funcionalidades Sugeridas:

- Adicionar mais alimentos da TACO (versão completa tem 600+)
- Alimentos favoritos por usuário
- Histórico de alimentos usados
- Conversor de porções (xícara, colher, unidade)
- Filtro por categoria
- Importar dados de foto
