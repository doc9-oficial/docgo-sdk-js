import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
// Fallback para fetch em Node < 18
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchFn: any = (globalThis as any).fetch || require("node-fetch");

// Interface para o Manifest com suporte MCP
interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface FunctionDef {
  script: string;
  description: string;
  params: ParameterDef[];
  mcp?: MCPToolDefinition;
}

interface ParameterDef {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface Manifest {
  name: string;
  version: string;
  description: string;
  functions: Record<string, FunctionDef>;
  config?: Record<string, any>;
  mcp?: boolean;
}

interface ConfigEnvVar {
  name: string;
  value: string;
}

interface ConfigApp {
  name: string;
  env?: ConfigEnvVar[];
}

interface ConfigFile {
  apps?: ConfigApp[];
}

export class DocGoLib {
  private manifestPath: string | undefined;
  private functionName: string | undefined;
  private params: any[];
  private _manifest: Manifest | null = null;
  private _config: ConfigFile | null = null;

  constructor() {
    // 1. Carregar .env (raiz/projeto e diretório atual) se ainda não carregado
    this.loadDotEnv();

    // 2. Descobrir manifest.json se não fornecido
    this.manifestPath = process.env.DOCGO_MANIFEST_PATH || this.findManifest();
    if (process.env.DOCGO_DEBUG === "1") {
      console.log(
        `[docgo-sdk][debug] manifestPath=${this.manifestPath || "NOT_FOUND"}`
      );
    }
    if (this.manifestPath) {
      process.env.DOCGO_MANIFEST_PATH = this.manifestPath;
    }

    // 3. Inferir função pelo nome do arquivo (ex: dist/buscarProcesso.js -> buscarProcesso)
    this.functionName = process.env.DOCGO_FUNCTION || this.inferFunctionName();
    if (process.env.DOCGO_DEBUG === "1") {
      console.log(
        `[docgo-sdk][debug] functionName=${this.functionName || "NOT_INFERRED"}`
      );
    }
    if (this.functionName) {
      process.env.DOCGO_FUNCTION = this.functionName;
    }

    // 4. Parâmetros CLI se não definidos
    if (!process.env.DOCGO_PARAMS) {
      const cliArgs = process.argv.slice(2); // ignora node + script
      process.env.DOCGO_PARAMS = JSON.stringify(cliArgs);
    }
    this.params = JSON.parse(process.env.DOCGO_PARAMS || "[]");
  }

  private loadDotEnv(): void {
    if (process.env.DOCGO_ENV_LOADED) return;
    const candidates: string[] = [];
    try {
      const cwd = process.cwd();
      candidates.push(path.join(cwd, ".env"));
      // Diretório do script principal
      const mainFile = require.main?.filename;
      if (mainFile) {
        const dir = path.dirname(mainFile);
        candidates.push(path.join(dir, ".env"));
        // Um nível acima (caso dist/)
        candidates.push(path.join(path.dirname(dir), ".env"));
      }
    } catch (_) {
      /* ignore */
    }
    for (const f of candidates) {
      if (f && fs.existsSync(f)) {
        try {
          const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
          for (const line of lines) {
            const l = line.trim();
            if (!l || l.startsWith("#") || !l.includes("=")) continue;
            const [k, ...rest] = l.split("=");
            const v = rest.join("=");
            if (!process.env[k]) process.env[k] = v;
          }
        } catch (_) {
          /* ignore */
        }
      }
    }
    process.env.DOCGO_ENV_LOADED = "1";
  }

  private findManifest(): string | undefined {
    // Sobe diretórios a partir do script principal procurando manifest.json
    const tried = new Set<string>();
    const add = (p: string) => {
      if (p) tried.add(p);
    };
    const mainFile = require.main?.filename;
    const startDirs: string[] = [];
    if (mainFile) startDirs.push(path.dirname(mainFile));
    startDirs.push(process.cwd());
    for (const dir of startDirs) {
      let current = dir;
      for (let i = 0; i < 5; i++) {
        // limite de subida
        const candidate = path.join(current, "manifest.json");
        add(candidate);
        if (fs.existsSync(candidate)) return candidate;
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
    return undefined;
  }

  private inferFunctionName(): string | undefined {
    const mainFile = require.main?.filename;
    if (!mainFile) return undefined;
    const base = path.basename(mainFile);
    const name = base.replace(/\.[jt]s$/, "");
    return name || undefined;
  }

  // Carrega o manifest
  get manifest(): Manifest | null {
    if (!this._manifest && this.manifestPath) {
      try {
        const data = fs.readFileSync(this.manifestPath, "utf8");
        this._manifest = JSON.parse(data);
      } catch (error) {
        console.error("Error loading manifest:", error);
      }
    }
    return this._manifest;
  }

  // Carrega o config.yml
  get config(): ConfigFile | null {
    if (!this._config) {
      try {
        // Procurar config.yml no diretório do executável (bin/)
        const configPath = this.findConfigFile();
        if (configPath) {
          const data = fs.readFileSync(configPath, "utf8");
          this._config = yaml.load(data) as ConfigFile;
          if (process.env.DOCGO_DEBUG === "1") {
            console.log(`[docgo-sdk][debug] config loaded from:`, configPath);
            console.log(`[docgo-sdk][debug] config content:`, this._config);
          }
        }
      } catch (error) {
        if (process.env.DOCGO_DEBUG === "1") {
          console.log(`[docgo-sdk][debug] config not found or error:`, error);
        }
      }
    }
    return this._config;
  }

  // Procura o arquivo config.yml
  private findConfigFile(): string | undefined {
    // 1. Tentar no diretório do executável (bin/)
    const execPath = process.env.DOCGO_EXEC_PATH || process.argv[0];
    if (execPath) {
      const execDir = path.dirname(execPath);
      const configPath = path.join(execDir, "config.yml");
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    // 2. Tentar no diretório atual
    const currentConfig = path.join(process.cwd(), "config.yml");
    if (fs.existsSync(currentConfig)) {
      return currentConfig;
    }

    // 3. Tentar no diretório do manifest
    if (this.manifestPath) {
      const manifestDir = path.dirname(this.manifestPath);
      const configPath = path.join(manifestDir, "config.yml");
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return undefined;
  }

  // Obtém variável do manifest
  getVariable(key: string): string | null {
    if (this.manifest?.config && this.manifest.config[key] !== undefined) {
      return String(this.manifest.config[key]);
    }
    return null;
  }

  // Obtém todas as variáveis
  getAllVariables(): Record<string, string> {
    const result: Record<string, string> = {};

    if (this.manifest?.config) {
      for (const [key, value] of Object.entries(this.manifest.config)) {
        result[key] = String(value);
      }
    }

    return result;
  }

  // Obtém configuração da função atual
  getCurrentFunction(): FunctionDef | null {
    if (this.manifest?.functions && this.functionName) {
      return this.manifest.functions[this.functionName];
    }
    return null;
  }

  // Valida parâmetros da função
  validateParams(): { valid: boolean; error?: string } {
    const func = this.getCurrentFunction();
    if (!func) return { valid: false, error: "Function not found" };

    const parameters = func.params || [];
    const required = parameters.filter((p) => p.required);

    if (this.params.length < required.length) {
      return {
        valid: false,
        error: `Missing required parameters. Expected at least ${required.length}, got ${this.params.length}`,
      };
    }

    return { valid: true };
  }

  // Obtém parâmetro por índice ou nome
  getParam(indexOrName: number | string): any {
    if (typeof indexOrName === "number") {
      return this.params[indexOrName];
    }

    const func = this.getCurrentFunction();
    if (func) {
      const parameters = func.params || [];
      const index = parameters.findIndex((p) => p.name === indexOrName);
      return index >= 0 ? this.params[index] : undefined;
    }

    return undefined;
  }

  // Parsing de entidades com tipagem
  parseEntity<T>(type: string, data: any): T {
    try {
      if (typeof data === "string") {
        data = JSON.parse(data);
      }
      return data as T;
    } catch (error: any) {
      throw new Error(
        `Failed to parse entity of type ${type}: ${error.message}`
      );
    }
  }

  // Logger padronizado
  log(level: string, message: string, data: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      data,
    };
    console.log(JSON.stringify(logEntry));
  }

  // Métodos de conveniência para logging
  info(message: string, data?: any): void {
    this.log("INFO", message, data);
  }
  error(message: string, data?: any): void {
    this.log("ERROR", message, data);
  }
  debug(message: string, data?: any): void {
    this.log("DEBUG", message, data);
  }

  // Retorna resultado padronizado
  result(
    success: boolean,
    data: any = null,
    error: string | null = null
  ): string {
    const result: any = {
      success,
      timestamp: new Date().toISOString(),
      function: this.functionName,
    };

    if (data !== null) result.data = data;
    if (error !== null) result.error = error;

    return JSON.stringify(result, null, 2);
  }

  // Acesso a variáveis de ambiente com resolução hierárquica
  getEnv(key: string, defaultValue: string | null = null): string | null {
    // 1. Verificar config.yml primeiro
    const configValue = this.getConfigValue(key);
    if (configValue !== null) {
      return configValue;
    }

    // 2. Fallback para variável de ambiente direta
    return process.env[key] || defaultValue;
  }

  // Obtém valor do config.yml com resolução de referências
  private getConfigValue(key: string): string | null {
    const config = this.config;
    if (!config?.apps) {
      return null;
    }

    // Encontrar o app atual
    const appName = this.manifest?.name;
    if (!appName) {
      return null;
    }

    const app = config.apps.find((a) => a.name === appName);
    if (!app?.env) {
      return null;
    }

    // Encontrar a variável no config do app
    const envVar = app.env.find((e) => e.name === key);
    if (!envVar) {
      return null;
    }

    // Se o valor começa com $, é uma referência a uma env
    if (envVar.value.startsWith("$")) {
      const envKey = envVar.value.substring(1);
      return process.env[envKey] || null;
    }

    // Caso contrário, é um valor direto
    return envVar.value;
  }

  // Helpers para trabalhar com APIs externas
  async callAPI(endpoint: string, options: any = {}): Promise<any> {
    const baseURL =
      this.getVariable("api_base_url") || this.getEnv("API_BASE_URL");
    if (!baseURL) {
      throw new Error("API base URL not configured");
    }

    const url = `${baseURL}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
      ...JSON.parse(this.getEnv("API_HEADERS") || "{}"),
    };

    const response = await fetchFn(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Chama outro app via MCP
  async callApp(
    appName: string,
    functionName: string,
    params: any[]
  ): Promise<any> {
    const mcpPort = this.getEnv("MCP_PORT") || "9000";
    const url = `http://localhost:${mcpPort}/mcp/execute`;

    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app: appName,
        function: functionName,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP call failed: ${response.status}`);
    }

    return response.json();
  }

  // Obtém definição MCP da função (gera automaticamente se não existir)
  getMCPDefinition(): MCPToolDefinition | null {
    const func = this.getCurrentFunction();
    if (!func) return null;

    // Se já existe definição MCP, retorna ela
    if (func.mcp) return func.mcp;

    // Gera automaticamente a partir dos parâmetros
    const parameters = func.params || [];
    if (parameters.length === 0) return null;

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const param of parameters) {
      let schemaType: any;

      // Converter tipos simplificados para JSON Schema
      if (param.type.endsWith("[]")) {
        const baseType = param.type.slice(0, -2);
        schemaType = {
          type: "array",
          items: { type: this.mapTypeToJsonSchema(baseType) },
        };
      } else {
        schemaType = this.mapTypeToJsonSchema(param.type);
      }

      properties[param.name] = {
        type: schemaType,
        description: param.description,
      };

      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      name: this.functionName || "unknown_function",
      description: func.description,
      inputSchema: {
        type: "object",
        properties,
        required,
      },
    };
  }

  // Mapeia tipos simplificados para JSON Schema
  private mapTypeToJsonSchema(type: string): string {
    switch (type) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      default:
        return "string";
    }
  }
}

// Export singleton instance + named exports das entidades
export * from "./entities";
const singleton = new DocGoLib();
export default singleton;
