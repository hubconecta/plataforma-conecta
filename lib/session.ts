import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, HOME } from "@/lib/perms";
import { createAdminClient } from "@/lib/supabase/admin";

export type Profile = { id: string; email: string; name: string; role: string; status: string; perms: string[]; brand_id: string | null; creator_id: string | null; cargo: string | null; access_status: string; limited?: boolean; hub?: boolean; hubVisible?: boolean };

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  // creator "só da marca": vê só os desafios das marcas dela
  if (profile?.role === "creator" && profile.creator_id) {
    const { data: c } = await supabase.from("creators").select("brand_only").eq("id", profile.creator_id).maybeSingle();
    (profile as any).limited = !!(c as any)?.brand_only;
    // Conecta Hub: a mesma regra do banco (my_hub). Se o SQL 23 ainda não rodou, fica Free.
    const { data: hub, error } = await supabase.rpc("my_hub");
    (profile as any).hub = !error && hub === true;
    // Hub em modo teste: só as creators de teste (e quem já assina) enxergam
    try {
      const { data: st } = await createAdminClient().from("settings").select("value").eq("key", "hub").maybeSingle();
      const v: any = st?.value || {};
      const { data: cr } = await supabase.from("creators").select("email").eq("id", profile.creator_id).maybeSingle();
      const emails = [profile.email, (cr as any)?.email].filter(Boolean).map((x: string) => x.toLowerCase());
      (profile as any).hubVisible = (profile as any).hub || v.launched === true || (v.testers || []).some((t: string) => emails.includes(String(t).toLowerCase()));
    } catch { (profile as any).hubVisible = (profile as any).hub; }
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
