import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { signed } from "@/lib/storage";

// Carrega o Método para a creator (ou para a equipe, em modo prévia).
export async function loadMetodo() {
  const s = await getSession();
  if (!s.profile) redirect("/login");
  const staff = can(s.profile, "metodo_adm");
  if (s.profile.role !== "creator" && !staff) redirect("/");
  const me = s.profile.creator_id;
  const [{ data: mods }, { data: buys }, { data: cfg }] = await Promise.all([
    s.supabase.from("method_modules").select("*").eq("status", "Publicado").order("position").order("created_at"),
    me ? s.supabase.from("method_purchases").select("status,created_at").eq("creator_id", me) : Promise.resolve({ data: [] as any[] }),
    s.supabase.from("settings").select("value").eq("key", "metodo").maybeSingle(),
  ]);
  const access = staff || (buys || []).some((b: any) => b.status === "Pago");
  const pendingCheckout = (buys || []).find((b: any) => b.status === "Aguardando pagamento");
  let lessons: any[] = [], done = new Set<string>();
  if (access) {
    const modIds = (mods || []).map((m: any) => m.id);
    const { data } = modIds.length ? await s.supabase.from("method_lessons").select("*").in("module_id", modIds).eq("status", "Publicada").order("position").order("created_at") : { data: [] };
    lessons = data || [];
    if (me) { const { data: pr } = await s.supabase.from("method_progress").select("lesson_id").eq("creator_id", me); done = new Set((pr || []).map((p: any) => p.lesson_id)); }
  }
  const covers = new Map<string, string>();
  for (const m of mods || []) if (m.cover_path) covers.set(m.id, await signed(m.cover_path, 3600));
  const ordered = (mods || []).flatMap((m: any) => lessons.filter((l) => l.module_id === m.id));
  return { ...s, staff, me, access, pendingCheckout, mods: mods || [], lessons, ordered, done, covers, cfg: cfg?.value || {} };
}
