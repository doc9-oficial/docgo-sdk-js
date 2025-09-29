#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

// Interfaces para validação do manifest
interface FormField {
  type:
    | "text"
    | "password"
    | "textarea"
    | "code"
    | "number"
    | "switch"
    | "select"
    | "segmented"
    | "radio"
    | "kv-list";
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  language?: "json" | "text";
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: (string | { label: string; value: string })[];
  if?: Record<string, unknown>;
  submit?: boolean;
}

interface Param {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  form: FormField;
}

interface Function {
  script: string;
  description: string;
  category: string;
  params: Param[];
}

interface Config {
  timeout: number;
  max_retries: number;
  cache_ttl: number;
}

interface Manifest {
  name: string;
  version: string;
  description: string;
  functions: Record<string, Function>;
  config: Config;
  mcp: boolean;
}

// Validação de tipos de campo de formulário
const validFormTypes = [
  "text",
  "password",
  "textarea",
  "code",
  "number",
  "switch",
  "select",
  "segmented",
  "radio",
  "kv-list",
];

const validLanguages = ["json", "text"];

// Função para validar um campo de formulário
function validateFormField(field: FormField, paramName: string): string[] {
  const errors: string[] = [];

  // Validar tipo
  if (!validFormTypes.includes(field.type)) {
    errors.push(
      `Parâmetro '${paramName}': tipo de formulário inválido '${field.type}'`
    );
  }

  // Validar label obrigatório
  if (!field.label || typeof field.label !== "string") {
    errors.push(
      `Parâmetro '${paramName}': campo 'label' é obrigatório e deve ser string`
    );
  }

  // Validar campos específicos por tipo
  if (
    field.type === "select" ||
    field.type === "segmented" ||
    field.type === "radio"
  ) {
    if (!field.options || !Array.isArray(field.options)) {
      errors.push(
        `Parâmetro '${paramName}': campo 'options' é obrigatório para tipo '${field.type}'`
      );
    } else {
      field.options.forEach((option, index) => {
        if (typeof option === "string") return;
        if (typeof option === "object" && option !== null) {
          if (!option.label || !option.value) {
            errors.push(
              `Parâmetro '${paramName}': opção ${index} deve ter 'label' e 'value'`
            );
          }
        } else {
          errors.push(
            `Parâmetro '${paramName}': opção ${index} deve ser string ou objeto com label/value`
          );
        }
      });
    }
  }

  // Validar language para campos code
  if (
    field.type === "code" &&
    field.language &&
    !validLanguages.includes(field.language)
  ) {
    errors.push(
      `Parâmetro '${paramName}': language inválido '${field.language}' para tipo code`
    );
  }

  // Validar campos numéricos
  if (field.type === "number") {
    if (field.min !== undefined && typeof field.min !== "number") {
      errors.push(`Parâmetro '${paramName}': campo 'min' deve ser número`);
    }
    if (field.max !== undefined && typeof field.max !== "number") {
      errors.push(`Parâmetro '${paramName}': campo 'max' deve ser número`);
    }
    if (field.step !== undefined && typeof field.step !== "number") {
      errors.push(`Parâmetro '${paramName}': campo 'step' deve ser número`);
    }
  }

  // Validar rows para textarea
  if (
    field.type === "textarea" &&
    field.rows !== undefined &&
    typeof field.rows !== "number"
  ) {
    errors.push(`Parâmetro '${paramName}': campo 'rows' deve ser número`);
  }

  return errors;
}

// Função para validar um parâmetro
function validateParam(param: Param, functionName: string): string[] {
  const errors: string[] = [];

  // Validar campos obrigatórios
  if (!param.name || typeof param.name !== "string") {
    errors.push(`Função '${functionName}': campo 'name' é obrigatório`);
  }

  if (!param.type || typeof param.type !== "string") {
    errors.push(`Função '${functionName}': campo 'type' é obrigatório`);
  }

  if (typeof param.required !== "boolean") {
    errors.push(
      `Função '${functionName}': campo 'required' é obrigatório e deve ser boolean`
    );
  }

  if (!param.description || typeof param.description !== "string") {
    errors.push(`Função '${functionName}': campo 'description' é obrigatório`);
  }

  if (!param.form || typeof param.form !== "object") {
    errors.push(`Função '${functionName}': campo 'form' é obrigatório`);
  } else {
    errors.push(
      ...validateFormField(param.form, `${functionName}.${param.name}`)
    );
  }

  return errors;
}

// Função para validar uma função
function validateFunction(func: Function, functionName: string): string[] {
  const errors: string[] = [];

  // Validar campos obrigatórios
  if (!func.script || typeof func.script !== "string") {
    errors.push(`Função '${functionName}': campo 'script' é obrigatório`);
  }

  if (!func.description || typeof func.description !== "string") {
    errors.push(`Função '${functionName}': campo 'description' é obrigatório`);
  }

  if (!func.category || typeof func.category !== "string") {
    errors.push(`Função '${functionName}': campo 'category' é obrigatório`);
  }

  if (!func.params || !Array.isArray(func.params)) {
    errors.push(
      `Função '${functionName}': campo 'params' é obrigatório e deve ser array`
    );
  } else {
    func.params.forEach((param, index) => {
      errors.push(...validateParam(param, `${functionName}.params[${index}]`));
    });
  }

  return errors;
}

// Função para validar configuração
function validateConfig(config: Config): string[] {
  const errors: string[] = [];

  if (typeof config.timeout !== "number" || config.timeout <= 0) {
    errors.push("Config: campo 'timeout' deve ser um número positivo");
  }

  if (typeof config.max_retries !== "number" || config.max_retries < 0) {
    errors.push("Config: campo 'max_retries' deve ser um número não negativo");
  }

  if (typeof config.cache_ttl !== "number" || config.cache_ttl <= 0) {
    errors.push("Config: campo 'cache_ttl' deve ser um número positivo");
  }

  return errors;
}

// Função principal de validação
function validateManifest(manifest: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validar estrutura básica
  if (!manifest || typeof manifest !== "object") {
    return {
      isValid: false,
      errors: ["Manifest deve ser um objeto JSON válido"],
    };
  }

  // Validar campos obrigatórios do manifest
  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("Campo 'name' é obrigatório");
  }

  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("Campo 'version' é obrigatório");
  }

  if (!manifest.description || typeof manifest.description !== "string") {
    errors.push("Campo 'description' é obrigatório");
  }

  if (!manifest.functions || typeof manifest.functions !== "object") {
    errors.push("Campo 'functions' é obrigatório e deve ser um objeto");
  } else {
    // Validar cada função
    Object.entries(manifest.functions).forEach(([functionName, func]) => {
      errors.push(...validateFunction(func as Function, functionName));
    });
  }

  if (!manifest.config || typeof manifest.config !== "object") {
    errors.push("Campo 'config' é obrigatório");
  } else {
    errors.push(...validateConfig(manifest.config));
  }

  if (typeof manifest.mcp !== "boolean") {
    errors.push("Campo 'mcp' é obrigatório e deve ser boolean");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Função para executar validação
function main() {
  const manifestPath = process.argv[2] || "./manifest.json";

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Arquivo não encontrado: ${manifestPath}`);
    process.exit(1);
  }

  try {
    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent);

    console.log(`🔍 Validando manifest: ${manifestPath}`);
    console.log("─".repeat(50));

    const result = validateManifest(manifest);

    if (result.isValid) {
      console.log("✅ Manifest válido!");
      console.log(`📋 Nome: ${manifest.name}`);
      console.log(`📦 Versão: ${manifest.version}`);
      console.log(`🔧 Funções: ${Object.keys(manifest.functions).length}`);
      console.log(
        `📝 Parâmetros totais: ${Object.values(manifest.functions).reduce(
          (total, func: any) => total + func.params.length,
          0
        )}`
      );
    } else {
      console.log("❌ Manifest inválido!");
      console.log("\n🚨 Erros encontrados:");
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Erro ao processar manifest:", error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export {
  validateManifest,
  validateFormField,
  validateParam,
  validateFunction,
  validateConfig,
};
