# Como Corrigir o Erro de Permissões do Firestore

## Problema
Erro ao salvar medidas: "FirebaseError: Missing or insufficient permissions"

## Causa
As regras do Firestore no Firebase Console não permitem acesso à subcoleção `measurements` dentro de `users/{userId}`.

## Solução

### 1. Acesse o Firebase Console
1. Vá para [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione seu projeto (fitgoal.com.br)
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Regras** (Rules)

### 2. Atualize as Regras do Firestore
Cole as seguintes regras (substituindo completamente as regras existentes):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para documentos de usuários e suas subcoleções
    match /users/{userId} {
      // Permitir que o usuário leia e escreva seu próprio documento
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcoleção de medidas corporais
      match /measurements/{measurementId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Regras para fotos de progresso
    match /progressPhotos/{photoId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow list: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Regras para leads
    match /leads/{leadId} {
      allow read, write: if request.auth.uid == leadId || (request.auth.token.admin == true);
    }

    // Bloquear acesso a todas as outras coleções
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Publique as Regras
1. Clique no botão **Publicar** (Publish) no topo da página
2. Aguarde a confirmação de que as regras foram publicadas com sucesso

### 4. Teste Novamente
1. Volte para a página de Progresso no seu app
2. Preencha as medidas corporais
3. Clique em **Salvar Medidas**
4. Verifique o console do navegador (F12) para ver os logs de debug

## Verificando se Funcionou

Após aplicar as regras, você deve ver no console do navegador:
- `[v0] Starting save measurements for user: [seu-user-id]`
- `[v0] Collection reference created: users/[seu-user-id]/measurements`
- `[v0] Measurements saved successfully!`

Se ainda houver erro, você verá:
- `[v0] Error saving measurements:` seguido do erro específico

## Estrutura de Dados no Firestore

Após salvar com sucesso, a estrutura no Firestore será:

```
firestore
└── users
    └── {userId}
        ├── quizData: {...}
        └── measurements (subcoleção)
            └── {measurementId}
                ├── weight: "72"
                ├── height: "178"
                ├── chest: "95.5"
                ├── waist: "80.0"
                ├── hips: "95.0"
                ├── leftArm: "35.5"
                ├── rightArm: "35.5"
                ├── leftThigh: "55.0"
                ├── rightThigh: "55.0"
                ├── neck: "38.0"
                ├── date: "2025-11-22"
                └── timestamp: [Firestore Timestamp]
```

## Dicas Adicionais

- Verifique se você está logado no app (o erro também pode ocorrer se não houver usuário autenticado)
- Certifique-se de que as variáveis de ambiente do Firebase estão configuradas corretamente
- Limpe o cache do navegador se o problema persistir

## Suporte

Se o erro continuar após aplicar as regras, verifique:
1. Se você está usando o projeto correto do Firebase
2. Se as variáveis de ambiente estão corretas
3. Se o usuário está realmente autenticado (verifique os logs no console)
