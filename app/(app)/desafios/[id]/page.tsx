import Link from "next/link";
import PrizeList, { prizeSummary, prizesOf } from "@/components/PrizeList";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Kpi, Person, fd, brl } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { CH_METRICS } from "@/lib/consts";
import ChallengeForm from "../ChallengeForm";
import { setChallengeStatus, reviewSubmission, saveChallengeResult, deleteChallenge } from "../actions";

export default async function Desafio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("desafios");
  const isBrand = profile.role === "marca", staff = !isBrand;
  const { data: c } = await supabase.from("challenges").select("*, brands(name), campaigns(name)").eq("id", id).single();
  if (!c || (isBrand && c.status === "Rascunho")) notFound();
  const [{ data: parts }, { data: subs }, { data: brands }, { data: camps }] = await Promise.all([
    supabase.from("challenge_participants").select("creator_id, progress, joined_at, creators(name,instagram,tiktok)").eq("challenge_id", id),
    staff ? supabase.from("challenge_submissions").select("*, creators(name,instagram,tiktok)").eq("challenge_id", id).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    staff ? supabase.from("brands").select("id,name").order("name") : Promise.resolve({ data: [] as any[] }),
    supabase.from("campaigns").select("id,name,brands(name)").not("status", "in", "(Recusada)").order("created_at", { ascending: false }),
  ]);
  const tabs: [string, string][] = [["detalhes", "Detalhes"], ...(staff ? [["comprovantes", `Comprovantes (${(subs || []).filter((s: any) => ["Enviado", "Em análise"].includes(s.status)).length})`] as [string, string]] : []), ["resultado", c.result ? "Ganhadoras e resultado" : "Resultado"], ...((staff || ["Em aprovação", "Ajuste solicitado"].includes(c.status)) ? [["editar", "Editar"] as [string, string]] : [])];
  const tab = tabs.some((t) => t[0] === q.tab) ? q.tab : "detalhes";
  const S = ({ status, label, cls = "btn-ghost", note }: { status: string; label: string; cls?: string; note?: boolean }) => note
    ? <details className="confirm-del"><summary className={`btn ${cls} btn-sm`}>{label}</summary><form action={setChallengeStatus} className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><textarea className="input" name="note" placeholder="Explique para a marca o que precisa mudar" required /><button className={`btn ${cls} btn-sm`}>{label}</button></form></details>
    : <form action={setChallengeStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><button className={`btn ${cls} btn-sm`}>{label}</button></form>;

  // Pré-preenche números do resultado a partir dos conteúdos das participantes na campanha
  let pre: Record<string, number> = { participants: parts?.length || 0, contents: 0, views: 0, interactions: 0, clicks: 0, orders: 0, sales: 0 };
  if (staff && c.campaign_id && tab === "resultado") {
    const ids = (parts || []).map((p: any) => p.creator_id);
    if (ids.length) {
      const { data: cts } = await supabase.from("contents").select("views,interactions").eq("campaign_id", c.campaign_id).in("creator_id", ids);
      pre.contents = cts?.length || 0; pre.views = (cts || []).reduce((s: number, x: any) => s + (x.views || 0), 0); pre.interactions = (cts || []).reduce((s: number, x: any) => s + (x.interactions || 0), 0);
    }
  }
  const r = c.result;
  const pool = new Map<string, string>();
  (parts || []).forEach((p: any) => pool.set(p.creator_id, p.creators?.name));
  (subs || []).forEach((s: any) => pool.set(s.creator_id, s.creators?.name));
  let poolList = [...pool.entries()];
  if (staff && tab === "resultado" && !poolList.length) { const { data: crs } = await supabase.from("creators").select("id,name").order("name"); poolList = (crs || []).map((x: any) => [x.id, x.name]); }
  const nRows = Math.max(c.winners || 3, r?.winners?.length || 0, 1) + (q.mais ? Number(q.mais) : 0);

  return (
    <>
      <PageH eyebrow={`${c.type} · ${c.campaigns?.name || c.brands?.name || "Clube Conecta"}`} title={c.name} right={<div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Link className="btn btn-ghost btn-sm" href="/desafios">Voltar</Link><Pill s={c.status} /></div>} />
      <Notice q={q} />
      {c.review_note && ["Ajuste solicitado", "Recusado"].includes(c.status) ? <div className="notice info">Retorno da Conecta: {c.review_note}</div> : null}
      {staff ? <div className="actions" style={{ justifyContent: "flex-start" }}>
        {["Em aprovação", "Ajuste solicitado"].includes(c.status) ? <><S status="Ativo" label="Aprovar e publicar" cls="btn-primary" /><S status="Rascunho" label="Aprovar como rascunho" /><S status="Ajuste solicitado" label="Pedir ajuste à marca" note /><S status="Recusado" label="Recusar" cls="btn-bad" note /></> : null}
        {!["Ativo", "Encerrado", "Em aprovação", "Ajuste solicitado", "Recusado"].includes(c.status) ? <S status="Ativo" label="Ativar" cls="btn-primary" /> : null}
        {c.status === "Rascunho" ? <S status="Agendado" label="Agendar" /> : null}
        {c.status === "Ativo" ? <S status="Pausado" label="Pausar" /> : null}
        {["Ativo", "Pausado", "Agendado"].includes(c.status) ? <S status="Encerrado" label="Encerrar" cls="btn-dark" /> : null}
        {profile.role === "ceo" ? <ConfirmDelete action={deleteChallenge} fields={{ id }} label="Excluir" warning="Apaga o desafio, participações, comprovantes e o resultado. Recompensas já registradas continuam com as creators." /> : null}
      </div> : null}
      {staff && c.status === "Ativo" ? <p className="small muted">Ativar publica o desafio e avisa as creators do público. Pausar esconde até reativar. Encerrar impede novos comprovantes.</p> : null}
      <div className="tabs">{tabs.map(([k, l]) => <Link key={k} className={`tab ${tab === k ? "on" : ""}`} href={`/desafios/${id}?tab=${k}`}>{l}</Link>)}</div>

      {tab === "detalhes" ? <>
        <div className="kpis"><Kpi k="Participando" v={parts?.length || 0} hero /><Kpi k="Meta" v={c.target} /><Kpi k="Pontos" v={c.points || 0} /><Kpi k="Premiação" v={prizeSummary(c)} /><Kpi k="Prazo" v={fd(c.due_date)} /></div>
        {prizesOf(c).length ? <div className="card"><div className="card-h"><h2>Premiação</h2></div><PrizeList c={c} /></div> : null}
        <div className="card"><dl className="dl">
          {[["Público", c.audience], ["Período", `${fd(c.start_date)} – ${fd(c.due_date)}`], ["Descrição", c.description], ["Objetivo", c.objective], ["Regras", c.rules], ["Critérios", c.criteria], ["Comprovante exigido", c.evidence], ["Regulamento", c.regulation]].map(([k, v]) => v ? <div key={k as string}><dt>{k}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{String(v)}</dd></div> : null)}
        </dl></div>
        {parts?.length ? <div className="card"><div className="card-h"><h2>Participantes</h2></div><div className="list">{parts.map((p: any) => <div className="li" key={p.creator_id}><div className="grow"><Person name={p.creators?.name || "Creator"} ig={p.creators?.instagram} tt={p.creators?.tiktok} /></div><span className="small muted">{p.progress}/{c.target}</span><div className="bar" style={{ width: 120 }}><i style={{ width: `${Math.min(100, (p.progress / c.target) * 100)}%` }} /></div></div>)}</div></div> : null}
      </> : null}

      {tab === "comprovantes" && staff ? <div className="card">{subs?.length ? <div className="list">{subs.map((s: any) => (
        <div className="li" key={s.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
          <div className="grow"><Person name={s.creators?.name} ig={s.creators?.instagram} tt={s.creators?.tiktok} sub={`enviado ${fd(s.updated_at?.slice(0, 10))}`} />
            {s.evidence ? <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{s.evidence}</p> : null}
            {(s.links?.length ? s.links : s.link ? [s.link] : []).map((l: string, i: number) => <p key={i} className="small"><a href={l} target="_blank" rel="noopener noreferrer">Abrir comprovante {i + 1} ↗</a></p>)}
            {s.note ? <p className="small muted">Retorno: {s.note}</p> : null}</div>
          <Pill s={s.status} />
          {["Enviado", "Em análise"].includes(s.status) ? <div className="actions" style={{ width: "100%", justifyContent: "flex-start" }}>
            <form action={reviewSubmission}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="Aprovado" /><button className="btn btn-ok btn-sm">Aprovar</button></form>
            {s.status === "Enviado" ? <form action={reviewSubmission}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="Em análise" /><button className="btn btn-ghost btn-sm">Colocar em análise</button></form> : null}
            <details className="confirm-del"><summary className="btn btn-ghost btn-sm">Pedir ajuste</summary><form action={reviewSubmission} className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="Ajuste necessário" /><textarea className="input" name="note" placeholder="O que ela precisa ajustar? (opcional)" /><button className="btn btn-dark btn-sm">Enviar pedido de ajuste</button></form></details>
            <form action={reviewSubmission}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="Reprovado" /><button className="btn btn-bad btn-sm">Reprovar</button></form>
          </div> : null}
        </div>))}</div> : <Empty icon="inbox" title="Nenhum comprovante ainda" text="Quando uma creator enviar o comprovante, ele aparece aqui e você recebe uma notificação." />}</div> : null}

      {tab === "resultado" ? <>
        {r ? <>
          <div className="section-t"><h2>Ganhadoras</h2></div>
          <div className="cards">{r.winners.map((w: any) => <div key={w.creator_id} className="ccard"><div className="cbody"><span className="eyebrow">🏆 {w.place}º lugar</span><h3>{w.name}</h3>{w.prize ? <p><b>{w.prize}</b></p> : null}{w.highlight ? <p className="small muted">{w.highlight}</p> : null}</div></div>)}</div>
          <div className="section-t"><h2>Números do desafio</h2></div>
          <div className="kpis">{CH_METRICS.map(([k, l]) => <Kpi key={k} k={l} v={k === "sales" ? brl(r.metrics?.[k] || 0) : (r.metrics?.[k] || 0).toLocaleString("pt-BR")} hero={k === "sales"} />)}</div>
          {r.notes || r.links ? <div className="card"><div className="card-h"><h2>Destaques e observações</h2></div>{r.notes ? <p style={{ whiteSpace: "pre-wrap" }}>{r.notes}</p> : null}{r.links ? <p className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.links}</p> : null}</div> : null}
          <p className="small muted">Registrado por {r.by} em {fd(String(r.at).slice(0, 10))}.</p>
        </> : <Empty icon="trophy" title="Resultado ainda não registrado" text={staff ? "Registre as ganhadoras e os números abaixo. Eles vão para a marca e para o relatório dela." : "Assim que a Conecta registrar o resultado, as ganhadoras aparecem aqui e no relatório da sua marca."} />}
        {staff && ["Ativo", "Pausado", "Encerrado"].includes(c.status) ? <div className="card"><div className="card-h"><h2>{r ? "Editar resultado" : "Registrar resultado"}</h2></div>
          <form action={saveChallengeResult} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="hidden" name="id" value={id} /><input type="hidden" name="rows" value={nRows} />
            {Array.from({ length: nRows }).map((_, i) => { const w = r?.winners?.[i]; return (
              <div className="form-grid" key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                <div className="field"><label>{i + 1}º lugar · creator</label><select className="input" name={`w${i}_creator`} defaultValue={w?.creator_id || ""}><option value="">—</option>{poolList.map(([cid, n]) => <option key={cid} value={cid}>{n}</option>)}</select></div>
                <div className="field"><label>Prêmio</label><input className="input" name={`w${i}_prize`} defaultValue={w?.prize || (() => { const pz = (Array.isArray(c.prizes) ? c.prizes : []).filter((p: any) => /º lugar$/.test(p.place))[i]; return pz ? [pz.reward_label, Number(pz.reward_value) ? `R$ ${pz.reward_value}` : ""].filter(Boolean).join(" · ") : i === 0 ? c.reward_label || "" : ""; })()} /></div>
                <div className="field full"><label>Destaque (por que ganhou)</label><input className="input" name={`w${i}_highlight`} defaultValue={w?.highlight || ""} /></div>
              </div>); })}
            <div><Link className="btn btn-ghost btn-sm" href={`/desafios/${id}?tab=resultado&mais=${(Number(q.mais) || 0) + 1}`}>+ Adicionar colocação</Link></div>
            <div className="form-grid">{CH_METRICS.map(([k, l]) => <div className="field" key={k}><label>{l}</label><input placeholder="0,00" className="input" type="text" inputMode="decimal" name={`m_${k}`} defaultValue={r?.metrics?.[k] ?? pre[k] ?? 0} /></div>)}</div>
            <div className="field"><label>Destaques e observações</label><textarea className="input" name="notes" defaultValue={r?.notes || ""} /></div>
            <div className="field"><label>Links (posts, relatórios)</label><textarea className="input" name="links" defaultValue={r?.links || ""} /></div>
            <label className="check"><input type="checkbox" name="close" defaultChecked={c.status !== "Encerrado"} /> Encerrar o desafio</label>
            <label className="check"><input type="checkbox" name="rewards" defaultChecked /> Registrar as recompensas das ganhadoras</label>
            {c.brand_id ? <label className="check"><input type="checkbox" name="notify_brand" defaultChecked /> Avisar a marca (o resultado entra no relatório dela)</label> : null}
            <div><button className="btn btn-primary btn-sm">Salvar resultado</button></div>
          </form></div> : null}
      </> : null}

      {tab === "editar" ? <div className="card">{isBrand ? <p className="small muted" style={{ marginBottom: 10 }}>Ao salvar, o desafio volta para a aprovação da Conecta.</p> : null}<ChallengeForm c={c} brands={brands || []} campaigns={camps || []} isBrand={isBrand} /></div> : null}
    </>
  );
}
