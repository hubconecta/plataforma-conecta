import Link from "next/link";
import { requireModule } from "@/lib/session";
import { Kpi } from "@/components/ui";

export default async function Clube() {
  const { supabase, profile } = await requireModule("clube");
  const [{ data: me }, { data: open }, { data: mine }] = await Promise.all([
    supabase.from("creators").select("name,xp").eq("id", profile.creator_id).single(),
    supabase.from("campaigns").select("id").eq("status", "Inscrições abertas"),
    supabase.from("campaign_applications").select("id,status").eq("creator_id", profile.creator_id),
  ]);
  const first = (me?.name || profile.name || "").split(" ")[0];
  return (
    <>
      <div className="club-hero"><span className="eyebrow" style={{ color: "#FF8CC4" }}>Clube Conecta</span><h1>Olá, {first} 👋</h1><p style={{ color: "#C9BFC6" }}>Você tem {open?.length || 0} campanhas com inscrições abertas.</p><div><Link className="btn btn-primary" href="/clube/oportunidades">Ver oportunidades</Link></div></div>
      <div className="kpis"><Kpi k="Inscrições enviadas" v={mine?.length || 0} /><Kpi k="Aprovadas" v={(mine || []).filter((a: any) => a.status === "Aprovada").length} /><Kpi k="XP" v={me?.xp || 0} /></div>
    </>
  );
}
