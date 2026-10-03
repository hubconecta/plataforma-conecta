import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Kpi } from "@/components/ui";

export default async function Operacao() {
  const { supabase, profile } = await requireModule("ops");
  const c = async (t: string, f: (q: any) => any) => { const { count } = await f(supabase.from(t).select("id", { count: "exact", head: true })); return count || 0; };
  const [cad, insc, act] = await Promise.all([c("creator_applications", (q) => q.in("status", ["Nova", "Em análise"])), c("campaign_applications", (q) => q.in("status", ["Enviada", "Em análise"])), c("campaigns", (q) => q.eq("status", "Ativa"))]);
  return (
    <>
      <PageH eyebrow="O que está acontecendo na operação?" title={`Olá, ${profile.name.split(" ")[0]}`} sub="Tudo que precisa de ação hoje." />
      <div className="kpis"><Kpi k="Cadastros de creators" v={cad} hero /><Kpi k="Inscrições aguardando" v={insc} /><Kpi k="Campanhas ativas" v={act} /></div>
      <div className="actions" style={{ justifyContent: "flex-start" }}><Link className="btn btn-ghost" href="/cadastros">Ver cadastros</Link><Link className="btn btn-ghost" href="/inscricoes">Ver inscrições</Link><Link className="btn btn-ghost" href="/campanhas">Ver campanhas</Link></div>
    </>
  );
}
