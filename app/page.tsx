import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HOME } from "@/lib/perms";
import { createAdminClient } from "@/lib/supabase/admin";
import Landing from "@/components/site/Landing";

export const metadata = { title: "Conecta · creators e marcas", description: "A Conecta conecta marcas às creators certas: campanhas, afiliadas, UGC, press kits e resultados. Creators: faça parte do Clube Conecta." };

// Página inicial pública (Sou marca / Sou creator). Quem já está logado vai direto para o seu painel.
export default async function Root({ searchParams }: { searchParams: Promise<any> }) {
  const { user, profile } = await getSession();
  if (user) redirect(HOME[profile?.role || "pendente"] || "/sem-acesso");
  const q = await searchParams;
  const tab = q.p === "creator" ? "creator" : "marca";
  let qs: any = { hasBudget: true, amount: true, creators: true, affiliates: true, agency: true }, levels: any[] = [], wa = "";
  try {
    const admin = createAdminClient();
    const [{ data: s }, { data: lv }] = await Promise.all([admin.from("settings").select("key,value").in("key", ["lead_qs", "whatsapp"]), admin.from("levels").select("name,min_points,color,perks").order("position")]);
    for (const r of s || []) { if (r.key === "lead_qs") qs = r.value; if (r.key === "whatsapp") wa = String(r.value?.number || "").replace(/\D/g, ""); }
    levels = lv || [];
  } catch {}
  return <Landing tab={tab} qs={qs} levels={levels} wa={wa} />;
}
