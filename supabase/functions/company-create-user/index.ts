import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { assertCompanyCanCreateUser, assertCompanyRole, createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { normalizeEmail } from "../_shared/admin.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const user = await getAuthenticatedUser(request);
    const service = createServiceClient();
    const body = await request.json();

    const empresaId = body.empresa_id;
    const email = normalizeEmail(body.email ?? "");
    const perfil = body.perfil ?? "operador";
    const password = body.password || crypto.randomUUID().slice(0, 12) + "Aa1!";

    if (!empresaId || !email) return jsonResponse({ error: "empresa_id e e-mail são obrigatórios." }, 400);
    if (!["admin", "gerente", "operador", "estoquista", "visualizador"].includes(perfil)) {
      return jsonResponse({ error: "Perfil inválido." }, 400);
    }

    await assertCompanyRole(service, user.id, empresaId, ["admin"]);
    await assertCompanyCanCreateUser(service, empresaId);

    const { data: userData, error: userError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: body.nome ?? email }
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error("Usuário não foi criado.");

    const { data: link, error: linkError } = await service
      .from("usuarios_empresas")
      .insert({
        user_id: userData.user.id,
        empresa_id: empresaId,
        perfil,
        ativo: true
      })
      .select()
      .single();

    if (linkError) throw linkError;
    return jsonResponse({ data: { link, email, temporary_password: password } });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
