import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.0";

export type UserRole = "admin" | "gerente" | "operador" | "estoquista" | "visualizador";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function createRequestClient(request: Request) {
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: request.headers.get("Authorization") ?? ""
      }
    }
  });
}

export async function assertCompanyCanCreateUser(
  serviceClient: ReturnType<typeof createServiceClient>,
  empresaId: string
) {
  const [{ data: license, error: licenseError }, { count, error: countError }] = await Promise.all([
    serviceClient
      .from("licencas_empresas")
      .select("status, fim_teste, vencimento, limite_usuarios")
      .eq("empresa_id", empresaId)
      .maybeSingle(),
    serviceClient
      .from("usuarios_empresas")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
  ]);

  if (licenseError) throw licenseError;
  if (countError) throw countError;
  if (!license) throw new Error("Empresa sem licença SaaS configurada.");

  const today = new Date().toISOString().slice(0, 10);
  const active =
    (license.status === "ativo" && (!license.vencimento || license.vencimento >= today)) ||
    (license.status === "teste" && (!license.fim_teste || license.fim_teste >= today));

  if (!active) throw new Error("Licença vencida, bloqueada ou sem período ativo.");
  if ((count ?? 0) >= Number(license.limite_usuarios ?? 0)) {
    throw new Error("Limite de usuários atingido para o plano contratado.");
  }
}

export function createServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function getAuthenticatedUser(request: Request) {
  const client = createRequestClient(request);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error("Usuário não autenticado.");
  }
  return data.user;
}

export async function assertCompanyRole(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  empresaId: string,
  allowedRoles: UserRole[]
) {
  const { data, error } = await serviceClient
    .from("usuarios_empresas")
    .select("perfil, ativo")
    .eq("user_id", userId)
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  if (!data || !allowedRoles.includes(data.perfil as UserRole)) {
    throw new Error("Usuário sem permissão para esta empresa.");
  }
}
