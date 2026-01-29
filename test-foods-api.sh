#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${YELLOW}🧪 Testando Sistema de Autocomplete de Alimentos${NC}\n"

# Test 1: Initialize foods database
echo -e "${YELLOW}1. Inicializando banco de alimentos...${NC}"
INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/foods/init" -H "Content-Type: application/json")
echo "Response: $INIT_RESPONSE"

if echo "$INIT_RESPONSE" | grep -q "populated\|already"; then
    echo -e "${GREEN}✓ Banco inicializado com sucesso!${NC}\n"
else
    echo -e "${RED}✗ Erro ao inicializar banco${NC}\n"
fi

# Test 2: Check initialization status
echo -e "${YELLOW}2. Verificando status do banco...${NC}"
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/foods/init")
echo "Response: $STATUS_RESPONSE"
echo ""

# Test 3: Search for foods
echo -e "${YELLOW}3. Testando busca por alimentos...${NC}"

# Test search: "frango"
echo -e "  ${YELLOW}Buscando 'frango'...${NC}"
SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/foods/search?q=frango")
echo "Response: $SEARCH_RESPONSE"
COUNT=$(echo "$SEARCH_RESPONSE" | grep -o "frango" | wc -l)
if [ $COUNT -gt 0 ]; then
    echo -e "  ${GREEN}✓ Encontrou alimentos com 'frango'${NC}"
else
    echo -e "  ${YELLOW}⚠ Nenhum alimento encontrado (pode ser esperado se DB vazio)${NC}"
fi
echo ""

# Test search: "banana"
echo -e "  ${YELLOW}Buscando 'banana'...${NC}"
SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/foods/search?q=banana")
echo "Response: $SEARCH_RESPONSE"
COUNT=$(echo "$SEARCH_RESPONSE" | grep -o "banana" | wc -l)
if [ $COUNT -gt 0 ]; then
    echo -e "  ${GREEN}✓ Encontrou alimentos com 'banana'${NC}"
else
    echo -e "  ${YELLOW}⚠ Nenhum alimento encontrado (pode ser esperado se DB vazio)${NC}"
fi
echo ""

# Test search: "arr" (arroz)
echo -e "  ${YELLOW}Buscando 'arr' (arroz)...${NC}"
SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/foods/search?q=arr")
echo "Response: $SEARCH_RESPONSE"
COUNT=$(echo "$SEARCH_RESPONSE" | grep -o "arroz" | wc -l)
if [ $COUNT -gt 0 ]; then
    echo -e "  ${GREEN}✓ Encontrou alimentos com 'arr'${NC}"
else
    echo -e "  ${YELLOW}⚠ Nenhum alimento encontrado (pode ser esperado se DB vazio)${NC}"
fi
echo ""

echo -e "${GREEN}✓ Testes concluídos!${NC}"
echo -e "\n${YELLOW}Próximos passos:${NC}"
echo "1. Abra o Dashboard > Dieta"
echo "2. Clique em 'Adicionar Alimento'"
echo "3. Digite o nome de um alimento (ex: 'frango', 'banana', 'arroz')"
echo "4. Selecione um da lista"
echo "5. As macros devem ser preenchidas automaticamente"
