# Configuração Supabase para FitGoal

## Status: Pronto para Configurar ✅

Você tem as variáveis de ambiente configuradas:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅

## Próximos Passos

### 1. Criar a Tabela de Alimentos no Supabase

**Via Supabase Dashboard (Recomendado):**

1. Acesse https://app.supabase.com
2. Clique no seu projeto
3. Vá em **SQL Editor** (no menu esquerdo)
4. Clique em **New Query**
5. Cole o conteúdo de `/scripts/setup-supabase-foods.sql`
6. Clique em **Run**

**Isso vai:**
- ✅ Criar a tabela `foods`
- ✅ Criar índices para busca rápida
- ✅ Inserir 20 alimentos comuns (frango, arroz, feijão, etc)
- ✅ Criar categorias (Proteína, Carboidratos, Vegetais, etc)

### 2. Instalar Dependências

\`\`\`bash
npm install
\`\`\`

### 3. Testar a Integração

Após criar a tabela, você pode:

1. **Buscar um alimento:**
\`\`\`bash
curl "http://localhost:3000/api/foods/search-supabase?q=frango"
\`\`\`

2. **Buscar por categoria:**
\`\`\`bash
curl "http://localhost:3000/api/foods/search-supabase?category=Proteína"
\`\`\`

## Arquivos Criados

- `/lib/supabase.ts` - Cliente Supabase configurado
- `/lib/supabaseFoods.ts` - Serviços para gerenciar alimentos
- `/app/api/foods/search-supabase/route.ts` - API endpoint para buscar alimentos
- `/scripts/setup-supabase-foods.sql` - Script para criar tabela e inserir dados

## Próximas Integrações

Após confirmar que a tabela foi criada, vou:
1. Atualizar o componente de autocomplete de alimentos
2. Integrar o Supabase na página de dieta
3. Substituir completamente o Firebase pelos alimentos Supabase

## Suporte

Se encontrar erros ao executar o SQL:
- Verifique as variáveis de ambiente
- Certifique-se de que está conectado ao projeto correto
- Verifique as permissões do seu usuário Supabase
