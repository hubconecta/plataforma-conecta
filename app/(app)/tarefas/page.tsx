import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Notice, fd } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { TASK_STATUS, PRIOS } from "@/lib/consts";
import { saveTask, moveTask, deleteTask } from "./actions";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { LabelFilter, LabelChecks } from "@/components/Labels";

export default async function Tarefas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("demandas");
  const [{ data: tasks }, { data: team }, { data: brands }, { data: camps }, { data: creators }] = await Promise.all([
    supabase.from("tasks").select("*, brands(name), campaigns(name), creators(name)").order("due", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id,name").in("role", ["ceo", "equipe"]).eq("status", "ativo").order("name"),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("campaigns").select("id,name").order("created_at", { ascending: false }),
    supabase.from("creators").select("id,name").order("name"),
  ]);
  const L = await loadLabels(supabase, "task");
  const TL = L.usable("task");
  const TN = new Map((team || []).map((t: any) => [t.id, t.name]));
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const late = (t: any) => t.status !== "Concluído" && t.due && t.due < today;
  const who = q.who || "";
  const et = TL.some((l) => l.id === q.et) ? q.et : "";
  const list = (tasks || []).filter((t: any) => (!who || t.owner_id === who) && (!et || L.has("task", t.id, et)));
  const base = `/tarefas${who ? `?who=${who}` : ""}`;
  const here = et ? `${base}${who ? "&" : "?"}et=${et}` : base;
  const Form = ({ t }: { t?: any }) => (
    <form action={saveTask} className="form-grid">
      {t ? <input type="hidden" name="id" value={t.id} /> : null}<input type="hidden" name="back" value={here} />
      <div className="field full"><label>Título</label><input className="input" name="title" required defaultValue={t?.title || ""} /></div>
      <div className="field"><label>Responsável</label><select className="input" name="owner_id" defaultValue={t?.owner_id || profile.id}>{(team || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="field"><label>Prazo</label><input className="input" type="date" name="due" required defaultValue={t?.due || (/^\d{4}-\d{2}-\d{2}$/.test(q.due || "") ? q.due : new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10))} /></div>
      <div className="field"><label>Prioridade</label><select className="input" name="prio" defaultValue={t?.prio || "Média"}>{PRIOS.map((p) => <option key={p}>{p}</option>)}</select></div>
      {t ? <div className="field"><label>Status</label><select className="input" name="status" defaultValue={t.status}>{TASK_STATUS.map((s) => <option key={s} value={s}>{s === "Concluído" ? "Concluída" : s}</option>)}</select></div> : null}
      <div className="field"><label>Marca</label><select className="input" name="brand_id" defaultValue={t?.brand_id || ""}><option value="">—</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label>Campanha</label><select className="input" name="campaign_id" defaultValue={t?.campaign_id || ""}><option value="">—</option>{(camps || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label>Creator</label><select className="input" name="creator_id" defaultValue={t?.creator_id || ""}><option value="">—</option>{(creators || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={t?.description || ""} /></div>
      {!t ? <LabelChecks labels={TL} on={et ? [et] : []} /> : null}
      <div><button className="btn btn-primary btn-sm">{t ? "Salvar" : "Criar tarefa"}</button></div>
    </form>
  );
  return (
    <>
      <PageH eyebrow="Gestão" title="Tarefas" sub={`${list.filter(late).length} atrasadas · tarefas vencidas ficam marcadas como atrasadas automaticamente`} />
      <Notice q={q} />
      <details className="mod" open={q.novo === "1"}><summary>+ Nova tarefa</summary><div style={{ paddingBottom: 16 }}><Form /></div></details>
      <div className="chips"><Link className={`chip ${!who ? "on" : ""}`} href={`/tarefas${et ? `?et=${et}` : ""}`}>Todos</Link>{(team || []).map((p: any) => <Link key={p.id} className={`chip ${who === p.id ? "on" : ""}`} href={`/tarefas?who=${p.id}${et ? `&et=${et}` : ""}`}>{p.name}</Link>)}</div>
      <LabelFilter labels={TL} active={et} base={base} />
      <div className="kanban">{TASK_STATUS.map((st, ci) => { const col = list.filter((t: any) => t.status === st); return (
        <div className="kcol" key={st}><div className="kcol-h"><span>{st === "Concluído" ? "Concluída" : st}</span><span className="count" style={{ fontSize: 14 }}>{col.length}</span></div>
          {col.map((t: any) => <div key={t.id} className={`kcard ${late(t) ? "late" : ""}`}>
            <LabelPicker all={TL} on={L.ids("task", t.id)} entity="task" id={t.id} compact />
            <b>{t.title}</b>
            <span className="small muted">{[t.brands?.name && `Marca · ${t.brands.name}`, t.campaigns?.name && `Campanha · ${t.campaigns.name}`, t.creators?.name && `Creator · ${t.creators.name}`].filter(Boolean).join(" · ") || "Interno"}</span>
            {t.description ? <span className="small" style={{ whiteSpace: "pre-wrap" }}>{t.description}</span> : null}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Pill s={t.prio} />{late(t) ? <Pill s="Atrasado" /> : null}</div>
            <div className="kcard-f"><span className="small">{TN.get(t.owner_id) || "—"} · {fd(t.due)}</span>
              <span style={{ display: "flex", gap: 4 }}>{ci > 0 ? <form action={moveTask}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="-1" /><input type="hidden" name="back" value={here} /><button className="btn btn-ghost btn-sm" aria-label="Voltar etapa">←</button></form> : null}{ci < 2 ? <form action={moveTask}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="1" /><input type="hidden" name="back" value={here} /><button className="btn btn-ghost btn-sm" aria-label="Avançar etapa">→</button></form> : null}</span></div>
            <details className="mod" style={{ padding: "0 10px" }}><summary className="small">Editar</summary><div style={{ paddingBottom: 12 }}><Form t={t} />{profile.role === "ceo" || t.created_by === profile.id ? <div style={{ marginTop: 10 }}><ConfirmDelete action={deleteTask} fields={{ id: t.id }} warning="A tarefa será apagada." /></div> : null}</div></details>
          </div>)}
        </div>); })}</div>
    </>
  );
}
