import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, HOME } from "@/lib/perms";

export type Profile = { id: string; email: string; name: string; role: string; status: string; perms: string[]; brand_id: string | null; creator_id: string | null; cargo: string | null; access_status: string; limited?: boolean };

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  // creator "só da marca": vê só os desafios das marcas dela
  if (profile?.role === "creator" && profile.creator_id) {
    const { data: c } = await supabase.from("creators").select("brand_only").eq("id", profile.creator_id).maybeSingle();
    (profile as any).limited = !!(c as any)?.brand_only;
  }
  return { supabase, user: data.user, profile: (profile as Profile) || null };
}

// Garante login + permissão para o módulo; senão manda para o início do perfil.
export async function requireModule(key: string) {
  const s = await getSession();
  if (!s.user) redirect("/login");
  if (!s.profile || s.profile.role === "pendente") redirect("/sem-acesso");
  if (!can(s.profile, key)) redirect(HOME[s.profile.role] || "/login");
  return s as { supabase: typeof s.supabase; user: NonNullable<typeof s.user>; profile: Profile };
}

export async function logAction(supabase: any, profile: Profile, action: string, module: string, entityId?: string | null, financial = false) {
  await supabase.from("audit_logs").insert({ user_id: profile.id, who: profile.name, action, module, entity_id: entityId || null, financial });
}
