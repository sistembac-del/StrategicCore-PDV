import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const body = await request.json();
    const empresaId = body.empresa_id;
    if (!empresaId) return jsonResponse({ error: "empresa_id é obrigatório." }, 400);

    await assertCompanyRole(service, user.id, empresaId, ["admin"]);

    const patch: Record<string, unknown> = {
      empresa_id: empresaId,
      ambiente: body.ambiente ?? "homologacao",
      serie_nfce: String(body.serie_nfce ?? "1"),
      proximo_numero_nfce: Number(body.proximo_numero_nfce ?? 1),
      ativo: true
    };

    if (body.csc_id) patch.csc_id = String(body.csc_id);
    if (body.csc_token) {
      patch.csc_token = String(body.csc_token);
      patch.csc_configurado = true;
    }
    if (body.certificado_path) {
      patch.certificado_path = String(body.certificado_path);
      patch.certificado_configurado = true;
    }
    if (body.certificado_configurado === false) patch.certificado_configurado = false;
    if (body.csc_configurado === false) patch.csc_configurado = false;

    const { data, error } = await service
      .from("configuracoes_fiscais")
      .upsert(patch, { onConflict: "empresa_id" })
      .select(
        "id, empresa_id, ambiente, serie_nfce, proximo_numero_nfce, certificado_configurado, csc_configurado, ativo, updated_at"
      )
      .single();

    if (error) throw error;
    return jsonResponse({ data });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
