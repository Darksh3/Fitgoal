# Configurar Índice do Firestore para Histórico

## Erro Atual
\`\`\`
9 FAILED_PRECONDITION: The query requires an index
\`\`\`

## Solução

### Opção 1: Link Automático (Recomendado)
Quando você vir o erro no console do Firebase, ele fornecerá um link direto para criar o índice. Clique nesse link e o Firebase criará automaticamente.

### Opção 2: Criar Manualmente

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá em **Firestore Database** → **Indexes** → **Composite**
4. Clique em **Create Index**
5. Configure:
   - **Collection ID**: `progressPhotos`
   - **Fields to index**:
     - Campo: `userId` | Order: Ascending
     - Campo: `createdAt` | Order: Descending
   - **Query scope**: Collection
6. Clique em **Create**

O índice levará alguns minutos para ser criado. Após isso, o histórico funcionará normalmente.

## Verificação

Após criar o índice, teste carregando a página de análise corporal. O histórico deve aparecer sem erros.
