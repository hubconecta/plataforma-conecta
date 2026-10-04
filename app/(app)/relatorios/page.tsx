import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Kpi, fd, brl } from "@/components/ui";
import BrandReport from "@/components/BrandReport";
import CopyText from "@/components/CopyText";
import { publishReport } from "./actions";

const PERIODS: [string, string][] = [["30", "30 dias"], ["90", "90 dias"], ["365", "12 meses"], ["all", "Todo o período"]];

export default async function Relatorios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("relatorios");
  const isBrand = profile.role === "marca";
  const brandId: string = isBrand ? profile.brand_id! : q.marca || "";
  const tabs: [string, string][] = isBrand ? [["vivo", "Relatório da marca"], ["analise", "Análise com filtros"], ["publicados", "Relatórios enviados pela Conecta"]] : brandId ? [["analise", "Análise com filtros"], ["vivo", "Relatório da marca"], ["publicados", "Publicados para a marca"]] : [["analise", "Análise com filtros"]];
  const tab = tabs.some((t) => t[0] === q.tab) ? q.tab : tabs[0][0];
  const qs = (o: Record<string, string>) => { const p = new URLSearchParams({ ...(brandId && !isBrand ? { marca: brandId } : {}), ...(q.camp ? { camp: q.camp } : {}), ...(q.creator ? { creator: q.creator } : {}), ...(q.p ? { p: q.p } : {}), tab, ...o }); [...p.keys()].forEach((k) => !p.get(k) && p.delete(k)); return `/relatorios?${p}`; };
  const here = qs({});

  const [{ data: brands }, { data: campsAll }, { data: creators }] = await Promise.all([
    isBrand ? Promise.resolve({ data: [] as any[] }) : supabase.from("brands").select("id,name").order("name"),
    supabase.from("campaigns").select("id,name,status,brand_id,end_date,commission_pct,results,brands(name)").not("status", "in", "(Em aprovação,Ajuste solicitado,Recusada)").order("created_at", { ascending: false }),
    isBrand ? Promise.resolve({ data: [] as any[] }) : supabase.from("creators").select("id,name").order("name"),
  ]);
  const period = PERIODS.some((p) => p[0] === q.p) ? q.p : "all";
  const cutoff = period === "all" ? "" : new Date(Date.now() - Number(period) * 864e5).toISOString().slice(0, 10);
  let camps = (campsAll || []).filter((c: any) => (!brandId || c.brand_id === brandId) && (!cutoff || !c.end_date || c.end_date >= cutoff));
  if (q.camp) camps = camps.filter((c: any) => c.id === q.camp);

  // Dados da análise
  const cIds = camps.map((c: any) => c.id);
  let cts: any[] = [], subsOk: any[] = [], sales: any[] = [], chs: any[] = [], rws: any[] = [], ships: any[] = [], apps: any[] = [];
  if (tab === "analise") {
    const r = await Promise.all([
      cIds.length ? supabase.from("contents").select("creator_id,campaign_id,views,interactions,creators(name)").in("campaign_id", cIds) : Promise.resolve({ data: [] }),
      supabase.from("challenges").select("id,status,brand_id,campaign_id").neq("status", "Rascunho"),
      isBrand ? Promise.resolve({ data: [] }) : supabase.from("sales").select("creator_id,campaign_id,brand_id,sold,creator_pct,sale_date"),
      isBrand ? Promise.resolve({ data: [] }) : supabase.from("challenge_submissions").select("creator_id,challenge_id,status").eq("status", "Aprovado"),
      isBrand ? Promise.resolve({ data: [] }) : supabase.from("rewards").select("creator_id,challenge_id,campaign_id"),
      supabase.from("shipments").select("creator_id,brand_id,campaign_id,status"),
      cIds.length ? supabase.from("campaign_applications").select("creator_id,campaign_id,creators(name)").in("campaign_id", cIds).eq("status", "Aprovada") : Promise.resolve({ data: [] }),
    ]);
    cts = r[0].data || []; chs = (r[1].data || []).filter((c: any) => (!brandId || c.brand_id === brandId) && (!q.camp || c.campaign_id === q.camp));
    sales = (r[2].data || []).filter((s: any) => (!brandId || s.brand_id === brandId) && (!q.camp || s.campaign_id === q.camp) && (!cutoff || s.sale_date >= cutoff));
    subsOk = r[3].data || []; rws = r[4].data || []; ships = (r[5].data || []).filter((s: any) => (!brandId || s.brand_id === brandId) && (!q.camp || s.campaign_id === q.camp)); apps = r[6].data || [];
    if (q.creator) { cts = cts.filter((x) => x.creator_id === q.creator); sales = sales.filter((x) => x.creator_id === q.creator); ships = ships.filter((x) => x.creator_id === q.creator); apps = apps.filter((x) => x.creator_id === q.creator); }
  }
  const R = (k: string) => camps.reduce((s: number, c: any) => s + (Number(c.results?.[k]) || 0), 0);
  const chIds = new Set(chs.map((c: any) => c.id));
  const data = { creators: R("creators"), conteudos: cts.length, views: R("views"), interactions: R("interactions"), clicks: R("clicks"), orders: R("orders"), gmv: R("gmv") };
  const title = q.creator ? "Relatório de creator" : q.camp ? "Relatório da campanha" : isBrand ? "Relatório da sua marca" : brandId ? "Relatório da marca" : "Relatório geral";

  // Por creator
  const byCr = new Map<string, any>();
  const cr = (id: string, name?: string) => { if (!byCr.has(id)) byCr.set(id, { name: name || "Creator", contents: 0, views: 0, inter: 0, sales: 0, comm: 0, ch: 0 }); const o = byCr.get(id); if (name) o.name = name; return o; };
  apps.forEach((a: any) => cr(a.creator_id, a.creators?.name));
  cts.forEach((c: any) => { const o = cr(c.creator_id, c.creators?.name); o.contents++; o.views += c.views || 0; o.inter += c.interactions || 0; });
  sales.forEach((s: any) => { if (!byCr.has(s.creator_id) && !s.creator_id) return; const o = cr(s.creator_id); o.sales += Number(s.sold) || 0; o.comm += (Number(s.sold) || 0) * (Number(s.creator_pct) || 0) / 100; });
  subsOk.forEach((s: any) => { if (chIds.has(s.challenge_id) && byCr.has(s.creator_id)) byCr.get(s.creator_id).ch++; });
  const crRows = [...byCr.values()].sort((a, b) => b.sales - a.sales || b.views - a.views);
  const maxG = Math.max(1, ...camps.map((c: any) => Number(c.results?.gmv) || 0));
  const tsv = ["Campanha\tStatus\tConcluíram\tCreators\tViews\tCliques\tPedidos\tGMV", ...camps.map((c: any) => [c.name, c.status, c.results?.concluded || 0, c.results?.creators || 0, c.results?.views || 0, c.results?.clicks || 0, c.results?.orders || 0, c.results?.gmv || 0].join("\t")), "", `Creator\tConteúdos\tViews\tInterações${isBrand ? "" : "\tVendas\tComissão\tDesafios aprovados"}`, ...crRows.map((r) => [r.name, r.contents, r.views, r.inter, ...(isBrand ? [] : [r.sales, r.comm.toFixed(2), r.ch])].join("\t"))].join("\n");

  const { data: published } = tab === "publicados" && brandId ? await supabase.from("reports").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }) : { data: [] as any[] };

  return (
    <>
      <PageH eyebrow={isBrand ? "Acompanhamento" : "Gestão"} title="Relatórios" sub={isBrand ? "Tudo o que a Conecta entregou para a sua marca, atualizado a cada resultado." : "Escolha uma marca para ver o relatório vivo dela e publicar no portal."} />
      <Notice q={q} />
      {tabs.length > 1 ? <div className="tabs">{tabs.map(([k, l]) => <Link key={k} className={`tab ${tab === k ? "on" : ""}`} href={qs({ tab: k })}>{l}</Link>)}</div> : null}

      {tab === "vivo" && brandId ? <BrandReport supabase={supabase} brandId={brandId} staff={!isBrand} backPath={here} /> : null}

      {tab === "publicados" ? <div className="card">{published?.length ? <div className="list">{published.map((r: any) => <details key={r.id} className="mod" style={{ marginBottom: 8 }}><summary><span style={{ flex: 1 }}>{r.title}<br /><span className="small muted" style={{ fontWeight: 500 }}>{r.period || ""} · publicado {fd(String(r.created_at).slice(0, 10))}{!isBrand && r.by_name ? ` por ${r.by_name}` : ""}</span></span></summary><div style={{ paddingBottom: 14 }}><div className="kpis">{[["Creators", r.data.creators], ["Conteúdos", r.data.conteudos], ["Visualizações", r.data.views], ["Interações", r.data.interactions], ["Cliques", r.data.clicks], ["Pedidos", r.data.orders]].map(([k, v]) => <Kpi key={k} k={k} v={(Number(v) || 0).toLocaleString("pt-BR")} />)}<Kpi k="GMV" v={brl(r.data.gmv)} hero /></div>{r.campaigns?.length ? <div className="table-wrap" style={{ marginTop: 10 }}><table><thead><tr><th>Campanha</th><th className="r">Views</th><th className="r">Cliques</th><th className="r">GMV</th></tr></thead><tbody>{r.campaigns.map((c: any, i: number) => <tr key={i}><td>{c.name}</td><td className="r num">{(c.views || 0).toLocaleString("pt-BR")}</td><td className="r num">{(c.clicks || 0).toLocaleString("pt-BR")}</td><td className="r num">{brl(c.gmv || 0)}</td></tr>)}</tbody></table></div> : null}</div></details>)}</div> : <Empty icon="chart" title="Nenhum relatório publicado ainda" text={isBrand ? "Quando a Conecta publicar um relatório fechado, ele aparece aqui." : "Use Publicar no portal da marca na aba Análise com filtros."} />}</div> : null}

      {tab === "analise" ? <>
        <form className="card form-grid" method="get" action="/relatorios">
          <input type="hidden" name="tab" value="analise" />
          {isBrand ? null : <div className="field"><label>Marca</label><select className="input" name="marca" defaultValue={brandId}><option value="">Todas as marcas</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
          <div className="field"><label>Campanha</label><select className="input" name="camp" defaultValue={q.camp || ""}><option value="">Todas</option>{(campsAll || []).filter((c: any) => !brandId || c.brand_id === brandId).map((c: any) => <option key={c.id} value={c.id}>{c.name}{!brandId && c.brands?.name ? ` · ${c.brands.name}` : ""}</option>)}</select></div>
          {isBrand ? null : <div className="field"><label>Creator</label><select className="input" name="creator" defaultValue={q.creator || ""}><option value="">Todas</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          <div className="field"><label>Período</label><select className="input" name="p" defaultValue={period}>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="full"><button className="btn btn-dark btn-sm">Aplicar filtros</button></div>
        </form>
        <div className="page-h" style={{ marginTop: 4 }}><div><span className="eyebrow">{PERIODS.find((p) => p[0] === period)?.[1]}</span><h2>{title}</h2></div>
          <div className="actions"><CopyText text={tsv} />
            {!isBrand && brandId ? <form action={publishReport}><input type="hidden" name="brand_id" value={brandId} /><input type="hidden" name="back" value={here} /><input type="hidden" name="kind" value={q.camp ? "Relatório da campanha" : "Relatório da marca"} /><input type="hidden" name="period" value={PERIODS.find((p) => p[0] === period)?.[1]} /><input type="hidden" name="data" value={JSON.stringify(data)} /><input type="hidden" name="campaigns" value={JSON.stringify(camps.map((c: any) => ({ name: c.name, ...c.results })))} /><button className="btn btn-primary btn-sm">Publicar no portal da marca</button></form> : null}
            {!isBrand && brandId ? <Link className="btn btn-ghost btn-sm" href={qs({ tab: "vivo" })}>Abrir relatório da marca</Link> : null}
          </div></div>
        <div className="kpis">
          <Kpi k="GMV das campanhas" v={brl(data.gmv)} hero /><Kpi k="Creators" v={data.creators} /><Kpi k="Conteúdos" v={data.conteudos} /><Kpi k="Alcance (estimado)" v={Math.round(data.views * 1.3).toLocaleString("pt-BR")} />
          <Kpi k="Visualizações" v={data.views.toLocaleString("pt-BR")} /><Kpi k="Engajamento" v={data.interactions.toLocaleString("pt-BR")} /><Kpi k="Cliques" v={data.clicks.toLocaleString("pt-BR")} /><Kpi k="Pedidos" v={data.orders.toLocaleString("pt-BR")} />
          {isBrand ? null : <><Kpi k="Vendas registradas" v={brl(sales.reduce((s, x) => s + (Number(x.sold) || 0), 0))} /><Kpi k="Comissão creators" v={brl(crRows.reduce((s, r) => s + r.comm, 0))} /></>}
          <Kpi k="Desafios" v={chs.length} />{isBrand ? null : <Kpi k="Recompensas" v={rws.filter((r: any) => (r.challenge_id && chIds.has(r.challenge_id)) || (r.campaign_id && cIds.includes(r.campaign_id))).length} />}<Kpi k="Envios" v={ships.length} />
        </div>
        <div className="grid g-main">
          <div className="card"><div className="card-h"><h2>Por campanha</h2></div>{camps.length ? <div className="table-wrap"><table><thead><tr><th>Campanha</th><th>Status</th><th className="r">Concluíram</th><th className="r">Views</th><th className="r">Cliques</th><th className="r">GMV</th></tr></thead><tbody>{camps.map((c: any) => <tr key={c.id}><td><b>{c.name}</b>{brandId ? null : <div className="small muted">{c.brands?.name}</div>}</td><td><Pill s={c.status} /></td><td className="r num">{c.results?.concluded || 0}/{c.results?.creators || 0}</td><td className="r num">{(c.results?.views || 0).toLocaleString("pt-BR")}</td><td className="r num">{(c.results?.clicks || 0).toLocaleString("pt-BR")}</td><td className="r num">{brl(c.results?.gmv || 0)}</td></tr>)}</tbody></table></div> : <p className="muted">Nenhuma campanha no filtro.</p>}</div>
          <div className="card"><div className="card-h"><h2>GMV por campanha</h2></div><div className="hbars">{camps.slice(0, 8).map((c: any) => <div className="hbar" key={c.id}><b>{c.name}</b><div className="bar"><i style={{ width: `${((Number(c.results?.gmv) || 0) / maxG) * 100}%` }} /></div><span className="num small">{brl(c.results?.gmv || 0)}</span></div>)}</div></div>
        </div>
        <div className="card"><div className="card-h"><h2>Por creator</h2></div>{crRows.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th className="r">Conteúdos</th><th className="r">Views</th><th className="r">Interações</th>{isBrand ? null : <><th className="r">Vendas</th><th className="r">Comissão</th><th className="r">Desafios aprovados</th></>}</tr></thead><tbody>{crRows.map((r, i) => <tr key={i}><td><b>{r.name}</b></td><td className="r num">{r.contents}</td><td className="r num">{r.views.toLocaleString("pt-BR")}</td><td className="r num">{r.inter.toLocaleString("pt-BR")}</td>{isBrand ? null : <><td className="r num">{brl(r.sales)}</td><td className="r num">{brl(r.comm)}</td><td className="r num">{r.ch}</td></>}</tr>)}</tbody></table></div> : <p className="muted">Sem creators no filtro.</p>}</div>
      </> : null}
    </>
  );
}
