// Próximas aulas/lives (creator, marca e equipe veem conforme as regras do banco).
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function ClassList({ supabase, brandId, limit = 3, title = "🎓 Próximas aulas e lives", empty }: { supabase: any; brandId?: string; limit?: number; title?: string; empty?: string }) {
  let q = supabase.from("classes").select("*, brands(name)").eq("status", "Agendada").gte("starts_at", new Date(Date.now() - 2 * 3600e3).toISOString()).order("starts_at").limit(limit);
  if (brandId) q = q.eq("brand_id", brandId);
  const { data, error } = await q;
  if (error || (!data?.length && !empty)) return null;
  return (
    <div className="card"><div className="card-h"><h2>{title}</h2><a className="btn btn-ghost btn-sm" href="/aulas">Ver todas</a></div>
      {data?.length ? <div className="list">{data.map((c: any) => <div className="li" key={c.id} style={{ flexWrap: "wrap" }}><div className="grow"><b>{c.title}</b><span>{c.brands?.name ? `${c.brands.name} · ` : ""}{when(c.starts_at)}</span>{c.theme ? <span className="small" style={{ whiteSpace: "pre-wrap" }}>{c.theme}</span> : null}</div>{c.url ? <a className="btn btn-primary btn-sm" href={c.url} target="_blank" rel="noopener noreferrer">Entrar na aula</a> : <span className="small muted">link em breve</span>}</div>)}</div> : <p className="small muted">{empty}</p>}
    </div>
  );
}
