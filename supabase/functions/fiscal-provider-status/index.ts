import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getFiscalProviderStatus } from "../_shared/fiscal.ts";
import { assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { empresa_id } = await request.json();
    if (!empresa_id) return jsonResponse({ error: "empresa_id e obrigatorio." }, 400);

    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();
    await assertCompanyRole(service, user.id, empresa_id, ["admin", "gerente"]);

    const status = await getFiscalProviderStatus();
    return jsonResponse({ data: status });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
