import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Notice, Person, Empty, fd } from "@/components/ui";
import LevelBadge, { levelOf } from "@/components/LevelBadge";
import { saveLevels, saveRules, addRule, givePoints } from "./actions";

export default async function Gamificacao({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("gamificacao");
  const tab = ["niveis", "pontos", "dar", "ranking", "historico"].includes(q.tab) ? q.tab : "niveis";
  const [{ data: levels }, { data: rules }, { data: creators }, { data: log }] = await Promise.all([
    supabase.from("levels").select("*").order("position"),
    supabase.from("point_rules").select("*").order("position").order("label"),
    supabase.from("creators").select("id,name,instagram,xp,kind").order("xp", { ascending: false }),
    tab === "historico" ? supabase.from("points_log").select("*, creators(name)").order("created_at", { ascending: false }).limit(150) : Promise.resolve({ data: [] as any[] }),
  ]);
  const L = levels || [];
  const count = (lv: any) => (creators || []).filter((c: any) => levelOf(L, c.xp || 0).cur?.id === lv.id).length;
  return (
    <>
      <PageH eyebrow="Gestão" title="Níveis e pontos" sub="As creators sobem de nível juntando pontos: campanhas, conteúdos no prazo, vendas, desafios e o que a equipe reconhecer." />
      <Notice q={q} />
      <div className="tabs">{[["niveis", "Níveis"], ["pontos", "Quanto vale cada ação"], ["dar", "Dar pontos"], ["ranking", "Ranking"], ["historico", "Histórico"]].map(([k, l]) => <Link key={k} className={`tab ${tab === k ? "on" : ""}`} href={`/gamificacao?tab=${k}`}>{l}</Link>)}</div>

      {tab === "niveis" ? <form action={saveLevels} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="lv-steps">{L.map((l: any) => <div key={l.id} className="lv-step" style={{ ["--lv" as any]: l.color }}>
          <input type="hidden" name="id" value={l.id} />
          <span className="eyebrow">Nível {l.position} · {count(l)} creators</span>
          <LevelBadge level={l} />
          <div className="field"><label>Nome do nível</label><input className="input" name="name" defaultValue={l.name} required /></div>
          <div className="field"><label>A partir de (pontos)</label><input className="input" type="number" min={0} name="min_points" defaultValue={l.min_points} /></div>
          <div className="field"><label>Cor do selo</label><input className="input" type="color" name="color" defaultValue={l.color} /></div>
          <div className="field"><label>Benefícios deste nível</label><textarea className="input" name="perks" defaultValue={l.perks || ""} /></div>
        </div>)}</div>
        <div><button className="btn btn-primary btn-sm">Salvar níveis</button></div>
      </form> : null}

      {tab === "pontos" ? <>
        <form action={saveRules} className="card"><div className="card-h"><h2>Quanto vale cada ação</h2><span className="small muted">automáticas contam sozinhas; as manuais a equipe dá em “Dar pontos”</span></div>
          <div className="table-wrap"><table><thead><tr><th>Ação</th><th>Como conta</th><th className="r">Pontos</th><th>Ativa</th></tr></thead><tbody>
            {(rules || []).map((r: any) => <tr key={r.key}><td><input type="hidden" name="key" value={r.key} /><input className="input" name="label" defaultValue={r.label} />{r.description ? <div className="small muted" style={{ marginTop: 4 }}>{r.description}</div> : null}</td><td className="small">{r.auto ? "Automática" : "A equipe dá"}</td><td className="r"><input className="input" type="number" name="points" defaultValue={r.points} style={{ maxWidth: 100, textAlign: "right" }} /></td><td><input type="checkbox" name="active" value={r.key} defaultChecked={r.active} aria-label={`Ativar ${r.label}`} /></td></tr>)}
          </tbody></table></div>
          <div style={{ marginTop: 12 }}><button className="btn btn-primary btn-sm">Salvar pontuação</button></div></form>
        <details className="mod"><summary>+ Nova ação que vale pontos</summary><form action={addRule} className="form-grid" style={{ paddingBottom: 14 }}><div className="field"><label>Ação</label><input className="input" name="label" required placeholder="Ex.: Stories com link de vendas" /></div><div className="field"><label>Pontos</label><input className="input" type="number" name="points" required /></div><div className="field full"><label>Descrição (opcional)</label><input className="input" name="description" /></div><div><button className="btn btn-dark btn-sm">Criar ação</button></div></form></details>
        <p className="small muted">Os pontos dos desafios continuam sendo definidos em cada desafio. A ação “Ganhadora de desafio” soma por cima para quem fica entre as ganhadoras.</p>
      </> : null}

      {tab === "dar" ? <form action={givePoints} className="card form-grid">
        <div className="field"><label>Ação</label><select className="input" name="rule_key" defaultValue=""><option value="">Outro motivo (digite os pontos)</option>{(rules || []).filter((r: any) => r.active).map((r: any) => <option key={r.key} value={r.key}>{r.label} · {r.points} pts</option>)}</select></div>
        <div className="field"><label>Pontos (deixe vazio para usar os da ação; pode ser negativo)</label><input className="input" type="number" name="points" /></div>
        <div className="field full"><label>Motivo que a creator vai ver</label><input className="input" name="reason" placeholder="Ex.: Reels da campanha Lume ficou incrível" /></div>
        <div className="field full"><label>Creators</label><div className="perm-grid">{(creators || []).map((c: any) => <label key={c.id} className="perm"><input type="checkbox" name="creator_id" value={c.id} defaultChecked={q.c === c.id} />{c.name} <span className="small muted">· {c.xp || 0} pts</span></label>)}</div></div>
        <div><button className="btn btn-primary btn-sm">Dar pontos</button></div>
      </form> : null}

      {tab === "ranking" ? <div className="card">{creators?.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Creator</th><th>Nível</th><th className="r">Pontos</th><th>Próximo nível</th><th></th></tr></thead><tbody>
        {creators.map((c: any, i: number) => { const lv = levelOf(L, c.xp || 0); return <tr key={c.id}><td className="num">{i + 1}º</td><td><Person name={c.name} sub={c.instagram || c.kind || ""} /></td><td><LevelBadge level={lv.cur} small /></td><td className="r num"><b>{c.xp || 0}</b></td><td style={{ minWidth: 160 }}>{lv.next ? <><span className="small muted">faltam {lv.next.min_points - (c.xp || 0)} para {lv.next.name}</span><div className="bar"><i style={{ width: `${lv.pct}%` }} /></div></> : <span className="small">Nível máximo ✨</span>}</td><td><Link className="btn btn-ghost btn-sm" href={`/gamificacao?tab=dar&c=${c.id}`}>Dar pontos</Link></td></tr>; })}
      </tbody></table></div> : <Empty icon="star" title="Nenhuma creator ainda" />}</div> : null}

      {tab === "historico" ? <div className="card">{log?.length ? <div className="list">{log.map((p: any) => <div className="li" key={p.id}><div className="grow"><b>{p.creators?.name}</b><span>{p.reason} · {p.given_by || "Automático"} · {fd(String(p.created_at).slice(0, 10))}</span></div><span className="count" style={{ color: p.points < 0 ? "var(--bad)" : "var(--ok)" }}>{p.points > 0 ? "+" : ""}{p.points}</span></div>)}</div> : <Empty icon="star" title="Nenhum ponto lançado ainda" />}</div> : null}
    </>
  );
}
