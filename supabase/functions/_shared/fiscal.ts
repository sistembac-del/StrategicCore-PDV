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

export async function callFiscalApi(path: string, payload: unknown): Promise<FiscalApiResult> {
  const fiscalApiUrl = Deno.env.get("FISCAL_API_URL");
  const fiscalApiKey = Deno.env.get("FISCAL_API_KEY");

  if (!fiscalApiUrl || !fiscalApiKey) {
    throw new Error("API fiscal externa não configurada nas secrets da Edge Function.");
  }

  const response = await fetch(`${fiscalApiUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fiscalApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? "Falha ao comunicar com a API fiscal externa.");
  }

  return data as FiscalApiResult;
}

export function validateFiscalItems(items: Array<Record<string, unknown>>) {
  const invalid = items.filter((item) => !item.ncm || !item.cfop || (!item.csosn && !item.cst));
  if (invalid.length) {
    throw new Error("Existem itens sem NCM, CFOP e CST/CSOSN mínimos para NFC-e.");
  }
}

export function makeFiscalStoragePath(empresaId: string, vendaId: string, fileName: string) {
  return `${empresaId}/vendas/${vendaId}/${fileName}`;
}
