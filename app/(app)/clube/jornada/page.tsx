import { requireModule } from "@/lib/session";
import { PageH, Kpi, fd } from "@/components/ui";
import LevelBadge, { levelOf } from "@/components/LevelBadge";

export default async function Jornada() {
  const { supabase, profile } = await requireModule("jornada");
  const [{ data: me }, { data: levels }, { data: rules }, { data: log }] = await Promise.all([
    supabase.from("creators").select("name,xp").eq("id", profile.creator_id).single(),
    supabase.from("levels").select("*").order("position"),
    supabase.from("point_rules").select("*").eq("active", true).order("position"),
    supabase.from("points_log").select("*").eq("creator_id", profile.creator_id).order("created_at", { ascending: false }).limit(50),
  ]);
  const pts = me?.xp || 0, L = levels || [];
  const lv = levelOf(L, pts);
  return (
    <>
      <PageH eyebrow="Evolução" title="Minha jornada" sub="Cada entrega, venda e desafio vale pontos. Junte pontos para subir de nível e crescer junto com a Conecta." />
      <div className="club-hero" style={{ gap: 12 }}><span className="eyebrow" style={{ color: "#FF8CC4" }}>Seu nível</span><div><LevelBadge level={lv.cur} /></div><h1>{pts} pontos</h1>
        {lv.next ? <><p style={{ color: "#C9BFC6" }}>Faltam <b style={{ color: "#fff" }}>{lv.next.min_points - pts} pontos</b> para {lv.next.name}.</p><div className="bar" style={{ maxWidth: 420, background: "#2A2730" }}><i style={{ width: `${lv.pct}%` }} /></div></> : <p style={{ color: "#C9BFC6" }}>Você chegou ao nível máximo da Conecta. ✨</p>}</div>
      <div className="lv-steps">{L.map((l: any) => <div key={l.id} className={`lv-step ${l.id === lv.cur?.id ? "on" : pts >= l.min_points ? "done" : ""}`} style={{ ["--lv" as any]: l.color }}><span className="eyebrow">Nível {l.position} · a partir de {l.min_points} pts</span><LevelBadge level={l} /><p className="small">{l.perks}</p>{l.id === lv.cur?.id ? <b className="small">Você está aqui</b> : pts >= l.min_points ? <span className="small muted">Conquistado ✓</span> : <span className="small muted">🔒 Bloqueado</span>}</div>)}</div>
      <div className="grid g2">
        <div className="card"><div className="card-h"><h2>Como ganhar pontos</h2></div><div className="list">{(rules || []).filter((r: any) => r.points > 0).map((r: any) => <div className="li" key={r.key}><div className="grow"><b>{r.label}</b>{r.description ? <span>{r.description}</span> : null}</div><span className="count" style={{ color: "var(--ok)" }}>+{r.points}</span></div>)}<div className="li"><div className="grow"><b>Desafios</b><span>Cada desafio mostra quantos pontos vale.</span></div></div></div></div>
        <div className="card"><div className="card-h"><h2>Seus pontos</h2></div>{log?.length ? <div className="list">{log.map((p: any) => <div className="li" key={p.id}><div className="grow"><b>{p.reason}</b><span>{fd(String(p.created_at).slice(0, 10))}</span></div><span className="count" style={{ color: p.points < 0 ? "var(--bad)" : "var(--ok)" }}>{p.points > 0 ? "+" : ""}{p.points}</span></div>)}</div> : <p className="muted">Seus primeiros pontos chegam com a primeira campanha aprovada.</p>}</div>
      </div>
    </>
  );
}
