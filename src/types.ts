import type { LucideIcon } from "lucide-react";

export type FiscalStatus = "NAO_EMITIDA" | "ENVIANDO" | "AUTORIZADA" | "REJEITADA" | "CANCELADA" | "CONTINGENCIA";
export type PaymentMethod = "Dinheiro" | "Pix" | "Cartão de débito" | "Cartão de crédito" | "Outros";

export type ModuleId =
  | "dashboard"
  | "superadmin"
  | "pdv"
  | "produtos"
  | "estoque"
  | "clientes"
  | "nfce"
  | "relatorios"
  | "fiscal"
  | "empresa"
  | "usuarios"
  | "gerais";

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
}

export interface Product {
  id: string;
  codigo: string;
  codigoBarras: string;
  descricao: string;
  categoria: string;
  marca: string;
  precoCusto: number;
  precoVenda: number;
  margem: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: string;
  ncm: string;
  cest?: string;
  cfop: string;
  origem: string;
  csosn?: string;
  cst?: string;
  aliquotaIcms?: number;
  ativo: boolean;
}

export interface CartItem {
  product: Product;
  quantidade: number;
  desconto: number;
}

export interface FiscalDocument {
  id: string;
  venda: string;
  data: string;
  cliente: string;
  cpf?: string;
  total: number;
  status: FiscalStatus;
  numero?: string;
  serie?: string;
  chave?: string;
  protocolo?: string;
  formaPagamento: PaymentMethod;
  motivo?: string;
}
