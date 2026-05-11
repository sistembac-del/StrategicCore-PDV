import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { emitNfceForSale } from "../_shared/emit-nfce.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { venda_id } = await request.json();
    if (!venda_id) return jsonResponse({ error: "venda_id é obrigatório." }, 400);

    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();
    const result = await emitNfceForSale(service, user, venda_id);

    return jsonResponse({ data: result.document, idempotent: result.idempotent });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
