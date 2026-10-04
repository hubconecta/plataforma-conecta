import Link from "next/link";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Notice, Pill, fd } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { saveEvent, deleteEvent } from "./actions";

type Item = { day: string; time?: string; title: string; kind: string; href: string; owner?: string | null; late?: boolean; id?: string; ev?: any };
const KIND: Record<string, string> = { Compromisso: "#E6007E", Tarefa: "#111111", Campanha: "#2F6FDB", Desafio: "#B7791F", "Follow-up": "#7A1F5C", Vencimento: "#C53030" };
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Calendario({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("calendario");
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const m = /^\d{4}-\d{2}$/.test(q.m || "") ? q.m : today.slice(0, 7);
  const [Y, M] = m.split("-").map(Number);
  const first = new Date(Date.UTC(Y, M - 1, 1)), daysIn = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const start = `${m}-01`, end = `${m}-${String(daysIn).padStart(2, "0")}`;
  const prev = new Date(Date.UTC(Y, M - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(Y, M, 1)).toISOString().slice(0, 7);
  const who = q.who === "todos" ? "" : q.who || profile.id;
  const [{ data: team }, { data: evs }, { data: tasks }, { data: camps }, { data: chs }, { data: leads }, { data: fin }, { data: brands }] = await Promise.all([
    supabase.from("profiles").select("id,name").in("role", ["ceo", "equipe"]).eq("status", "ativo").order("name"),
    supabase.from("calendar_events").select("*, brands(name)").gte("day", start).lte("day", end).order("start_time"),
    can(profile, "demandas") ? supabase.from("tasks").select("id,title,due,owner_id,status").gte("due", start).lte("due", end) : Promise.resolve({ data: [] as any[] }),
    can(profile, "campanhas") ? supabase.from("campaigns").select("id,name,start_date,end_date,status").or(`and(start_date.gte.${start},start_date.lte.${end}),and(end_date.gte.${start},end_date.lte.${end})`) : Promise.resolve({ data: [] as any[] }),
    can(profile, "desafios") ? supabase.from("challenges").select("id,name,due_date,status").gte("due_date", start).lte("due_date", end).neq("status", "Rascunho") : Promise.resolve({ data: [] as any[] }),
    can(profile, "crm") ? supabase.from("leads").select("id,company,brand_name,follow_up,owner_id,stage").gte("follow_up", start).lte("follow_up", end) : Promise.resolve({ data: [] as any[] }),
    can(profile, "fin") ? supabase.from("fin_entries").select("id,description,due,kind,status,value").gte("due", start).lte("due", end).eq("status", "Em aberto") : Promise.resolve({ data: [] as any[] }),
    supabase.from("brands").select("id,name").order("name"),
  ]);
  const TN = new Map((team || []).map((t: any) => [t.id, t.name]));
  const items: Item[] = [];
  (evs || []).forEach((e: any) => items.push({ day: e.day, time: e.start_time?.slice(0, 5), title: e.title, kind: "Compromisso", href: `/calendario?m=${m}&dia=${e.day}${q.who ? `&who=${q.who}` : ""}`, owner: e.owner_id, id: e.id, ev: e }));
  (tasks || []).forEach((t: any) => items.push({ day: t.due, title: t.title, kind: "Tarefa", href: "/tarefas", owner: t.owner_id, late: t.status !== "Concluído" && t.due < today }));
  (camps || []).forEach((c: any) => { if (c.start_date >= start && c.start_date <= end) items.push({ day: c.start_date, title: `Início · ${c.name}`, kind: "Campanha", href: "/campanhas" }); if (c.end_date && c.end_date >= start && c.end_date <= end) items.push({ day: c.end_date, title: `Fim · ${c.name}`, kind: "Campanha", href: "/campanhas" }); });
  (chs || []).forEach((c: any) => items.push({ day: c.due_date, title: `Prazo · ${c.name}`, kind: "Desafio", href: `/desafios/${c.id}` }));
  (leads || []).filter((l: any) => !["Cliente convertido", "Não convertido"].includes(l.stage)).forEach((l: any) => items.push({ day: l.follow_up, title: `Follow-up · ${l.brand_name || l.company}`, kind: "Follow-up", href: `/leads/${l.id}`, owner: l.owner_id }));
  (fin || []).forEach((f: any) => items.push({ day: f.due, title: `${f.kind === "receber" ? "Receber" : "Pagar"} · ${f.description}`, kind: "Vencimento", href: "/financeiro?tab=" + f.kind }));
  const mineOnly = (i: Item) => !who || !i.owner || i.owner === who || ["Campanha", "Desafio", "Vencimento"].includes(i.kind);
  const shown = items.filter(mineOnly);
  const byDay = (d: string) => shown.filter((i) => i.day === d).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const lead = first.getUTCDay();
  const cells = Array.from({ length: Math.ceil((lead + daysIn) / 7) * 7 }).map((_, i) => { const n = i - lead + 1; return n >= 1 && n <= daysIn ? `${m}-${String(n).padStart(2, "0")}` : null; });
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(q.dia || "") ? q.dia : today.startsWith(m) ? today : start;
  const qsWho = q.who ? `&who=${q.who}` : "";
  const here = `/calendario?m=${m}&dia=${sel}${qsWho}`;
  const monthName = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <PageH eyebrow="Gestão" title="Calendário" sub="Compromissos, tarefas, prazos de campanhas e desafios, follow-ups de leads e vencimentos, tudo em um lugar." />
      <Notice q={q} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div className="chips"><Link className={`chip ${who === profile.id ? "on" : ""}`} href={`/calendario?m=${m}`}>Minha agenda</Link>{(team || []).filter((t: any) => t.id !== profile.id).map((t: any) => <Link key={t.id} className={`chip ${who === t.id ? "on" : ""}`} href={`/calendario?m=${m}&who=${t.id}`}>{t.name}</Link>)}<Link className={`chip ${!who ? "on" : ""}`} href={`/calendario?m=${m}&who=todos`}>Todos</Link></div>
        <div className="actions" style={{ alignItems: "center" }}><Link className="btn btn-ghost btn-sm" href={`/calendario?m=${prev}${qsWho}`} aria-label="Mês anterior">←</Link><b style={{ textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>{monthName}</b><Link className="btn btn-ghost btn-sm" href={`/calendario?m=${next}${qsWho}`} aria-label="Próximo mês">→</Link><Link className="btn btn-ghost btn-sm" href={`/calendario${q.who ? `?who=${q.who}` : ""}`}>Hoje</Link></div>
      </div>
      <div className="chips">{Object.entries(KIND).map(([k, c]) => <span key={k} className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />{k}</span>)}</div>
      <div className="grid g-main">
        <div className="card" style={{ padding: 10 }}>
          <div className="cal">{WD.map((d) => <div key={d} className="cal-h">{d}</div>)}
            {cells.map((d, i) => d ? <Link key={i} href={`/calendario?m=${m}&dia=${d}${qsWho}`} className={`cal-d ${d === today ? "today" : ""} ${d === sel ? "sel" : ""}`}><span className="cal-n">{Number(d.slice(8))}</span>{byDay(d).slice(0, 3).map((it, j) => <span key={j} className="cal-i" style={{ borderLeftColor: KIND[it.kind], color: it.late ? "var(--bad)" : undefined }}>{it.time ? `${it.time} ` : ""}{it.title}</span>)}{byDay(d).length > 3 ? <span className="cal-more">+{byDay(d).length - 3}</span> : null}</Link> : <div key={i} className="cal-d off" />)}
          </div>
        </div>
        <div className="card"><div className="card-h"><h2>{fd(sel)}</h2></div>
          {byDay(sel).length ? <div className="list">{byDay(sel).map((it, j) => <div className="li" key={j} style={{ alignItems: "flex-start", flexWrap: "wrap" }}><i style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: KIND[it.kind] }} /><div className="grow"><b>{it.time ? `${it.time} · ` : ""}{it.title}</b><span>{it.kind}{it.owner ? ` · ${TN.get(it.owner) || ""}` : ""}{it.ev?.brands?.name ? ` · ${it.ev.brands.name}` : ""}{it.ev?.location ? ` · ${it.ev.location}` : ""}</span>{it.ev?.notes ? <span style={{ whiteSpace: "pre-wrap" }}>{it.ev.notes}</span> : null}</div>{it.late ? <Pill s="Atrasado" /> : null}
            {it.kind === "Compromisso" ? <ConfirmDelete action={deleteEvent} fields={{ id: it.id!, back: here }} warning="O compromisso será apagado." /> : <Link className="btn btn-ghost btn-sm" href={it.href}>Abrir</Link>}</div>)}</div> : <p className="muted">Nada marcado neste dia.</p>}
          <details className="mod" style={{ marginTop: 12 }} open={!byDay(sel).length}><summary>+ Novo compromisso em {fd(sel)}</summary>
            <form action={saveEvent} className="form-grid" style={{ paddingBottom: 14 }}><input type="hidden" name="back" value={here} />
              <div className="field full"><label>Título</label><input className="input" name="title" required placeholder="Reunião com a marca, gravação…" /></div>
              <div className="field"><label>Data</label><input className="input" type="date" name="day" required defaultValue={sel} /></div>
              <div className="field"><label>Responsável</label><select className="input" name="owner_id" defaultValue={who || profile.id}>{(team || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div className="field"><label>Início</label><input className="input" type="time" name="start_time" /></div><div className="field"><label>Fim</label><input className="input" type="time" name="end_time" /></div>
              <div className="field"><label>Marca (opcional)</label><select className="input" name="brand_id"><option value="">—</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div className="field"><label>Local ou link</label><input className="input" name="location" /></div>
              <div className="field full"><label>Observações</label><textarea className="input" name="notes" /></div>
              <div><button className="btn btn-primary btn-sm">Agendar</button></div></form></details>
          {can(profile, "demandas") ? <Link className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} href={`/tarefas?novo=1&due=${sel}`}>+ Nova tarefa com prazo em {fd(sel)}</Link> : null}
        </div>
      </div>
    </>
  );
}
