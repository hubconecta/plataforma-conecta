import Link from "next/link";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Empty, Notice, fd, brl } from "@/components/ui";
import { LEAD_STAGES } from "@/lib/consts";
import LeadForm from "./LeadForm";

const FILTERS: [string, string][] = [["abertos", "Em aberto"], ["todos", "Todos"], ["convertidos", "Convertidos"], ["nao", "Não convertidos"], ["follow", "Follow-up futuro"]];

export default async function Leads({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("crm");
  const showValue = profile.role === "ceo" || can(profile, "fin");
  const [{ data: leads }, { data: owners }] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,name").in("role", ["ceo", "equipe"]).eq("status", "ativo").order("name"),
  ]);
  const ON = new Map((owners || []).map((o: any) => [o.id, o.name]));
  const all = leads || [];
  const isOpen = (l: any) => !["Cliente convertido", "Não convertido"].includes(l.stage);
  const f = FILTERS.some((x) => x[0] === q.f) ? q.f : "abertos";
  const view = q.v === "funil" ? "funil" : "lista";
  const shown = all.filter((l: any) => f === "todos" ? true : f === "abertos" ? isOpen(l) : f === "convertidos" ? l.stage === "Cliente convertido" : f === "nao" ? l.stage === "Não convertido" : l.stage === "Follow-up futuro");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageH eyebrow="Comercial · CRM" title="Leads de marcas" sub={`${all.filter(isOpen).length} leads em aberto · lead é empresa interessada; só vira marca cliente depois de convertido`} right={<Link className="btn btn-ghost btn-sm" href="/para-marcas" target="_blank">Ver formulário público</Link>} />
      <Notice q={q} />
      <details className="mod" open={q.novo === "1"}><summary>+ Novo lead</summary><div style={{ paddingBottom: 16 }}><LeadForm owners={owners || []} showValue={showValue} /></div></details>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div className="chips">{FILTERS.map(([k, l]) => <Link key={k} className={`chip ${f === k ? "on" : ""}`} href={`/leads?f=${k}&v=${view}`}>{l}</Link>)}</div>
        <div className="chips"><Link className={`chip ${view === "lista" ? "on" : ""}`} href={`/leads?f=${f}&v=lista`}>Lista</Link><Link className={`chip ${view === "funil" ? "on" : ""}`} href={`/leads?f=${f}&v=funil`}>Funil</Link></div>
      </div>
      {view === "lista" ? <div className="card">{shown.length ? <div className="table-wrap"><table><thead><tr><th>Empresa · marca</th><th>Responsável</th><th>Segmento</th><th>Interesse</th><th>Entrada</th><th>Resp. Conecta</th><th>Status</th><th>Última interação</th><th>Follow-up</th></tr></thead><tbody>
        {shown.map((l: any) => <tr key={l.id}><td><Link href={`/leads/${l.id}`}><b>{l.brand_name || l.company}</b></Link><div className="small muted">{l.company}</div></td><td>{l.contact}<div className="small muted">{[l.email, l.phone].filter(Boolean).join(" · ")}</div></td><td>{l.segment || "—"}</td><td className="small">{l.interests?.[0] || "—"}{l.interests?.length > 1 ? ` +${l.interests.length - 1}` : ""}</td><td className="small">{l.source}<div className="muted">{fd(String(l.created_at).slice(0, 10))}</div></td><td>{ON.get(l.owner_id) || "—"}</td><td><Pill s={l.stage} /></td><td className="num small">{fd(String(l.last_at).slice(0, 10))}</td><td className="num small" style={{ color: l.follow_up && l.follow_up < today && isOpen(l) ? "var(--bad)" : undefined }}>{fd(l.follow_up)}</td></tr>)}
      </tbody></table></div> : <Empty icon="funnel" title="Nenhum lead aqui" text="Leads chegam pelo formulário público Para Marcas ou pelo cadastro manual." />}</div>
        : <div className="kanban" style={{ gridTemplateColumns: "repeat(8,minmax(230px,1fr))" }}>{LEAD_STAGES.map((st) => { const col = shown.filter((l: any) => l.stage === st); return (
          <div className="kcol" key={st}><div className="kcol-h"><span>{st}</span><span className="count" style={{ fontSize: 14 }}>{col.length}</span></div>
            {col.map((l: any) => <Link key={l.id} href={`/leads/${l.id}`} className="kcard" style={{ textDecoration: "none", color: "inherit" }}><b>{l.brand_name || l.company}</b><span className="small muted">{l.contact}{l.interests?.[0] ? ` · ${l.interests[0]}` : ""}</span><div className="kcard-f"><span className="small" style={{ color: l.follow_up && l.follow_up < today ? "var(--bad)" : "var(--muted)" }}>{l.follow_up ? `Follow-up ${fd(l.follow_up)}` : ""}</span>{showValue && l.value ? <span className="small num"><b>{brl(l.value)}/mês</b></span> : null}</div></Link>)}
          </div>); })}</div>}
    </>
  );
}
