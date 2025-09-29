# Validador de Manifest DocGo

Este validador verifica se o arquivo `manifest.json` está seguindo a estrutura correta para aplicações DocGo.

## 🚀 Uso Rápido

### Opção 1: Script Shell (Recomendado)

```bash
./validate.sh
```

### Opção 2: TypeScript Direto

```bash
npx ts-node validate-manifest.ts
```

### Opção 3: Validar arquivo específico

```bash
./validate.sh /caminho/para/outro/manifest.json
```

## 📋 O que é Validado

### Estrutura Básica

- ✅ Campos obrigatórios: `name`, `version`, `description`, `functions`, `config`, `mcp`
- ✅ Tipos de dados corretos para cada campo
- ✅ Estrutura de objeto válida

### Funções

- ✅ Cada função tem: `script`, `description`, `category`, `params`
- ✅ Nomes de funções são dinâmicos (única parte flexível)
- ✅ Scripts apontam para arquivos `.js` na pasta `dist/`

### Parâmetros

- ✅ Cada parâmetro tem: `name`, `type`, `required`, `description`, `form`
- ✅ Tipos válidos: `string`, `number`, `boolean`, `object`, `array`
- ✅ Campo `required` é boolean

### Campos de Formulário

- ✅ Tipos válidos: `text`, `password`, `textarea`, `code`, `number`, `switch`, `select`, `segmented`, `radio`, `kv-list`
- ✅ Campo `label` obrigatório
- ✅ Para campos `select`/`segmented`/`radio`: array `options` obrigatório
- ✅ Para campo `code`: `language` deve ser `json` ou `text`
- ✅ Para campo `number`: `min`, `max`, `step` devem ser números
- ✅ Para campo `textarea`: `rows` deve ser número

### Configuração

- ✅ `timeout`: número positivo
- ✅ `max_retries`: número não negativo
- ✅ `cache_ttl`: número positivo

## 🎯 Exemplo de Saída

### ✅ Manifest Válido

```
🔍 Validando manifest: ./manifest.json
──────────────────────────────────────────────────
✅ Manifest válido!
📋 Nome: jusbr
📦 Versão: 2.0.0
🔧 Funções: 2
📝 Parâmetros totais: 7
✅ Validação concluída!
```

### ❌ Manifest Inválido

```
🔍 Validando manifest: ./manifest.json
──────────────────────────────────────────────────
❌ Manifest inválido!

🚨 Erros encontrados:
  1. Função 'buscarProcesso': campo 'script' é obrigatório
  2. Parâmetro 'numeroProcesso': campo 'label' é obrigatório e deve ser string
  3. Parâmetro 'tribunal': campo 'options' é obrigatório para tipo 'select'
```

## 🔧 Requisitos

- Node.js (para executar TypeScript)
- npm/npx (para compilar e executar)

## 📁 Arquivos

- `validate-manifest.ts` - Validador principal em TypeScript
- `validate.sh` - Script shell para execução fácil
- `VALIDATOR.md` - Esta documentação

## 🛠️ Desenvolvimento

Para modificar o validador:

1. Edite `validate-manifest.ts`
2. Execute `./validate.sh` para testar
3. O script compila automaticamente o TypeScript

## 📝 Notas

- Apenas os **nomes das funções** dentro de `functions` são dinâmicos
- Todos os outros campos seguem uma estrutura fixa
- O validador é rigoroso e não permite campos extras não documentados
- Campos opcionais devem estar presentes mas podem ter valores `null` ou `undefined`
