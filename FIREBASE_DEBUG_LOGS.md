# 🔍 Firebase Debug Logs

Este documento explica os logs adicionados para debugar o fluxo de dados do quiz e Firebase.

## Fluxo de Logs

### 1️⃣ Autenticação (auth-form.tsx)
\`\`\`
[v0] AUTH_FORM_LOGIN_ATTEMPT - Email: usuario@email.com
[v0] AUTH_FORM_LOGIN_SUCCESS - User authenticated
[v0] AUTH_FORM_REDIRECTING_TO_DASHBOARD
\`\`\`

### 2️⃣ Envio do Quiz (quiz/page.tsx - case 30)

Quando o usuário clica em "Continuar" no final do quiz:

\`\`\`
[v0] QUIZ_SUBMIT_START - User ID: <UID>
[v0] QUIZ_DATA_PREPARED - Updated data keys: [array de chaves]
[v0] QUIZ_DATA_EMAIL: usuario@email.com
[v0] QUIZ_DATA_NAME: Nome Completo
[v0] QUIZ_DATA_SAVED_TO_LOCALSTORAGE
[v0] FIREBASE_SAVE_START - Refs created for user: <UID>
[v0] FIREBASE_USER_DOC_SAVED - User doc saved to /users/<UID>
[v0] FIREBASE_LEAD_DOC_SAVED - Lead doc saved to /leads/<UID>
[v0] CASE_30_BUTTON_CLICKED - Redirecting to results page
\`\`\`

### 3️⃣ Página de Resultados (quiz/results/page.tsx)

Quando a página de resultados carrega:

\`\`\`
[v0] RESULTS_DATA_FOUND_IN_LOCALSTORAGE - Keys: [array de chaves]
\`\`\`

OU

\`\`\`
[v0] RESULTS_NO_DATA_IN_LOCALSTORAGE
[v0] RESULTS_FETCHING_FROM_FIREBASE - User ID: <UID>
[v0] RESULTS_DATA_FOUND_IN_FIREBASE - Keys: [array de chaves]
[v0] RESULTS_FIREBASE_DATA_EMAIL: usuario@email.com
[v0] RESULTS_FIREBASE_DATA_NAME: Nome Completo
[v0] RESULTS_DATA_LOADED_SUCCESSFULLY
\`\`\`

OU (Erro)

\`\`\`
[v0] RESULTS_NO_DATA_FOUND - REDIRECTING_TO_QUIZ after 2 seconds
\`\`\`

## ✅ Checklist de Debug

1. **Abra o console do navegador** (F12 ou Cmd+Option+I)
2. **Vá para a aba "Console"**
3. **Passe pelo quiz** e observe os logs
4. **Após clicar em "Continuar"** no case 30, procure por:
   - ✅ Todos os logs `FIREBASE_*` devem aparecer
   - ✅ Se vir `RESULTS_DATA_FOUND_IN_FIREBASE`, os dados estão sendo salvos
   - ❌ Se vir `RESULTS_NO_DATA_FOUND`, os dados NÃO foram salvos

## 🔧 Possíveis Problemas

### Problema: Logs de Firebase NÃO aparecem
- **Causa**: O `currentUser` pode ser null
- **Solução**: Verifique se a autenticação foi feita corretamente

### Problema: Dados salvos no localStorage mas não no Firebase
- **Causa**: Erro na configuração do Firestore
- **Solução**: Verifique o arquivo `lib/firebaseClient.ts`

### Problema: Redireciona para /quiz em 2 segundos
- **Causa**: Nenhum dado foi encontrado (localStorage vazio E Firebase vazio)
- **Solução**: Verifique o console para ver qual etapa falhou

## 🚀 Como Remover os Logs

Uma vez que o debug estiver completo, pesquise por `[v0]` e remova todos os `console.log("[v0]...` e `console.error("[v0]...`.
