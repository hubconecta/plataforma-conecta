import { createClient } from "@supabase/supabase-js";

// Cliente com chave de serviço: só no servidor, só para criar acessos e definir perfis.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}
