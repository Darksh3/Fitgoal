# Configuração do Firebase

## Regras do Firestore

As regras do Firestore precisam ser implantadas manualmente no console do Firebase.

### Como implantar as regras:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Firestore Database** > **Regras**
4. Copie e cole as regras do arquivo `firestore.rules`
5. Clique em **Publicar**

### Regras necessárias para progressPhotos:

\`\`\`rules
match /progressPhotos/{photoId} {
  // Permitir que usuários leiam suas próprias fotos
  allow read: if request.auth != null && 
              (resource.data.userId == request.auth.uid || 
               request.auth.token.admin == true);
  
  // Permitir que usuários criem suas próprias fotos
  allow create: if request.auth != null && 
                request.resource.data.userId == request.auth.uid;
  
  // Permitir que usuários atualizem suas próprias fotos
  allow update: if request.auth != null && 
                resource.data.userId == request.auth.uid;
  
  // Permitir que usuários deletem suas próprias fotos
  allow delete: if request.auth != null && 
                resource.data.userId == request.auth.uid;
}
