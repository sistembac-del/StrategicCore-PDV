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
