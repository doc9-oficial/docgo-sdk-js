#!/bin/bash

# Script para validar manifest.json
# Uso: ./validate.sh [caminho-do-manifest]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Validador de Manifest DocGo${NC}"
echo "=================================="

# Verificar se TypeScript está instalado
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Node.js/npm não encontrado. Instale Node.js primeiro.${NC}"
    exit 1
fi

# Verificar se o arquivo TypeScript existe
if [ ! -f "validate-manifest.ts" ]; then
    echo -e "${RED}❌ Arquivo validate-manifest.ts não encontrado${NC}"
    exit 1
fi

# Compilar TypeScript
echo -e "${YELLOW}📦 Compilando validador...${NC}"
npx tsc validate-manifest.ts --target es2020 --module commonjs --esModuleInterop --skipLibCheck

# Executar validação
echo -e "${YELLOW}🔍 Executando validação...${NC}"
node validate-manifest.js "${1:-./manifest.json}"

# Limpar arquivo compilado
rm -f validate-manifest.js

echo -e "${GREEN}✅ Validação concluída!${NC}"
