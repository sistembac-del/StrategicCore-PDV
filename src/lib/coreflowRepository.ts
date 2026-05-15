import { supabase } from "./supabase";
import type { CartItem, FiscalDocument, FiscalStatus, PaymentMethod, Product } from "../types";

export interface CompanyContext {
  empresaId: string;
  perfil: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  regimeTributario: string;
  uf: string;
  municipio: string;
  endereco?: string;
  ativo: boolean;
  createdAt?: string;
  license?: CompanyLicenseStatus;
  domains?: CompanyDomain[];
}

export interface CompanyDomain {
  id: string;
  dominio: string;
  status: string;
  observacao?: string;
  createdAt: string;
}

export interface DomainResolution {
  empresaId: string;
  dominio: string;
  status: string;
  nomeFantasia: string;
  razaoSocial: string;
}

export interface RemoteAppData {
  company: CompanyContext | null;
  superAdmin: SuperAdminProfile | null;
  products: Product[];
  documents: FiscalDocument[];
  sales: SaleRecord[];
}

export interface CompanyLicenseStatus {
  id: string;
  planoNome: string;
  planoCodigo: string;
  status: "teste" | "ativo" | "vencido" | "bloqueado" | "cancelado";
  operacional: boolean;
  fimTeste?: string;
  vencimento?: string;
  limiteUsuarios: number;
  limiteProdutos: number;
  usuariosAtivos: number;
  produtosAtivos: number;
  bloqueioMotivo?: string;
  observacao?: string;
}

export interface SuperAdminProfile {
  nome: string;
  cargo: string;
  role: "owner" | "admin" | "support" | "auditor";
}

export interface SuperAdminCompanySummary {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  uf: string;
  municipio: string;
  ativo: boolean;
  totalUsuarios: number;
  totalProdutos: number;
  totalVendas: number;
  faturamentoTotal: number;
  nfceAutorizadas: number;
  nfceRejeitadas: number;
}

export interface SuperAdminUserLink {
  id: string;
  empresaId: string;
  perfil: string;
  ativo: boolean;
  empresaNome: string;
  userId: string;
}

export interface SaaSPlan {
  id: string;
  codigo: string;
  nome: string;
  precoMensal: number;
  limiteUsuarios: number;
  limiteProdutos: number;
  limiteEmpresas: number;
  ativo: boolean;
}

export interface CompanyLicense {
  id: string;
  empresaId: string;
  empresaNome: string;
  cnpj: string;
  planoId: string;
  planoNome: string;
  planoCodigo: string;
  precoMensal: number;
  status: "teste" | "ativo" | "vencido" | "bloqueado" | "cancelado";
  inicioTeste?: string;
  fimTeste?: string;
  vencimento?: string;
  limiteUsuarios: number;
  limiteProdutos: number;
  usuariosAtivos: number;
  produtosAtivos: number;
  observacao?: string;
  bloqueioMotivo?: string;
  updatedAt?: string;
}

export interface BillingInvoice {
  id: string;
  empresaId: string;
  empresaNome: string;
  cnpj: string;
  licencaId: string;
  planoNome?: string;
  competencia: string;
  valor: number;
  vencimento: string;
  pagoEm?: string;
  status: "aberta" | "paga" | "vencida" | "cancelada" | "estornada";
  formaPagamento?: string;
  referenciaExterna?: string;
  observacao?: string;
}

export interface CompanyUserLink {
  id: string;
  userId: string;
  perfil: string;
  ativo: boolean;
  createdAt: string;
}

export interface SaleItemRecord {
  id: string;
  produtoId?: string;
  codigo: string;
  codigoBarras?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  total: number;
  ncm?: string;
  cfop?: string;
  csosn?: string;
  cst?: string;
}

export interface SaleRecord {
  id: string;
  numero: string;
  data: string;
  createdAt: string;
  usuarioId: string;
  clienteCpf?: string;
  subtotal: number;
  descontoTotal: number;
  total: number;
  formaPagamento: PaymentMethod;
  statusVenda: string;
  statusFiscal: FiscalStatus;
  estoqueBaixado: boolean;
  canceladoEm?: string;
  motivoCancelamento?: string;
  documentoStatus?: FiscalStatus;
  documentoChave?: string;
  itens: SaleItemRecord[];
}

export interface ProductInput {
  empresaId: string;
  codigo: string;
  codigoBarras?: string;
  descricao: string;
  categoria?: string;
  marca?: string;
  precoCusto: number;
  precoVenda: number;
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
  unidadeComercialFiscal: string;
}

export interface Customer {
  id: string;
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
}

export interface CustomerInput extends Omit<Customer, "id"> {
  empresaId: string;
}

export interface StockMovement {
  id: string;
  produtoId: string;
  produtoDescricao: string;
  tipo: string;
  quantidade: number;
  estoqueAnterior: number;
  estoquePosterior: number;
  valorUnitario?: number;
  valorTotal?: number;
  documentoOrigem?: string;
  observacao?: string;
  createdAt: string;
}

export interface FiscalSettings {
  id?: string;
  empresaId: string;
  ambiente: "homologacao" | "producao";
  serieNfce: string;
  proximoNumeroNfce: number;
  certificadoConfigurado: boolean;
  cscConfigurado: boolean;
  ativo: boolean;
  updatedAt?: string;
}

export interface FiscalApiStatus {
  provider: string;
  configured: boolean;
  baseUrlConfigured: boolean;
  apiKeyConfigured: boolean;
  baseUrlHost?: string;
  authHeader: string;
  endpoints: {
    emitir: string;
    cancelar: string;
    consultar: string;
  };
  timeoutMs: number;
  healthCheckConfigured: boolean;
  healthCheckOk?: boolean;
  healthCheckStatus?: number;
}

export interface GeneralSettings {
  id?: string;
  empresaId: string;
  permitirEstoqueNegativo: boolean;
  casasDecimaisQuantidade: number;
  impressaoAutomaticaNfce: boolean;
  reimpressaoDanfeAuditada: boolean;
  baixaEstoqueAoFinalizar: boolean;
  cancelamentoEstornaEstoque: boolean;
  exigirCpfAcimaDe?: number;
  pdvModoCompacto: boolean;
  observacao?: string;
  updatedAt?: string;
}

const fiscalStatusMap: Record<string, FiscalStatus> = {
  NAO_EMITIDA: "NAO_EMITIDA",
  ENVIANDO: "ENVIANDO",
  AUTORIZADA: "AUTORIZADA",
  REJEITADA: "REJEITADA",
  CANCELADA: "CANCELADA",
  CONTINGENCIA: "CONTINGENCIA"
};

const paymentToDb: Record<PaymentMethod, string> = {
  Dinheiro: "DINHEIRO",
  Pix: "PIX",
  "Cartão de débito": "CARTAO_DEBITO",
  "Cartão de crédito": "CARTAO_CREDITO",
  Outros: "OUTROS"
};

const paymentFromDb: Record<string, PaymentMethod> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
  OUTROS: "Outros"
};

export async function resolveCompanyDomain(hostname: string): Promise<DomainResolution | null> {
  if (!supabase) throw new Error("Supabase não configurado.");
  const normalized = hostname.toLowerCase().replace(/^www\./, "").split(":")[0];
  if (!normalized || normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".pages.dev")) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke<{ data?: DomainResolution | null }>("resolve-domain", {
    body: { hostname: normalized }
  });

  if (error) throw error;
  return data?.data ?? null;
}

export async function loadRemoteAppData(preferredEmpresaId?: string): Promise<RemoteAppData> {
  if (!supabase) throw new Error("Supabase não configurado.");

  let membershipQuery = supabase
    .from("usuarios_empresas")
    .select("empresa_id, perfil, empresas(razao_social, nome_fantasia, cnpj, inscricao_estadual, regime_tributario, uf, municipio, endereco, ativo, created_at)")
    .eq("ativo", true)
    .limit(1);

  if (preferredEmpresaId) {
    membershipQuery = membershipQuery.eq("empresa_id", preferredEmpresaId);
  }

  const { data: memberships, error: membershipError } = await membershipQuery;

  if (membershipError) throw membershipError;
  const membership = memberships?.[0];

  const superAdmin = await loadSuperAdminProfile();

  if (!membership) {
    return { company: null, superAdmin, products: [], documents: [], sales: [] };
  }

  const companyRow = Array.isArray(membership.empresas) ? membership.empresas[0] : membership.empresas;
  const company: CompanyContext = {
    empresaId: membership.empresa_id,
    perfil: membership.perfil,
    razaoSocial: companyRow?.razao_social ?? "Empresa sem razão social",
    nomeFantasia: companyRow?.nome_fantasia ?? "Empresa",
    cnpj: companyRow?.cnpj ?? "",
    inscricaoEstadual: companyRow?.inscricao_estadual ?? undefined,
    regimeTributario: companyRow?.regime_tributario ?? "",
    uf: companyRow?.uf ?? "",
    municipio: companyRow?.municipio ?? "",
    endereco: companyRow?.endereco?.texto ?? companyRow?.endereco?.logradouro ?? "",
    ativo: Boolean(companyRow?.ativo ?? true),
    createdAt: companyRow?.created_at ? new Date(companyRow.created_at).toLocaleString("pt-BR") : undefined
  };

  const [
    { data: licenseData, error: licenseError },
    { data: productsData, error: productsError },
    { data: documentsData, error: documentsError },
    { data: salesData, error: salesError },
    { data: domainsData, error: domainsError }
  ] = await Promise.all([
    supabase.from("empresa_licenca_atual").select("*").eq("empresa_id", company.empresaId).maybeSingle(),
    supabase.from("produtos").select("*").eq("empresa_id", company.empresaId).order("descricao"),
    supabase
      .from("documentos_fiscais")
      .select("*, vendas(cliente_cpf, total, forma_pagamento, created_at)")
      .eq("empresa_id", company.empresaId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("vendas")
      .select("*, venda_itens(*), documentos_fiscais(status, chave_acesso)")
      .eq("empresa_id", company.empresaId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("empresa_dominios")
      .select("id, dominio, status, observacao, created_at")
      .eq("empresa_id", company.empresaId)
      .order("created_at", { ascending: false })
  ]);

  if (licenseError) throw licenseError;
  if (productsError) throw productsError;
  if (documentsError) throw documentsError;
  if (salesError) throw salesError;
  if (domainsError && domainsError.code !== "42P01" && domainsError.code !== "PGRST205") throw domainsError;

  if (licenseData) {
    company.license = {
      id: licenseData.id,
      planoNome: licenseData.plano_nome,
      planoCodigo: licenseData.plano_codigo,
      status: licenseData.status,
      operacional: Boolean(licenseData.operacional),
      fimTeste: licenseData.fim_teste ?? undefined,
      vencimento: licenseData.vencimento ?? undefined,
      limiteUsuarios: Number(licenseData.limite_usuarios ?? 0),
      limiteProdutos: Number(licenseData.limite_produtos ?? 0),
      usuariosAtivos: Number(licenseData.usuarios_ativos ?? 0),
      produtosAtivos: Number(licenseData.produtos_ativos ?? 0),
      bloqueioMotivo: licenseData.bloqueio_motivo ?? undefined,
      observacao: licenseData.observacao ?? undefined
    };
  }

  company.domains = (domainsData ?? []).map((row: any) => ({
    id: row.id,
    dominio: row.dominio,
    status: row.status,
    observacao: row.observacao ?? undefined,
    createdAt: new Date(row.created_at).toLocaleString("pt-BR")
  }));

  return {
    company,
    superAdmin,
    products: (productsData ?? []).map(mapProduct),
    documents: (documentsData ?? []).map(mapFiscalDocument),
    sales: (salesData ?? []).map(mapSaleRecord)
  };
}

export async function loadSuperAdminProfile(): Promise<SuperAdminProfile | null> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("super_admins")
    .select("nome, cargo, role")
    .eq("user_id", userData.user.id)
    .eq("ativo", true)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw error;
  }

  return data as SuperAdminProfile | null;
}

export async function loadSuperAdminDashboard() {
  if (!supabase) throw new Error("Supabase não configurado.");

  const [
    { data: companies, error: companiesError },
    { data: users, error: usersError },
    { data: domains, error: domainsError },
    { data: plans, error: plansError },
    { data: licenses, error: licensesError },
    { data: invoices, error: invoicesError }
  ] =
    await Promise.all([
      supabase.from("super_admin_empresas_resumo").select("*").order("created_at", { ascending: false }),
      supabase.from("usuarios_empresas").select("id, empresa_id, user_id, perfil, ativo, empresas(nome_fantasia)").order("created_at", { ascending: false }),
      supabase.from("empresa_dominios").select("id, empresa_id, dominio, status, observacao, empresas(nome_fantasia)").order("created_at", { ascending: false }),
      supabase.from("planos_saas").select("*").order("preco_mensal", { ascending: true }),
      supabase.from("super_admin_licencas_resumo").select("*").order("updated_at", { ascending: false }),
      supabase.from("super_admin_cobrancas_resumo").select("*").order("vencimento", { ascending: true })
    ]);

  if (companiesError) throw companiesError;
  if (usersError) throw usersError;
  if (domainsError) throw domainsError;
  if (plansError) throw plansError;
  if (licensesError) throw licensesError;
  if (invoicesError) throw invoicesError;

  return {
    companies: (companies ?? []).map((row: any): SuperAdminCompanySummary => ({
      id: row.id,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia ?? "Empresa",
      cnpj: row.cnpj,
      uf: row.uf,
      municipio: row.municipio,
      ativo: Boolean(row.ativo),
      totalUsuarios: Number(row.total_usuarios ?? 0),
      totalProdutos: Number(row.total_produtos ?? 0),
      totalVendas: Number(row.total_vendas ?? 0),
      faturamentoTotal: Number(row.faturamento_total ?? 0),
      nfceAutorizadas: Number(row.nfce_autorizadas ?? 0),
      nfceRejeitadas: Number(row.nfce_rejeitadas ?? 0)
    })),
    users: (users ?? []).map((row: any): SuperAdminUserLink => {
      const company = Array.isArray(row.empresas) ? row.empresas[0] : row.empresas;
      return {
        id: row.id,
        empresaId: row.empresa_id,
        perfil: row.perfil,
        ativo: Boolean(row.ativo),
        empresaNome: company?.nome_fantasia ?? "Empresa",
        userId: row.user_id
      };
    }),
    domains: domains ?? [],
    plans: (plans ?? []).map((row: any): SaaSPlan => ({
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      precoMensal: Number(row.preco_mensal ?? 0),
      limiteUsuarios: Number(row.limite_usuarios ?? 0),
      limiteProdutos: Number(row.limite_produtos ?? 0),
      limiteEmpresas: Number(row.limite_empresas ?? 1),
      ativo: Boolean(row.ativo)
    })),
    licenses: (licenses ?? []).map((row: any): CompanyLicense => ({
      id: row.id,
      empresaId: row.empresa_id,
      empresaNome: row.empresa_nome ?? "Empresa",
      cnpj: row.cnpj ?? "-",
      planoId: row.plano_id,
      planoNome: row.plano_nome ?? "Plano",
      planoCodigo: row.plano_codigo ?? "-",
      precoMensal: Number(row.preco_mensal ?? 0),
      status: row.status,
      inicioTeste: row.inicio_teste,
      fimTeste: row.fim_teste,
      vencimento: row.vencimento,
      limiteUsuarios: Number(row.limite_usuarios ?? 0),
      limiteProdutos: Number(row.limite_produtos ?? 0),
      usuariosAtivos: Number(row.usuarios_ativos ?? 0),
      produtosAtivos: Number(row.produtos_ativos ?? 0),
      observacao: row.observacao ?? undefined,
      bloqueioMotivo: row.bloqueio_motivo ?? undefined,
      updatedAt: row.updated_at
    })),
    invoices: (invoices ?? []).map((row: any): BillingInvoice => ({
      id: row.id,
      empresaId: row.empresa_id,
      empresaNome: row.empresa_nome ?? "Empresa",
      cnpj: row.cnpj ?? "-",
      licencaId: row.licenca_id,
      planoNome: row.plano_nome ?? undefined,
      competencia: row.competencia,
      valor: Number(row.valor ?? 0),
      vencimento: row.vencimento,
      pagoEm: row.pago_em ?? undefined,
      status: row.status,
      formaPagamento: row.forma_pagamento ?? undefined,
      referenciaExterna: row.referencia_externa ?? undefined,
      observacao: row.observacao ?? undefined
    }))
  };
}

export async function createRetailerFromCoreAdmin(input: {
  email: string;
  password?: string;
  nome_admin?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  uf: string;
  municipio: string;
  dominio?: string;
  dominio_status?: string;
}) {
  return invokeCoreAdminFunction("core-admin-create-retailer", input);
}

export async function updateCompanyLicense(input: {
  id: string;
  planoId: string;
  status: CompanyLicense["status"];
  vencimento?: string;
  limiteUsuarios: number;
  limiteProdutos: number;
  observacao?: string;
  bloqueioMotivo?: string;
}) {
  if (!supabase) throw new Error("Supabase nÃ£o configurado.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { error } = await supabase
    .from("licencas_empresas")
    .update({
      plano_id: input.planoId,
      status: input.status,
      vencimento: input.vencimento || null,
      limite_usuarios: input.limiteUsuarios,
      limite_produtos: input.limiteProdutos,
      observacao: input.observacao || null,
      bloqueio_motivo: input.bloqueioMotivo || null,
      atualizado_por: userData.user?.id ?? null
    })
    .eq("id", input.id);

  if (error) throw error;
}

export async function registerBillingPayment(input: {
  cobrancaId: string;
  pagoEm?: string;
  mesesRenovacao: number;
  formaPagamento?: string;
  referenciaExterna?: string;
  observacao?: string;
}) {
  return invokeCoreAdminFunction("core-admin-register-payment", {
    cobranca_id: input.cobrancaId,
    pago_em: input.pagoEm,
    meses_renovacao: input.mesesRenovacao,
    forma_pagamento: input.formaPagamento,
    referencia_externa: input.referenciaExterna,
    observacao: input.observacao
  });
}

export async function createUserFromCoreAdmin(input: {
  empresa_id: string;
  email: string;
  password?: string;
  nome?: string;
  perfil: string;
}) {
  return invokeCoreAdminFunction("core-admin-create-user", input);
}

export async function updateAccessFromCoreAdmin(input: {
  usuarios_empresas_id: string;
  perfil?: string;
  ativo?: boolean;
}) {
  return invokeCoreAdminFunction("core-admin-update-access", input);
}

export async function upsertDomainFromCoreAdmin(input: {
  empresa_id: string;
  dominio: string;
  status: string;
  observacao?: string;
}) {
  return invokeCoreAdminFunction("core-admin-upsert-domain", input);
}

export async function loadCompanyUsers(empresaId: string): Promise<CompanyUserLink[]> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("usuarios_empresas")
    .select("id, user_id, perfil, ativo, created_at")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    perfil: row.perfil,
    ativo: Boolean(row.ativo),
    createdAt: new Date(row.created_at).toLocaleString("pt-BR")
  }));
}

export async function createCompanyUser(input: {
  empresaId: string;
  email: string;
  nome?: string;
  perfil: string;
  password?: string;
}) {
  return invokeCoreAdminFunction("company-create-user", {
    empresa_id: input.empresaId,
    email: input.email,
    nome: input.nome,
    perfil: input.perfil,
    password: input.password
  });
}

export async function updateCompanyUser(input: {
  empresaId: string;
  usuariosEmpresasId: string;
  perfil?: string;
  ativo?: boolean;
}) {
  return invokeCoreAdminFunction("company-update-user", {
    empresa_id: input.empresaId,
    usuarios_empresas_id: input.usuariosEmpresasId,
    perfil: input.perfil,
    ativo: input.ativo
  });
}

async function invokeCoreAdminFunction(functionName: string, body: Record<string, unknown>) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw error;
  const payload = data as { data?: unknown; error?: string };
  if (payload?.error) throw new Error(payload.error);
  return payload?.data;
}

export async function createRetailerAccount(input: {
  email: string;
  password: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
}) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password
  });

  if (authError) throw authError;
  if (!authData.session) {
    return {
      needsEmailConfirmation: true
    };
  }

  await createCompanyForCurrentUser(input);
  return { needsEmailConfirmation: false };
}

export async function createCompanyForCurrentUser(input: {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
}) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: company, error: companyError } = await supabase
    .from("empresas")
    .insert({
      razao_social: input.razaoSocial,
      nome_fantasia: input.nomeFantasia,
      cnpj: input.cnpj,
      regime_tributario: "simples_nacional",
      uf: "CE",
      municipio: "Fortaleza",
      endereco: {}
    })
    .select("id")
    .single();

  if (companyError) throw companyError;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Usuário não autenticado.");

  const { error: linkError } = await supabase.from("usuarios_empresas").insert({
    user_id: userData.user.id,
    empresa_id: company.id,
    perfil: "admin",
    ativo: true
  });

  if (linkError) throw linkError;
}

export async function updateCompanyProfile(input: {
  empresaId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  regimeTributario: string;
  uf: string;
  municipio: string;
  endereco?: string;
}) {
  if (!supabase) throw new Error("Supabase nÃ£o configurado.");

  const { data, error } = await supabase
    .from("empresas")
    .update({
      razao_social: input.razaoSocial.trim(),
      nome_fantasia: input.nomeFantasia.trim() || null,
      cnpj: input.cnpj.trim(),
      inscricao_estadual: input.inscricaoEstadual?.trim() || null,
      regime_tributario: input.regimeTributario.trim(),
      uf: input.uf.trim().toUpperCase().slice(0, 2),
      municipio: input.municipio.trim(),
      endereco: input.endereco?.trim() ? { texto: input.endereco.trim() } : {}
    })
    .eq("id", input.empresaId)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function finalizeRemoteSale(input: {
  empresaId: string;
  cart: CartItem[];
  clienteCpf: string;
  formaPagamento: PaymentMethod;
  descontoTotal: number;
}) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase.rpc("finalizar_venda", {
    p_empresa_id: input.empresaId,
    p_cliente_cpf: input.clienteCpf || null,
    p_forma_pagamento: paymentToDb[input.formaPagamento],
    p_desconto_total: input.descontoTotal,
    p_itens: input.cart.map((item) => ({
      produto_id: item.product.id,
      quantidade: item.quantidade,
      desconto: item.desconto
    }))
  });

  if (error) throw error;
  return data as string;
}

export async function cancelRemoteSale(input: {
  vendaId: string;
  motivo: string;
  estornarEstoque?: boolean;
}) {
  if (!supabase) throw new Error("Supabase nÃ£o configurado.");

  const { data, error } = await supabase.rpc("cancelar_venda", {
    p_venda_id: input.vendaId,
    p_motivo: input.motivo,
    p_estornar_estoque: input.estornarEstoque ?? true
  });

  if (error) throw error;
  return data;
}

export async function settleRemoteSaleStock(vendaId: string) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase.rpc("baixar_estoque_venda", {
    p_venda_id: vendaId
  });

  if (error) throw error;
  return data;
}

export async function createRemoteProduct(input: ProductInput) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const payload = productInputToPayload(input);

  const { data, error } = await supabase.from("produtos").insert(payload).select("*").single();
  if (error) throw error;
  return mapProduct(data);
}

export async function createRemoteProducts(inputs: ProductInput[]) {
  if (!supabase) throw new Error("Supabase nÃ£o configurado.");
  if (!inputs.length) return [];

  const payload = inputs.map(productInputToPayload);
  const { data, error } = await supabase.from("produtos").insert(payload).select("*");
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function updateRemoteProductPricing(input: {
  productId: string;
  precoCusto: number;
  precoVenda: number;
}) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("produtos")
    .update({
      preco_custo: input.precoCusto,
      preco_venda: input.precoVenda
    })
    .eq("id", input.productId)
    .select("*")
    .single();

  if (error) throw error;
  return mapProduct(data);
}

function productInputToPayload(input: ProductInput) {
  return {
    empresa_id: input.empresaId,
    codigo: input.codigo.trim(),
    codigo_barras: input.codigoBarras?.trim() || null,
    descricao: input.descricao.trim(),
    categoria: input.categoria?.trim() || null,
    marca: input.marca?.trim() || null,
    preco_custo: input.precoCusto,
    preco_venda: input.precoVenda,
    estoque_atual: input.estoqueAtual,
    estoque_minimo: input.estoqueMinimo,
    unidade: input.unidade || "UN",
    ncm: input.ncm.trim(),
    cest: input.cest?.trim() || null,
    cfop: input.cfop.trim(),
    origem: input.origem.trim(),
    csosn: input.csosn?.trim() || null,
    cst: input.cst?.trim() || null,
    aliquota_icms: input.aliquotaIcms ?? null,
    unidade_comercial_fiscal: input.unidadeComercialFiscal || input.unidade || "UN",
    ativo: true
  };
}

export async function setRemoteProductActive(productId: string, ativo: boolean) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) throw error;
  return mapProduct(data);
}

export async function loadRemoteCustomers(empresaId: string): Promise<Customer[]> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase.from("clientes").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCustomer);
}

export async function createRemoteCustomer(input: CustomerInput) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: input.empresaId,
      nome: input.nome,
      cpf_cnpj: input.cpfCnpj || null,
      telefone: input.telefone || null,
      email: input.email || null,
      endereco: input.endereco ? { texto: input.endereco } : null,
      observacoes: input.observacoes || null
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapCustomer(data);
}

export async function loadRemoteStockMovements(empresaId: string): Promise<StockMovement[]> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .select("*, produtos(descricao)")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const product = Array.isArray(row.produtos) ? row.produtos[0] : row.produtos;
    return {
      id: row.id,
      produtoId: row.produto_id,
      produtoDescricao: product?.descricao ?? "Produto",
      tipo: row.tipo,
      quantidade: Number(row.quantidade ?? 0),
      estoqueAnterior: Number(row.estoque_anterior ?? 0),
      estoquePosterior: Number(row.estoque_posterior ?? 0),
      valorUnitario: row.valor_unitario === null || row.valor_unitario === undefined ? undefined : Number(row.valor_unitario),
      valorTotal: row.valor_total === null || row.valor_total === undefined ? undefined : Number(row.valor_total),
      documentoOrigem: row.documento_origem ?? undefined,
      observacao: row.observacao ?? undefined,
      createdAt: new Date(row.created_at).toLocaleString("pt-BR")
    };
  });
}

export async function createRemoteStockMovement(input: {
  empresaId: string;
  produtoId: string;
  tipo: string;
  quantidade: number;
  observacao?: string;
  valorUnitario?: number;
  valorTotal?: number;
  documentoOrigem?: string;
}) {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase.rpc("movimentar_estoque", {
    p_empresa_id: input.empresaId,
    p_produto_id: input.produtoId,
    p_tipo: input.tipo,
    p_quantidade: input.quantidade,
    p_observacao: input.observacao || null,
    p_valor_unitario: input.valorUnitario ?? null,
    p_valor_total: input.valorTotal ?? null,
    p_documento_origem: input.documentoOrigem || null
  });

  if (error) throw error;
  return data;
}

export async function loadFiscalSettings(empresaId: string): Promise<FiscalSettings | null> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("configuracoes_fiscais")
    .select("id, empresa_id, ambiente, serie_nfce, proximo_numero_nfce, certificado_configurado, csc_configurado, ativo, updated_at")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapFiscalSettings(data);
}

export async function loadGeneralSettings(empresaId: string): Promise<GeneralSettings | null> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("configuracoes_gerais")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw error;
  }

  return data ? mapGeneralSettings(data) : null;
}

export async function saveGeneralSettings(input: GeneralSettings): Promise<GeneralSettings> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from("configuracoes_gerais")
    .upsert(
      {
        empresa_id: input.empresaId,
        permitir_estoque_negativo: input.permitirEstoqueNegativo,
        casas_decimais_quantidade: input.casasDecimaisQuantidade,
        impressao_automatica_nfce: input.impressaoAutomaticaNfce,
        reimpressao_danfe_auditada: input.reimpressaoDanfeAuditada,
        baixa_estoque_ao_finalizar: input.baixaEstoqueAoFinalizar,
        cancelamento_estorna_estoque: input.cancelamentoEstornaEstoque,
        exigir_cpf_acima_de: input.exigirCpfAcimaDe ?? null,
        pdv_modo_compacto: input.pdvModoCompacto,
        observacao: input.observacao?.trim() || null
      },
      { onConflict: "empresa_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapGeneralSettings(data);
}

export async function saveFiscalSettings(input: {
  empresaId: string;
  ambiente: "homologacao" | "producao";
  serieNfce: string;
  proximoNumeroNfce: number;
  cscId?: string;
  cscToken?: string;
  certificadoPath?: string;
}) {
  const data = await invokeCoreAdminFunction("fiscal-settings", {
    empresa_id: input.empresaId,
    ambiente: input.ambiente,
    serie_nfce: input.serieNfce,
    proximo_numero_nfce: input.proximoNumeroNfce,
    csc_id: input.cscId,
    csc_token: input.cscToken,
    certificado_path: input.certificadoPath
  });
  return mapFiscalSettings(data);
}

export async function loadFiscalApiStatus(empresaId: string): Promise<FiscalApiStatus | null> {
  if (!supabase) throw new Error("Supabase nÃ£o configurado.");

  const { data, error } = await supabase.functions.invoke<{ data: any }>("fiscal-provider-status", {
    body: { empresa_id: empresaId }
  });

  if (error) throw error;
  if (!data?.data) return null;

  return {
    provider: data.data.provider,
    configured: Boolean(data.data.configured),
    baseUrlConfigured: Boolean(data.data.base_url_configured),
    apiKeyConfigured: Boolean(data.data.api_key_configured),
    baseUrlHost: data.data.base_url_host ?? undefined,
    authHeader: data.data.auth_header,
    endpoints: data.data.endpoints,
    timeoutMs: Number(data.data.timeout_ms ?? 30000),
    healthCheckConfigured: Boolean(data.data.health_check_configured),
    healthCheckOk: data.data.health_check_ok,
    healthCheckStatus: data.data.health_check_status
  };
}

function mapFiscalSettings(row: any): FiscalSettings {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    ambiente: row.ambiente,
    serieNfce: row.serie_nfce,
    proximoNumeroNfce: Number(row.proximo_numero_nfce ?? 1),
    certificadoConfigurado: Boolean(row.certificado_configurado),
    cscConfigurado: Boolean(row.csc_configurado),
    ativo: Boolean(row.ativo),
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleString("pt-BR") : undefined
  };
}

function mapGeneralSettings(row: any): GeneralSettings {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    permitirEstoqueNegativo: Boolean(row.permitir_estoque_negativo),
    casasDecimaisQuantidade: Number(row.casas_decimais_quantidade ?? 3),
    impressaoAutomaticaNfce: Boolean(row.impressao_automatica_nfce),
    reimpressaoDanfeAuditada: Boolean(row.reimpressao_danfe_auditada),
    baixaEstoqueAoFinalizar: Boolean(row.baixa_estoque_ao_finalizar),
    cancelamentoEstornaEstoque: Boolean(row.cancelamento_estorna_estoque),
    exigirCpfAcimaDe: row.exigir_cpf_acima_de === null || row.exigir_cpf_acima_de === undefined ? undefined : Number(row.exigir_cpf_acima_de),
    pdvModoCompacto: Boolean(row.pdv_modo_compacto),
    observacao: row.observacao ?? undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleString("pt-BR") : undefined
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    nome: row.nome,
    cpfCnpj: row.cpf_cnpj ?? undefined,
    telefone: row.telefone ?? undefined,
    email: row.email ?? undefined,
    endereco: row.endereco?.texto ?? undefined,
    observacoes: row.observacoes ?? undefined
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    codigo: row.codigo,
    codigoBarras: row.codigo_barras ?? "",
    descricao: row.descricao,
    categoria: row.categoria ?? "",
    marca: row.marca ?? "",
    precoCusto: Number(row.preco_custo ?? 0),
    precoVenda: Number(row.preco_venda ?? 0),
    margem: Number(row.margem ?? 0),
    estoqueAtual: Number(row.estoque_atual ?? 0),
    estoqueMinimo: Number(row.estoque_minimo ?? 0),
    unidade: row.unidade ?? "UN",
    ncm: row.ncm ?? "",
    cest: row.cest ?? "",
    cfop: row.cfop ?? "",
    origem: row.origem ?? "",
    csosn: row.csosn ?? "",
    cst: row.cst ?? "",
    aliquotaIcms: row.aliquota_icms ? Number(row.aliquota_icms) : undefined,
    ativo: Boolean(row.ativo)
  };
}

function mapFiscalDocument(row: any): FiscalDocument {
  return {
    id: row.id,
    venda: row.venda_id,
    data: new Date(row.created_at).toLocaleString("pt-BR"),
    createdAt: row.created_at,
    cliente: row.vendas?.cliente_cpf ? "Consumidor identificado" : "Consumidor não identificado",
    cpf: row.vendas?.cliente_cpf ?? undefined,
    total: Number(row.vendas?.total ?? 0),
    status: fiscalStatusMap[row.status] ?? "NAO_EMITIDA",
    numero: row.numero ?? undefined,
    serie: row.serie ?? undefined,
    chave: row.chave_acesso ?? undefined,
    protocolo: row.protocolo ?? undefined,
    hasXml: Boolean(row.xml_path),
    hasDanfe: Boolean(row.danfe_path),
    formaPagamento: paymentFromDb[row.vendas?.forma_pagamento] ?? "Outros",
    motivo: row.motivo_rejeicao ?? undefined
  };
}

function mapSaleRecord(row: any): SaleRecord {
  const document = Array.isArray(row.documentos_fiscais) ? row.documentos_fiscais[0] : row.documentos_fiscais;
  return {
    id: row.id,
    numero: String(row.id).slice(0, 8).toUpperCase(),
    data: new Date(row.created_at).toLocaleString("pt-BR"),
    createdAt: row.created_at,
    usuarioId: row.usuario_id,
    clienteCpf: row.cliente_cpf ?? undefined,
    subtotal: Number(row.subtotal ?? 0),
    descontoTotal: Number(row.desconto_total ?? 0),
    total: Number(row.total ?? 0),
    formaPagamento: paymentFromDb[row.forma_pagamento] ?? "Outros",
    statusVenda: row.status_venda,
    statusFiscal: fiscalStatusMap[row.status_fiscal] ?? "NAO_EMITIDA",
    estoqueBaixado: Boolean(row.estoque_baixado),
    canceladoEm: row.cancelado_em ? new Date(row.cancelado_em).toLocaleString("pt-BR") : undefined,
    motivoCancelamento: row.motivo_cancelamento ?? undefined,
    documentoStatus: document?.status ? fiscalStatusMap[document.status] : undefined,
    documentoChave: document?.chave_acesso ?? undefined,
    itens: (row.venda_itens ?? []).map((item: any): SaleItemRecord => ({
      id: item.id,
      produtoId: item.produto_id ?? undefined,
      codigo: item.codigo,
      codigoBarras: item.codigo_barras ?? undefined,
      descricao: item.descricao,
      quantidade: Number(item.quantidade ?? 0),
      valorUnitario: Number(item.valor_unitario ?? 0),
      desconto: Number(item.desconto ?? 0),
      total: Number(item.total ?? 0),
      ncm: item.ncm ?? undefined,
      cfop: item.cfop ?? undefined,
      csosn: item.csosn ?? undefined,
      cst: item.cst ?? undefined
    }))
  };
}
