// Ajudantes das ações do servidor (formulários).
import { redirect } from "next/navigation";

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
