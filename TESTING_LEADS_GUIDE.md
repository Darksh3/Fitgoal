## Guia de Teste: Sistema de Salvamento de Leads

---

## Pré-Requisitos
- ✅ Projeto Fitgoal funcionando
- ✅ Firebase configurado
- ✅ Quiz acessível em `/quiz`
- ✅ Browser Developer Tools disponível (F12)

---

## Teste 1: Verificar Implementação da API

### Objetivo
Confirmar que o arquivo API foi criado corretamente

### Passos
1. No seu editor, abra `/app/api/save-lead/route.ts`
2. Confirme que tem as seguintes funções:
   - `export async function POST(request: NextRequest)`
   - Salva em `leads` collection
   - Salva em `users` collection
3. ✅ Se encontrou, implementação OK

---

## Teste 2: Verificar Modificação do Quiz

### Objetivo
Confirmar que o quiz chama a função `saveLead()`

### Passos
1. Abra `/app/quiz/page.tsx`
2. Procure pela função `saveLead()`
3. Procure pela função `nextStep()` 
4. Confirme que quando `currentStep === totalSteps`, chama `saveLead()`
5. ✅ Se encontrou ambas, modificação OK

---

## Teste 3: Teste de Fluxo Completo

### Objetivo
Testar todo o fluxo de salvamento de lead via quiz

### Passos

#### 1. Abrir Console do Desenvolvedor
```
Pressione F12 ou Cmd+Option+I (Mac)
Abra a aba "Console"
```

#### 2. Acessar o Quiz
```
Acesse: http://localhost:3000/quiz
```

#### 3. Completar o Quiz
- Responda todas as 30 perguntas
- Nota: Você precisa completar TODOS os passos
- ⚠️ Não pule nenhum passo

#### 4. Monitorar os Logs
Enquanto completa, veja os logs aparecendo:
```
[QUIZ] Frequency selected: 4
[v0] Initializing clientUid from quiz: abc123xyz
[DATA_FLOW] [stage]: { ... }
```

#### 5. Último Passo (Passo 30)
- Insira seu email no último campo
- Clique no botão "Continuar"

#### 6. Observar Salvamento
Você deve ver estes logs na console:
```
[v0] SAVE_LEAD - Starting to save lead for user: abc123xyz
[v0] SAVE_LEAD - Success: { leadId: 'abc123xyz', ... }
```

#### 7. Verificar Redirecionamento
- Você deve ser redirecionado para `/quiz/results`
- Se ver a página de resultados = ✅ Sucesso

---

## Teste 4: Verificar Salvamento no Firebase

### Objetivo
Confirmar que os dados foram realmente salvos no Firestore

### Passos

#### 1. Abrir Firebase Console
```
Acesse: https://console.firebase.google.com
Selecione projeto: Fitgoal
```

#### 2. Abrir Firestore Database
```
No menu esquerdo: Build → Firestore Database
```

#### 3. Navegar até Collection "leads"
```
Clique em "leads" na lista de collections
```

#### 4. Procurar pelo seu UID
- Você precisa saber qual foi seu UID
- Ele está no localStorage como "clientUid"
- Para verificar no console: 
  ```javascript
  console.log(localStorage.getItem("clientUid"))
  ```
- Procure este ID na collection "leads"

#### 5. Verificar Documento
- Clique no documento com seu UID
- Você deve ver todos seus dados:
  ```
  name: "Seu Nome"
  email: "seu@email.com"
  age: 25
  gender: "homem" ou "mulher"
  goals: ["perder-peso", "ganhar-massa"]
  bodyType: "ectomorfo"
  experience: "iniciante"
  ... (50+ campos)
  ```

#### 6. Verificar Fields Importantes
- ✅ name: deve ter seu nome
- ✅ email: deve ter seu email
- ✅ status: deve ser "lead"
- ✅ completedQuizAt: deve ter timestamp recente
- ✅ goals: deve ter array com seus objetivos

---

## Teste 5: Verificar Salvamento em "users"

### Objetivo
Confirmar que os dados do quiz também foram salvos em "users"

### Passos

#### 1. Na Firestore, abra collection "users"
```
Clique em "users" na lista de collections
```

#### 2. Procurar pelo seu UID
```
Procure o documento com seu UID
```

#### 3. Verificar Dados
- Deve ter campo "quizData"
- Deve ter campo "quizCompletedAt"
- Deve ter seus "name" e "email"

---

## Teste 6: Teste de Query - Filtrar por Objetivo

### Objetivo
Confirmar que você pode buscar leads por objetivo

### Passos

#### 1. Abrir Console do Navegador
```
Pressione F12
Abra aba "Console"
```

#### 2. Copie e cole este código:
```javascript
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

const testQuery = async () => {
  const leadsRef = collection(db, "leads")
  const q = query(leadsRef, where("goals", "array-contains", "perder-peso"))
  
  const querySnapshot = await getDocs(q)
  console.log("Leads que querem perder peso:", querySnapshot.size)
  
  querySnapshot.forEach((doc) => {
    console.log("Nome:", doc.data().name)
  })
}

testQuery()
```

#### 3. Você deve ver:
```
Leads que querem perder peso: 1
Nome: Seu Nome
```

---

## Teste 7: Teste de Contagem de Leads

### Objetivo
Confirmar que você pode contar quantos leads existem

### Passos

#### 1. Abrir Console
```
Pressione F12
Abra aba "Console"
```

#### 2. Cole este código:
```javascript
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

const countLeads = async () => {
  const leadsRef = collection(db, "leads")
  const querySnapshot = await getDocs(leadsRef)
  
  console.log("Total de leads:", querySnapshot.size)
  
  const stats = {
    homens: 0,
    mulheres: 0,
    iniciantes: 0,
    intermediarios: 0,
    avancados: 0
  }
  
  querySnapshot.forEach((doc) => {
    const data = doc.data()
    if (data.gender === "homem") stats.homens++
    if (data.gender === "mulher") stats.mulheres++
    if (data.experience === "iniciante") stats.iniciantes++
    if (data.experience === "intermediario") stats.intermediarios++
    if (data.experience === "avançado") stats.avancados++
  })
  
  console.log("Estatísticas:", stats)
}

countLeads()
```

#### 3. Você deve ver:
```
Total de leads: 1
Estatísticas: {
  homens: 1,
  mulheres: 0,
  iniciantes: 1,
  intermediarios: 0,
  avancados: 0
}
```

---

## Teste 8: Testar com Outro Usuário

### Objetivo
Confirmar que múltiplos leads podem ser salvos

### Passos

#### 1. Abrir Navegador Privado
```
Ctrl+Shift+N (Windows)
ou
Cmd+Shift+N (Mac)
```

#### 2. Acessar o Quiz Novamente
```
Acesse: http://localhost:3000/quiz
```

#### 3. Completar com Dados Diferentes
- Use nome diferente: "Maria Silva"
- Use email diferente: "maria@email.com"
- Complete todo o quiz

#### 4. Verificar no Firebase
- Agora deve haver 2 documentos em "leads"
- Um com seu UID (primeiro teste)
- Um com o novo UID (segundo teste)

---

## Checklist de Validação

Marque cada item ao testar:

### Implementação
- [ ] API `/app/api/save-lead/route.ts` existe
- [ ] Função `saveLead()` existe no quiz
- [ ] `nextStep()` chama `saveLead()` no último passo

### Fluxo de Quiz
- [ ] Todos os 30 passos são completados
- [ ] Console mostra "[v0] SAVE_LEAD - Starting to save"
- [ ] Console mostra "[v0] SAVE_LEAD - Success"
- [ ] Usuário é redirecionado para `/quiz/results`

### Firebase
- [ ] Collection "leads" existe
- [ ] Documentos aparecem com UID como ID
- [ ] Campos básicos (name, email, status) estão presentes
- [ ] 50+ campos estão salvos
- [ ] Timestamp de `completedQuizAt` é recente

### Queries
- [ ] Filtro por objetivo funciona
- [ ] Contagem de leads funciona
- [ ] Múltiplos leads podem ser salvos
- [ ] Dados de cada lead estão corretos

---

## Possíveis Problemas e Soluções

### Problema 1: Redirecionamento não funciona
**Solução:**
```javascript
// Verificar se o router está correto
console.log("[v0] Router disponível?", router)

// Tentar redirect manual
setTimeout(() => {
  window.location.href = "/quiz/results"
}, 1000)
```

### Problema 2: Dados não salvam
**Verificar:**
1. Console de erros (F12)
2. Firestore Rules - permitem escrita?
3. Usuário está autenticado?
4. Firebase iniciado corretamente?

```javascript
// Testar autenticação
import { auth } from "@/lib/firebaseClient"
console.log("User:", auth.currentUser)
```

### Problema 3: Collection "leads" não existe
**Solução:**
1. Firestore cria collections automaticamente
2. Se não aparecer, significa que o POST não funcionou
3. Verificar logs do servidor/erro da API

### Problema 4: Dados Incompletos
**Verificar:**
1. Todos os 30 passos foram concluídos?
2. `quizData` tem todos os campos?
3. Erro durante o salvamento?

```javascript
// Verificar dados antes de salvar
console.log("Quiz data keys:", Object.keys(quizData).length)
console.log("Quiz data:", quizData)
```

---

## Teste de Carga

### Objetivo
Testar se o sistema funciona com múltiplos leads

### Passos
1. Complete o quiz com 3-5 usuários diferentes
2. Cada um em navegador privado
3. Verifique se todos aparecem em Firebase
4. Teste a query com múltiplos resultados

---

## Teste de Erro

### Objetivo
Testar se o sistema se recupera de erros

### Passos
1. Desative sua conexão de internet
2. Complete o quiz até o passo 30
3. Clique continuar
4. Observe que ainda é redirecionado (fail-safe)
5. Ligue a internet novamente
6. Tente novamente

---

## Sucesso!

Se todos os testes passaram:

✅ **Implementação OK**  
✅ **Fluxo OK**  
✅ **Salvamento OK**  
✅ **Queries OK**  
✅ **Pronto para Produção**

Próximo passo: Ver `/LEADS_SUMMARY.md` para próximos passos recomendados!

---

## Logs Esperados

Durante o teste completo, você deve ver:

```
[v0] Initializing clientUid from quiz: abc123xyz
[QUIZ] Frequency selected: 4
[DATA_FLOW] [stage]: {...}
...
[v0] SAVE_LEAD - Starting to save lead for user: abc123xyz
[v0] SAVE_LEAD - Success: { 
  success: true, 
  leadId: 'abc123xyz', 
  message: 'Lead saved successfully'
}
```

Se ver "[v0] SAVE_LEAD_ERROR", procure no arquivo `/QUIZ_LEAD_SAVING.md` para solução.
