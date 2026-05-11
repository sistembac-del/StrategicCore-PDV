import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { callFiscalApi } from "../_shared/fiscal.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { documento_fiscal_id, motivo } = await request.json();
    if (!documento_fiscal_id) return jsonResponse({ error: "documento_fiscal_id é obrigatório." }, 400);
    if (!motivo || String(motivo).trim().length < 15) {
      return jsonResponse({ error: "Motivo de cancelamento obrigatório com pelo menos 15 caracteres." }, 400);
    }

    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();

    const { data: document, error } = await service
      .from("documentos_fiscais")
      .select("*")
      .eq("id", documento_fiscal_id)
      .maybeSingle();

    if (error) throw error;
    if (!document) return jsonResponse({ error: "Documento fiscal não encontrado." }, 404);
    if (document.status !== "AUTORIZADA") return jsonResponse({ error: "Somente NFC-e autorizada pode ser cancelada." }, 422);

    await assertCompanyRole(service, user.id, document.empresa_id, ["admin", "gerente"]);

    const result = await callFiscalApi("/nfce/cancelar", {
      chave_acesso: document.chave_acesso,
      protocolo: document.protocolo,
      motivo
    });

    const { data: updated, error: updateError } = await service
      .from("documentos_fiscais")
      .update({
        status: "CANCELADA",
        protocolo_cancelamento: result.protocolo_cancelamento ?? result.protocolo,
        cancelado_em: new Date().toISOString()
      })
      .eq("id", document.id)
      .select()
      .single();

    if (updateError) throw updateError;
    await service.from("vendas").update({ status_fiscal: "CANCELADA" }).eq("id", document.venda_id);

    return jsonResponse({ data: updated });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
