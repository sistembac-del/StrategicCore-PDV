import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { normalizeEmail, requireSuperAdmin } from "../_shared/admin.ts";
import { assertCompanyCanCreateUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { service } = await requireSuperAdmin(request, ["owner", "admin"]);
    const body = await request.json();

    const email = normalizeEmail(body.email ?? "");
    const empresaId = body.empresa_id;
    const perfil = body.perfil ?? "operador";
    const password = body.password || crypto.randomUUID().slice(0, 12) + "Aa1!";

    if (!email || !empresaId) {
      return jsonResponse({ error: "E-mail e empresa são obrigatórios." }, 400);
    }

    if (!["admin", "gerente", "operador", "estoquista", "visualizador"].includes(perfil)) {
      return jsonResponse({ error: "Perfil inválido." }, 400);
    }

    await assertCompanyCanCreateUser(service, empresaId);

    const { data: userData, error: userError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: body.nome ?? email }
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error("Usuário não foi criado.");

    const { error: linkError } = await service.from("usuarios_empresas").insert({
      user_id: userData.user.id,
      empresa_id: empresaId,
      perfil,
      ativo: true
    });

    if (linkError) throw linkError;

    return jsonResponse({ data: { user_id: userData.user.id, email, temporary_password: password } });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
