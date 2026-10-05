import Link from "next/link";
import { Kpi, Pill, Empty, Person, fd, brl } from "./ui";
import { addHighlight } from "@/app/(app)/relatorios/actions";

const ICON: Record<string, string> = { Campanha: "📣", Desafio: "🏆", Destaque: "⭐" };

// Relatório vivo da marca: se atualiza sozinho a cada resultado de campanha, desafio ou destaque.
export default async function BrandReport({ supabase, brandId, staff, backPath }: { supabase: any; brandId: string; staff: boolean; backPath: string }) {
  const [{ data: brand }, { data: camps }, { data: chs }, { data: entries }, { data: ships }, { count: nBase }] = await Promise.all([
    supabase.from("brands").select("name").eq("id", brandId).single(),
    supabase.from("campaigns").select("id,name,status,results").eq("brand_id", brandId).not("status", "in", "(Em aprovação,Ajuste solicitado,Recusada)"),
    supabase.from("challenges").select("id,name,status,result,campaign_id,campaigns(name)").eq("brand_id", brandId).not("status", "in", "(Em aprovação,Ajuste solicitado,Recusado)"),
    supabase.from("report_entries").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(60),
    supabase.from("shipments").select("status").eq("brand_id", brandId),
    supabase.from("creator_brands").select("creator_id", { count: "exact", head: true }).eq("brand_id", brandId),
  ]);
  const cIds = (camps || []).map((c: any) => c.id);
  const { data: conts } = cIds.length ? await supabase.from("contents").select("id,platform,type,link,views,interactions,creators(name),campaigns(name)").in("campaign_id", cIds).order("views", { ascending: false }).limit(3) : { data: [] };
  const R = (k: string) => (camps || []).reduce((s: number, c: any) => s + (Number(c.results?.[k]) || 0), 0);
  const { count: nContents } = cIds.length ? await supabase.from("contents").select("id", { count: "exact", head: true }).in("campaign_id", cIds) : { count: 0 };
  const live = (chs || []).filter((c: any) => c.status !== "Rascunho");
  const withRes = live.filter((c: any) => c.result);
  const going = live.filter((c: any) => !c.result && c.status !== "Encerrado");
  const sent = (ships || []).filter((s: any) => ["Enviado", "Em trânsito", "Entregue"].includes(s.status)).length;
  const sum = (k: string) => withRes.reduce((s: number, c: any) => s + (Number(c.result?.metrics?.[k]) || 0), 0);
  const last = entries?.[0]?.created_at;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card"><div className="card-h" style={{ flexWrap: "wrap", gap: 10 }}>
        <div><span className="eyebrow">Relatório da marca</span><h2>{brand?.name}</h2><span className="muted small">Atualizado sozinho a cada resultado{last ? ` · última atualização ${fd(String(last).slice(0, 10))}` : ""}</span></div>
        {staff ? <div className="actions"><Link className="btn btn-ghost btn-sm" href={`/desafios?s=Ativo`}>Registrar resultado de desafio</Link></div> : null}
      </div>
        {staff ? <details className="mod" style={{ marginTop: 10 }}><summary>+ Adicionar destaque</summary><form action={addHighlight} style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14 }}><input type="hidden" name="brand_id" value={brandId} /><input type="hidden" name="back" value={backPath} /><div className="field"><label>Título</label><input className="input" name="title" required /></div><div className="field"><label>Descrição</label><textarea className="input" name="summary" /></div><label className="check"><input type="checkbox" name="notify" defaultChecked /> Avisar a marca</label><div><button className="btn btn-primary btn-sm">Adicionar ao relatório</button></div></form></details> : null}
      </div>

      <div className="section-t"><h2>Visão geral</h2></div>
      <div className="kpis">
        <Kpi k="GMV" v={brl(R("gmv"))} hero /><Kpi k="Campanhas" v={(camps || []).length} /><Kpi k="Creators" v={R("creators")} /><Kpi k="Conteúdos" v={nContents || 0} />
        <Kpi k="Visualizações" v={R("views").toLocaleString("pt-BR")} /><Kpi k="Interações" v={R("interactions").toLocaleString("pt-BR")} /><Kpi k="Cliques" v={R("clicks").toLocaleString("pt-BR")} /><Kpi k="Pedidos" v={R("orders").toLocaleString("pt-BR")} />
        <Kpi k="Creators na base da marca" v={nBase || 0} /><Kpi k="Desafios concluídos" v={`${withRes.length}/${live.length}`} /><Kpi k="Produtos enviados" v={sent} />
      </div>

      <div className="card"><div className="card-h"><h2>Desafios e ganhadoras</h2></div>
        {withRes.length ? <><div className="table-wrap"><table><thead><tr><th>Desafio</th><th>Campanha</th><th>Ganhadoras</th><th className="r">Participantes</th><th className="r">Views</th><th className="r">Vendas</th><th></th></tr></thead><tbody>
          {withRes.map((c: any) => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.campaigns?.name || "—"}</td><td className="small">{c.result.winners?.map((w: any) => `${w.place}º ${w.name}`).join(" · ")}</td><td className="r num">{c.result.metrics?.participants || 0}</td><td className="r num">{(c.result.metrics?.views || 0).toLocaleString("pt-BR")}</td><td className="r num">{brl(c.result.metrics?.sales || 0)}</td><td><Link className="btn btn-ghost btn-sm" href={`/desafios/${c.id}?tab=resultado`}>Ver ganhadoras</Link></td></tr>)}
        </tbody></table></div>
          <p className="small muted" style={{ marginTop: 8 }}>Somando os desafios: {sum("participants")} participações, {sum("views").toLocaleString("pt-BR")} visualizações e {brl(sum("sales"))} em vendas. Esses números fazem parte das campanhas e não são somados de novo na visão geral.</p></>
          : <p className="muted">Nenhum desafio com resultado registrado ainda.</p>}
        {going.length ? <p className="small" style={{ marginTop: 8 }}><b>Em andamento:</b> {going.map((c: any) => c.name).join(", ")}</p> : null}
      </div>

      <div className="card"><div className="card-h"><h2>Campanhas</h2></div>
        {camps?.length ? <div className="table-wrap"><table><thead><tr><th>Campanha</th><th>Status</th><th className="r">Concluíram</th><th className="r">Views</th><th className="r">Cliques</th><th className="r">GMV</th></tr></thead><tbody>
          {camps.map((c: any) => <tr key={c.id}><td><b>{c.name}</b></td><td><Pill s={c.status} /></td><td className="r num">{c.results?.concluded || 0}/{c.results?.creators || 0}</td><td className="r num">{(c.results?.views || 0).toLocaleString("pt-BR")}</td><td className="r num">{(c.results?.clicks || 0).toLocaleString("pt-BR")}</td><td className="r num">{brl(c.results?.gmv || 0)}</td></tr>)}
        </tbody></table></div> : <p className="muted">Nenhuma campanha ainda.</p>}
      </div>

      {conts?.length ? <div className="card"><div className="card-h"><h2>Conteúdos em destaque</h2></div><div className="list">{conts.map((c: any) => <div className="li" key={c.id}><div className="grow"><Person name={c.creators?.name || "Creator"} sub={`${c.platform} · ${c.type} · ${c.campaigns?.name || ""}`} /></div><span className="small num">{(c.views || 0).toLocaleString("pt-BR")} views · {(c.interactions || 0).toLocaleString("pt-BR")} int.</span>{c.link ? <a className="btn btn-ghost btn-sm" href={c.link} target="_blank" rel="noopener noreferrer">Abrir</a> : null}</div>)}</div></div> : null}

      <div className="card"><div className="card-h"><h2>Linha do tempo do relatório</h2></div>
        {entries?.length ? <div className="list">{entries.map((e: any) => <div className="li" key={e.id} style={{ alignItems: "flex-start" }}><span style={{ fontSize: 20 }} aria-hidden="true">{ICON[e.kind]}</span><div className="grow"><b>{e.title}</b>{e.summary ? <span style={{ whiteSpace: "pre-wrap" }}>{e.summary}</span> : null}<span>{fd(String(e.created_at).slice(0, 10))}{e.by_name && staff ? ` · ${e.by_name}` : ""}</span></div>{e.kind === "Desafio" && e.ref_id ? <Link className="btn btn-ghost btn-sm" href={`/desafios/${e.ref_id}?tab=resultado`}>Abrir</Link> : null}</div>)}</div>
          : <Empty icon="chart" title="O relatório começa aqui" text="Cada resultado de campanha, desafio ou destaque registrado pela Conecta entra nesta linha do tempo." />}
      </div>
    </div>
  );
}
