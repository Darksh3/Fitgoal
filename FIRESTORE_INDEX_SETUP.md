# Configuração do Índice Composto do Firestore

O histórico de fotos precisa de um índice composto para funcionar corretamente.

## ⚠️ Erro que você está vendo:

```
FirebaseError: Missing or insufficient permissions.
"9 FAILED_PRECONDITION: The query requires an index"
```

## ✅ Solução: Criar Índice Composto

### Opção 1: Link Direto (Mais Rápido)

Quando você vir o erro no console, o Firebase geralmente fornece um link direto. Clique nele e o índice será criado automaticamente.

### Opção 2: Manual no Firebase Console

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}**
3. Vá em **Firestore Database** → **Índices** (aba no topo)
4. Clique em **Criar índice** ou **Add Index**
5. Configure:
   - **Coleção**: `progressPhotos`
   - **Campos a indexar**:
     - Campo 1: `userId` → **Ascending** (Crescente)
     - Campo 2: `createdAt` → **Descending** (Decrescente)
   - **Escopo da consulta**: Collection
6. Clique em **Criar**
7. Aguarde 2-5 minutos para o índice ser construído

## 📝 Por que isso é necessário?

O código faz esta query:
```typescript
query(
  collection(db, "progressPhotos"),
  where("userId", "==", user.uid),
  orderBy("createdAt", "desc")
)
```

Queries com `where` + `orderBy` em campos diferentes precisam de índices compostos no Firestore.

## 🔍 Como Verificar se Funcionou

Após criar o índice:
1. Recarregue a página do seu app
2. Vá em **Histórico** na aba de Análise Corporal
3. O erro deve sumir e as fotos devem aparecer
4. No console do Firebase, o índice deve mostrar status **Enabled** (verde)

## 📊 Estrutura Esperada no Firestore

```
progressPhotos/
├── [photoId1]
│   ├── userId: "user123"
│   ├── photos: [{ photoUrl, photoType }, ...]
│   ├── analysis: { motivacao, pontosForts, ... }
│   ├── createdAt: timestamp
│   └── batchAnalysis: true
├── [photoId2]
│   └── ...
```

## 🆘 Ainda com Problemas?

Se o erro persistir:
1. Verifique se você está logado com a conta correta
2. Confirme que o índice está com status **Enabled**
3. Limpe o cache do navegador (Ctrl+Shift+Del)
4. Verifique as regras do Firestore na aba **Rules**

---

**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
