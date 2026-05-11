import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { callFiscalApi } from "../_shared/fiscal.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { documento_fiscal_id } = await request.json();
    if (!documento_fiscal_id) return jsonResponse({ error: "documento_fiscal_id é obrigatório." }, 400);

    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();

    const { data: document, error } = await service
      .from("documentos_fiscais")
      .select("*")
      .eq("id", documento_fiscal_id)
      .maybeSingle();

    if (error) throw error;
    if (!document) return jsonResponse({ error: "Documento fiscal não encontrado." }, 404);

    await assertCompanyRole(service, user.id, document.empresa_id, ["admin", "gerente", "operador", "visualizador"]);

    const result = await callFiscalApi("/nfce/consultar", {
      chave_acesso: document.chave_acesso,
      venda_id: document.venda_id,
      documento_fiscal_id: document.id
    });

    const { data: updated, error: updateError } = await service
      .from("documentos_fiscais")
      .update({
        status: result.status,
        protocolo: result.protocolo ?? document.protocolo,
        motivo_rejeicao: result.motivo_rejeicao ?? null
      })
      .eq("id", document.id)
      .select()
      .single();

    if (updateError) throw updateError;
    await service.from("vendas").update({ status_fiscal: result.status }).eq("id", document.venda_id);

    return jsonResponse({ data: updated });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
