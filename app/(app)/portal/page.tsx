import GroupLinks from "@/components/GroupLinks";
import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Kpi, Pill, Empty, brl, fd } from "@/components/ui";

export default async function Portal() {
  const { supabase, profile } = await requireModule("marca_home");
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const [{ data: brand }, { data: camps }, { data: chs }, { data: conts }, { data: fin }, { data: kits }] = await Promise.all([
    supabase.from("brands").select("name,category").eq("id", profile.brand_id).single(),
    supabase.from("campaigns").select("id,name,status,start_date,end_date,results").order("created_at", { ascending: false }),
    supabase.from("challenges").select("id,name,status,due_date,result").neq("status", "Rascunho").order("created_at", { ascending: false }).limit(4),
    supabase.from("contents").select("id,platform,type,link,views,creators(name)").eq("status", "Publicado").order("published_at", { ascending: false }).limit(4),
    supabase.from("fin_entries").select("description,value,due,status").eq("kind", "receber").eq("status", "Em aberto").order("due").limit(1),
    supabase.from("press_kits").select("id").eq("status", "Ativo"),
  ]);
  const live = (camps || []).filter((c: any) => !["Em aprovação", "Ajuste solicitado", "Recusada"].includes(c.status));
  const R = (k: string) => live.reduce((s: number, c: any) => s + (Number(c.results?.[k]) || 0), 0);
  const nx = fin?.[0];
  return (
    <>
      <PageH eyebrow="O que a Conecta está fazendo pela sua marca" title={brand?.name || "Sua marca"} sub="Painel atualizado pela equipe Conecta a cada novo resultado." right={<Link className="btn btn-primary btn-sm" href="/campanhas?novo=1">+ Propor campanha</Link>} />
      <div className="kpis"><Kpi k="Campanhas ativas" v={live.filter((c: any) => c.status === "Ativa").length} hero /><Kpi k="Creators" v={R("creators")} /><Kpi k="Visualizações" v={R("views").toLocaleString("pt-BR")} /><Kpi k="Alcance (estimado)" v={Math.round(R("views") * 1.3).toLocaleString("pt-BR")} /><Kpi k="Interações" v={R("interactions").toLocaleString("pt-BR")} /><Kpi k="Cliques" v={R("clicks").toLocaleString("pt-BR")} /><Kpi k="Pedidos" v={R("orders").toLocaleString("pt-BR")} /><Kpi k="GMV" v={brl(R("gmv"))} /><Kpi k="Press kits ativos" v={kits?.length || 0} /></div>
      {nx ? <div className="card"><div className="li"><div className="grow"><b>Próximo pagamento: {nx.description}</b><span>vence {fd(nx.due)}</span></div><span className="count">{brl(nx.value)}</span><Pill s={nx.due < today ? "Vencido" : "Em aberto"} /><Link className="btn btn-ghost btn-sm" href="/portal/financeiro">Ver financeiro</Link></div></div> : null}
      <div className="card"><div className="card-h"><h2>Campanhas</h2><Link className="btn btn-ghost btn-sm" href="/campanhas">Ver todas</Link></div>{camps?.length ? <div className="table-wrap"><table><thead><tr><th>Campanha</th><th>Status</th><th>Período</th><th className="r">Concluíram</th><th className="r">GMV</th></tr></thead><tbody>{camps.slice(0, 8).map((c: any) => <tr key={c.id}><td><b>{c.name}</b></td><td><Pill s={c.status} /></td><td className="num">{fd(c.start_date)} – {fd(c.end_date)}</td><td className="r num">{c.results?.concluded || 0}/{c.results?.creators || 0}</td><td className="r num">{brl(c.results?.gmv || 0)}</td></tr>)}</tbody></table></div> : <Empty icon="megaphone" title="Nenhuma campanha ainda" text="Proponha uma campanha: ela vai para a aprovação da Conecta." />}</div>
      <GroupLinks supabase={supabase} brands />
      <div className="grid g2">
        <div className="card"><div className="card-h"><h2>Desafios e premiações</h2><Link className="btn btn-ghost btn-sm" href="/desafios">Ver</Link></div>{chs?.length ? <div className="list">{chs.map((c: any) => <Link key={c.id} href={`/desafios/${c.id}`} className="li" style={{ textDecoration: "none", color: "inherit" }}><div className="grow"><b>{c.name}</b><span>{c.result ? `🏆 ${c.result.winners?.map((w: any) => w.name).join(", ")}` : `prazo ${fd(c.due_date)}`}</span></div><Pill s={c.status} /></Link>)}</div> : <p className="muted">Nenhum desafio ainda. <Link href="/desafios?novo=1">Propor um desafio</Link></p>}</div>
        <div className="card"><div className="card-h"><h2>Conteúdos publicados</h2><Link className="btn btn-ghost btn-sm" href="/conteudos">Ver</Link></div>{conts?.length ? <div className="list">{conts.map((c: any) => <div className="li" key={c.id}><div className="grow"><b>{c.creators?.name}</b><span>{c.platform} · {c.type} · {(c.views || 0).toLocaleString("pt-BR")} views</span></div>{c.link ? <a className="btn btn-ghost btn-sm" href={c.link} target="_blank" rel="noopener noreferrer">Abrir</a> : null}</div>)}</div> : <p className="muted">Os conteúdos publicados aparecem aqui.</p>}</div>
      </div>
    </>
  );
}
