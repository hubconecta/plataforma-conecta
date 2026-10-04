import Link from "next/link";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Kpi, Pill, fd } from "@/components/ui";

export default async function Operacao() {
  const { supabase, profile } = await requireModule("ops");
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const c = async (t: string, f: (q: any) => any) => { const { count } = await f(supabase.from(t).select("id", { count: "exact", head: true })); return count || 0; };
  const [cad, insc, act, subs, conts, ships, leads] = await Promise.all([
    c("creator_applications", (q) => q.in("status", ["Nova", "Em análise"])), c("campaign_applications", (q) => q.in("status", ["Enviada", "Em análise"])), c("campaigns", (q) => q.eq("status", "Ativa")),
    c("challenge_submissions", (q) => q.in("status", ["Enviado", "Em análise"])), c("contents", (q) => q.in("status", ["Enviado", "Em análise"])), c("shipments", (q) => q.in("status", ["Aguardando envio", "Preparando", "Problema"])), c("leads", (q) => q.eq("stage", "Novo Lead")),
  ]);
  const { data: tasks } = can(profile, "demandas") ? await supabase.from("tasks").select("id,title,due,prio,status").eq("owner_id", profile.id).neq("status", "Concluído").order("due") : { data: [] as any[] };
  const k: [string, number, string, string][] = ([["Cadastros de creators", cad, "/cadastros", "cad_creators"], ["Inscrições aguardando", insc, "/inscricoes", "candidaturas"], ["Comprovantes de desafios", subs, "/desafios", "desafios"], ["Conteúdos para aprovar", conts, "/conteudos", "conteudos"], ["Envios em aberto", ships, "/envios", "amostras"], ["Novos leads", leads, "/leads", "crm"], ["Campanhas ativas", act, "/campanhas", "campanhas"]] as [string, number, string, string][]).filter((x) => can(profile, x[3]));
  return (
    <>
      <PageH eyebrow="O que está acontecendo na operação?" title={`Olá, ${profile.name.split(" ")[0]}`} sub="Tudo que precisa de ação hoje." />
      <div className="kpis">{k.map(([l, v, href], i) => <Link key={l} href={href} style={{ textDecoration: "none", color: "inherit" }}><Kpi k={l} v={v} hero={i === 0} /></Link>)}</div>
      {can(profile, "demandas") ? <div className="card"><div className="card-h"><h2>Minhas tarefas</h2><Link className="btn btn-ghost btn-sm" href="/tarefas">Ver todas</Link></div>{tasks?.length ? <div className="list">{tasks.map((t: any) => <div className="li" key={t.id}><div className="grow"><b>{t.title}</b><span style={{ color: t.due && t.due < today ? "var(--bad)" : undefined }}>prazo {fd(t.due)}{t.due && t.due < today ? " · atrasada" : ""}</span></div><Pill s={t.prio} /><Pill s={t.status} /></div>)}</div> : <p className="muted">Nenhuma tarefa aberta para você.</p>}</div> : null}
    </>
  );
}
