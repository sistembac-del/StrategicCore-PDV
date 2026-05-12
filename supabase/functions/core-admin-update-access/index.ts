import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireSuperAdmin } from "../_shared/admin.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { service } = await requireSuperAdmin(request, ["owner", "admin"]);
    const { usuarios_empresas_id, perfil, ativo } = await request.json();

    if (!usuarios_empresas_id) {
      return jsonResponse({ error: "usuarios_empresas_id é obrigatório." }, 400);
    }

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
      .select()
      .single();

    if (error) throw error;
    return jsonResponse({ data });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
