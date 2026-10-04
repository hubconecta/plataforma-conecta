import { requireModule } from "@/lib/session";
import { PageH, Pill, Kpi, Empty, fd, brl } from "@/components/ui";

export default async function Comissoes() {
  const { supabase, profile } = await requireModule("comissoes");
  const [{ data: sales }, { data: rewards }] = await Promise.all([
    supabase.from("sales").select("id,product,sold,creator_pct,status,sale_date").eq("creator_id", profile.creator_id).neq("status", "Cancelada").order("sale_date", { ascending: false }),
    supabase.from("rewards").select("*").eq("creator_id", profile.creator_id).order("created_at", { ascending: false }),
  ]);
  const c = (s: any) => (Number(s.sold) * Number(s.creator_pct)) / 100;
  const by = (st: string) => (sales || []).filter((s: any) => s.status === st).reduce((t: number, s: any) => t + c(s), 0);
  return (
    <>
      <PageH eyebrow="Ganhos" title="Comissões e recompensas" sub="Acompanhe suas vendas, comissões e prêmios dos desafios." />
      <div className="kpis"><Kpi k="Liberada para pagamento" v={brl(by("Liberada"))} hero /><Kpi k="Pendente" v={brl(by("Pendente"))} /><Kpi k="Aprovada" v={brl(by("Aprovada"))} /><Kpi k="Já paga" v={brl(by("Paga"))} /></div>
      <div className="card"><div className="card-h"><h2>Vendas</h2></div>{sales?.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Produto</th><th className="r">Venda</th><th className="r">Sua comissão</th><th>Status</th></tr></thead><tbody>{sales.map((s: any) => <tr key={s.id}><td className="num small">{fd(s.sale_date)}</td><td>{s.product}</td><td className="r num">{brl(s.sold)}</td><td className="r num"><b>{brl(c(s))}</b> <span className="small muted">({Number(s.creator_pct)}%)</span></td><td><Pill s={s.status} /></td></tr>)}</tbody></table></div> : <Empty icon="coins" title="Nenhuma venda registrada ainda" text="Suas vendas com links e cupons aparecem aqui." />}</div>
      <div className="card"><div className="card-h"><h2>Recompensas</h2></div>{rewards?.length ? <div className="list">{rewards.map((r: any) => <div className="li" key={r.id}><div className="grow"><b>{r.title}</b><span>{r.type}{r.value ? ` · ${brl(r.value)}` : ""} · {fd(String(r.created_at).slice(0, 10))}</span></div><Pill s={r.status} /></div>)}</div> : <p className="muted">Ganhe recompensas participando dos desafios.</p>}</div>
    </>
  );
}
