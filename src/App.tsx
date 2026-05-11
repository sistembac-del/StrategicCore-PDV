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
import { useMemo, useState } from "react";
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

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(productsSeed);
  const [documents, setDocuments] = useState<FiscalDocument[]>(documentsSeed);
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

  async function handleLogin(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setToast(error.message);
        return;
      }
    }
    setIsAuthenticated(true);
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

  function finishSale(emitFiscal: boolean) {
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

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} toast={toast} />;
  }

  const activeLabel = navItems.find((item) => item.id === activeModule)?.label ?? "Dashboard";

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
        <Menu size={20} />
      </button>

      <Sidebar
        activeModule={activeModule}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onCollapse={() => setSidebarCollapsed((value) => !value)}
        onNavigate={(moduleId) => {
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
              Mercado Central Demo
            </span>
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

        {activeModule === "dashboard" && <Dashboard products={products} documents={documents} />}
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
          />
        )}
        {activeModule === "produtos" && <ProductsModule products={products} />}
        {activeModule === "estoque" && <StockModule products={products} />}
        {activeModule === "clientes" && <CustomersModule />}
        {activeModule === "nfce" && <FiscalDocumentsModule documents={documents} onAction={triggerFiscalAction} />}
        {activeModule === "relatorios" && <ReportsModule documents={documents} products={products} />}
        {activeModule === "fiscal" && <FiscalSettingsModule />}
        {activeModule === "empresa" && <CompanyModule />}
        {activeModule === "usuarios" && <UsersModule />}
        {activeModule === "gerais" && <GeneralSettingsModule />}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin, toast }: { onLogin: (email: string, password: string) => void; toast: string }) {
  const [email, setEmail] = useState("admin@strategiccore.systems");
  const [password, setPassword] = useState("demo123");

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
          onLogin(email, password);
        }}
      >
        <div className="security-chip">
          <LockKeyhole size={16} />
          Ambiente empresarial seguro
        </div>
        <h2>Acesso operacional</h2>
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
          Entrar
        </button>
        <button type="button" className="text-button">
          Esqueci minha senha
        </button>
        {!isSupabaseConfigured && <p className="hint">Modo demonstração ativo até configurar o Supabase.</p>}
        {toast && <p className="form-error">{toast}</p>}
      </form>
    </main>
  );
}

function Sidebar({
  activeModule,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onCollapse,
  onNavigate
}: {
  activeModule: ModuleId;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onNavigate: (moduleId: ModuleId) => void;
}) {
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
          {navItems.map((item) => (
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
                <button className="primary-button compact" onClick={() => props.onAdd(product)}>
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
}) {
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
                onChange={(event) => props.onQuantity(item.product.id, Number(event.target.value))}
                aria-label="Quantidade"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.desconto}
                onChange={(event) => props.onDiscount(item.product.id, Number(event.target.value))}
                aria-label="Desconto"
              />
              <button className="icon-button danger" onClick={() => props.onRemove(item.product.id)} aria-label="Remover">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <label>
        CPF do consumidor
        <input value={props.consumerCpf} onChange={(event) => props.onConsumerCpf(event.target.value)} placeholder="Opcional" />
      </label>

      <label>
        Desconto geral
        <input
          type="number"
          min={0}
          step="0.01"
          value={props.globalDiscount}
          onChange={(event) => props.onGlobalDiscount(Number(event.target.value))}
        />
      </label>

      <div className="segmented">
        {paymentOptions.map((option) => (
          <button
            key={option}
            className={props.paymentMethod === option ? "selected" : ""}
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

      <button className="secondary-button full" onClick={() => props.onFinish(false)}>
        Finalizar venda
      </button>
      <button className="primary-button full" onClick={() => props.onFinish(true)}>
        Finalizar e emitir NFC-e
      </button>
    </aside>
  );
}

function ProductsModule({ products }: { products: Product[] }) {
  return (
    <Panel title="Cadastro de produtos" icon={Package} action={<button className="primary-button compact">Novo produto</button>}>
      <FilterBar filters={["Nome", "Código", "Barras", "Categoria", "Ativos", "Estoque baixo", "Fiscal incompleto"]} />
      <ResponsiveTable
        headers={["Código", "Produto", "Preço", "Estoque", "Fiscal", "Status"]}
        rows={products.map((product) => [
          product.codigo,
          `${product.descricao} | ${product.categoria}`,
          formatMoney(product.precoVenda),
          `${product.estoqueAtual} ${product.unidade}`,
          product.ncm && (product.csosn || product.cst) ? "Completo" : "Incompleto",
          product.ativo ? "Ativo" : "Inativo"
        ])}
      />
    </Panel>
  );
}

function StockModule({ products }: { products: Product[] }) {
  return (
    <div className="two-column">
      <Panel title="Estoque atual" icon={Boxes}>
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
        <RankList
          rows={[
            ["Entrada manual | Café Premium", "+24 un"],
            ["Venda | Açúcar Cristal", "-3 un"],
            ["Ajuste negativo | Detergente", "-2 un"],
            ["Cancelamento de venda | Fone", "+1 un"]
          ]}
        />
      </Panel>
    </div>
  );
}

function CustomersModule() {
  return (
    <Panel title="Clientes" icon={Users} action={<button className="primary-button compact">Novo cliente</button>}>
      <FilterBar filters={["Nome", "CPF/CNPJ", "Telefone", "E-mail"]} />
      <ResponsiveTable
        headers={["Nome", "CPF/CNPJ", "Telefone", "E-mail"]}
        rows={[
          ["Mariana Alves", "123.456.789-09", "(85) 98888-1001", "mariana@email.com"],
          ["João Pereira ME", "12.345.678/0001-90", "(85) 3777-2000", "financeiro@jpme.com"],
          ["Consumidor balcão", "-", "-", "-"]
        ]}
      />
    </Panel>
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

function FiscalSettingsModule() {
  return (
    <div className="two-column">
      <Panel title="Configuração fiscal da empresa" icon={ShieldCheck}>
        <div className="settings-grid">
          {["CNPJ", "Razão social", "Inscrição Estadual", "Regime tributário", "UF", "Município", "Série NFC-e", "Número inicial NFC-e"].map(
            (label) => (
              <label key={label}>
                {label}
                <input placeholder={label} />
              </label>
            )
          )}
          <label>
            Ambiente fiscal
            <select defaultValue="homologacao">
              <option value="homologacao">Homologação</option>
              <option value="producao">Produção</option>
            </select>
          </label>
          <label>
            Certificado digital A1
            <input type="file" />
          </label>
          <label>
            Senha do certificado
            <input type="password" placeholder="Não será exibida após salvar" />
          </label>
          <label>
            CSC/token NFC-e
            <input type="password" placeholder="Armazenado somente no backend" />
          </label>
        </div>
        <button className="primary-button">Salvar configuração fiscal</button>
      </Panel>
      <Panel title="Indicadores de segurança fiscal" icon={KeyRound}>
        <div className="status-list">
          <StatusLine label="Configuração fiscal" status="Incompleta" tone="warning" />
          <StatusLine label="Certificado A1" status="Não enviado" tone="danger" />
          <StatusLine label="CSC/token" status="Mascarado após salvar" tone="info" />
          <StatusLine label="Ambiente" status="Homologação" tone="warning" />
          <StatusLine label="Edge Functions" status="Obrigatórias para NFC-e" tone="success" />
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

function UsersModule() {
  return (
    <Panel title="Usuários e acessos" icon={UserCog} action={<button className="primary-button compact">Convidar usuário</button>}>
      <ResponsiveTable
        headers={["Usuário", "Perfil", "Permissões", "Status"]}
        rows={[
          ["Ana Souza", "Dono/Admin", "Acesso total", "Ativo"],
          ["Carlos Lima", "Gerente", "Vendas, produtos, estoque, relatórios", "Ativo"],
          ["Paula Nunes", "Operador de caixa", "PDV e próprias vendas", "Ativo"],
          ["Roberto Dias", "Estoquista", "Produtos e estoque", "Ativo"],
          ["Auditoria", "Visualizador", "Somente leitura", "Ativo"]
        ]}
      />
    </Panel>
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
