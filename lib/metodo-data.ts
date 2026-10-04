import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { signed } from "@/lib/storage";

async function base() {
  const s = await getSession();
  if (!s.profile) redirect("/login");
  const staff = can(s.profile, "metodo_adm");
  if (s.profile.role !== "creator" && !staff) redirect("/");
  return { ...s, staff, me: s.profile.creator_id };
}

const cover = async (p?: string | null) => (p ? await signed(p, 3600) : "");

// Vitrine do Club Criadora: todos os produtos publicados, com acesso ou cadeado.
export async function loadVitrine() {
  const s = await base();
  const [{ data: prods }, { data: buys }, { data: prog }] = await Promise.all([
    s.supabase.from("products").select("*").eq("status", "Publicado").order("position").order("created_at"),
    s.me ? s.supabase.from("method_purchases").select("product_id,status").eq("creator_id", s.me) : Promise.resolve({ data: [] as any[] }),
    s.me ? s.supabase.from("method_progress").select("lesson_id").eq("creator_id", s.me) : Promise.resolve({ data: [] as any[] }),
  ]);
  const owned = new Set((buys || []).filter((b: any) => b.status === "Pago").map((b: any) => b.product_id));
  const pending = new Set((buys || []).filter((b: any) => b.status === "Aguardando pagamento").map((b: any) => b.product_id));
  const list = [];
  for (const p of prods || []) list.push({ ...p, cover: await cover(p.cover_path), access: s.staff || owned.has(p.id), pending: pending.has(p.id) });
  return { ...s, products: list, doneCount: (prog || []).length };
}

// Um produto: módulos, aulas (se tiver acesso) e progresso.
export async function loadProduct(slug: string) {
  const s = await base();
  const { data: product } = await s.supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (!product || (product.status !== "Publicado" && !s.staff)) notFound();
  const [{ data: mods }, { data: buys }] = await Promise.all([
    s.supabase.from("method_modules").select("*").eq("product_id", product.id).eq("status", "Publicado").order("position").order("created_at"),
    s.me ? s.supabase.from("method_purchases").select("status,created_at").eq("creator_id", s.me).eq("product_id", product.id) : Promise.resolve({ data: [] as any[] }),
  ]);
  const access = s.staff || (buys || []).some((b: any) => b.status === "Pago");
  const pendingCheckout = (buys || []).find((b: any) => b.status === "Aguardando pagamento");
  let lessons: any[] = [], done = new Set<string>();
  if (access) {
    const ids = (mods || []).map((m: any) => m.id);
    const { data } = ids.length ? await s.supabase.from("method_lessons").select("*").in("module_id", ids).eq("status", "Publicada").order("position").order("created_at") : { data: [] };
    lessons = data || [];
    if (s.me) { const { data: pr } = await s.supabase.from("method_progress").select("lesson_id").eq("creator_id", s.me); done = new Set((pr || []).map((p: any) => p.lesson_id)); }
  }
  const covers = new Map<string, string>();
  for (const m of mods || []) if (m.cover_path) covers.set(m.id, await cover(m.cover_path));
  const ordered = (mods || []).flatMap((m: any) => lessons.filter((l) => l.module_id === m.id));
  return { ...s, product: { ...product, cover: await cover(product.cover_path) }, access, pendingCheckout, mods: mods || [], lessons, ordered, done, covers };
}
