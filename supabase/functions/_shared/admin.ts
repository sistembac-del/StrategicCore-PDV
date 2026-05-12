import { createServiceClient, getAuthenticatedUser } from "./supabase.ts";

export async function requireSuperAdmin(request: Request, roles = ["owner", "admin"]) {
  const user = await getAuthenticatedUser(request);
  const service = createServiceClient();

  const { data, error } = await service
    .from("super_admins")
    .select("role, ativo")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  if (!data || !roles.includes(data.role)) {
    throw new Error("Acesso restrito ao Core Admin.");
  }

  return { user, service, role: data.role as string };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
