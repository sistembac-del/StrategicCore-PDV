import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export async function invokeFiscalFunction<T>(
  functionName: "emitir-nfce" | "cancelar-nfce" | "consultar-nfce" | "reenviar-nfce" | "fiscal-document-files" | "fiscal-provider-status",
  body: Record<string, unknown>
) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Supabase ainda não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.")
    };
  }

  return supabase.functions.invoke<T>(functionName, { body });
}
