import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  DatabaseZap,
  FileBadge,
  FileDown,
  FileText,
  Filter,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Trash2,
  type LucideIcon,
  UserCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  createCompanyForCurrentUser,
  createRetailerAccount,
  createRetailerFromCoreAdmin,
  createUserFromCoreAdmin,
  createRemoteProduct,
  createRemoteProducts,
  createRemoteCustomer,
  createRemoteStockMovement,
  createCompanyUser,
  finalizeRemoteSale,
  registerBillingPayment,
  loadRemoteCustomers,
  loadRemoteAppData,
  loadRemoteStockMovements,
  loadCompanyUsers,
  loadFiscalSettings,
  loadSuperAdminDashboard,
  saveFiscalSettings,
  updateAccessFromCoreAdmin,
  updateCompanyLicense,
  updateCompanyUser,
  upsertDomainFromCoreAdmin,
  setRemoteProductActive,
  type SuperAdminCompanySummary,
  type SuperAdminProfile,
  type SuperAdminUserLink,
  type SaaSPlan,
  type BillingInvoice,
  type CompanyContext,
  type CompanyLicense,
  type CompanyUserLink,
  type Customer,
  type FiscalSettings,
  type ProductInput,
  type StockMovement
} from "./lib/coreflowRepository";
import { invokeFiscalFunction, isSupabaseConfigured, supabase } from "./lib/supabase";
import type { CartItem, FiscalDocument, FiscalStatus, ModuleId, NavItem, PaymentMethod, Product } from "./types";

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "pdv", label: "PDV / Vendas", icon: ShoppingCart },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "estoque", label: "Estoque", icon: Boxes },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "nfce", label: "Cupons NFC-e", icon: ReceiptText },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "fiscal", label: "Configurações Fiscais", icon: ShieldCheck },
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "usuarios", label: "Usuários e Acessos", icon: UserCog },
  { id: "gerais", label: "Configurações Gerais", icon: Settings }
];

const superAdminNavItem: NavItem = { id: "superadmin", label: "Core Admin", icon: ShieldCheck };

const rolePermissions: Record<string, ModuleId[]> = {
  admin: ["dashboard", "pdv", "produtos", "estoque", "clientes", "nfce", "relatorios", "fiscal", "empresa", "usuarios", "gerais"],
  gerente: ["dashboard", "pdv", "produtos", "estoque", "clientes", "nfce", "relatorios"],
  operador: ["pdv", "nfce"],
  estoquista: ["dashboard", "produtos", "estoque"],
  visualizador: ["dashboard", "produtos", "estoque", "clientes", "nfce", "relatorios"]
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  operador: "Operador",
  estoquista: "Estoquista",
  visualizador: "Visualizador"
};

const roleOrder = ["admin", "gerente", "operador", "estoquista", "visualizador"];

function canAccessModule(profile: string | undefined, moduleId: ModuleId, isSuperAdmin: boolean) {
  if (isSuperAdmin && moduleId === "superadmin") return true;
  if (isSuperAdmin && !profile) return moduleId === "superadmin";
  return rolePermissions[profile ?? "visualizador"]?.includes(moduleId) ?? false;
}

function canEdit(profile: string | undefined, area: "sales" | "products" | "stock" | "customers" | "fiscal" | "users") {
  if (profile === "admin") return true;
  if (profile === "gerente") return ["sales", "products", "stock", "customers"].includes(area);
  if (profile === "operador") return area === "sales";
  if (profile === "estoquista") return ["products", "stock"].includes(area);
  return false;
}

function licenseBlockMessage(company?: CompanyContext | null) {
  const license = company?.license;
  if (!license) return "Empresa sem licença SaaS configurada.";
  if (!license.operacional) {
    if (license.status === "bloqueado") return license.bloqueioMotivo || "Licença bloqueada pelo Core Admin.";
    if (license.status === "vencido") return "Licença vencida. Regularize o plano para liberar a operação.";
    if (license.status === "cancelado") return "Licença cancelada.";
    return "Licença fora do período ativo.";
  }
  return "";
}

function licenseCanOperate(company?: CompanyContext | null) {
  return !licenseBlockMessage(company);
}

function licenseCanCreateProduct(company?: CompanyContext | null) {
  const license = company?.license;
  return licenseCanOperate(company) && !!license && license.produtosAtivos < license.limiteProdutos;
}

function licenseCanCreateUser(company?: CompanyContext | null) {
  const license = company?.license;
  return licenseCanOperate(company) && !!license && license.usuariosAtivos < license.limiteUsuarios;
}

const productsSeed: Product[] = [
  {
    id: "p1",
    codigo: "PRD-001",
    codigoBarras: "7891000100019",
    descricao: "Café Premium Torrado 500g",
    categoria: "Mercearia",
    marca: "CoreMarket",
    precoCusto: 16.4,
    precoVenda: 28.9,
    margem: 76.2,
    estoqueAtual: 42,
    estoqueMinimo: 12,
    unidade: "UN",
    ncm: "09012100",
    cest: "17.096.00",
    cfop: "5102",
    origem: "0",
    csosn: "102",
    aliquotaIcms: 0,
    ativo: true
  },
  {
    id: "p2",
    codigo: "PRD-002",
    codigoBarras: "7892000200022",
    descricao: "Açúcar Cristal 1kg",
    categoria: "Mercearia",
    marca: "DoceLar",
    precoCusto: 3.7,
    precoVenda: 6.49,
    margem: 75.4,
    estoqueAtual: 8,
    estoqueMinimo: 15,
    unidade: "UN",
    ncm: "17019900",
    cfop: "5102",
    origem: "0",
    csosn: "102",
    ativo: true
  },
  {
    id: "p3",
    codigo: "PRD-003",
    codigoBarras: "7893000300035",
    descricao: "Detergente Neutro 500ml",
    categoria: "Limpeza",
    marca: "LimpMax",
    precoCusto: 1.75,
    precoVenda: 3.99,
    margem: 128,
    estoqueAtual: 65,
    estoqueMinimo: 20,
    unidade: "UN",
    ncm: "",
    cfop: "5102",
    origem: "0",
    csosn: "",
    ativo: true
  },
  {
    id: "p4",
    codigo: "PRD-004",
    codigoBarras: "7894000400048",
    descricao: "Fone Bluetooth Compact",
    categoria: "Eletrônicos",
    marca: "Pulse",
    precoCusto: 48,
    precoVenda: 89.9,
    margem: 87.3,
    estoqueAtual: 14,
    estoqueMinimo: 5,
    unidade: "UN",
    ncm: "85183000",
    cfop: "5102",
    origem: "1",
    cst: "00",
    aliquotaIcms: 18,
    ativo: true
  }
];

const documentsSeed: FiscalDocument[] = [
  {
    id: "df1",
    venda: "VD-1042",
    data: "11/05/2026 10:18",
    cliente: "Consumidor não identificado",
    total: 183.72,
    status: "AUTORIZADA",
    numero: "000012",
    serie: "1",
    chave: "23260512345678000195650010000000121000000123",
    protocolo: "323260000194530",
    formaPagamento: "Pix"
  },
  {
    id: "df2",
    venda: "VD-1043",
    data: "11/05/2026 10:42",
    cliente: "Mariana Alves",
    cpf: "123.456.789-09",
    total: 71.88,
    status: "REJEITADA",
    formaPagamento: "Cartão de crédito",
    motivo: "Produto sem NCM ou CST/CSOSN informado."
  },
  {
    id: "df3",
    venda: "VD-1044",
    data: "11/05/2026 11:08",
    cliente: "Consumidor não identificado",
    total: 32.89,
    status: "NAO_EMITIDA",
    formaPagamento: "Dinheiro"
  }
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const statusTone: Record<FiscalStatus, string> = {
  AUTORIZADA: "success",
  REJEITADA: "danger",
  ENVIANDO: "info",
  CANCELADA: "neutral-danger",
  CONTINGENCIA: "warning",
  NAO_EMITIDA: "muted"
};

type CsvProductImport = {
  valid: Omit<ProductInput, "empresaId">[];
  errors: string[];
};

const normalizeCsvKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const csvColumnAliases: Record<string, string[]> = {
  codigo: ["codigo", "codigo_interno", "sku"],
  codigoBarras: ["codigo_barras", "cod_barras", "barras", "ean", "gtin"],
  descricao: ["descricao", "descrição", "nome", "produto"],
  categoria: ["categoria", "grupo"],
  marca: ["marca", "fabricante"],
  precoCusto: ["preco_custo", "preço_custo", "custo"],
  precoVenda: ["preco_venda", "preço_venda", "preco", "preço", "venda"],
  estoqueAtual: ["estoque_atual", "estoque", "saldo"],
  estoqueMinimo: ["estoque_minimo", "estoque_mínimo", "minimo", "mínimo"],
  unidade: ["unidade", "un"],
  ncm: ["ncm"],
  cest: ["cest"],
  cfop: ["cfop"],
  origem: ["origem"],
  csosn: ["csosn"],
  cst: ["cst"],
  aliquotaIcms: ["aliquota_icms", "alíquota_icms", "icms"],
  unidadeComercialFiscal: ["unidade_comercial_fiscal", "unidade_fiscal", "un_fiscal"]
};

function parseCsvRows(text: string, delimiter: "," | ";") {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseCsvNumber(value: string | undefined, fallback = 0) {
  if (!value) return fallback;
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseProductsCsv(text: string): CsvProductImport {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = parseCsvRows(text, delimiter);
  const [header, ...dataRows] = rows;
  const errors: string[] = [];
  const valid: Omit<ProductInput, "empresaId">[] = [];

  if (!header?.length) return { valid, errors: ["CSV sem cabeçalho."] };

  const normalizedHeader = header.map(normalizeCsvKey);
  const getCell = (row: string[], field: keyof typeof csvColumnAliases) => {
    const index = csvColumnAliases[field].map(normalizeCsvKey).map((alias) => normalizedHeader.indexOf(alias)).find((position) => position >= 0);
    return index === undefined ? "" : row[index]?.trim() ?? "";
  };

  dataRows.forEach((row, rowIndex) => {
    const line = rowIndex + 2;
    const codigo = getCell(row, "codigo");
    const descricao = getCell(row, "descricao");
    const precoVenda = parseCsvNumber(getCell(row, "precoVenda"), NaN);
    const ncm = getCell(row, "ncm");
    const cfop = getCell(row, "cfop") || "5102";

    if (!codigo || !descricao || !Number.isFinite(precoVenda) || precoVenda <= 0 || !ncm) {
      errors.push(`Linha ${line}: código, descrição, preço de venda e NCM são obrigatórios.`);
      return;
    }

    valid.push({
      codigo,
      codigoBarras: getCell(row, "codigoBarras"),
      descricao,
      categoria: getCell(row, "categoria"),
      marca: getCell(row, "marca"),
      precoCusto: parseCsvNumber(getCell(row, "precoCusto"), 0),
      precoVenda,
      estoqueAtual: parseCsvNumber(getCell(row, "estoqueAtual"), 0),
      estoqueMinimo: parseCsvNumber(getCell(row, "estoqueMinimo"), 0),
      unidade: getCell(row, "unidade") || "UN",
      ncm,
      cest: getCell(row, "cest"),
      cfop,
      origem: getCell(row, "origem") || "0",
      csosn: getCell(row, "csosn") || "102",
      cst: getCell(row, "cst"),
      aliquotaIcms: getCell(row, "aliquotaIcms") ? parseCsvNumber(getCell(row, "aliquotaIcms")) : undefined,
      unidadeComercialFiscal: getCell(row, "unidadeComercialFiscal") || getCell(row, "unidade") || "UN"
    });
  });

  return { valid, errors };
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(productsSeed);
  const [documents, setDocuments] = useState<FiscalDocument[]>(documentsSeed);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [fiscalSettings, setFiscalSettings] = useState<FiscalSettings | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUserLink[]>([]);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [superAdminProfile, setSuperAdminProfile] = useState<SuperAdminProfile | null>(null);
  const [remoteMode, setRemoteMode] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [consumerCpf, setConsumerCpf] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.product.precoVenda * item.quantidade, 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + item.desconto, 0);
  const discountTotal = Math.min(globalDiscount + itemDiscounts, subtotal);
  const cartTotal = Math.max(subtotal - discountTotal, 0);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.descricao.toLowerCase().includes(term) ||
        product.codigo.toLowerCase().includes(term) ||
        product.codigoBarras.includes(term) ||
        product.categoria.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthenticated(true);
        refreshRemoteData();
      }
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (canAccessModule(companyContext?.perfil, activeModule, Boolean(superAdminProfile))) return;

    if (superAdminProfile) {
      setActiveModule("superadmin");
      return;
    }

    const firstAllowed = rolePermissions[companyContext?.perfil ?? "visualizador"]?.[0] ?? "dashboard";
    setActiveModule(firstAllowed);
  }, [isAuthenticated, activeModule, companyContext?.perfil, superAdminProfile]);

  async function refreshRemoteData() {
    if (!isSupabaseConfigured) return;

    setLoadingRemote(true);
    try {
      const data = await loadRemoteAppData();
      setRemoteMode(Boolean(data.company));
      setCompanyContext(data.company);
      setSuperAdminProfile(data.superAdmin);
      if (data.company) {
        setProducts(data.products);
        setDocuments(data.documents);
        const [remoteCustomers, remoteMovements] = await Promise.all([
          loadRemoteCustomers(data.company.empresaId),
          loadRemoteStockMovements(data.company.empresaId)
        ]);
        setCustomers(remoteCustomers);
        setStockMovements(remoteMovements);
        setFiscalSettings(await loadFiscalSettings(data.company.empresaId));
        setCompanyUsers(await loadCompanyUsers(data.company.empresaId));
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao carregar dados do Supabase.");
    } finally {
      setLoadingRemote(false);
    }
  }

  async function handleLogin(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setToast(error.message);
        return;
      }
      await refreshRemoteData();
    }
    setIsAuthenticated(true);
  }

  async function handleCreateRetailer(input: {
    email: string;
    password: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
  }) {
    try {
      const result = await createRetailerAccount(input);
      if (result.needsEmailConfirmation) {
        setToast("Conta criada. Confirme o e-mail e faça login para ativar a empresa.");
        return;
      }
      setIsAuthenticated(true);
      await refreshRemoteData();
      setToast("Revendedor criado com isolamento multiempresa ativo.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao criar revendedor.");
    }
  }

  async function handleCreateCompany(input: { razaoSocial: string; nomeFantasia: string; cnpj: string }) {
    try {
      await createCompanyForCurrentUser(input);
      await refreshRemoteData();
      setToast("Empresa criada. Seus dados já estão isolados por RLS.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao criar empresa.");
    }
  }

  function addToCart(product: Product) {
    if (!product.ativo) return setToast("Produto inativo não pode ser vendido.");
    if (product.estoqueAtual <= 0) return setToast("Estoque indisponível para este produto.");
    if (!product.precoVenda || product.precoVenda <= 0) return setToast("Produto sem preço válido.");

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantidade + 1 > product.estoqueAtual) {
          setToast("Quantidade maior que o estoque disponível.");
          return current;
        }
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...current, { product, quantidade: 1, desconto: 0 }];
    });
  }

  function updateQuantity(productId: string, quantidade: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = Math.max(1, Math.min(quantidade, item.product.estoqueAtual));
          return { ...item, quantidade: next };
        })
        .filter((item) => item.quantidade > 0)
    );
  }

  function updateItemDiscount(productId: string, desconto: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) return item;
        const itemTotal = item.product.precoVenda * item.quantidade;
        return { ...item, desconto: Math.max(0, Math.min(desconto, itemTotal)) };
      })
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  function validateSale() {
    if (!cart.length) return "Adicione pelo menos um produto para vender.";
    if (cart.some((item) => item.quantidade <= 0)) return "Quantidade deve ser maior que zero.";
    if (cart.some((item) => item.quantidade > item.product.estoqueAtual)) return "Há item acima do estoque disponível.";
    if (cart.some((item) => item.product.precoVenda <= 0)) return "Há produto sem preço válido.";
    if (discountTotal > subtotal) return "Desconto não pode ser maior que o total.";
    return "";
  }

  async function finishSale(emitFiscal: boolean) {
    const error = validateSale();
    if (error) {
      setToast(error);
      return;
    }

    const hasFiscalGap = cart.some((item) => !item.product.ncm || !item.product.cfop || (!item.product.csosn && !item.product.cst));
    if (emitFiscal && hasFiscalGap) {
      setToast("NFC-e bloqueada: existe produto sem dados fiscais mínimos.");
      return;
    }

    if (remoteMode && companyContext) {
      const licenseMessage = licenseBlockMessage(companyContext);
      if (licenseMessage) {
        setToast(`Venda bloqueada: ${licenseMessage}`);
        return;
      }

      try {
        const vendaId = await finalizeRemoteSale({
          empresaId: companyContext.empresaId,
          cart,
          clienteCpf: consumerCpf,
          formaPagamento: paymentMethod,
          descontoTotal: globalDiscount
        });

        if (emitFiscal) {
          const { error: fiscalError } = await invokeFiscalFunction("emitir-nfce", { venda_id: vendaId });
          if (fiscalError) throw fiscalError;
        }

        setCart([]);
        setGlobalDiscount(0);
        setConsumerCpf("");
        await refreshRemoteData();
        setToast(emitFiscal ? "Venda salva e enviada para emissão NFC-e." : "Venda salva com baixa de estoque.");
      } catch (remoteError) {
        setToast(remoteError instanceof Error ? remoteError.message : "Falha ao finalizar venda.");
      }
      return;
    }

    const vendaId = `VD-${Math.floor(1100 + Math.random() * 500)}`;
    setProducts((current) =>
      current.map((product) => {
        const item = cart.find((cartItem) => cartItem.product.id === product.id);
        if (!item) return product;
        return { ...product, estoqueAtual: product.estoqueAtual - item.quantidade };
      })
    );

    setDocuments((current) => [
      {
        id: crypto.randomUUID(),
        venda: vendaId,
        data: new Date().toLocaleString("pt-BR"),
        cliente: consumerCpf ? "Consumidor identificado" : "Consumidor não identificado",
        cpf: consumerCpf || undefined,
        total: cartTotal,
        status: emitFiscal ? "ENVIANDO" : "NAO_EMITIDA",
        formaPagamento: paymentMethod
      },
      ...current
    ]);

    setCart([]);
    setGlobalDiscount(0);
    setConsumerCpf("");
    setToast(emitFiscal ? "Venda confirmada. Emissão NFC-e deve seguir pela Edge Function." : "Venda finalizada sem emissão fiscal.");
  }

  async function triggerFiscalAction(action: "reenviar-nfce" | "consultar-nfce" | "cancelar-nfce", document: FiscalDocument) {
    const payload =
      action === "cancelar-nfce"
        ? { documento_fiscal_id: document.id, motivo: "Cancelamento solicitado pelo operador." }
        : action === "reenviar-nfce"
          ? { venda_id: document.venda }
          : { documento_fiscal_id: document.id };

    const { error } = await invokeFiscalFunction(action, payload);
    setToast(error ? error.message : `Solicitação enviada para ${action}.`);
  }

  function buildLocalProduct(input: Omit<ProductInput, "empresaId">): Product {
    return {
      id: crypto.randomUUID(),
      codigo: input.codigo,
      codigoBarras: input.codigoBarras ?? "",
      descricao: input.descricao,
      categoria: input.categoria ?? "",
      marca: input.marca ?? "",
      precoCusto: input.precoCusto,
      precoVenda: input.precoVenda,
      margem: input.precoCusto > 0 ? ((input.precoVenda - input.precoCusto) / input.precoCusto) * 100 : 0,
      estoqueAtual: input.estoqueAtual,
      estoqueMinimo: input.estoqueMinimo,
      unidade: input.unidade,
      ncm: input.ncm,
      cest: input.cest,
      cfop: input.cfop,
      origem: input.origem,
      csosn: input.csosn,
      cst: input.cst,
      aliquotaIcms: input.aliquotaIcms,
      ativo: true
    };
  }

  async function handleCreateProduct(input: Omit<ProductInput, "empresaId">) {
    if (remoteMode && companyContext) {
      const licenseMessage = licenseBlockMessage(companyContext);
      if (licenseMessage) return setToast(`Cadastro bloqueado: ${licenseMessage}`);
      if (!licenseCanCreateProduct(companyContext)) {
        return setToast("Cadastro bloqueado: limite de produtos atingido para o plano contratado.");
      }

      try {
        const product = await createRemoteProduct({ ...input, empresaId: companyContext.empresaId });
        setProducts((current) => [product, ...current]);
        setToast("Produto cadastrado com segurança fiscal.");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Falha ao cadastrar produto.");
      }
      return;
    }

    const product: Product = {
      id: crypto.randomUUID(),
      codigo: input.codigo,
      codigoBarras: input.codigoBarras ?? "",
      descricao: input.descricao,
      categoria: input.categoria ?? "",
      marca: input.marca ?? "",
      precoCusto: input.precoCusto,
      precoVenda: input.precoVenda,
      margem: input.precoCusto > 0 ? ((input.precoVenda - input.precoCusto) / input.precoCusto) * 100 : 0,
      estoqueAtual: input.estoqueAtual,
      estoqueMinimo: input.estoqueMinimo,
      unidade: input.unidade,
      ncm: input.ncm,
      cest: input.cest,
      cfop: input.cfop,
      origem: input.origem,
      csosn: input.csosn,
      cst: input.cst,
      aliquotaIcms: input.aliquotaIcms,
      ativo: true
    };
    setProducts((current) => [buildLocalProduct(input), ...current]);
    setToast("Produto cadastrado no modo demonstração.");
  }

  async function handleImportProducts(inputs: Omit<ProductInput, "empresaId">[]) {
    if (!inputs.length) return setToast("Nenhum produto válido para importar.");

    if (remoteMode && companyContext) {
      const licenseMessage = licenseBlockMessage(companyContext);
      if (licenseMessage) return setToast(`Importação bloqueada: ${licenseMessage}`);
      const available = Math.max(0, (companyContext.license?.limiteProdutos ?? 0) - (companyContext.license?.produtosAtivos ?? products.length));
      if (inputs.length > available) {
        return setToast(`Importação bloqueada: o plano permite mais ${available} produto(s) ativos.`);
      }

      try {
        const imported = await createRemoteProducts(inputs.map((input) => ({ ...input, empresaId: companyContext.empresaId })));
        setProducts((current) => [...imported, ...current]);
        await refreshRemoteData();
        setToast(`${imported.length} produto(s) importado(s) com sucesso.`);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Falha ao importar produtos.");
      }
      return;
    }

    setProducts((current) => [...inputs.map(buildLocalProduct), ...current]);
    setToast(`${inputs.length} produto(s) importado(s) no modo demonstração.`);
  }

  async function handleToggleProduct(product: Product) {
    if (remoteMode) {
      if (!licenseCanOperate(companyContext)) return setToast(`Alteração bloqueada: ${licenseBlockMessage(companyContext)}`);
      if (!product.ativo && !licenseCanCreateProduct(companyContext)) {
        return setToast("Ativação bloqueada: limite de produtos atingido para o plano contratado.");
      }

      try {
        const updated = await setRemoteProductActive(product.id, !product.ativo);
        setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setToast(updated.ativo ? "Produto ativado." : "Produto inativado.");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Falha ao atualizar produto.");
      }
      return;
    }

    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ativo: !item.ativo } : item)));
  }

  async function handleCreateCustomer(input: Omit<Customer, "id">) {
    if (remoteMode && companyContext) {
      const licenseMessage = licenseBlockMessage(companyContext);
      if (licenseMessage) return setToast(`Cadastro bloqueado: ${licenseMessage}`);

      try {
        const customer = await createRemoteCustomer({ ...input, empresaId: companyContext.empresaId });
        setCustomers((current) => [customer, ...current]);
        setToast("Cliente cadastrado.");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Falha ao cadastrar cliente.");
      }
      return;
    }

    setCustomers((current) => [{ ...input, id: crypto.randomUUID() }, ...current]);
  }

  async function handleCreateStockMovement(input: { produtoId: string; tipo: string; quantidade: number; observacao?: string }) {
    if (!companyContext || !remoteMode) {
      setToast("Movimentação de estoque exige Supabase conectado.");
      return;
    }

    if (!licenseCanOperate(companyContext)) return setToast(`Movimentação bloqueada: ${licenseBlockMessage(companyContext)}`);

    try {
      await createRemoteStockMovement({ ...input, empresaId: companyContext.empresaId });
      await refreshRemoteData();
      setToast("Estoque movimentado com histórico.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao movimentar estoque.");
    }
  }

  async function handleSaveFiscalSettings(input: {
    ambiente: "homologacao" | "producao";
    serieNfce: string;
    proximoNumeroNfce: number;
    cscId?: string;
    cscToken?: string;
    certificadoPath?: string;
  }) {
    if (!companyContext) {
      setToast("Empresa não carregada.");
      return;
    }

    try {
      const settings = await saveFiscalSettings({ ...input, empresaId: companyContext.empresaId });
      setFiscalSettings(settings);
      setToast("Configuração fiscal salva com segurança.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao salvar configuração fiscal.");
    }
  }

  async function handleCreateCompanyUser(input: { email: string; nome?: string; perfil: string; password?: string }) {
    if (!companyContext) return setToast("Empresa não carregada.");
    const licenseMessage = licenseBlockMessage(companyContext);
    if (licenseMessage) return setToast(`Usuário bloqueado: ${licenseMessage}`);
    if (!licenseCanCreateUser(companyContext)) return setToast("Usuário bloqueado: limite de usuários atingido para o plano contratado.");

    try {
      const result: any = await createCompanyUser({ ...input, empresaId: companyContext.empresaId });
      setCompanyUsers(await loadCompanyUsers(companyContext.empresaId));
      setToast(`Usuário criado. Senha temporária: ${result?.temporary_password ?? "definida manualmente"}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao criar usuário.");
    }
  }

  async function handleUpdateCompanyUser(input: { usuariosEmpresasId: string; perfil?: string; ativo?: boolean }) {
    if (!companyContext) return setToast("Empresa não carregada.");
    try {
      await updateCompanyUser({ ...input, empresaId: companyContext.empresaId });
      setCompanyUsers(await loadCompanyUsers(companyContext.empresaId));
      setToast("Acesso atualizado.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Falha ao atualizar acesso.");
    }
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} onCreateRetailer={handleCreateRetailer} toast={toast} />;
  }

  if (isSupabaseConfigured && !loadingRemote && !companyContext && !superAdminProfile) {
    return <CreateCompanyScreen onCreateCompany={handleCreateCompany} toast={toast} />;
  }

  const activeLabel = navItems.find((item) => item.id === activeModule)?.label ?? "Dashboard";
  const currentLicenseMessage = licenseBlockMessage(companyContext);
  const canOperateByLicense = licenseCanOperate(companyContext);

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
        <Menu size={20} />
      </button>

        <Sidebar
          activeModule={activeModule}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          isSuperAdmin={Boolean(superAdminProfile)}
          profile={companyContext?.perfil}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onCollapse={() => setSidebarCollapsed((value) => !value)}
            onNavigate={(moduleId) => {
              if (!canAccessModule(companyContext?.perfil, moduleId, Boolean(superAdminProfile))) {
                setToast("Seu perfil não tem acesso a este módulo.");
                return;
              }
              setActiveModule(moduleId);
              setMobileMenuOpen(false);
        }}
      />

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Strategic Core Systems</span>
            <h1>{activeLabel}</h1>
          </div>
          <div className="topbar-actions">
            <span className="company-pill">
              <Store size={16} />
              {companyContext?.nomeFantasia ?? "Mercado Central Demo"}
            </span>
            {companyContext?.perfil && <span className="company-pill">{companyContext.perfil}</span>}
            {companyContext?.license && <span className="company-pill">{companyContext.license.planoNome} | {companyContext.license.status}</span>}
            {loadingRemote && <span className="company-pill">Sincronizando</span>}
            <button className="icon-button" aria-label="Notificações">
              <Bell size={18} />
            </button>
            <button className="icon-button" aria-label="Sair" onClick={() => setIsAuthenticated(false)}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {toast && (
          <div className="toast" role="status" onAnimationEnd={() => setToast("")}>
            {toast}
          </div>
        )}

        {companyContext?.license && (
          <LicenseBanner license={companyContext.license} message={currentLicenseMessage} />
        )}

        {activeModule === "dashboard" && <Dashboard products={products} documents={documents} />}
        {activeModule === "superadmin" && superAdminProfile && <SuperAdminModule profile={superAdminProfile} />}
        {activeModule === "pdv" && (
          <PdvModule
            products={filteredProducts}
            searchTerm={searchTerm}
            cart={cart}
            subtotal={subtotal}
            discountTotal={discountTotal}
            cartTotal={cartTotal}
            globalDiscount={globalDiscount}
            paymentMethod={paymentMethod}
            consumerCpf={consumerCpf}
            cartVisible={cartVisible}
            onSearch={setSearchTerm}
            onAdd={addToCart}
            onQuantity={updateQuantity}
            onDiscount={updateItemDiscount}
            onRemove={removeFromCart}
            onGlobalDiscount={(value) => setGlobalDiscount(Math.max(0, Math.min(value, subtotal)))}
            onPayment={setPaymentMethod}
            onConsumerCpf={setConsumerCpf}
            onFinish={finishSale}
            onToggleCart={() => setCartVisible((value) => !value)}
            canSell={canEdit(companyContext?.perfil, "sales") && canOperateByLicense}
          />
        )}
        {activeModule === "produtos" && (
          <ProductsModule products={products} onCreateProduct={handleCreateProduct} onImportProducts={handleImportProducts} onToggleProduct={handleToggleProduct} canManage={canEdit(companyContext?.perfil, "products") && canOperateByLicense} />
        )}
        {activeModule === "estoque" && (
          <StockModule products={products} movements={stockMovements} onCreateMovement={handleCreateStockMovement} canManage={canEdit(companyContext?.perfil, "stock") && canOperateByLicense} />
        )}
        {activeModule === "clientes" && <CustomersModule customers={customers} onCreateCustomer={handleCreateCustomer} canManage={canEdit(companyContext?.perfil, "customers") && canOperateByLicense} />}
        {activeModule === "nfce" && <FiscalDocumentsModule documents={documents} onAction={triggerFiscalAction} />}
        {activeModule === "relatorios" && <ReportsModule documents={documents} products={products} />}
        {activeModule === "fiscal" && <FiscalSettingsModule settings={fiscalSettings} onSave={handleSaveFiscalSettings} canManage={canEdit(companyContext?.perfil, "fiscal")} />}
        {activeModule === "empresa" && <CompanyModule />}
        {activeModule === "usuarios" && (
          <UsersModule users={companyUsers} onCreateUser={handleCreateCompanyUser} onUpdateUser={handleUpdateCompanyUser} canManage={canEdit(companyContext?.perfil, "users") && canOperateByLicense} />
        )}
        {activeModule === "gerais" && <GeneralSettingsModule />}
      </main>
    </div>
  );
}

function LicenseBanner({ license, message }: { license: CompanyContext["license"]; message: string }) {
  if (!license) return null;
  const usageWarning = license.usuariosAtivos >= license.limiteUsuarios || license.produtosAtivos >= license.limiteProdutos;
  const tone = message ? "danger" : usageWarning ? "warning" : "success";

  return (
    <section className={`license-banner ${tone}`}>
      <div>
        <span className="eyebrow">Licença SaaS</span>
        <strong>{license.planoNome} | {license.status}</strong>
        <p>{message || "Operação liberada para venda, cadastros e movimentações."}</p>
      </div>
      <div className="license-banner-metrics">
        <span>Usuários {license.usuariosAtivos}/{license.limiteUsuarios}</span>
        <span>Produtos {license.produtosAtivos}/{license.limiteProdutos}</span>
        <span>Vence {license.vencimento ?? license.fimTeste ?? "sem data"}</span>
      </div>
    </section>
  );
}

function LoginScreen({
  onLogin,
  onCreateRetailer,
  toast
}: {
  onLogin: (email: string, password: string) => void;
  onCreateRetailer: (input: {
    email: string;
    password: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
  }) => void;
  toast: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@strategiccore.systems");
  const [password, setPassword] = useState("demo123");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="orbital-mark">
          <img src="/strategic-core-mark-tight.png" alt="Strategic Core Systems" />
        </div>
        <div>
          <span className="eyebrow">No Núcleo das Decisões Inteligentes.</span>
          <h1>CoreFlow PDV</h1>
          <p>by Strategic Core Systems</p>
        </div>
      </section>

      <form
        className="login-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === "login") {
            onLogin(email, password);
          } else {
            onCreateRetailer({ email, password, razaoSocial, nomeFantasia, cnpj });
          }
        }}
      >
        <div className="security-chip">
          <LockKeyhole size={16} />
          Ambiente empresarial seguro
        </div>
        <h2>{mode === "login" ? "Acesso operacional" : "Nova conta revendedor"}</h2>
        {mode === "signup" && (
          <>
            <label>
              Razão social
              <input value={razaoSocial} onChange={(event) => setRazaoSocial(event.target.value)} required />
            </label>
            <label>
              Nome fantasia
              <input value={nomeFantasia} onChange={(event) => setNomeFantasia(event.target.value)} required />
            </label>
            <label>
              CNPJ
              <input value={cnpj} onChange={(event) => setCnpj(event.target.value)} required />
            </label>
          </>
        )}
        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          Senha
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button className="primary-button" type="submit">
          {mode === "login" ? "Entrar" : "Criar revendedor"}
        </button>
        <button type="button" className="text-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Criar conta de revendedor" : "Já tenho conta"}
        </button>
        {mode === "login" && (
          <button type="button" className="text-button">
            Esqueci minha senha
          </button>
        )}
        {!isSupabaseConfigured && <p className="hint">Modo demonstração ativo até configurar o Supabase.</p>}
        {toast && <p className="form-error">{toast}</p>}
      </form>
    </main>
  );
}

function CreateCompanyScreen({
  onCreateCompany,
  toast
}: {
  onCreateCompany: (input: { razaoSocial: string; nomeFantasia: string; cnpj: string }) => void;
  toast: string;
}) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="orbital-mark">
          <img src="/strategic-core-mark-tight.png" alt="Strategic Core Systems" />
        </div>
        <div>
          <span className="eyebrow">No Núcleo das Decisões Inteligentes.</span>
          <h1>CoreFlow PDV</h1>
          <p>Crie a empresa inicial para ativar o isolamento multiempresa.</p>
        </div>
      </section>

      <form
        className="login-card"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateCompany({ razaoSocial, nomeFantasia, cnpj });
        }}
      >
        <div className="security-chip">
          <ShieldCheck size={16} />
          RLS por empresa
        </div>
        <h2>Empresa do revendedor</h2>
        <label>
          Razão social
          <input value={razaoSocial} onChange={(event) => setRazaoSocial(event.target.value)} required />
        </label>
        <label>
          Nome fantasia
          <input value={nomeFantasia} onChange={(event) => setNomeFantasia(event.target.value)} required />
        </label>
        <label>
          CNPJ
          <input value={cnpj} onChange={(event) => setCnpj(event.target.value)} required />
        </label>
        <button className="primary-button" type="submit">
          Ativar empresa
        </button>
        {toast && <p className="form-error">{toast}</p>}
      </form>
    </main>
  );
}

function Sidebar({
  activeModule,
  collapsed,
  mobileOpen,
  isSuperAdmin,
  profile,
  onCloseMobile,
  onCollapse,
  onNavigate
}: {
  activeModule: ModuleId;
  collapsed: boolean;
  mobileOpen: boolean;
  isSuperAdmin: boolean;
  profile?: string;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onNavigate: (moduleId: ModuleId) => void;
}) {
  const items = (isSuperAdmin ? [superAdminNavItem, ...navItems] : navItems).filter((item) =>
    canAccessModule(profile, item.id, isSuperAdmin)
  );

  return (
    <>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/strategic-core-mark-tight.png" alt="Strategic Core Systems" />
          {!collapsed && (
            <div>
              <strong>CoreFlow PDV</strong>
              <span>Strategic Core Systems</span>
            </div>
          )}
          <button className="icon-button mobile-only" onClick={onCloseMobile} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav>
          {items.map((item) => (
            <button
              key={item.id}
              className={activeModule === item.id ? "active" : ""}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={19} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button className="collapse-button" onClick={onCollapse}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Recolher menu</span>}
        </button>
      </aside>
      {mobileOpen && <button className="mobile-backdrop" onClick={onCloseMobile} aria-label="Fechar menu" />}
    </>
  );
}

function Dashboard({ products, documents }: { products: Product[]; documents: FiscalDocument[] }) {
  const lowStock = products.filter((product) => product.estoqueAtual <= product.estoqueMinimo).length;
  const authorized = documents.filter((document) => document.status === "AUTORIZADA").length;
  const rejected = documents.filter((document) => document.status === "REJEITADA").length;
  const revenue = documents.reduce((sum, document) => sum + document.total, 0);
  const averageTicket = revenue / Math.max(documents.length, 1);

  return (
    <section className="module-grid">
      <div className="kpi-grid">
        <Kpi title="Vendas do dia" value="38" icon={ShoppingCart} trend="+12%" />
        <Kpi title="Faturamento do dia" value={formatMoney(revenue)} icon={WalletCards} trend="+8,4%" />
        <Kpi title="Cupons autorizados" value={String(authorized)} icon={BadgeCheck} tone="success" />
        <Kpi title="Cupons rejeitados" value={String(rejected)} icon={AlertTriangle} tone={rejected ? "danger" : "neutral"} />
        <Kpi title="Estoque baixo" value={String(lowStock)} icon={Boxes} tone={lowStock ? "warning" : "neutral"} />
        <Kpi title="Total de clientes" value="1.284" icon={Users} />
        <Kpi title="Ticket médio" value={formatMoney(averageTicket)} icon={CreditCard} />
        <Kpi title="Pagamento líder" value="Pix 42%" icon={DatabaseZap} />
      </div>

      <div className="chart-grid">
        <Panel title="Vendas por período" icon={BarChart3}>
          <BarSeries values={[48, 64, 52, 76, 92, 88, 106]} />
        </Panel>
        <Panel title="Status fiscal das NFC-e" icon={FileBadge}>
          <StatusStack documents={documents} />
        </Panel>
        <Panel title="Produtos mais vendidos" icon={Layers3}>
          <RankList
            rows={[
              ["Café Premium Torrado 500g", "128 un"],
              ["Detergente Neutro 500ml", "94 un"],
              ["Açúcar Cristal 1kg", "86 un"],
              ["Fone Bluetooth Compact", "23 un"]
            ]}
          />
        </Panel>
        <Panel title="Formas de pagamento" icon={WalletCards}>
          <PaymentBars />
        </Panel>
      </div>
    </section>
  );
}

function SuperAdminModule({ profile }: { profile: SuperAdminProfile }) {
  const [companies, setCompanies] = useState<SuperAdminCompanySummary[]>([]);
  const [users, setUsers] = useState<SuperAdminUserLink[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [licenses, setLicenses] = useState<CompanyLicense[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await loadSuperAdminDashboard();
      setCompanies(data.companies);
      setUsers(data.users);
      setDomains(data.domains);
      setPlans(data.plans);
      setLicenses(data.licenses);
      setInvoices(data.invoices);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar Core Admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const totalRevenue = companies.reduce((sum, company) => sum + company.faturamentoTotal, 0);
  const activeCompanies = companies.filter((company) => company.ativo).length;
  const activeDomains = domains.filter((domain: any) => domain.status === "ativo").length;
  const pendingDomains = domains.filter((domain: any) => domain.status !== "ativo").length;
  const companiesWithoutDomain = companies.filter(
    (company) => !domains.some((domain: any) => domain.empresa_id === company.id)
  ).length;
  const adminUsers = users.filter((user) => user.perfil === "admin" && user.ativo).length;
  const blockedLicenses = licenses.filter((license) => license.status === "bloqueado" || license.status === "vencido").length;
  const trialLicenses = licenses.filter((license) => license.status === "teste").length;
  const recurringRevenue = licenses
    .filter((license) => license.status === "ativo" || license.status === "teste")
    .reduce((sum, license) => sum + license.precoMensal, 0);
  const openInvoices = invoices.filter((invoice) => invoice.status === "aberta" || invoice.status === "vencida");
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "vencida");
  const receivableTotal = openInvoices.reduce((sum, invoice) => sum + invoice.valor, 0);

  return (
    <section className="module-grid">
      <div className="admin-hero">
        <div>
          <span className="eyebrow">Core Admin</span>
          <h2>{profile.nome}</h2>
          <p>{profile.cargo} | {profile.role}</p>
        </div>
        <ShieldCheck size={42} />
      </div>

      {error && <div className="toast static">{error}</div>}
      {success && <div className="toast static">{success}</div>}
      {loading && <Panel title="Carregando administração" icon={RefreshCcw}>Sincronizando dados globais.</Panel>}

      {!loading && (
        <>
          <div className="admin-actions-grid">
            <CoreAdminRetailerForm
              onSubmit={async (payload) => {
                const result: any = await createRetailerFromCoreAdmin(payload);
                setSuccess(`Revendedor criado. Senha temporária: ${result?.temporary_password ?? "definida manualmente"}`);
                await refresh();
              }}
              onError={setError}
            />
            <CoreAdminUserForm
              companies={companies}
              onSubmit={async (payload) => {
                const result: any = await createUserFromCoreAdmin(payload);
                setSuccess(`Usuário criado. Senha temporária: ${result?.temporary_password ?? "definida manualmente"}`);
                await refresh();
              }}
              onError={setError}
            />
            <CoreAdminDomainForm
              companies={companies}
              onSubmit={async (payload) => {
                await upsertDomainFromCoreAdmin(payload);
                setSuccess("Domínio cadastrado/atualizado.");
                await refresh();
              }}
              onError={setError}
            />
          </div>

          <div className="kpi-grid">
            <Kpi title="Empresas ativas" value={String(activeCompanies)} icon={Building2} tone="success" />
            <Kpi title="Usuários vinculados" value={String(users.length)} icon={Users} />
            <Kpi title="Domínios ativos" value={`${activeDomains}/${domains.length}`} icon={DatabaseZap} tone={pendingDomains ? "warning" : "success"} />
            <Kpi title="Admins ativos" value={String(adminUsers)} icon={ShieldCheck} />
            <Kpi title="Sem domínio" value={String(companiesWithoutDomain)} icon={Store} tone={companiesWithoutDomain ? "warning" : "success"} />
            <Kpi title="Licenças em teste" value={String(trialLicenses)} icon={BadgeCheck} tone="info" />
            <Kpi title="Licenças bloqueadas" value={String(blockedLicenses)} icon={LockKeyhole} tone={blockedLicenses ? "danger" : "success"} />
            <Kpi title="MRR estimado" value={formatMoney(recurringRevenue)} icon={CreditCard} />
            <Kpi title="A receber" value={formatMoney(receivableTotal)} icon={WalletCards} tone={receivableTotal ? "warning" : "success"} />
            <Kpi title="Cobranças vencidas" value={String(overdueInvoices.length)} icon={AlertTriangle} tone={overdueInvoices.length ? "danger" : "success"} />
            <Kpi title="Faturamento monitorado" value={formatMoney(totalRevenue)} icon={WalletCards} />
          </div>

          <div className="chart-grid">
            <Panel title="Esteira de implantação" icon={ClipboardList}>
              <div className="onboarding-list">
                {companies.slice(0, 6).map((company) => {
                  const companyDomains = domains.filter((domain: any) => domain.empresa_id === company.id);
                  const hasAdmin = users.some((user) => user.empresaId === company.id && user.perfil === "admin" && user.ativo);
                  const hasActiveDomain = companyDomains.some((domain: any) => domain.status === "ativo");
                  return (
                    <article className="onboarding-row" key={company.id}>
                      <div>
                        <strong>{company.nomeFantasia}</strong>
                        <span>{company.cnpj}</span>
                      </div>
                      <span className={`badge ${hasAdmin ? "success" : "warning"}`}>Admin</span>
                      <span className={`badge ${companyDomains.length ? "info" : "neutral"}`}>Domínio</span>
                      <span className={`badge ${hasActiveDomain ? "success" : "warning"}`}>{hasActiveDomain ? "Ativo" : "Pendente"}</span>
                    </article>
                  );
                })}
                {!companies.length && <p className="empty-state">Nenhum revendedor cadastrado ainda.</p>}
              </div>
            </Panel>

            <Panel title="Matriz de permissões por cargo" icon={ShieldCheck}>
              <RolePermissionMatrix />
            </Panel>

            <LicenseManagementPanel
              licenses={licenses}
              plans={plans}
              onSave={async (input) => {
                await updateCompanyLicense(input);
                setSuccess("Licença atualizada.");
                await refresh();
              }}
              onError={setError}
            />

            <BillingPanel
              invoices={invoices}
              onRegisterPayment={async (input) => {
                await registerBillingPayment(input);
                setSuccess("Pagamento registrado e licença renovada.");
                await refresh();
              }}
              onError={setError}
            />

            <Panel title="Empresas e revendedores" icon={Building2}>
              <ResponsiveTable
                headers={["Empresa", "CNPJ", "UF", "Usuários", "Vendas", "NFC-e"]}
                rows={companies.map((company) => [
                  company.nomeFantasia,
                  company.cnpj,
                  `${company.uf}/${company.municipio}`,
                  String(company.totalUsuarios),
                  `${company.totalVendas} | ${formatMoney(company.faturamentoTotal)}`,
                  `${company.nfceAutorizadas} aut. / ${company.nfceRejeitadas} rej.`
                ])}
              />
            </Panel>

            <Panel title="Usuários e permissões" icon={UserCog}>
              <div className="access-list">
                {users.map((user) => (
                  <div className="access-row" key={user.id}>
                    <div>
                      <strong>{user.userId.slice(0, 8)}</strong>
                      <span>{user.empresaNome}</span>
                    </div>
                    <select
                      value={user.perfil}
                      onChange={async (event) => {
                        await updateAccessFromCoreAdmin({ usuarios_empresas_id: user.id, perfil: event.target.value });
                        setSuccess("Perfil atualizado.");
                        await refresh();
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="gerente">Gerente</option>
                      <option value="operador">Operador de caixa</option>
                      <option value="estoquista">Estoquista</option>
                      <option value="visualizador">Visualizador</option>
                    </select>
                    <button
                      className={user.ativo ? "secondary-button compact" : "primary-button compact"}
                      onClick={async () => {
                        await updateAccessFromCoreAdmin({ usuarios_empresas_id: user.id, ativo: !user.ativo });
                        setSuccess(user.ativo ? "Usuário desativado." : "Usuário ativado.");
                        await refresh();
                      }}
                    >
                      {user.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Domínios por empresa" icon={Store}>
              <ResponsiveTable
                headers={["Domínio", "Empresa", "Status", "Observação"]}
                rows={domains.map((domain: any) => {
                  const company = Array.isArray(domain.empresas) ? domain.empresas[0] : domain.empresas;
                  return [
                    domain.dominio,
                    company?.nome_fantasia ?? "Empresa",
                    domain.status,
                    domain.observacao ?? "-"
                  ];
                })}
              />
            </Panel>

            <Panel title="Cargos globais Core Admin" icon={ShieldCheck}>
              <div className="status-list">
                <StatusLine label="Owner" status="Acesso total, super admins e permissões" tone="success" />
                <StatusLine label="Admin" status="Empresas, usuários, domínios e suporte" tone="info" />
                <StatusLine label="Support" status="Atendimento e leitura operacional" tone="warning" />
                <StatusLine label="Auditor" status="Somente leitura global" tone="muted" />
              </div>
            </Panel>
          </div>
        </>
      )}
    </section>
  );
}

function BillingPanel({
  invoices,
  onRegisterPayment,
  onError
}: {
  invoices: BillingInvoice[];
  onRegisterPayment: (input: {
    cobrancaId: string;
    pagoEm?: string;
    mesesRenovacao: number;
    formaPagamento?: string;
    referenciaExterna?: string;
    observacao?: string;
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const orderedInvoices = [...invoices].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <Panel title="Cobranças e renovações" icon={WalletCards}>
      <div className="billing-list">
        {orderedInvoices.slice(0, 8).map((invoice) => (
          <BillingRow
            key={invoice.id}
            invoice={invoice}
            onRegisterPayment={onRegisterPayment}
            onError={onError}
          />
        ))}
        {!orderedInvoices.length && <p className="empty-state">Nenhuma cobrança gerada ainda.</p>}
      </div>
    </Panel>
  );
}

function BillingRow({
  invoice,
  onRegisterPayment,
  onError
}: {
  invoice: BillingInvoice;
  onRegisterPayment: (input: {
    cobrancaId: string;
    pagoEm?: string;
    mesesRenovacao: number;
    formaPagamento?: string;
    referenciaExterna?: string;
    observacao?: string;
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    pagoEm: new Date().toISOString().slice(0, 10),
    mesesRenovacao: "1",
    formaPagamento: "manual",
    referenciaExterna: "",
    observacao: ""
  });
  const paid = invoice.status === "paga";

  return (
    <article className="billing-row">
      <div className="billing-heading">
        <div>
          <strong>{invoice.empresaNome}</strong>
          <span>{invoice.competencia} | {invoice.planoNome ?? "Plano"} | venc. {invoice.vencimento}</span>
        </div>
        <span className={`badge ${invoice.status === "paga" ? "success" : invoice.status === "vencida" ? "danger" : "warning"}`}>
          {invoice.status}
        </span>
      </div>

      <div className="billing-main">
        <strong>{formatMoney(invoice.valor)}</strong>
        <input type="date" value={form.pagoEm} disabled={paid} onChange={(event) => setForm({ ...form, pagoEm: event.target.value })} />
        <input type="number" min={1} value={form.mesesRenovacao} disabled={paid} onChange={(event) => setForm({ ...form, mesesRenovacao: event.target.value })} aria-label="Meses de renovação" />
        <select value={form.formaPagamento} disabled={paid} onChange={(event) => setForm({ ...form, formaPagamento: event.target.value })}>
          <option value="manual">Manual</option>
          <option value="pix">Pix</option>
          <option value="cartao">Cartão</option>
          <option value="boleto">Boleto</option>
          <option value="transferencia">Transferência</option>
        </select>
      </div>

      <div className="billing-main notes">
        <input placeholder="Referência externa" value={form.referenciaExterna} disabled={paid} onChange={(event) => setForm({ ...form, referenciaExterna: event.target.value })} />
        <input placeholder="Observação" value={form.observacao} disabled={paid} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
        <button
          className="primary-button compact"
          disabled={paid}
          onClick={() =>
            onRegisterPayment({
              cobrancaId: invoice.id,
              pagoEm: form.pagoEm,
              mesesRenovacao: Number(form.mesesRenovacao),
              formaPagamento: form.formaPagamento,
              referenciaExterna: form.referenciaExterna,
              observacao: form.observacao
            }).catch((error) => onError(error.message))
          }
        >
          Registrar pagamento
        </button>
      </div>
    </article>
  );
}

function LicenseManagementPanel({
  licenses,
  plans,
  onSave,
  onError
}: {
  licenses: CompanyLicense[];
  plans: SaaSPlan[];
  onSave: (input: {
    id: string;
    planoId: string;
    status: CompanyLicense["status"];
    vencimento?: string;
    limiteUsuarios: number;
    limiteProdutos: number;
    observacao?: string;
    bloqueioMotivo?: string;
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <Panel title="Planos e licenças dos revendedores" icon={CreditCard}>
      <div className="license-list">
        {licenses.map((license) => (
          <LicenseRow
            key={license.id}
            license={license}
            plans={plans}
            onSave={onSave}
            onError={onError}
          />
        ))}
        {!licenses.length && <p className="empty-state">Nenhuma licença criada ainda.</p>}
      </div>
    </Panel>
  );
}

function LicenseRow({
  license,
  plans,
  onSave,
  onError
}: {
  license: CompanyLicense;
  plans: SaaSPlan[];
  onSave: (input: {
    id: string;
    planoId: string;
    status: CompanyLicense["status"];
    vencimento?: string;
    limiteUsuarios: number;
    limiteProdutos: number;
    observacao?: string;
    bloqueioMotivo?: string;
  }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    planoId: license.planoId,
    status: license.status,
    vencimento: license.vencimento ?? "",
    limiteUsuarios: String(license.limiteUsuarios),
    limiteProdutos: String(license.limiteProdutos),
    observacao: license.observacao ?? "",
    bloqueioMotivo: license.bloqueioMotivo ?? ""
  });

  useEffect(() => {
    setForm({
      planoId: license.planoId,
      status: license.status,
      vencimento: license.vencimento ?? "",
      limiteUsuarios: String(license.limiteUsuarios),
      limiteProdutos: String(license.limiteProdutos),
      observacao: license.observacao ?? "",
      bloqueioMotivo: license.bloqueioMotivo ?? ""
    });
  }, [license]);

  const limitWarning =
    license.usuariosAtivos > Number(form.limiteUsuarios) ||
    license.produtosAtivos > Number(form.limiteProdutos);

  return (
    <article className="license-row">
      <div className="license-heading">
        <div>
          <strong>{license.empresaNome}</strong>
          <span>{license.cnpj} | {license.planoNome} | {formatMoney(license.precoMensal)}/mês</span>
        </div>
        <span className={`badge ${license.status === "ativo" ? "success" : license.status === "bloqueado" || license.status === "vencido" ? "danger" : "warning"}`}>
          {license.status}
        </span>
      </div>

      <div className="license-controls">
        <select value={form.planoId} onChange={(event) => setForm({ ...form, planoId: event.target.value })}>
          {plans.map((plan) => (
            <option value={plan.id} key={plan.id}>
              {plan.nome} - {formatMoney(plan.precoMensal)}
            </option>
          ))}
        </select>
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CompanyLicense["status"] })}>
          <option value="teste">Teste grátis</option>
          <option value="ativo">Ativo</option>
          <option value="vencido">Vencido</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <input type="date" value={form.vencimento} onChange={(event) => setForm({ ...form, vencimento: event.target.value })} />
        <input type="number" min={1} value={form.limiteUsuarios} onChange={(event) => setForm({ ...form, limiteUsuarios: event.target.value })} aria-label="Limite de usuários" />
        <input type="number" min={1} value={form.limiteProdutos} onChange={(event) => setForm({ ...form, limiteProdutos: event.target.value })} aria-label="Limite de produtos" />
      </div>

      <div className="license-controls notes">
        <input placeholder="Observação interna" value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
        <input placeholder="Motivo do bloqueio" value={form.bloqueioMotivo} onChange={(event) => setForm({ ...form, bloqueioMotivo: event.target.value })} />
        <button
          className="primary-button compact"
          onClick={() =>
            onSave({
              id: license.id,
              planoId: form.planoId,
              status: form.status,
              vencimento: form.vencimento,
              limiteUsuarios: Number(form.limiteUsuarios),
              limiteProdutos: Number(form.limiteProdutos),
              observacao: form.observacao,
              bloqueioMotivo: form.bloqueioMotivo
            }).catch((error) => onError(error.message))
          }
        >
          Salvar licença
        </button>
      </div>

      <div className="license-usage">
        <span className={license.usuariosAtivos > Number(form.limiteUsuarios) ? "danger-text" : ""}>
          Usuários {license.usuariosAtivos}/{form.limiteUsuarios}
        </span>
        <span className={license.produtosAtivos > Number(form.limiteProdutos) ? "danger-text" : ""}>
          Produtos {license.produtosAtivos}/{form.limiteProdutos}
        </span>
        <span>Vencimento {form.vencimento || "sem data"}</span>
        {limitWarning && <span className="danger-text">Uso acima do limite contratado</span>}
      </div>
    </article>
  );
}

function RolePermissionMatrix() {
  const modules = navItems.filter((item) => item.id !== "fiscal" && item.id !== "gerais");

  return (
    <div className="permission-matrix">
      <div className="permission-row header">
        <span>Cargo</span>
        <span>Módulos liberados</span>
      </div>
      {roleOrder.map((role) => {
        const allowed = new Set(rolePermissions[role] ?? []);
        return (
          <div className="permission-row" key={role}>
            <strong>{roleLabels[role]}</strong>
            <div>
              {modules.map((module) => (
                <span className={`badge ${allowed.has(module.id) ? "success" : "neutral"}`} key={module.id}>
                  {module.label}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoreAdminRetailerForm({
  onSubmit,
  onError
}: {
  onSubmit: (payload: any) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    email: "",
    nome_admin: "",
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    uf: "CE",
    municipio: "Fortaleza",
    password: ""
  });

  return (
    <CoreAdminForm title="Criar revendedor" icon={Building2} onSubmit={() => onSubmit(form).catch((error) => onError(error.message))}>
      <input placeholder="E-mail admin" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input placeholder="Nome do admin" value={form.nome_admin} onChange={(e) => setForm({ ...form, nome_admin: e.target.value })} />
      <input placeholder="Razão social" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required />
      <input placeholder="Nome fantasia" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} required />
      <input placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} required />
      <div className="inline-fields">
        <input placeholder="UF" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
        <input placeholder="Município" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
      </div>
      <input placeholder="Senha inicial opcional" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
    </CoreAdminForm>
  );
}

function CoreAdminUserForm({
  companies,
  onSubmit,
  onError
}: {
  companies: SuperAdminCompanySummary[];
  onSubmit: (payload: any) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    empresa_id: "",
    email: "",
    nome: "",
    perfil: "operador",
    password: ""
  });

  return (
    <CoreAdminForm title="Criar usuário" icon={UserCog} onSubmit={() => onSubmit(form).catch((error) => onError(error.message))}>
      <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} required>
        <option value="">Empresa</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.nomeFantasia}
          </option>
        ))}
      </select>
      <input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
        <option value="admin">Admin</option>
        <option value="gerente">Gerente</option>
        <option value="operador">Operador de caixa</option>
        <option value="estoquista">Estoquista</option>
        <option value="visualizador">Visualizador</option>
      </select>
      <input placeholder="Senha inicial opcional" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
    </CoreAdminForm>
  );
}

function CoreAdminDomainForm({
  companies,
  onSubmit,
  onError
}: {
  companies: SuperAdminCompanySummary[];
  onSubmit: (payload: any) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    empresa_id: "",
    dominio: "",
    status: "pendente",
    observacao: ""
  });

  return (
    <CoreAdminForm title="Cadastrar domínio" icon={Store} onSubmit={() => onSubmit(form).catch((error) => onError(error.message))}>
      <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} required>
        <option value="">Empresa</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.nomeFantasia}
          </option>
        ))}
      </select>
      <input placeholder="app.empresa.com.br" value={form.dominio} onChange={(e) => setForm({ ...form, dominio: e.target.value })} required />
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option value="pendente">Pendente</option>
        <option value="validando_dns">Validando DNS</option>
        <option value="ativo">Ativo</option>
        <option value="bloqueado">Bloqueado</option>
      </select>
      <input placeholder="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
    </CoreAdminForm>
  );
}

function CoreAdminForm({
  title,
  icon: Icon,
  onSubmit,
  children
}: {
  title: string;
  icon: LucideIcon;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      className="core-admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3>
        <Icon size={17} />
        {title}
      </h3>
      {children}
      <button className="primary-button compact" type="submit">
        Salvar
      </button>
    </form>
  );
}

function PdvModule(props: {
  products: Product[];
  searchTerm: string;
  cart: CartItem[];
  subtotal: number;
  discountTotal: number;
  cartTotal: number;
  globalDiscount: number;
  paymentMethod: PaymentMethod;
  consumerCpf: string;
  cartVisible: boolean;
  onSearch: (value: string) => void;
  onAdd: (product: Product) => void;
  onQuantity: (productId: string, value: number) => void;
  onDiscount: (productId: string, value: number) => void;
  onRemove: (productId: string) => void;
  onGlobalDiscount: (value: number) => void;
  onPayment: (value: PaymentMethod) => void;
  onConsumerCpf: (value: string) => void;
  onFinish: (emitFiscal: boolean) => void;
  onToggleCart: () => void;
  canSell: boolean;
}) {
  return (
    <section className="pdv-layout">
      <div className="pdv-products">
        <div className="toolbar">
          <label className="search-box">
            <Search size={18} />
            <input
              value={props.searchTerm}
              onChange={(event) => props.onSearch(event.target.value)}
              placeholder="Buscar por código, código de barras ou nome"
            />
          </label>
          <button className="secondary-button">
            <SlidersHorizontal size={17} />
            Filtros
          </button>
        </div>
        {!props.canSell && (
          <p className="hint">Seu cargo permite consultar o PDV, mas nao finalizar vendas.</p>
        )}

        <div className="product-grid">
          {props.products.map((product) => {
            const fiscalIncomplete = !product.ncm || !product.cfop || (!product.csosn && !product.cst);
            return (
              <article className="product-card" key={product.id}>
                <div>
                  <span className="code">{product.codigo}</span>
                  <h3>{product.descricao}</h3>
                  <p>{product.categoria} | {product.marca}</p>
                </div>
                <div className="product-meta">
                  <strong>{formatMoney(product.precoVenda)}</strong>
                  <span className={product.estoqueAtual <= product.estoqueMinimo ? "stock low" : "stock"}>
                    Estoque {product.estoqueAtual}
                  </span>
                </div>
                {fiscalIncomplete && <span className="badge danger">Fiscal incompleto</span>}
                <button className="primary-button compact" disabled={!props.canSell} onClick={() => props.onAdd(product)}>
                  Adicionar
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <CartPanel {...props} />

      <button className="floating-cart" onClick={props.onToggleCart}>
        <ShoppingCart size={19} />
        Carrinho {props.cart.length}
      </button>
    </section>
  );
}

function CartPanel(props: {
  cart: CartItem[];
  subtotal: number;
  discountTotal: number;
  cartTotal: number;
  globalDiscount: number;
  paymentMethod: PaymentMethod;
  consumerCpf: string;
  cartVisible: boolean;
  onQuantity: (productId: string, value: number) => void;
  onDiscount: (productId: string, value: number) => void;
  onRemove: (productId: string) => void;
  onGlobalDiscount: (value: number) => void;
  onPayment: (value: PaymentMethod) => void;
  onConsumerCpf: (value: string) => void;
  onFinish: (emitFiscal: boolean) => void;
  canSell: boolean;
}) {
  const canFinalize = props.canSell && props.cart.length > 0;
  const paymentOptions: PaymentMethod[] = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito", "Outros"];

  return (
    <aside className={`cart-panel ${props.cartVisible ? "show-mobile" : ""}`}>
      <div className="cart-title">
        <div>
          <span className="eyebrow">Venda atual</span>
          <h2>Carrinho</h2>
        </div>
        <ReceiptText size={22} />
      </div>

      <div className="cart-items">
        {props.cart.length === 0 && <p className="empty-state">Nenhum produto adicionado.</p>}
        {props.cart.map((item) => (
          <div className="cart-item" key={item.product.id}>
            <div>
              <strong>{item.product.descricao}</strong>
              <span>{formatMoney(item.product.precoVenda)} | Estoque {item.product.estoqueAtual}</span>
            </div>
            <div className="cart-controls">
              <input
                type="number"
                min={1}
                max={item.product.estoqueAtual}
                value={item.quantidade}
                disabled={!props.canSell}
                onChange={(event) => props.onQuantity(item.product.id, Number(event.target.value))}
                aria-label="Quantidade"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.desconto}
                disabled={!props.canSell}
                onChange={(event) => props.onDiscount(item.product.id, Number(event.target.value))}
                aria-label="Desconto"
              />
              <button className="icon-button danger" disabled={!props.canSell} onClick={() => props.onRemove(item.product.id)} aria-label="Remover">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <label>
        CPF do consumidor
        <input disabled={!props.canSell} value={props.consumerCpf} onChange={(event) => props.onConsumerCpf(event.target.value)} placeholder="Opcional" />
      </label>

      <label>
        Desconto geral
        <input
          type="number"
          min={0}
          step="0.01"
          value={props.globalDiscount}
          disabled={!props.canSell}
          onChange={(event) => props.onGlobalDiscount(Number(event.target.value))}
        />
      </label>

      <div className="segmented">
        {paymentOptions.map((option) => (
          <button
            key={option}
            className={props.paymentMethod === option ? "selected" : ""}
            disabled={!props.canSell}
            onClick={() => props.onPayment(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="totals">
        <span>Subtotal <strong>{formatMoney(props.subtotal)}</strong></span>
        <span>Desconto <strong>{formatMoney(props.discountTotal)}</strong></span>
        <span className="grand-total">Total <strong>{formatMoney(props.cartTotal)}</strong></span>
      </div>

      {!props.canSell && <p className="hint">Perfil sem permissao para concluir venda.</p>}
      <button className="secondary-button full" disabled={!canFinalize} onClick={() => props.onFinish(false)}>
        Finalizar venda
      </button>
      <button className="primary-button full" disabled={!canFinalize} onClick={() => props.onFinish(true)}>
        Finalizar e emitir NFC-e
      </button>
    </aside>
  );
}

function ProductsModule({
  products,
  onCreateProduct,
  onImportProducts,
  onToggleProduct,
  canManage
}: {
  products: Product[];
  onCreateProduct: (input: Omit<ProductInput, "empresaId">) => void;
  onImportProducts: (inputs: Omit<ProductInput, "empresaId">[]) => void;
  onToggleProduct: (product: Product) => void;
  canManage: boolean;
}) {
  return (
    <div className="two-column">
      {canManage ? (
        <div className="product-tools-column">
          <ProductImportPanel onImportProducts={onImportProducts} />
          <ProductForm onCreateProduct={onCreateProduct} />
        </div>
      ) : (
        <Panel title="Produtos" icon={Package}>
          <p className="hint">Seu cargo permite consultar produtos, mas nao cadastrar ou alterar status.</p>
        </Panel>
      )}
      <Panel title="Cadastro de produtos" icon={Package}>
        <FilterBar filters={["Nome", "Código", "Barras", "Categoria", "Ativos", "Estoque baixo", "Fiscal incompleto"]} />
        <div className="product-admin-list">
          {products.map((product) => {
            const fiscalOk = Boolean(product.ncm && product.cfop && (product.csosn || product.cst));
            return (
              <article className="product-admin-row" key={product.id}>
                <div>
                  <span className="code">{product.codigo}</span>
                  <strong>{product.descricao}</strong>
                  <small>{product.categoria || "Sem categoria"} | {product.marca || "Sem marca"}</small>
                </div>
                <div>
                  <strong>{formatMoney(product.precoVenda)}</strong>
                  <small>Estoque {product.estoqueAtual} {product.unidade}</small>
                </div>
                <span className={`badge ${fiscalOk ? "success" : "danger"}`}>{fiscalOk ? "Fiscal completo" : "Fiscal incompleto"}</span>
                <button
                  className={product.ativo ? "secondary-button compact" : "primary-button compact"}
                  disabled={!canManage}
                  onClick={() => onToggleProduct(product)}
                >
                  {product.ativo ? "Inativar" : "Ativar"}
                </button>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function ProductImportPanel({ onImportProducts }: { onImportProducts: (inputs: Omit<ProductInput, "empresaId">[]) => void }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<CsvProductImport>({ valid: [], errors: [] });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseProductsCsv(text));
  }

  return (
    <Panel title="Importar produtos CSV" icon={FileText}>
      <div className="import-box">
        <label className="file-drop">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span>{fileName || "Selecionar arquivo CSV"}</span>
        </label>
        <p className="hint">
          Colunas aceitas: codigo, codigo_barras, descricao, categoria, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade, ncm, cest, cfop, origem, csosn, cst.
        </p>
        <div className="import-summary">
          <span className="badge success">{parsed.valid.length} válido(s)</span>
          <span className={`badge ${parsed.errors.length ? "danger" : "neutral"}`}>{parsed.errors.length} erro(s)</span>
        </div>
        {parsed.errors.length > 0 && (
          <div className="import-errors">
            {parsed.errors.slice(0, 4).map((error) => (
              <span key={error}>{error}</span>
            ))}
            {parsed.errors.length > 4 && <span>Mais {parsed.errors.length - 4} erro(s).</span>}
          </div>
        )}
        <button
          className="primary-button full"
          type="button"
          disabled={!parsed.valid.length}
          onClick={() => {
            onImportProducts(parsed.valid);
            setParsed({ valid: [], errors: [] });
            setFileName("");
          }}
        >
          Importar produtos válidos
        </button>
      </div>
    </Panel>
  );
}

function ProductForm({ onCreateProduct }: { onCreateProduct: (input: Omit<ProductInput, "empresaId">) => void }) {
  const [form, setForm] = useState({
    codigo: "",
    codigoBarras: "",
    descricao: "",
    categoria: "",
    marca: "",
    precoCusto: "0",
    precoVenda: "",
    estoqueAtual: "0",
    estoqueMinimo: "0",
    unidade: "UN",
    ncm: "",
    cest: "",
    cfop: "5102",
    origem: "0",
    csosn: "102",
    cst: "",
    aliquotaIcms: "",
    unidadeComercialFiscal: "UN"
  });

  return (
    <Panel title="Novo produto" icon={Package}>
      <form
        className="entity-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateProduct({
            codigo: form.codigo,
            codigoBarras: form.codigoBarras,
            descricao: form.descricao,
            categoria: form.categoria,
            marca: form.marca,
            precoCusto: Number(form.precoCusto),
            precoVenda: Number(form.precoVenda),
            estoqueAtual: Number(form.estoqueAtual),
            estoqueMinimo: Number(form.estoqueMinimo),
            unidade: form.unidade,
            ncm: form.ncm,
            cest: form.cest,
            cfop: form.cfop,
            origem: form.origem,
            csosn: form.csosn,
            cst: form.cst,
            aliquotaIcms: form.aliquotaIcms ? Number(form.aliquotaIcms) : undefined,
            unidadeComercialFiscal: form.unidadeComercialFiscal
          });
          setForm((current) => ({ ...current, codigo: "", codigoBarras: "", descricao: "", precoVenda: "", ncm: "" }));
        }}
      >
        <input required placeholder="Código interno" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        <input placeholder="Código de barras" value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} />
        <input required placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <div className="inline-fields">
          <input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
          <input placeholder="Marca" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
        </div>
        <div className="inline-fields">
          <input required type="number" min="0" step="0.01" placeholder="Custo" value={form.precoCusto} onChange={(e) => setForm({ ...form, precoCusto: e.target.value })} />
          <input required type="number" min="0.01" step="0.01" placeholder="Venda" value={form.precoVenda} onChange={(e) => setForm({ ...form, precoVenda: e.target.value })} />
        </div>
        <div className="inline-fields">
          <input required type="number" min="0" step="0.001" placeholder="Estoque" value={form.estoqueAtual} onChange={(e) => setForm({ ...form, estoqueAtual: e.target.value })} />
          <input required type="number" min="0" step="0.001" placeholder="Mínimo" value={form.estoqueMinimo} onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })} />
        </div>
        <div className="inline-fields">
          <input required placeholder="Unidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value.toUpperCase() })} />
          <input required placeholder="Unidade fiscal" value={form.unidadeComercialFiscal} onChange={(e) => setForm({ ...form, unidadeComercialFiscal: e.target.value.toUpperCase() })} />
        </div>
        <input required placeholder="NCM" value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} />
        <input placeholder="CEST quando aplicável" value={form.cest} onChange={(e) => setForm({ ...form, cest: e.target.value })} />
        <div className="inline-fields">
          <input required placeholder="CFOP" value={form.cfop} onChange={(e) => setForm({ ...form, cfop: e.target.value })} />
          <input required placeholder="Origem" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} />
        </div>
        <div className="inline-fields">
          <input placeholder="CSOSN" value={form.csosn} onChange={(e) => setForm({ ...form, csosn: e.target.value })} />
          <input placeholder="CST" value={form.cst} onChange={(e) => setForm({ ...form, cst: e.target.value })} />
        </div>
        <input type="number" min="0" step="0.01" placeholder="Alíquota ICMS" value={form.aliquotaIcms} onChange={(e) => setForm({ ...form, aliquotaIcms: e.target.value })} />
        <button className="primary-button full" type="submit">Cadastrar produto</button>
      </form>
    </Panel>
  );
}

function StockModule({
  products,
  movements,
  onCreateMovement,
  canManage
}: {
  products: Product[];
  movements: StockMovement[];
  onCreateMovement: (input: { produtoId: string; tipo: string; quantidade: number; observacao?: string }) => void;
  canManage: boolean;
}) {
  const [form, setForm] = useState({
    produtoId: "",
    tipo: "ENTRADA_MANUAL",
    quantidade: "1",
    observacao: ""
  });

  return (
    <div className="two-column">
      <Panel title="Estoque atual" icon={Boxes}>
        {canManage ? (
        <form
          className="entity-form compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateMovement({
              produtoId: form.produtoId,
              tipo: form.tipo,
              quantidade: Number(form.quantidade),
              observacao: form.observacao
            });
          }}
        >
          <select required value={form.produtoId} onChange={(event) => setForm({ ...form, produtoId: event.target.value })}>
            <option value="">Produto</option>
            {products.map((product) => (
              <option value={product.id} key={product.id}>{product.descricao}</option>
            ))}
          </select>
          <div className="inline-fields">
            <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
              <option value="ENTRADA_MANUAL">Entrada manual</option>
              <option value="SAIDA_MANUAL">Saída manual</option>
              <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
              <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
            </select>
            <input type="number" min="0.001" step="0.001" value={form.quantidade} onChange={(event) => setForm({ ...form, quantidade: event.target.value })} />
          </div>
          <input placeholder="Observação" value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          <button className="primary-button compact" type="submit">Registrar movimentação</button>
        </form>
        ) : (
          <p className="hint">Seu cargo permite consultar estoque, mas nao registrar movimentacoes.</p>
        )}
        <ResponsiveTable
          headers={["Produto", "Atual", "Mínimo", "Alerta"]}
          rows={products.map((product) => [
            product.descricao,
            String(product.estoqueAtual),
            String(product.estoqueMinimo),
            product.estoqueAtual <= product.estoqueMinimo ? "Estoque baixo" : "Normal"
          ])}
        />
      </Panel>
      <Panel title="Movimentações recentes" icon={ClipboardList}>
        <ResponsiveTable
          headers={["Data", "Produto", "Tipo", "Qtd", "Saldo"]}
          rows={(movements.length ? movements : [
            {
              id: "demo",
              produtoId: "demo",
              produtoDescricao: "Sem movimentações reais ainda",
              tipo: "-",
              quantidade: 0,
              estoqueAnterior: 0,
              estoquePosterior: 0,
              createdAt: "-"
            }
          ]).map((movement) => [
            movement.createdAt,
            movement.produtoDescricao,
            movement.tipo,
            String(movement.quantidade),
            `${movement.estoqueAnterior} -> ${movement.estoquePosterior}`
          ])}
        />
      </Panel>
    </div>
  );
}

function CustomersModule({
  customers,
  onCreateCustomer,
  canManage
}: {
  customers: Customer[];
  onCreateCustomer: (input: Omit<Customer, "id">) => void;
  canManage: boolean;
}) {
  const [form, setForm] = useState({
    nome: "",
    cpfCnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    observacoes: ""
  });

  return (
    <div className="two-column">
      <Panel title="Novo cliente" icon={Users}>
        {canManage ? (
        <form
          className="entity-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateCustomer(form);
            setForm({ nome: "", cpfCnpj: "", telefone: "", email: "", endereco: "", observacoes: "" });
          }}
        >
          <input required placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input placeholder="CPF/CNPJ" value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} />
          <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Endereço opcional" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          <input placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          <button className="primary-button full" type="submit">Cadastrar cliente</button>
        </form>
        ) : (
          <p className="hint">Seu cargo permite consultar clientes, mas nao cadastrar novos registros.</p>
        )}
      </Panel>
      <Panel title="Clientes" icon={Users}>
        <FilterBar filters={["Nome", "CPF/CNPJ", "Telefone", "E-mail"]} />
        <ResponsiveTable
          headers={["Nome", "CPF/CNPJ", "Telefone", "E-mail"]}
          rows={(customers.length ? customers : []).map((customer) => [
            customer.nome,
            customer.cpfCnpj ?? "-",
            customer.telefone ?? "-",
            customer.email ?? "-"
          ])}
        />
      </Panel>
    </div>
  );
}

function FiscalDocumentsModule({
  documents,
  onAction
}: {
  documents: FiscalDocument[];
  onAction: (action: "reenviar-nfce" | "consultar-nfce" | "cancelar-nfce", document: FiscalDocument) => void;
}) {
  return (
    <Panel title="Histórico fiscal NFC-e modelo 65" icon={ReceiptText}>
      <FilterBar filters={["Data", "Cliente", "Pagamento", "Status fiscal"]} />
      <div className="document-list">
        {documents.map((document) => (
          <article className="document-card" key={document.id}>
            <div>
              <span className="eyebrow">{document.venda} | {document.data}</span>
              <h3>{document.cliente}</h3>
              <p>{document.cpf ?? "CPF não informado"} | {formatMoney(document.total)} | {document.formaPagamento}</p>
              {document.chave && <p className="mono">Chave {document.chave}</p>}
              {document.motivo && <p className="rejection">{document.motivo}</p>}
            </div>
            <div className="document-actions">
              <span className={`badge ${statusTone[document.status]}`}>{document.status}</span>
              <button className="secondary-button compact" onClick={() => onAction("consultar-nfce", document)}>
                <RefreshCcw size={15} />
                Consultar
              </button>
              <button className="secondary-button compact">
                <FileDown size={15} />
                XML/DANFE
              </button>
              {(document.status === "REJEITADA" || document.status === "NAO_EMITIDA") && (
                <button className="primary-button compact" onClick={() => onAction("reenviar-nfce", document)}>
                  Reenviar
                </button>
              )}
              {document.status === "AUTORIZADA" && (
                <button className="danger-button compact" onClick={() => onAction("cancelar-nfce", document)}>
                  Cancelar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function ReportsModule({ documents, products }: { documents: FiscalDocument[]; products: Product[] }) {
  const lowStock = products.filter((product) => product.estoqueAtual <= product.estoqueMinimo);
  return (
    <div className="module-grid">
      <FilterBar filters={["Data inicial", "Data final", "Operador", "Pagamento", "Status fiscal", "Exportar CSV"]} />
      <div className="chart-grid">
        <Panel title="Faturamento diário" icon={BarChart3}>
          <BarSeries values={[180, 220, 194, 288, 342, 316, 410]} />
        </Panel>
        <Panel title="Cupons autorizados e rejeitados" icon={FileText}>
          <StatusStack documents={documents} />
        </Panel>
        <Panel title="Produtos com estoque baixo" icon={AlertTriangle}>
          <RankList rows={lowStock.map((product) => [product.descricao, `${product.estoqueAtual} un`])} />
        </Panel>
        <Panel title="Vendas por operador" icon={UserCog}>
          <RankList rows={[["Ana Operadora", "R$ 4.820,30"], ["Carlos Gerente", "R$ 3.408,12"], ["Sistema", "R$ 912,00"]]} />
        </Panel>
      </div>
    </div>
  );
}

function FiscalSettingsModule({
  settings,
  onSave,
  canManage
}: {
  settings: FiscalSettings | null;
  onSave: (input: {
    ambiente: "homologacao" | "producao";
    serieNfce: string;
    proximoNumeroNfce: number;
    cscId?: string;
    cscToken?: string;
    certificadoPath?: string;
  }) => void;
  canManage: boolean;
}) {
  const [form, setForm] = useState({
    ambiente: settings?.ambiente ?? "homologacao",
    serieNfce: settings?.serieNfce ?? "1",
    proximoNumeroNfce: String(settings?.proximoNumeroNfce ?? 1),
    cscId: "",
    cscToken: "",
    certificadoPath: ""
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      ambiente: settings?.ambiente ?? "homologacao",
      serieNfce: settings?.serieNfce ?? "1",
      proximoNumeroNfce: String(settings?.proximoNumeroNfce ?? 1)
    }));
  }, [settings]);

  return (
    <div className="two-column">
      <Panel title="Configuração fiscal da empresa" icon={ShieldCheck}>
        <form
          className="settings-grid"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canManage) return;
            onSave({
              ambiente: form.ambiente as "homologacao" | "producao",
              serieNfce: form.serieNfce,
              proximoNumeroNfce: Number(form.proximoNumeroNfce),
              cscId: form.cscId,
              cscToken: form.cscToken,
              certificadoPath: form.certificadoPath
            });
            setForm((current) => ({ ...current, cscToken: "" }));
          }}
        >
          <label>
            Ambiente fiscal
            <select
              value={form.ambiente}
              onChange={(event) =>
                setForm({ ...form, ambiente: event.target.value as "homologacao" | "producao" })
              }
            >
              <option value="homologacao">Homologação</option>
              <option value="producao">Produção</option>
            </select>
          </label>
          <label>
            Série NFC-e
            <input value={form.serieNfce} onChange={(event) => setForm({ ...form, serieNfce: event.target.value })} />
          </label>
          <label>
            Próximo número NFC-e
            <input type="number" min={1} value={form.proximoNumeroNfce} onChange={(event) => setForm({ ...form, proximoNumeroNfce: event.target.value })} />
          </label>
          <label>
            ID do CSC
            <input value={form.cscId} onChange={(event) => setForm({ ...form, cscId: event.target.value })} placeholder="Ex: 000001" />
          </label>
          <label>
            CSC/token NFC-e
            <input type="password" value={form.cscToken} onChange={(event) => setForm({ ...form, cscToken: event.target.value })} placeholder={settings?.cscConfigurado ? "Já configurado. Preencha só para trocar." : "Armazenado somente no backend"} />
          </label>
          <label>
            Certificado digital A1
            <input value={form.certificadoPath} onChange={(event) => setForm({ ...form, certificadoPath: event.target.value })} placeholder={settings?.certificadoConfigurado ? "Já configurado. Preencha só para trocar." : "Caminho seguro no Storage/backend"} />
          </label>
          <button className="primary-button full" type="submit" disabled={!canManage}>Salvar configuração fiscal</button>
        </form>
        {!canManage && <p className="hint">Seu cargo permite consultar a configuracao fiscal, mas nao alterar dados sensiveis.</p>}
        <p className="hint">O frontend nunca exibe CSC/token completo, senha de certificado ou service_role.</p>
      </Panel>
      <Panel title="Indicadores de segurança fiscal" icon={KeyRound}>
        <div className="status-list">
          <StatusLine label="Configuração fiscal" status={settings ? "Criada" : "Incompleta"} tone={settings ? "success" : "warning"} />
          <StatusLine label="Certificado A1" status={settings?.certificadoConfigurado ? "Configurado" : "Não enviado"} tone={settings?.certificadoConfigurado ? "success" : "danger"} />
          <StatusLine label="CSC/token" status={settings?.cscConfigurado ? "Configurado e mascarado" : "Ausente"} tone={settings?.cscConfigurado ? "success" : "warning"} />
          <StatusLine label="Ambiente" status={settings?.ambiente === "producao" ? "Produção" : "Homologação"} tone={settings?.ambiente === "producao" ? "danger" : "warning"} />
          <StatusLine label="Edge Functions" status="Obrigatórias para NFC-e" tone="success" />
          <StatusLine label="Última atualização" status={settings?.updatedAt ?? "-"} tone="muted" />
        </div>
      </Panel>
    </div>
  );
}

function CompanyModule() {
  return (
    <Panel title="Empresa e multiempresa" icon={Building2}>
      <div className="settings-grid">
        {["Razão social", "Nome fantasia", "CNPJ", "Inscrição Estadual", "UF", "Município", "Endereço completo"].map((label) => (
          <label key={label}>
            {label}
            <input placeholder={label} />
          </label>
        ))}
      </div>
      <p className="hint">Todas as tabelas operacionais usam empresa_id e RLS para isolamento por empresa.</p>
    </Panel>
  );
}

function UsersModule({
  users,
  onCreateUser,
  onUpdateUser,
  canManage
}: {
  users: CompanyUserLink[];
  onCreateUser: (input: { email: string; nome?: string; perfil: string; password?: string }) => void;
  onUpdateUser: (input: { usuariosEmpresasId: string; perfil?: string; ativo?: boolean }) => void;
  canManage: boolean;
}) {
  const [form, setForm] = useState({
    email: "",
    nome: "",
    perfil: "operador",
    password: ""
  });

  return (
    <div className="two-column">
      <Panel title="Criar usuário da empresa" icon={UserCog}>
        {canManage ? (
        <form
          className="entity-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateUser(form);
            setForm({ email: "", nome: "", perfil: "operador", password: "" });
          }}
        >
          <input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="gerente">Gerente</option>
            <option value="operador">Operador de caixa</option>
            <option value="estoquista">Estoquista</option>
            <option value="visualizador">Visualizador</option>
          </select>
          <input placeholder="Senha inicial opcional" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="primary-button full" type="submit">Criar usuário</button>
        </form>
        ) : (
          <p className="hint">Seu cargo permite consultar usuarios, mas nao criar ou alterar acessos.</p>
        )}
      </Panel>

      <Panel title="Usuários e acessos" icon={UserCog}>
        <div className="access-list">
          {users.map((user) => (
            <div className="access-row" key={user.id}>
              <div>
                <strong>{user.userId.slice(0, 8)}</strong>
                <span>Criado em {user.createdAt}</span>
              </div>
              <select
                value={user.perfil}
                disabled={!canManage}
                onChange={(event) => onUpdateUser({ usuariosEmpresasId: user.id, perfil: event.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="gerente">Gerente</option>
                <option value="operador">Operador de caixa</option>
                <option value="estoquista">Estoquista</option>
                <option value="visualizador">Visualizador</option>
              </select>
              <button
                className={user.ativo ? "secondary-button compact" : "primary-button compact"}
                disabled={!canManage}
                onClick={() => onUpdateUser({ usuariosEmpresasId: user.id, ativo: !user.ativo })}
              >
                {user.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))}
          {!users.length && <p className="empty-state">Nenhum usuário vinculado ainda.</p>}
        </div>
      </Panel>
    </div>
  );
}

function GeneralSettingsModule() {
  return (
    <Panel title="Configurações gerais" icon={Settings}>
      <div className="status-list">
        <StatusLine label="Permitir estoque negativo" status="Desativado" tone="success" />
        <StatusLine label="Reimpressão de DANFE" status="Com auditoria" tone="info" />
        <StatusLine label="Baixa de estoque" status="Após confirmação da venda" tone="success" />
        <StatusLine label="Reenvio NFC-e" status="Sem duplicar estoque" tone="success" />
      </div>
    </Panel>
  );
}

function Kpi({
  title,
  value,
  icon: Icon,
  trend,
  tone = "info"
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "info" | "success" | "danger" | "warning" | "neutral";
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        {trend && <small>{trend} vs ontem</small>}
      </div>
      <Icon size={23} />
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header>
        <div>
          <Icon size={19} />
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function BarSeries({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return (
    <div className="bar-series">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ height: `${(value / max) * 100}%` }}>
          <small>{value}</small>
        </span>
      ))}
    </div>
  );
}

function StatusStack({ documents }: { documents: FiscalDocument[] }) {
  const statuses: FiscalStatus[] = ["AUTORIZADA", "REJEITADA", "ENVIANDO", "CANCELADA", "CONTINGENCIA", "NAO_EMITIDA"];
  return (
    <div className="status-stack">
      {statuses.map((status) => {
        const count = documents.filter((document) => document.status === status).length;
        return <StatusLine key={status} label={status} status={`${count} registro(s)`} tone={statusTone[status]} />;
      })}
    </div>
  );
}

function PaymentBars() {
  return (
    <div className="payment-bars">
      {[
        ["Pix", 42],
        ["Débito", 24],
        ["Crédito", 21],
        ["Dinheiro", 13]
      ].map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <meter min={0} max={100} value={Number(value)} />
          <strong>{value}%</strong>
        </div>
      ))}
    </div>
  );
}

function RankList({ rows }: { rows: string[][] }) {
  return (
    <div className="rank-list">
      {rows.map(([label, value], index) => (
        <div key={label}>
          <span>{index + 1}</span>
          <strong>{label}</strong>
          <em>{value}</em>
        </div>
      ))}
    </div>
  );
}

function FilterBar({ filters }: { filters: string[] }) {
  return (
    <div className="filter-bar">
      <Filter size={17} />
      {filters.map((filter) => (
        <button key={filter}>{filter}</button>
      ))}
    </div>
  );
}

function ResponsiveTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td data-label={headers[cellIndex]} key={`${cell}-${cellIndex}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusLine({ label, status, tone }: { label: string; status: string; tone: string }) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <strong className={`badge ${tone}`}>{status}</strong>
    </div>
  );
}
