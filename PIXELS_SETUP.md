# Configuração de Pixels - Meta e TikTok

## Resumo do que foi implementado

✅ **3 novos arquivos criados:**
- `lib/pixels.ts` - Funções de rastreamento Meta Pixel e TikTok Pixel
- `lib/meta-conversions-api.ts` - Meta Conversions API server-side
- `components/pixel-tracker.tsx` - React Context Provider e hook usePixel()

✅ **3 arquivos modificados:**
- `app/layout.tsx` - Adicionado PixelTracker wrapper
- `app/quiz/page.tsx` - Rastreamento de Lead ao completar quiz
- `app/api/handle-post-checkout/route.tsx` - Rastreamento de Purchase server-side

## Eventos rastreados

### Client-Side (automático)
- **PageView** - Cada vez que o usuário navega
- **ViewContent** - Na landing page e página de vendas
- **QuizStart** - Quando clica em "Começar Quiz"
- **Lead** - Quando completa o quiz com sucesso

### Server-Side (handle-post-checkout)
- **Purchase** - Quando o pagamento é confirmado (Meta CAPI)

## Variáveis de Ambiente Necessárias

Adicione ao Vercel (Settings > Environment Variables):

```
NEXT_PUBLIC_META_PIXEL_ID=seu_pixel_id_aqui
NEXT_PUBLIC_TIKTOK_PIXEL_ID=seu_pixel_id_aqui
META_PIXEL_ID=seu_pixel_id_aqui
META_CONVERSIONS_API_TOKEN=seu_token_aqui
```

### Onde obter os IDs e Tokens?

**Meta Pixel ID:**
1. Acesse: https://business.facebook.com/events_manager
2. Clique em "Data Sources"
3. Selecione seu Pixel
4. Copie o ID do Pixel (ex: 123456789)

**Meta Conversions API Token:**
1. Em Events Manager > Settings
2. Clique em "Generate Access Token"
3. Copie o token gerado

**TikTok Pixel ID:**
1. Acesse: https://ads.tiktok.com/pixel/
2. Selecione ou crie um novo pixel
3. Copie o Pixel ID (ex: C0AABBCCDD1122EE)

## Testando os Pixels

### Meta Pixel Helper (Chrome Extension)
1. Instale: https://chrome.google.com/webstore/detail/meta-pixel-helper/
2. Clique no ícone na extensão
3. Navegue pelo site e veja os eventos sendo rastreados

### TikTok Pixel Test
1. Em TikTok Ads Manager, vá para Pixel
2. Clique em "Manage Partners" > "Test"
3. Use o test event code enquanto está no seu site

## Verificação Rápida

Abra o console do navegador (F12) e procure por logs como:
```
[v0] ADMIN_LEADS - Fetching leads
[v0] META_CAPI - Evento Purchase enviado com sucesso
```

## Integração com Campanhas

### Meta Ads (Facebook/Instagram)
1. Vá para Meta Ads Manager
2. Crie uma campanha de conversão
3. Escolha "Lead" ou "Purchase" como evento de conversão
4. Selecione seu Pixel
5. O rastreamento acontecerá automaticamente!

### TikTok Ads
1. Vá para TikTok Ads Manager
2. Crie uma campanha
3. Em "Conversion" selecione seu Pixel
4. Escolha o evento (Lead, Purchase)
5. Pronto!

## Observações Importantes

- **Server-Side Tracking (Meta CAPI):** Garante rastreamento mesmo com bloqueadores de anúncios
- **Hashing automático:** Email e telefone são automaticamente hasheados (SHA-256) para privacidade
- **Fallback automático:** Se o pixel falhar, o checkout continua funcionando
- **UTM Params:** Automaticamente capturados e salvos em sessionStorage para atribuição correta

## Próximos Passos

1. ✅ Adicione as variáveis de ambiente no Vercel
2. ✅ Deploy o projeto (git push)
3. ✅ Teste os pixels com o Meta Pixel Helper
4. ✅ Crie uma campanha de tráfego pago
5. ✅ Monitore as conversões no Meta Ads Manager

## Dúvidas?

- Meta Pixel Docs: https://developers.facebook.com/docs/facebook-pixel
- TikTok Pixel Docs: https://ads.tiktok.com/help/article/pixel-setup
- Meta CAPI Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
