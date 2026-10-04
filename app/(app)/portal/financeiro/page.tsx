import { requireModule } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageH, Pill, Kpi, Empty, fd, brl } from "@/components/ui";

export default async function MarcaFinanceiro() {
  const { supabase, profile } = await requireModule("fin_marca");
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const [{ data: entries }, { data: logs }, { data: c }, { data: b }] = await Promise.all([
    supabase.from("fin_entries").select("*").eq("kind", "receber").neq("status", "Cancelado").order("due", { ascending: false }),
    supabase.from("reminder_log").select("*").order("created_at", { ascending: false }).limit(5),
    createAdminClient().from("brand_contracts").select("monthly_value,due_day").eq("brand_id", profile.brand_id!).maybeSingle(),
    supabase.from("brands").select("billing_model,hiring_model").eq("id", profile.brand_id!).single(),
  ]);
  const all = entries || [];
  const open = all.filter((e: any) => e.status !== "Pago").sort((a: any, z: any) => a.due.localeCompare(z.due));
  const late = open.some((e: any) => e.due < today);
  const disp = (e: any) => e.status === "Pago" ? "Pago" : e.due < today ? "Vencido" : "Em aberto";
  return (
    <>
      <PageH eyebrow="Acompanhamento" title="Financeiro" sub="Seu contrato, próximos pagamentos e histórico com a Conecta." />
      <div className="kpis"><Kpi k="Valor mensal" v={c?.monthly_value ? brl(c.monthly_value) : "—"} hero /><Kpi k="Vencimento" v={c?.due_day ? `todo dia ${c.due_day}` : "—"} /><Kpi k="Modelo" v={b?.hiring_model || b?.billing_model || "—"} /><Kpi k="Situação" v={<Pill s={late ? "Vencido" : open.length ? "Em aberto" : "Em dia"} />} /></div>
      {open[0] ? <div className="card"><div className="card-h"><h2>Próximo pagamento</h2></div><div className="li"><div className="grow"><b>{open[0].description}</b><span>{open[0].ref || ""} · vence {fd(open[0].due)}</span></div><span className="count">{brl(open[0].value)}</span><Pill s={disp(open[0])} /></div></div> : null}
      <div className="card"><div className="card-h"><h2>Pagamentos</h2></div>{all.length ? <div className="table-wrap"><table><thead><tr><th>Referência</th><th>Descrição</th><th>Vencimento</th><th className="r">Valor</th><th>Status</th><th>Pago em</th></tr></thead><tbody>{all.map((e: any) => <tr key={e.id}><td className="small">{e.ref || "—"}</td><td>{e.description}</td><td className="num small">{fd(e.due)}</td><td className="r num">{brl(e.value)}</td><td><Pill s={disp(e)} /></td><td className="num small">{fd(e.paid_at)}</td></tr>)}</tbody></table></div> : <Empty icon="wallet" title="Nenhuma cobrança ainda" />}</div>
      {logs?.length ? <div className="card"><div className="card-h"><h2>Avisos de pagamento recebidos</h2></div><div className="list">{logs.map((l: any) => <div className="li" key={l.id}><div className="grow"><b>{l.message}</b><span>{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {l.channel}</span></div></div>)}</div></div> : null}
    </>
  );
}
