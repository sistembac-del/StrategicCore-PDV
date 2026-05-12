import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { normalizeEmail, requireSuperAdmin } from "../_shared/admin.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { service } = await requireSuperAdmin(request, ["owner", "admin"]);
    const body = await request.json();

    const email = normalizeEmail(body.email ?? "");
    const password = body.password || crypto.randomUUID().slice(0, 12) + "Aa1!";
    const razaoSocial = String(body.razao_social ?? "").trim();
    const nomeFantasia = String(body.nome_fantasia ?? "").trim();
    const cnpj = String(body.cnpj ?? "").replace(/\D/g, "");

    if (!email || !razaoSocial || !nomeFantasia || !cnpj) {
      return jsonResponse({ error: "E-mail, razão social, nome fantasia e CNPJ são obrigatórios." }, 400);
    }

    const { data: userData, error: userError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: body.nome_admin ?? nomeFantasia }
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error("Usuário não foi criado.");

    const { data: empresa, error: empresaError } = await service
      .from("empresas")
      .insert({
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnpj,
        inscricao_estadual: body.inscricao_estadual ?? "ISENTO",
        regime_tributario: body.regime_tributario ?? "simples_nacional",
        uf: body.uf ?? "CE",
        municipio: body.municipio ?? "Fortaleza",
        endereco: body.endereco ?? {},
        ativo: true
      })
      .select("id, nome_fantasia")
      .single();

    if (empresaError) throw empresaError;

    const { error: linkError } = await service.from("usuarios_empresas").insert({
      user_id: userData.user.id,
      empresa_id: empresa.id,
      perfil: "admin",
      ativo: true
    });

    if (linkError) throw linkError;

    return jsonResponse({
      data: {
        empresa_id: empresa.id,
        user_id: userData.user.id,
        email,
        temporary_password: password
      }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
