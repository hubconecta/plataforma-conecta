import Link from "next/link";
import PrizeList, { prizeSummary, prizesOf } from "@/components/PrizeList";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";
import { joinChallenge, submitEvidence } from "../../desafios/actions";
import MultiLinks from "@/components/MultiLinks";

export default async function MeusDesafios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("meus_desafios");
  const me = profile.creator_id;
  const [{ data: chs }, { data: parts }, { data: subs }] = await Promise.all([
    supabase.from("challenges").select("*, brands(name), campaigns(name)").in("status", ["Ativo", "Encerrado"]).order("due_date", { ascending: true }),
    supabase.from("challenge_participants").select("challenge_id, progress").eq("creator_id", me),
    supabase.from("challenge_submissions").select("challenge_id, status, note, evidence, link, links").eq("creator_id", me),
  ]);
  const P = new Map((parts || []).map((p: any) => [p.challenge_id, p.progress]));
  const SB = new Map((subs || []).map((s: any) => [s.challenge_id, s]));
  const all = chs || [];
  const disp = all.filter((c: any) => c.status === "Ativo" && !P.has(c.id));
  const done = all.filter((c: any) => (SB.get(c.id) as any)?.status === "Aprovado" || c.result?.winners?.some((w: any) => w.creator_id === me));
  const ativos = all.filter((c: any) => P.has(c.id) && !done.includes(c));
  const tabs: [string, string, any[]][] = [["disponiveis", "Disponíveis", disp], ["ativos", "Participando", ativos], ["concluidos", "Concluídos", done]];
  const tab = tabs.find((t) => t[0] === q.tab) || tabs[0];
  return (
    <>
      <PageH eyebrow="Clube Conecta" title="Desafios" sub="Participe, cumpra o desafio e envie o comprovante para ganhar pontos e prêmios." />
      <Notice q={q} />
      <div className="tabs">{tabs.map(([k, l, arr]) => <Link key={k} className={`tab ${tab[0] === k ? "on" : ""}`} href={`/clube/desafios?tab=${k}`}>{l} ({arr.length})</Link>)}</div>
      {tab[2].length ? <div className="cards">{tab[2].map((c: any) => {
        const prog = P.get(c.id) as number | undefined, sub = SB.get(c.id) as any;
        const win = c.result?.winners?.find((w: any) => w.creator_id === me);
        const canSend = prog !== undefined && c.status === "Ativo" && (!sub || ["Ajuste necessário", "Reprovado"].includes(sub.status));
        return (
          <div key={c.id} className="ccard"><div className="cbody">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className="eyebrow">{c.type} · {c.brands?.name || "Clube Conecta"}</span>{sub ? <Pill s={sub.status} /> : <Pill s={c.status} />}</div>
            <h3>{c.name}</h3>
            {c.description ? <p className="small">{c.description}</p> : null}
            <div className="cmeta"><div>Prazo<b>{fd(c.due_date)}</b></div><div>Pontos<b>{c.points || 0}</b></div><div>Prêmio<b>{prizeSummary(c)}</b></div></div>
            {prizesOf(c).length ? <PrizeList c={c} compact /> : null}
            {c.rules ? <p className="small muted"><b>Regras:</b> {c.rules}</p> : null}
            {c.evidence ? <p className="small muted"><b>Comprovante:</b> {c.evidence}</p> : null}
            {prog !== undefined ? <div><span className="small muted">Progresso {prog}/{c.target}</span><div className="bar"><i style={{ width: `${Math.min(100, (prog / c.target) * 100)}%` }} /></div></div> : null}
            {sub?.note ? <div className="notice info">{sub.note}</div> : null}
            {win ? <div className="notice ok">🏆 Você ficou em {win.place}º lugar{win.prize ? ` · ${win.prize}` : ""}</div> : null}
            {prog === undefined && c.status === "Ativo" ? <form action={joinChallenge}><input type="hidden" name="id" value={c.id} /><button className="btn btn-primary btn-block">PARTICIPAR</button></form> : null}
            {canSend ? <details className="mod"><summary>{sub ? "Enviar comprovante de novo" : "ENVIAR COMPROVANTE"}</summary><form action={submitEvidence} style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14 }}><input type="hidden" name="id" value={c.id} />
              <div className="field"><label>O que você fez?</label><textarea className="input" name="evidence" defaultValue={sub?.evidence || ""} /></div>
              <MultiLinks label="Links dos posts, prints ou vídeos (Drive, Instagram, TikTok…)" initial={sub?.links?.length ? sub.links : sub?.link ? [sub.link] : []} />
              <button className="btn btn-primary btn-sm">Enviar comprovante</button></form></details> : null}
          </div></div>);
      })}</div> : <Empty icon="trophy" title={tab[0] === "disponiveis" ? "Nenhum desafio disponível agora" : tab[0] === "ativos" ? "Você não está participando de nenhum desafio" : "Nenhum desafio concluído ainda"} text="Quando a Conecta lançar um desafio novo, você recebe uma notificação." />}
    </>
  );
}
