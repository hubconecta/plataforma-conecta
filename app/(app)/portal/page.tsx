import { requireModule } from "@/lib/session";
import { PageH, Kpi, Pill, Empty, brl, fd } from "@/components/ui";

export default async function Portal() {
  const { supabase, profile } = await requireModule("marca_home");
  const [{ data: brand }, { data: camps }] = await Promise.all([
    supabase.from("brands").select("name,category").eq("id", profile.brand_id).single(),
    supabase.from("campaigns").select("id,name,status,start_date,end_date,results").order("created_at", { ascending: false }),
  ]);
  const R = (k: string) => (camps || []).reduce((s: number, c: any) => s + (Number(c.results?.[k]) || 0), 0);
  return (
    <>
      <PageH eyebrow="O que a Conecta está fazendo pela sua marca" title={brand?.name || "Sua marca"} sub="Painel atualizado pela equipe Conecta a cada novo resultado." />
      <div className="kpis"><Kpi k="Campanhas ativas" v={(camps || []).filter((c: any) => c.status === "Ativa").length} hero /><Kpi k="Creators" v={R("creators")} /><Kpi k="Visualizações" v={R("views").toLocaleString("pt-BR")} /><Kpi k="Interações" v={R("interactions").toLocaleString("pt-BR")} /><Kpi k="Cliques" v={R("clicks").toLocaleString("pt-BR")} /><Kpi k="GMV" v={brl(R("gmv"))} /></div>
      <div className="card"><div className="card-h"><h2>Campanhas</h2></div>{camps?.length ? <div className="table-wrap"><table><thead><tr><th>Campanha</th><th>Status</th><th>Período</th><th className="r">Concluíram</th><th className="r">GMV</th></tr></thead><tbody>{camps.map((c: any) => <tr key={c.id}><td><b>{c.name}</b></td><td><Pill s={c.status} /></td><td className="num">{fd(c.start_date)} – {fd(c.end_date)}</td><td className="r num">{c.results?.concluded || 0}/{c.results?.creators || 0}</td><td className="r num">{brl(c.results?.gmv || 0)}</td></tr>)}</tbody></table></div> : <Empty icon="megaphone" title="Nenhuma campanha ainda" text="Quando a Conecta criar campanhas para a sua marca, elas aparecem aqui." />}</div>
    </>
  );
}
