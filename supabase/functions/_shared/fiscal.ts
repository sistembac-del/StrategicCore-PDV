export interface FiscalApiResult {
  status: "AUTORIZADA" | "REJEITADA" | "CONTINGENCIA";
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  protocolo?: string;
  motivo_rejeicao?: string;
  qr_code?: string;
  xml?: string;
  danfe_pdf_base64?: string;
  autorizado_em?: string;
  protocolo_cancelamento?: string;
}

export type FiscalOperation = "emitir" | "cancelar" | "consultar";

export interface FiscalProviderStatus {
  provider: string;
  configured: boolean;
  base_url_configured: boolean;
  api_key_configured: boolean;
  base_url_host?: string;
  auth_header: string;
  endpoints: Record<FiscalOperation, string>;
  timeout_ms: number;
  health_check_configured: boolean;
  health_check_ok?: boolean;
  health_check_status?: number;
}

interface FiscalProviderConfig {
  provider: string;
  fiscalApiUrl?: string;
  fiscalApiKey?: string;
  authHeader: string;
  authScheme: string;
  endpoints: Record<FiscalOperation, string>;
  timeoutMs: number;
  healthPath?: string;
}

const defaultEndpoints: Record<FiscalOperation, string> = {
  emitir: "/nfce/emitir",
  cancelar: "/nfce/cancelar",
  consultar: "/nfce/consultar"
};

export function getFiscalProviderConfig(): FiscalProviderConfig {
  return {
    provider: Deno.env.get("FISCAL_PROVIDER_NAME")?.trim() || "generic",
    fiscalApiUrl: Deno.env.get("FISCAL_API_URL")?.trim(),
    fiscalApiKey: Deno.env.get("FISCAL_API_KEY")?.trim(),
    authHeader: Deno.env.get("FISCAL_API_AUTH_HEADER")?.trim() || "Authorization",
    authScheme: Deno.env.get("FISCAL_API_AUTH_SCHEME")?.trim() ?? "Bearer",
    endpoints: {
      emitir: Deno.env.get("FISCAL_API_EMITIR_PATH")?.trim() || defaultEndpoints.emitir,
      cancelar: Deno.env.get("FISCAL_API_CANCELAR_PATH")?.trim() || defaultEndpoints.cancelar,
      consultar: Deno.env.get("FISCAL_API_CONSULTAR_PATH")?.trim() || defaultEndpoints.consultar
    },
    timeoutMs: Math.max(5000, Number(Deno.env.get("FISCAL_API_TIMEOUT_MS") ?? 30000)),
    healthPath: Deno.env.get("FISCAL_API_HEALTH_PATH")?.trim()
  };
}

export async function getFiscalProviderStatus(): Promise<FiscalProviderStatus> {
  const config = getFiscalProviderConfig();
  const status: FiscalProviderStatus = {
    provider: config.provider,
    configured: Boolean(config.fiscalApiUrl && config.fiscalApiKey),
    base_url_configured: Boolean(config.fiscalApiUrl),
    api_key_configured: Boolean(config.fiscalApiKey),
    base_url_host: safeHost(config.fiscalApiUrl),
    auth_header: config.authHeader,
    endpoints: config.endpoints,
    timeout_ms: config.timeoutMs,
    health_check_configured: Boolean(config.healthPath)
  };

  if (config.fiscalApiUrl && config.healthPath) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs, 8000));
    try {
      const response = await fetch(buildFiscalUrl(config.fiscalApiUrl, config.healthPath), {
        method: "GET",
        headers: buildAuthHeaders(config),
        signal: controller.signal
      });
      status.health_check_ok = response.ok;
      status.health_check_status = response.status;
    } catch {
      status.health_check_ok = false;
    } finally {
      clearTimeout(timeout);
    }
  }

  return status;
}

export async function callFiscalApi(path: string, payload: unknown): Promise<FiscalApiResult> {
  const config = getFiscalProviderConfig();

  if (!config.fiscalApiUrl || !config.fiscalApiKey) {
    throw new Error("API fiscal externa nao configurada nas secrets da Edge Function. Configure FISCAL_API_URL e FISCAL_API_KEY no Supabase.");
  }

  const operation = operationFromPath(path);
  const endpoint = operation ? config.endpoints[operation] : path;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(buildFiscalUrl(config.fiscalApiUrl, endpoint), {
      method: "POST",
      headers: {
        ...buildAuthHeaders(config),
        "X-CoreFlow-Provider": config.provider,
        "X-CoreFlow-Operation": operation ?? "custom",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message ?? data?.erro ?? data?.error ?? "Falha ao comunicar com a API fiscal externa.");
    }

    return normalizeFiscalApiResult(data);
  } finally {
    clearTimeout(timeout);
  }
}

export function validateFiscalItems(items: Array<Record<string, unknown>>) {
  const invalid = items.filter((item) => !item.ncm || !item.cfop || (!item.csosn && !item.cst));
  if (invalid.length) {
    throw new Error("Existem itens sem NCM, CFOP e CST/CSOSN minimos para NFC-e.");
  }
}

export function makeFiscalStoragePath(empresaId: string, vendaId: string, fileName: string) {
  return `${empresaId}/vendas/${vendaId}/${fileName}`;
}

function operationFromPath(path: string): FiscalOperation | null {
  if (path.includes("emitir")) return "emitir";
  if (path.includes("cancelar")) return "cancelar";
  if (path.includes("consultar")) return "consultar";
  return null;
}

function buildFiscalUrl(baseUrl: string, endpoint: string) {
  return `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
}

function buildAuthHeaders(config: FiscalProviderConfig) {
  const token = config.authScheme ? `${config.authScheme} ${config.fiscalApiKey}` : config.fiscalApiKey!;
  return { [config.authHeader]: token };
}

function safeHost(url?: string) {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return "URL invalida";
  }
}

function normalizeFiscalApiResult(data: any): FiscalApiResult {
  const source = data?.data ?? data?.result ?? data;
  const rawStatus = String(source.status ?? source.status_fiscal ?? source.situacao ?? "").toUpperCase();
  const status = ["AUTORIZADA", "REJEITADA", "CONTINGENCIA"].includes(rawStatus) ? rawStatus : "REJEITADA";

  return {
    status: status as FiscalApiResult["status"],
    numero: source.numero ?? source.numero_nfce ?? source.nNF,
    serie: source.serie ?? source.serie_nfce,
    chave_acesso: source.chave_acesso ?? source.chave ?? source.chaveNFe,
    protocolo: source.protocolo ?? source.protocolo_autorizacao ?? source.nProt,
    motivo_rejeicao: source.motivo_rejeicao ?? source.motivo ?? source.mensagem,
    qr_code: source.qr_code ?? source.qrcode,
    xml: source.xml ?? source.xml_autorizado,
    danfe_pdf_base64: source.danfe_pdf_base64 ?? source.danfe_base64 ?? source.pdf_base64,
    autorizado_em: source.autorizado_em ?? source.data_autorizacao,
    protocolo_cancelamento: source.protocolo_cancelamento
  };
}
