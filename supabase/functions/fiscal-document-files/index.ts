import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

const BUCKET = "documentos-fiscais";
const EXPIRES_IN_SECONDS = 300;

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { documento_fiscal_id } = await request.json();
    if (!documento_fiscal_id) return jsonResponse({ error: "documento_fiscal_id e obrigatorio." }, 400);

    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();

    const { data: document, error: documentError } = await service
      .from("documentos_fiscais")
      .select("id, empresa_id, venda_id, status, chave_acesso, xml_path, danfe_path")
      .eq("id", documento_fiscal_id)
      .maybeSingle();

    if (documentError) throw documentError;
    if (!document) return jsonResponse({ error: "Documento fiscal nao encontrado." }, 404);

    await assertCompanyRole(service, user.id, document.empresa_id, ["admin", "gerente", "operador", "visualizador"]);

    const [xmlResult, danfeResult] = await Promise.all([
      createSignedUrl(service, document.xml_path),
      createSignedUrl(service, document.danfe_path)
    ]);

    return jsonResponse({
      data: {
        documento_fiscal_id: document.id,
        venda_id: document.venda_id,
        status: document.status,
        chave_acesso: document.chave_acesso,
        expires_in: EXPIRES_IN_SECONDS,
        xml_url: xmlResult.url,
        danfe_url: danfeResult.url,
        xml_available: Boolean(xmlResult.url),
        danfe_available: Boolean(danfeResult.url)
      }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});

async function createSignedUrl(service: ReturnType<typeof createServiceClient>, path?: string | null) {
  if (!path) return { url: null as string | null };

  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN_SECONDS);
  if (error) return { url: null as string | null };
  return { url: data.signedUrl };
}
