import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Empty, Notice } from "@/components/ui";
import { saveClass, setClassStatus } from "./actions";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dayOf = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
const timeOf = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(11, 16);

export default async function Aulas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await getSession();
  if (!profile) redirect("/login");
  const staff = ["ceo", "equipe"].includes(profile.role) && (can(profile, "campanhas") || can(profile, "marcas"));
  if (!staff && !["creator", "marca"].includes(profile.role)) redirect("/");
  const [{ data: list }, { data: brands }] = await Promise.all([
    supabase.from("classes").select("*, brands(name)").order("starts_at", { ascending: false }).limit(200),
    staff ? supabase.from("brands").select("id,name").order("name") : Promise.resolve({ data: [] as any[] }),
  ]);
  const now = Date.now() - 2 * 3600e3;
  const next = (list || []).filter((c: any) => new Date(c.starts_at).getTime() >= now && c.status === "Agendada").reverse();
  const past = (list || []).filter((c: any) => !(new Date(c.starts_at).getTime() >= now && c.status === "Agendada"));
  const Form = ({ c }: { c?: any }) => (
    <form action={saveClass} className="form-grid">{c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="field"><label>Marca</label><select className="input" name="brand_id" defaultValue={c?.brand_id || ""}><option value="">Conecta (todas as creators)</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label>Quem participa</label><select className="input" name="audience" defaultValue={c?.audience || "Creators da marca"}><option>Creators da marca</option><option>Todas as creators</option></select></div>
      <div className="field full"><label>Título da aula</label><input className="input" name="title" required defaultValue={c?.title || ""} placeholder="Ex.: Aula Anagrow · como vender mais nos stories" /></div>
      <div className="field full"><label>Tema / o que vai ser ensinado</label><textarea className="input" name="theme" defaultValue={c?.theme || ""} /></div>
      <div className="field"><label>Dia</label><input className="input" type="date" name="day" required defaultValue={c ? dayOf(c.starts_at) : ""} /></div>
      <div className="field"><label>Horário</label><input className="input" type="time" name="time" required defaultValue={c ? timeOf(c.starts_at) : "19:00"} /></div>
      <div className="field"><label>Duração (min)</label><input className="input" type="number" name="duration" defaultValue={c?.duration_min || 60} /></div>
      <div className="field"><label>Link da aula (Meet, Zoom, live…)</label><input className="input" type="url" name="url" defaultValue={c?.url || ""} placeholder="https://…" /></div>
      {c ? <label className="perm full"><input type="checkbox" name="notify" />Avisar de novo as creators e a marca sobre a mudança</label> : null}
      <div><button className="btn btn-primary btn-sm">{c ? "Salvar aula" : "Agendar e avisar"}</button></div></form>
  );
  const Card = ({ c }: { c: any }) => (
    <div className="li" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="grow"><b>{c.title}</b><span>{c.brands?.name || "Conecta"} · {when(c.starts_at)} · {c.duration_min || 60} min{staff ? ` · ${c.audience}` : ""}</span>{c.theme ? <span className="small" style={{ whiteSpace: "pre-wrap" }}>{c.theme}</span> : null}</div>
      <Pill s={c.status} />
      {c.status === "Agendada" && c.url ? <a className="btn btn-primary btn-sm" href={c.url} target="_blank" rel="noopener noreferrer">Entrar na aula</a> : null}
      {c.recording_url ? <a className="btn btn-ghost btn-sm" href={c.recording_url} target="_blank" rel="noopener noreferrer">▶️ Ver gravação</a> : null}
      {staff ? <details className="mod" style={{ width: "100%", padding: "0 10px" }}><summary className="small">Editar</summary><div style={{ paddingBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}><Form c={c} />
        <form action={setClassStatus} className="inline-form"><input type="hidden" name="id" value={c.id} /><select className="input" name="status" defaultValue={c.status}>{["Agendada", "Realizada", "Cancelada", "Excluir"].map((x) => <option key={x}>{x}</option>)}</select><input className="input" name="recording_url" type="url" placeholder="Link da gravação (opcional)" defaultValue={c.recording_url || ""} /><button className="btn btn-dark btn-sm">Atualizar</button></form></div></details> : null}
    </div>
  );
  return (
    <>
      <PageH eyebrow={staff ? "Operação" : profile.role === "marca" ? "Sua marca" : "Clube Conecta"} title="Aulas e lives" sub={staff ? "Agende aulas das marcas ou da Conecta. As creators da marca e a própria marca recebem a notificação, e no dia todas recebem um lembrete." : "Aulas e lives agendadas para você."} />
      <Notice q={q} />
      {staff ? <details className="mod" open={q.novo === "1" || !(list || []).length}><summary>+ Agendar aula</summary><div style={{ paddingBottom: 16 }}><Form /></div></details> : null}
      <div className="card"><div className="card-h"><h2>Próximas</h2></div>{next.length ? <div className="list">{next.map((c: any) => <Card key={c.id} c={c} />)}</div> : <Empty icon="play" title="Nenhuma aula agendada" text={staff ? "Agende a primeira aula acima." : "Quando tiver aula, ela aparece aqui e você recebe uma notificação."} />}</div>
      {past.length ? <div className="card"><div className="card-h"><h2>Anteriores</h2></div><div className="list">{past.slice(0, 30).map((c: any) => <Card key={c.id} c={c} />)}</div></div> : null}
    </>
  );
}
