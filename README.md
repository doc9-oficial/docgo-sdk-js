# docgo-sdk (JavaScript/TypeScript)

SDK utilizado pelos apps DocGo para:

- Carregar e interpretar o `manifest.json` (quando executado via executor ou diretamente).
- Validar parâmetros com base na função atual.
- Acessar variáveis (`manifest.variables`, ENV).
- Logging padronizado JSON.
- Chamar outras funções via MCP.
- Auto-descoberta de manifest e função ao rodar scripts diretamente (`node dist/minhaFuncao.js`).
- Auto-carregamento de `.env` (caminhos: cwd, diretório do script, pai do diretório do script).

## Instalação

```
npm install docgo-sdk@github:doc9-oficial/docgo-sdk-js
```

(Em desenvolvimento local: usar `"docgo-sdk": "file:../sdk-js"` em um app.)

## Uso Básico

```ts
import docgo from "docgo-sdk";

// Parâmetros
const p0 = docgo.getParam(0);
const named = docgo.getParam("numeroProcesso");

// Validação
const v = docgo.validateParams();
if (!v.valid) {
  console.log(docgo.result(false, null, v.error));
  process.exit(1);
}

// Logging
docgo.info("Mensagem", { contexto: 123 });

// Resultado final
console.log(docgo.result(true, { ok: true }));
```

## Execução Direta Sem Executor

Se você rodar:

```
node dist/buscarProcesso.js 00000000000000000000
```

O SDK tentará:

1. Inferir `DOCGO_FUNCTION` = nome do arquivo (`buscarProcesso`).
2. Localizar `manifest.json` subindo diretórios até 5 níveis.
3. Carregar `.env`.
4. Preencher `DOCGO_PARAMS` com argumentos da CLI.

## Variáveis Especiais

| Variável              | Descrição                                                                              |
| --------------------- | -------------------------------------------------------------------------------------- |
| `DOCGO_MANIFEST_PATH` | Caminho do manifest (força override da descoberta automática)                          |
| `DOCGO_FUNCTION`      | Nome da função atual                                                                   |
| `DOCGO_PARAMS`        | JSON array com parâmetros                                                              |
| `DOCGO_DEBUG`         | Quando `1`, habilita logs de debug (manifest encontrado, função inferida, falhas HTTP) |

## Chamar Outro App via MCP

```ts
await docgo.callApp("jusbr", "buscarProcesso", ["00000000000000000000"]);
```

Requer MCP server ativo.

## Headers/Env Customizados

Para APIs externas defina em `.env` ou config:

```
API_BASE_URL=https://minha.api
API_HEADERS={"Authorization":"Bearer abc"}
```

## Desenvolvimento do SDK

Compilar:

```
npm run build
```

Limpar:

```
npm run clean
```

## Roadmap

- Tipagem mais forte para manifest (geração automática de d.ts).
- Cache de manifest em memória compartilhada.
- Suporte a streaming de logs estruturados.

## Licença

MIT (ver LICENSE na raiz do monorepo).
