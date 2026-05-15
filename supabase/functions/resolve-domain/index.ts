import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const body = await request.json().catch(() => ({}));
    const hostname = String(body.hostname ?? "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "")
      .split(":")[0];

    if (!hostname) return jsonResponse({ data: null });

    const service = createServiceClient();
    const { data, error } = await service
      .from("empresa_dominios")
      .select("empresa_id, dominio, status, empresas(razao_social, nome_fantasia, ativo)")
      .eq("dominio", hostname)
      .maybeSingle();

    if (error) throw error;
    if (!data) return jsonResponse({ data: null });

    const company = Array.isArray(data.empresas) ? data.empresas[0] : data.empresas;
    if (!company?.ativo) {
      return jsonResponse({
        data: {
          empresaId: data.empresa_id,
          dominio: data.dominio,
          status: "empresa_inativa",
          nomeFantasia: company?.nome_fantasia ?? "Empresa",
          razaoSocial: company?.razao_social ?? "Empresa"
        }
      });
    }

    return jsonResponse({
      data: {
        empresaId: data.empresa_id,
        dominio: data.dominio,
        status: data.status,
        nomeFantasia: company?.nome_fantasia ?? "Empresa",
        razaoSocial: company?.razao_social ?? "Empresa"
      }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
