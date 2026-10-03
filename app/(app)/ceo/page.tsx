import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Kpi, brl } from "@/components/ui";
import Icon from "@/components/Icon";

export default async function CEO() {
  const { supabase, profile } = await requireModule("ceo");
  const c = async (t: string, f?: (q: any) => any) => { let q = supabase.from(t).select("id", { count: "exact", head: true }); if (f) q = f(q); const { count } = await q; return count || 0; };
  const [brandsAct, creatorsAct, campAct, campOpen, cadPend, inscPend, team] = await Promise.all([
    c("brands", (q) => q.eq("status", "Ativa")), c("creators"), c("campaigns", (q) => q.eq("status", "Ativa")), c("campaigns", (q) => q.eq("status", "Inscrições abertas")),
    c("creator_applications", (q) => q.in("status", ["Nova", "Em análise"])), c("campaign_applications", (q) => q.in("status", ["Enviada", "Em análise"])), c("profiles", (q) => q.eq("role", "equipe")),
  ]);
  const { data: camps } = await supabase.from("campaigns").select("results");
  const gmv = (camps || []).reduce((s: number, x: any) => s + (Number(x.results?.gmv) || 0), 0);
  const h = new Date().getUTCHours() - 3;
  const greet = h < 12 && h >= 0 ? "Bom dia" : h < 18 && h >= 0 ? "Boa tarde" : "Boa noite";
  const alerts = [["Creators pendentes", cadPend, "user", "/cadastros", "cadastros aguardando aprovação"], ["Inscrições em campanhas", inscPend, "inbox", "/inscricoes", "aguardando análise"]] as const;
  return (
    <>
      <PageH eyebrow="Conecta CEO · Como está o negócio?" title={`${greet}, ${profile.name.split(" ")[0]}`} sub="Números reais do banco da Conecta." />
      <div className="card"><div className="card-h"><h2>Precisa da sua atenção</h2></div><div className="alerts">{alerts.map(([t, n, i, href, s]) => (
        <Link key={t} href={href} className="li" style={{ textDecoration: "none", color: "inherit" }}><span className="alert-ic pink"><Icon name={i} /></span><span className="grow"><b>{t}</b><span>{s}</span></span><span className="count">{n}</span></Link>))}</div></div>
      <div className="kpis"><Kpi k="Marcas ativas" v={brandsAct} hero /><Kpi k="Creators" v={creatorsAct} /><Kpi k="Campanhas ativas" v={campAct} /><Kpi k="Inscrições abertas" v={campOpen} /><Kpi k="GMV registrado" v={brl(gmv)} /><Kpi k="Colaboradoras" v={team} /></div>
      <div className="card"><h2 style={{ marginBottom: 8 }}>Próximas entregas da plataforma</h2><p className="muted small">Financeiro, desafios, conteúdos, press kits, relatórios e Método entram nas próximas versões. Eles já aparecem no menu marcados como “breve”.</p></div>
    </>
  );
}
