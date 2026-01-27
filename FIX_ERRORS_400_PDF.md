## Correções Implementadas - Erros 400 e PDF

### 1. Erro 400 - Substituição de Exercício

**Problema:**
- O endpoint `/api/substitute-exercise` esperava: `{ userId, dayIndex, exerciseIndex, currentExercise, userPreferences }`
- Mas estava recebendo apenas: `{ exercise }`

**Solução:**
Atualizei `handleSubstitute()` em `/app/dashboard/treino/page.tsx` para enviar todos os parâmetros esperados:
```typescript
body: JSON.stringify({
  userId: user.uid,
  dayIndex,
  exerciseIndex,
  currentExercise: exercise,
  userPreferences: userData?.quizData || {},
})
```

**Melhorias adicionadas:**
- Validação de parâmetros antes da requisição
- Log detalhado do erro do backend: `await res.text()`
- Verificação correta do tipo de resposta (`substitution` vs `newExercise`)

---

### 2. Erro de PDF - "Cannot access 's' before initialization"

**Problema:**
- Biblioteca `html2pdf.js` tem problemas com minificação em produção
- Container com `left: -9999px` ficava com altura 0
- PDF saía em branco

**Solução:**
Substituí `html2pdf.js` por `html2canvas` + `jsPDF` (mais robusto) em dois arquivos:

#### `/app/dashboard/treino/page.tsx` - `downloadWorkoutPDF()`
- Container criado com posição `fixed`, `width: 800px`, `height: auto` e `backgroundColor: white`
- `setTimeout(50ms)` para garantir que o layout foi renderizado
- `html2canvas` captura com `scale: 2, useCORS: true, backgroundColor: "#ffffff"`
- `jsPDF` converte para PDF com múltiplas páginas se necessário

#### `/app/dashboard/dieta/page.tsx` - `downloadDietPDF()`
- Mesma abordagem aplicada
- Corrigido bug: código estava chamando `html2pdf()` antes de criar o `pdfContent` e antes de declarar `options`
- Agora a lógica está corretamente ordenada

**Dependências já instaladas:**
- `html2canvas: 1.4.1` ✅
- `jspdf: 4.0.0` ✅

---

### Testes Recomendados

1. **Substituição de Exercício:**
   - Clique em "Substituir" em um exercício
   - Verifique se recebe um exercício alternativo válido

2. **Download de PDFs:**
   - Clique em "Download" na aba Treino
   - Clique em "Download" na aba Dieta
   - Ambos devem gerar PDFs corretamente sem erros
