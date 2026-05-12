import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();
    const { empresa_id, usuarios_empresas_id, perfil, ativo } = await request.json();

    if (!empresa_id || !usuarios_empresas_id) {
      return jsonResponse({ error: "empresa_id e usuarios_empresas_id são obrigatórios." }, 400);
    }

    await assertCompanyRole(service, user.id, empresa_id, ["admin"]);

    const patch: Record<string, unknown> = {};
    if (perfil) {
      if (!["admin", "gerente", "operador", "estoquista", "visualizador"].includes(perfil)) {
        return jsonResponse({ error: "Perfil inválido." }, 400);
      }
      patch.perfil = perfil;
    }
    if (typeof ativo === "boolean") patch.ativo = ativo;

    const { data, error } = await service
      .from("usuarios_empresas")
      .update(patch)
      .eq("id", usuarios_empresas_id)
      .eq("empresa_id", empresa_id)
      .select()
      .single();

    if (error) throw error;
    return jsonResponse({ data });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
