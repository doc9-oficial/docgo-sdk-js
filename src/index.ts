import * as fs from "fs";
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
  parameters: ParameterDef[];
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
  variables: Record<string, string>;
  mcp?: {
    enabled: boolean;
    tools: MCPToolDefinition[];
  };
}

export class DocGoLib {
  private manifestPath: string | undefined;
  private functionName: string | undefined;
  private params: any[];
  private _manifest: Manifest | null = null;

  constructor() {
    this.manifestPath = process.env.DOCGO_MANIFEST_PATH;
    this.functionName = process.env.DOCGO_FUNCTION;
    this.params = JSON.parse(process.env.DOCGO_PARAMS || "[]");
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

  // Obtém variável do manifest
  getVariable(key: string): string | null {
    if (this.manifest?.variables) {
      return this.manifest.variables[key];
    }
    return null;
  }

  // Obtém todas as variáveis
  getAllVariables(): Record<string, string> {
    return this.manifest?.variables || {};
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

    const required = func.parameters.filter((p) => p.required);
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
    if (func?.parameters) {
      const index = func.parameters.findIndex((p) => p.name === indexOrName);
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

  // Acesso a variáveis de ambiente
  getEnv(key: string, defaultValue: string | null = null): string | null {
    return process.env[key] || defaultValue;
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

  // Obtém definição MCP da função
  getMCPDefinition(): MCPToolDefinition | null {
    const func = this.getCurrentFunction();
    return func?.mcp || null;
  }
}

// Export singleton instance + named exports das entidades
export * from "./entities";
const singleton = new DocGoLib();
export default singleton;
