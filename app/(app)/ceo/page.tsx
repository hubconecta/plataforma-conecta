import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Kpi, brl } from "@/components/ui";
import Icon from "@/components/Icon";

export default async function CEO() {
  const { supabase, profile } = await requireModule("ceo");
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const in5 = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const c = async (t: string, f?: (q: any) => any) => { let q = supabase.from(t).select("id", { count: "exact", head: true }); if (f) q = f(q); const { count } = await q; return count || 0; };
  const [brandsAct, creatorsAct, campAct, campOpen, cadPend, inscPend, team, campProp, chProp, subsPend, contPend, leadsNew, tasksLate, chEnding, shipOpen, pkPend, metPend, chActive, contPub, students] = await Promise.all([
    c("brands", (q) => q.eq("status", "Ativa")), c("creators"), c("campaigns", (q) => q.eq("status", "Ativa")), c("campaigns", (q) => q.eq("status", "Inscrições abertas")),
    c("creator_applications", (q) => q.in("status", ["Nova", "Em análise"])), c("campaign_applications", (q) => q.in("status", ["Enviada", "Em análise"])), c("profiles", (q) => q.eq("role", "equipe")),
    c("campaigns", (q) => q.eq("status", "Em aprovação")), c("challenges", (q) => q.eq("status", "Em aprovação")), c("challenge_submissions", (q) => q.in("status", ["Enviado", "Em análise"])),
    c("contents", (q) => q.in("status", ["Enviado", "Em análise"])), c("leads", (q) => q.eq("stage", "Novo Lead")), c("tasks", (q) => q.neq("status", "Concluído").lt("due", today)),
    c("challenges", (q) => q.eq("status", "Ativo").lte("due_date", in5)), c("shipments", (q) => q.in("status", ["Aguardando envio", "Preparando", "Problema"])), c("pk_orders", (q) => q.in("status", ["Aguardando pagamento", "Preparando"])),
    c("method_purchases", (q) => q.eq("status", "Aguardando pagamento")), c("challenges", (q) => q.eq("status", "Ativo")), c("contents", (q) => q.eq("status", "Publicado")), c("method_purchases", (q) => q.eq("status", "Pago")),
  ]);
  const [{ data: camps }, { data: fin }, { data: sales }] = await Promise.all([
    supabase.from("campaigns").select("results"),
    supabase.from("fin_entries").select("kind,value,due,status,paid_at").neq("status", "Cancelado"),
    supabase.from("sales").select("sold,creator_pct,conecta_pct,status").neq("status", "Cancelada"),
  ]);
  const gmv = (camps || []).reduce((s: number, x: any) => s + (Number(x.results?.gmv) || 0), 0);
  const F = fin || [], sum = (a: any[]) => a.reduce((s, e) => s + (Number(e.value) || 0), 0);
  const month = today.slice(0, 7);
  const recMonth = sum(F.filter((e: any) => e.kind === "receber" && e.status === "Pago" && String(e.paid_at || "").startsWith(month)));
  const outMonth = sum(F.filter((e: any) => e.kind === "pagar" && e.status === "Pago" && String(e.paid_at || "").startsWith(month)));
  const aRec = sum(F.filter((e: any) => e.kind === "receber" && e.status !== "Pago")), vencido = F.filter((e: any) => e.kind === "receber" && e.status !== "Pago" && e.due < today);
  const prox = F.filter((e: any) => e.kind === "receber" && e.status !== "Pago" && e.due >= today && e.due <= in7).length;
  const aPag = sum(F.filter((e: any) => e.kind === "pagar" && e.status !== "Pago"));
  const commC = (sales || []).filter((s: any) => ["Aprovada", "Liberada"].includes(s.status)).reduce((t: number, s: any) => t + (Number(s.sold) * Number(s.creator_pct)) / 100, 0);
  const h = new Date().getUTCHours() - 3;
  const greet = h < 12 && h >= 0 ? "Bom dia" : h < 18 && h >= 0 ? "Boa tarde" : "Boa noite";
  const alerts: [string, number, string, string, string, string][] = [
    ["Pagamentos vencidos", vencido.length, "wallet", "/financeiro?tab=cobrancas", "cobranças de marcas em atraso", "bad"],
    ["Pagamentos próximos", prox, "calendar", "/financeiro?tab=receber", "vencem nos próximos 7 dias", "warn"],
    ["Campanhas para aprovar", campProp, "megaphone", "/campanhas?s=Em%20aprova%C3%A7%C3%A3o", "propostas enviadas pelas marcas", "pink"],
    ["Desafios para aprovar", chProp, "trophy", "/desafios?s=Em%20aprova%C3%A7%C3%A3o", "propostos pelas marcas", "pink"],
    ["Creators pendentes", cadPend, "user", "/cadastros", "cadastros aguardando aprovação", "pink"],
    ["Inscrições em campanhas", inscPend, "inbox", "/inscricoes", "aguardando análise", "info"],
    ["Comprovantes de desafios", subsPend, "trophy", "/desafios", "aguardando aprovação", "info"],
    ["Conteúdos pendentes", contPend, "film", "/conteudos", "aguardando aprovação", "info"],
    ["Novos leads", leadsNew, "funnel", "/leads", "empresas esperando contato", "pink"],
    ["Tarefas atrasadas", tasksLate, "tasks", "/tarefas", "passaram do prazo", "bad"],
    ["Desafios terminando", chEnding, "clock", "/desafios?s=Ativo", "encerram em até 5 dias", "warn"],
    ["Envios em aberto", shipOpen, "truck", "/envios", "aguardando, preparando ou com problema", "info"],
    ["Pedidos de press kit", pkPend, "gift", "/presskits?tab=pedidos", "aguardando pagamento ou preparo", "info"],
    ["Checkouts do Método", metPend, "book", "/metodo/admin?tab=alunas", "aguardando confirmação de pagamento", "warn"],
  ];
  const shown = alerts.filter((a) => a[1] > 0);
  return (
    <>
      <PageH eyebrow="Conecta CEO · Como está o negócio?" title={`${greet}, ${profile.name.split(" ")[0]}`} sub="Números reais do banco da Conecta." />
      <div className="card"><div className="card-h"><h2>Precisa da sua atenção</h2></div>{shown.length ? <div className="alerts">{shown.map(([t, n, i, href, s, tone]) => (
        <Link key={t} href={href} className="li" style={{ textDecoration: "none", color: "inherit" }}><span className={`alert-ic ${tone}`}><Icon name={i} /></span><span className="grow"><b>{t}</b><span>{s}</span></span><span className="count">{n}</span></Link>))}</div> : <p className="muted">Tudo em dia por aqui. ✨</p>}</div>
      <div className="section-t"><h2>Financeiro</h2></div>
      <div className="kpis"><Kpi k="Receita do mês" v={brl(recMonth)} hero /><Kpi k="Despesas do mês" v={brl(outMonth)} /><Kpi k="Resultado do mês" v={brl(recMonth - outMonth)} /><Kpi k="A receber" v={brl(aRec)} /><Kpi k="Vencido" v={brl(sum(vencido))} /><Kpi k="A pagar" v={brl(aPag)} /><Kpi k="Comissões a pagar" v={brl(commC)} /></div>
      <div className="section-t"><h2>Operação</h2></div>
      <div className="kpis"><Kpi k="Marcas ativas" v={brandsAct} hero /><Kpi k="Creators" v={creatorsAct} /><Kpi k="Campanhas ativas" v={campAct} /><Kpi k="Inscrições abertas" v={campOpen} /><Kpi k="Desafios ativos" v={chActive} /><Kpi k="Conteúdos publicados" v={contPub} /><Kpi k="GMV registrado" v={brl(gmv)} /><Kpi k="Alunas do Método" v={students} /><Kpi k="Colaboradoras" v={team} /></div>
    </>
  );
}
