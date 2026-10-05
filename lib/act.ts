// Ajudantes das ações do servidor (formulários).
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const g = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const orNull = (v: string) => (v === "" ? null : v);
export const num = (fd: FormData, k: string) => { const v = g(fd, k).replace(",", "."); return v === "" ? null : Number(v) || 0; };
export const back = (path: string, msg: string, ok = true): never => {
  const sep = path.includes("?") ? "&" : "?";
  return redirect(`${path}${sep}${ok ? "ok" : "erro"}=${encodeURIComponent(msg)}`);
};
export const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // horário de Brasília
export const addDays = (d: number) => new Date(Date.now() - 3 * 3600e3 + d * 864e5).toISOString().slice(0, 10);

// Notifica quem está ligado a uma marca, a uma creator, ou pessoas específicas.
export async function notifyProfiles(supabase: any, filter: { creator_id?: string | null; brand_id?: string | null; ids?: string[] }, text: string, link: string) {
  let ids: string[] = filter.ids || [];
  if (filter.creator_id || filter.brand_id) {
    let q = supabase.from("profiles").select("id").eq("status", "ativo");
    if (filter.creator_id) q = q.eq("creator_id", filter.creator_id).eq("role", "creator");
    if (filter.brand_id) q = q.eq("brand_id", filter.brand_id).eq("role", "marca");
    const { data } = await q;
    ids = ids.concat((data || []).map((p: any) => p.id));
  }
  if (ids.length) await supabase.from("notifications").insert(ids.map((id) => ({ user_id: id, text, link })));
}

// Notifica a CEO e a equipe com o módulo liberado (chamado pela equipe).
export async function notifyModule(supabase: any, mod: string, text: string, link: string, exceptId?: string) {
  const { data } = await supabase.from("profiles").select("id,role,perms").eq("status", "ativo").in("role", ["ceo", "equipe"]);
  const ids = (data || []).filter((p: any) => p.id !== exceptId && (p.role === "ceo" || (p.perms || []).includes(mod))).map((p: any) => p.id);
  if (ids.length) await supabase.from("notifications").insert(ids.map((id: string) => ({ user_id: id, text, link })));
}

// Avisa a CEO (quando quem fez a ação foi outra pessoa da equipe).
export async function notifyCeo(supabase: any, actor: { id: string; role: string }, text: string, link: string) {
  if (actor.role === "ceo") return;
  const { data } = await supabase.from("profiles").select("id").eq("role", "ceo").eq("status", "ativo");
  const ids = (data || []).map((p: any) => p.id).filter((id: string) => id !== actor.id);
  if (ids.length) await supabase.from("notifications").insert(ids.map((id: string) => ({ user_id: id, text, link })));
}

// Creators "só da marca" que NÃO são da marca informada (não devem receber avisos dela).
export async function hiddenForBrand(_supabase: any, brandId?: string | null): Promise<Set<string>> {
  let supabase: any;
  try { supabase = createAdminClient(); } catch { return new Set(); }
  const { data: lim, error } = await supabase.from("creators").select("id").eq("brand_only", true);
  if (error || !lim?.length) return new Set();
  const { data: mine } = brandId ? await supabase.from("creator_brands").select("creator_id").eq("brand_id", brandId) : { data: [] as any[] };
  const ok = new Set((mine || []).map((x: any) => x.creator_id));
  return new Set(lim.map((x: any) => x.id).filter((id: string) => !ok.has(id)));
}

// Avisa todas as creators com acesso ao Clube (ou só as de uma lista).
// Com brandId, as creators "só da marca" recebem apenas os avisos das marcas delas.
export async function notifyCreators(supabase: any, text: string, link: string, creatorIds?: string[], brandId?: string | null) {
  let q = supabase.from("profiles").select("id,creator_id").eq("role", "creator").eq("status", "ativo");
  if (creatorIds) { if (!creatorIds.length) return; q = q.in("creator_id", creatorIds); }
  const { data } = await q;
  const hide = creatorIds ? new Set<string>() : await hiddenForBrand(supabase, brandId);
  const ids = (data || []).filter((p: any) => !hide.has(p.creator_id)).map((p: any) => p.id);
  for (let i = 0; i < ids.length; i += 500) await supabase.from("notifications").insert(ids.slice(i, i + 500).map((id: string) => ({ user_id: id, text, link })));
}
