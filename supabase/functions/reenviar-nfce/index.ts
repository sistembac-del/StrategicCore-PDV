import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { emitNfceForSale } from "../_shared/emit-nfce.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { venda_id } = await request.json();
    if (!venda_id) return jsonResponse({ error: "venda_id é obrigatório." }, 400);

    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();

    const { data: venda, error: vendaError } = await service
      .from("vendas")
      .select("id, empresa_id, status_fiscal")
      .eq("id", venda_id)
      .maybeSingle();

    if (vendaError) throw vendaError;
    if (!venda) return jsonResponse({ error: "Venda não encontrada." }, 404);

    await assertCompanyRole(service, user.id, venda.empresa_id, ["admin", "gerente", "operador"]);

    if (!["REJEITADA", "NAO_EMITIDA"].includes(venda.status_fiscal)) {
      return jsonResponse({ error: "Reenvio permitido apenas para NFC-e rejeitada ou não emitida." }, 422);
    }

    const result = await emitNfceForSale(service, user, venda_id);
    return jsonResponse({ data: result.document, idempotent: result.idempotent });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
