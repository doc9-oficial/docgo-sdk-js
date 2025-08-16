// Entidades base para o sistema DocGo

export interface Processo {
  numero: string;
  tribunal: string;
  vara: string;
  classe: string;
  assunto: string;
  dataDistribuicao: Date;
  valorCausa: number;
  status: StatusProcesso;
  partes: Parte[];
  movimentacoes: Movimentacao[];
}

export interface Advogado {
  id: string;
  nome: string;
  oab: string;
  estado: string;
  email: string;
  telefone: string;
  especialidades: string[];
}

export interface Cliente {
  id: string;
  nome: string;
  tipoDocumento: "CPF" | "CNPJ";
  documento: string;
  email: string;
  telefone: string;
  endereco: Endereco;
  processos: string[]; // IDs dos processos
}

export interface Parte {
  tipo: "autor" | "reu" | "terceiro";
  nome: string;
  documento: string;
  advogados: Advogado[];
}

export interface Movimentacao {
  data: Date;
  descricao: string;
  tipo: string;
  documentos: Documento[];
}

export interface Documento {
  id: string;
  nome: string;
  tipo: string;
  dataUpload: Date;
  tamanho: number;
  hash: string;
  conteudo?: string;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Peticao {
  tipo: string;
  processo: Processo;
  titulo: string;
  conteudo: string;
  anexos: Documento[];
  advogado: Advogado;
  dataCriacao: Date;
}

export enum StatusProcesso {
  ATIVO = "ATIVO",
  SUSPENSO = "SUSPENSO",
  ARQUIVADO = "ARQUIVADO",
  BAIXADO = "BAIXADO",
  EM_GRAU_RECURSO = "EM_GRAU_RECURSO",
}

// Tipos de retorno para as funções
export interface ResultadoBusca<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  timestamp: Date;
}

export interface ResultadoPeticao {
  sucesso: boolean;
  protocolo?: string;
  dataProtocolo?: Date;
  erro?: string;
}
