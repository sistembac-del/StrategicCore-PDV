import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireSuperAdmin } from "../_shared/admin.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { service, user } = await requireSuperAdmin(request, ["owner", "admin"]);
    const { empresa_id, dominio, status = "pendente", observacao } = await request.json();

    const normalizedDomain = String(dominio ?? "").trim().toLowerCase();
    if (!empresa_id || !normalizedDomain) {
      return jsonResponse({ error: "Empresa e domínio são obrigatórios." }, 400);
    }

    const { data, error } = await service
      .from("empresa_dominios")
      .upsert(
        {
          empresa_id,
          dominio: normalizedDomain,
          status,
          observacao,
          criado_por: user.id
        },
        { onConflict: "dominio" }
      )
      .select()
      .single();

    if (error) throw error;
    return jsonResponse({ data });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
