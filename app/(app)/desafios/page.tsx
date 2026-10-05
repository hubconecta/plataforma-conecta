import Link from "next/link";
import { prizeSummary } from "@/components/PrizeList";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";
import { CH_STATUS } from "@/lib/consts";
import ChallengeForm from "./ChallengeForm";

export default async function Desafios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("desafios");
  const isBrand = profile.role === "marca";
  const [{ data: all }, { data: brands }, { data: camps }, { data: subs }] = await Promise.all([
    supabase.from("challenges").select("*, brands(name), campaigns(name), challenge_participants(creator_id)").order("created_at", { ascending: false }),
    isBrand ? Promise.resolve({ data: [] as any[] }) : supabase.from("brands").select("id,name").order("name"),
    supabase.from("campaigns").select("id,name,brands(name)").not("status", "in", "(Recusada,Encerrada)").order("created_at", { ascending: false }),
    isBrand ? Promise.resolve({ data: [] as any[] }) : supabase.from("challenge_submissions").select("challenge_id,status"),
  ]);
  const list = (all || []).filter((c: any) => !isBrand || c.status !== "Rascunho");
  const sts = CH_STATUS.filter((s) => list.some((c: any) => c.status === s));
  const f = q.s && sts.includes(q.s) ? q.s : "";
  const shown = f ? list.filter((c: any) => c.status === f) : list;
  const open = (id: string) => (subs || []).filter((s: any) => s.challenge_id === id && ["Enviado", "Em análise"].includes(s.status)).length;
  const approved = (id: string) => (subs || []).filter((s: any) => s.challenge_id === id && s.status === "Aprovado").length;
  const pendingApproval = list.filter((c: any) => c.status === "Em aprovação").length;
  return (
    <>
      <PageH eyebrow={isBrand ? "Sua marca" : "Gamificação"} title="Desafios" sub={isBrand ? "Desafios da sua marca no Clube Conecta. Você pode propor um desafio; ele entra no ar depois da aprovação da Conecta." : `${list.length} desafios${pendingApproval ? ` · ${pendingApproval} aguardando aprovação` : ""}`} />
      <Notice q={q} />
      <details className="mod" open={q.novo === "1"}><summary>+ {isBrand ? "Propor um desafio" : "Novo desafio"}</summary><div style={{ paddingBottom: 16 }}><ChallengeForm brands={brands || []} campaigns={camps || []} isBrand={isBrand} /></div></details>
      {sts.length > 1 ? <div className="chips"><Link className={`chip ${!f ? "on" : ""}`} href="/desafios">Todos<span className="c">{list.length}</span></Link>{sts.map((s) => <Link key={s} className={`chip ${f === s ? "on" : ""}`} href={`/desafios?s=${encodeURIComponent(s)}`}>{s}<span className="c">{list.filter((c: any) => c.status === s).length}</span></Link>)}</div> : null}
      {shown.length ? <div className="cards">{shown.map((c: any) => (
        <Link key={c.id} href={`/desafios/${c.id}`} className="ccard" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="cbody">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className="eyebrow">{c.type} · {c.campaigns?.name || c.brands?.name || "Clube Conecta"}</span><Pill s={c.status} /></div>
            <h3>{c.name}</h3>
            <div className="cmeta"><div>Período<b>{fd(c.start_date)} – {fd(c.due_date)}</b></div><div>Pontos<b>{c.points || 0}</b></div><div>Premiação<b>{prizeSummary(c)}</b></div></div>
            <p className="small muted">Público: {c.audience} · {c.challenge_participants?.length || 0} participando{isBrand ? "" : ` · ${approved(c.id)} aprovadas`}{c.result ? ` · ${c.result.winners?.length || 0} vencedoras` : ""}</p>
            {open(c.id) ? <span className="pill warn">{open(c.id)} comprovante(s) aguardando</span> : null}
            {c.result ? <p className="small"><b>🏆 {c.result.winners?.map((w: any) => `${w.place}º ${w.name}`).join(" · ")}</b></p> : null}
          </div>
        </Link>))}</div> : <Empty icon="trophy" title="Nenhum desafio aqui" text={isBrand ? "Proponha um desafio para as creators da sua marca." : "Crie o primeiro desafio."} />}
    </>
  );
}
