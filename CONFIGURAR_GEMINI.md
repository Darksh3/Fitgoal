# Como Configurar a API do Google Gemini

## Passo 1: Adicionar a Variável de Ambiente

Você precisa adicionar a chave da API do Google Gemini como variável de ambiente no projeto.

### Opção A: Através da Interface do v0 (Recomendado)

1. Clique no ícone de **sidebar** no canto esquerdo do chat
2. Selecione a aba **"Vars"** (Variáveis)
3. Clique em **"Add Variable"**
4. Adicione:
   - **Nome:** `GOOGLE_API_KEY`
   - **Valor:** `AIzaSyBu9NpMoNpPcovvVNqQVfvOou_DJeuwEnw`
5. Clique em **"Save"**

### Opção B: Através do Vercel Dashboard

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione:
   - **Key:** `GOOGLE_API_KEY`
   - **Value:** `AIzaSyBu9NpMoNpPcovvVNqQVfvOou_DJeuwEnw`
5. Selecione todos os ambientes (Production, Preview, Development)
6. Clique em **"Save"**
7. Faça um novo deploy ou reinicie o servidor de desenvolvimento

## Passo 2: Testar

Após adicionar a variável de ambiente:

1. Recarregue a página do aplicativo
2. Tente fazer uma nova análise de fotos
3. O Gemini Flash deve processar as fotos sem problemas de política de conteúdo

## Benefícios do Gemini Flash

- ✅ **30x mais barato** que GPT-4o
- ✅ **Sem restrições** para análise de fotos fitness
- ✅ **Rápido e eficiente** para análise de imagens
- ✅ **Qualidade excelente** para avaliação de progresso físico

## Custo Estimado

- Análise típica: ~$0.001-0.002 por análise
- 1000 análises: ~$1-2 USD
