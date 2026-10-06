import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, Kpi, fd } from "@/components/ui";
import { setCampaignAppStatusBulk } from "../actions";
import BulkSelect from "./BulkSelect";

const PEND = ["Enviada", "Em análise"];
const TABS: [string, string, string[]][] = [["pendentes", "Para aprovar", PEND], ["aprovadas", "Aprovadas", ["Aprovada"]], ["espera", "Lista de espera", ["Lista de espera"]], ["reprovadas", "Reprovadas", ["Reprovada"]], ["todas", "Todas", []]];

export default async function Inscricoes({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("candidaturas");
  const [{ data: apps }, { data: camps }] = await Promise.all([
    supabase.from("campaign_applications").select("id,status,campaign_id,created_at"),
    supabase.from("campaigns").select("id,name,status,slots,start_date,end_date,brands(name)").not("status", "in", "(Em aprovação,Ajuste solicitado,Recusada)").order("created_at", { ascending: false }),
  ]);
  const cnt = (cid: string, sts: string[]) => (apps || []).filter((a: any) => a.campaign_id === cid && (!sts.length || sts.includes(a.status))).length;
  const sel = (camps || []).find((c: any) => c.id === q.c);

  // ---------- Lista de campanhas ----------
  if (!sel) {
    const withApps = (camps || []).filter((c: any) => cnt(c.id, []) > 0 || ["Inscrições abertas", "Ativa"].includes(c.status));
    const pendTotal = (apps || []).filter((a: any) => PEND.includes(a.status)).length;
    return (
      <>
        <PageH eyebrow="Central de aprovação" title="Inscrições em campanhas" sub="Escolha a campanha para ver e aprovar as creators inscritas nela." />
        <Notice q={q} />
        <div className="kpis"><Kpi k="Para aprovar" v={pendTotal} hero /><Kpi k="Campanhas com inscrições" v={withApps.filter((c: any) => cnt(c.id, []) > 0).length} /><Kpi k="Aprovadas" v={(apps || []).filter((a: any) => a.status === "Aprovada").length} /></div>
        {withApps.length ? <div className="camp-grid">{withApps.map((c: any) => { const p = cnt(c.id, PEND), ok = cnt(c.id, ["Aprovada"]); return (
          <Link key={c.id} href={`/inscricoes?c=${c.id}`} className={`card camp-card ${p ? "has-pend" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}><span className="eyebrow">{c.brands?.name || "Marca"}</span><Pill s={c.status} /></div>
            <h3>{c.name}</h3>
            <span className="small muted">{fd(c.start_date)} – {fd(c.end_date)}</span>
            <div className="camp-nums"><div><b>{p}</b><span>para aprovar</span></div><div><b>{ok}{c.slots ? `/${c.slots}` : ""}</b><span>aprovadas</span></div><div><b>{cnt(c.id, [])}</b><span>inscritas</span></div></div>
            <span className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>{p ? `Aprovar creators (${p})` : "Ver creators"}</span>
          </Link>); })}</div>
          : <div className="card"><Empty icon="inbox" title="Nenhuma inscrição ainda" text="Quando uma campanha estiver com inscrições abertas, as creators inscritas aparecem aqui, separadas por campanha." /></div>}
      </>
    );
  }

  // ---------- Inscritas de uma campanha ----------
  const tab = TABS.find((t) => t[0] === q.tab) || (cnt(sel.id, PEND) ? TABS[0] : TABS[4]);
  let qy = supabase.from("campaign_applications").select("*, creators(id,name,instagram,tiktok,followers,niche,kind,city,state,avatar_path,xp)").eq("campaign_id", sel.id).order("created_at", { ascending: true });
  if (tab[2].length) qy = qy.in("status", tab[2]);
  const { data } = await qy;
  const here = `/inscricoes?c=${sel.id}&tab=${tab[0]}`;
  const Btn = ({ id, s, cls, l }: any) => <button className={`btn ${cls} btn-sm`} name="one" value={`${id}|${s}`}>{l}</button>;
  const ok = cnt(sel.id, ["Aprovada"]);
  return (
    <>
      <PageH eyebrow={`Inscrições · ${sel.brands?.name || ""}`} title={sel.name} sub={`${cnt(sel.id, [])} inscritas · ${ok} aprovadas${sel.slots ? ` de ${sel.slots} vagas` : ""}`} right={<div className="actions"><Pill s={sel.status} /><Link className="btn btn-ghost btn-sm" href="/inscricoes">← Todas as campanhas</Link></div>} />
      <Notice q={q} />
      {sel.slots && ok >= sel.slots ? <div className="notice info">As {sel.slots} vagas desta campanha já estão preenchidas. Você ainda pode aprovar mais, se quiser.</div> : null}
      <div className="tabs">{TABS.map(([k, l, sts]) => <Link key={k} className={`tab ${tab[0] === k ? "on" : ""}`} href={`/inscricoes?c=${sel.id}&tab=${k}`}>{l} ({cnt(sel.id, sts)})</Link>)}</div>
      <div className="card">{data?.length ? <form action={setCampaignAppStatusBulk}><input type="hidden" name="back" value={here} />
        <div className="table-wrap"><table><thead><tr>{tab[0] === "pendentes" ? <th><BulkSelect /></th> : null}<th>Creator</th><th>Perfil</th><th className="r">Seguidores</th><th>Cidade</th><th>Inscrição</th><th>Status</th><th>Respostas</th><th className="r">Ações</th></tr></thead><tbody>
          {data.map((a: any) => { const c = a.creators || {}; return <tr key={a.id}>
            {tab[0] === "pendentes" ? <td><input type="checkbox" name="ids" value={a.id} className="bulk-ck" aria-label={`Selecionar ${c.name}`} /></td> : null}
            <td><Person name={c.name || "—"} src={c.avatar_path} ig={c.instagram} tt={c.tiktok} /><Link className="small" href={`/creators/${c.id}`}>ver perfil</Link></td>
            <td className="small">{[c.kind, c.niche].filter(Boolean).join(" · ") || "—"}</td>
            <td className="r num small">{c.followers ? `IG ${Number(c.followers).toLocaleString("pt-BR")}` : "—"}</td>
            <td className="small">{c.city ? `${c.city}/${c.state || ""}` : "—"}</td>
            <td className="num small">{fd(a.created_at?.slice(0, 10))}</td>
            <td><Pill s={a.status} /></td>
            <td className="small">{a.answers?.motivo || a.answers?.origem || "—"}</td>
            <td><div className="actions">{a.status !== "Aprovada" ? <Btn id={a.id} s="Aprovada" cls="btn-ok" l="Aprovar" /> : null}{a.status !== "Reprovada" ? <Btn id={a.id} s="Reprovada" cls="btn-bad" l="Reprovar" /> : null}{a.status !== "Lista de espera" ? <Btn id={a.id} s="Lista de espera" cls="btn-ghost" l="Espera" /> : null}</div></td>
          </tr>; })}
        </tbody></table></div>
        {tab[0] === "pendentes" ? <div className="actions" style={{ justifyContent: "flex-start", marginTop: 12 }}><span className="small muted" style={{ alignSelf: "center" }}>Com as marcadas:</span><button className="btn btn-ok btn-sm" name="status" value="Aprovada">Aprovar</button><button className="btn btn-ghost btn-sm" name="status" value="Lista de espera">Lista de espera</button><button className="btn btn-bad btn-sm" name="status" value="Reprovada">Reprovar</button></div> : null}
      </form> : <Empty icon="inbox" title={tab[0] === "pendentes" ? "Nenhuma inscrição para aprovar" : "Nada por aqui"} text="Quando creators se inscreverem nesta campanha, elas aparecem aqui." />}</div>
    </>
  );
}
