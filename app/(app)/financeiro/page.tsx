import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Kpi, Person, fd, brl } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { FIN_CATS, SALE_STATUS } from "@/lib/consts";
import { reminderText, kindFor, daysTo } from "@/lib/fin";
import { saveEntry, payEntry, cancelEntry, generateMonthly, sendReminder, saveRemSettings, saveSale, setSaleStatus, saveBrandProduct } from "./actions";

const KINDS = ["Club Criadora", "Comissão de marca", "Press kit", "Outro"];
const TABS: [string, string][] = [["visao", "Visão geral"], ["receber", "Contas a receber"], ["pagar", "Contas a pagar"], ["marcas", "Por marca"], ["cobrancas", "Cobranças e lembretes"], ["vendas", "Vendas e comissões"]];

export default async function Financeiro({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("fin");
  const tab = TABS.some((t) => t[0] === q.tab) ? q.tab : "visao";
  const here = `/financeiro?tab=${tab}`;
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const [{ data: entries }, { data: brands }, { data: contracts }, { data: rem }, { data: logs }, { data: sales }, { data: creators }, { data: camps }] = await Promise.all([
    supabase.from("fin_entries").select("*, brands(name,whatsapp,phone)").order("due", { ascending: true }),
    supabase.from("brands").select("id,name,status,billing_model,whatsapp,phone").order("name"),
    supabase.from("brand_contracts").select("*"),
    supabase.from("settings").select("value").eq("key", "rem").maybeSingle(),
    tab === "cobrancas" ? supabase.from("reminder_log").select("*, brands(name), fin_entries(description,ref)").order("created_at", { ascending: false }).limit(80) : Promise.resolve({ data: [] as any[] }),
    tab === "vendas" || tab === "visao" ? supabase.from("sales").select("*, creators(name), brands(name), campaigns(name)").order("sale_date", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    tab === "vendas" ? supabase.from("creators").select("id,name").order("name") : Promise.resolve({ data: [] as any[] }),
    tab === "vendas" ? supabase.from("campaigns").select("id,name").order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
  ]);
  const { data: bprods } = tab === "vendas" ? await supabase.from("brand_products").select("*, brands(name)").order("created_at", { ascending: false }) : { data: [] as any[] };
  const all = (entries || []).filter((e: any) => e.status !== "Cancelado");
  const disp = (e: any) => e.status === "Pago" ? "Pago" : e.due < today ? "Vencido" : "Em aberto";
  const sum = (arr: any[]) => arr.reduce((s, e) => s + (Number(e.value) || 0), 0);
  const rec = all.filter((e: any) => e.kind === "receber"), pag = all.filter((e: any) => e.kind === "pagar");
  const openRec = rec.filter((e: any) => e.status !== "Pago"), openPag = pag.filter((e: any) => e.status !== "Pago");
  const d30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const R = rem?.value || { before: 3, onDay: true, after: 2 };
  const months = Array.from({ length: 6 }).map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });
  const flow = months.map((m) => ({ m, in: sum(rec.filter((e: any) => e.status === "Pago" && String(e.paid_at || "").startsWith(m))), out: sum(pag.filter((e: any) => e.status === "Pago" && String(e.paid_at || "").startsWith(m))) }));
  const maxF = Math.max(1, ...flow.flatMap((f) => [f.in, f.out]));
  const salesAll = (sales || []).filter((s: any) => s.status !== "Cancelada");
  const comm = (s: any) => (Number(s.sold) * Number(s.creator_pct)) / 100, ccomm = (s: any) => (Number(s.sold) * Number(s.conecta_pct)) / 100;
  // Receita por origem (mês escolhido)
  const mes = /^\d{4}-\d{2}$/.test(q.mes || "") ? q.mes : today.slice(0, 7);
  const isFixo = (e: any) => e.kind === "receber" && (e.category === "Gestão" || String(e.ref || "").startsWith("Mensalidade"));
  const streams = (m: string) => {
    const sm = salesAll.filter((x: any) => String(x.sale_date || "").startsWith(m));
    const fixoPago = sum(rec.filter((e: any) => isFixo(e) && e.status === "Pago" && String(e.paid_at || "").startsWith(m)));
    const fixoPrev = sum(rec.filter((e: any) => isFixo(e) && String(e.due || "").startsWith(m)));
    const club = sm.filter((x: any) => x.kind === "Club Criadora").reduce((t: number, x: any) => t + Number(x.sold), 0);
    const marcaGmv = sm.filter((x: any) => x.kind === "Comissão de marca").reduce((t: number, x: any) => t + Number(x.sold), 0);
    const marcaCom = sm.filter((x: any) => x.kind === "Comissão de marca").reduce((t: number, x: any) => t + ccomm(x), 0);
    const pk = sm.filter((x: any) => x.kind === "Press kit").reduce((t: number, x: any) => t + Number(x.sold), 0);
    const outros = sm.filter((x: any) => x.kind === "Outro" || !x.kind).reduce((t: number, x: any) => t + Number(x.sold), 0) + sum(rec.filter((e: any) => !isFixo(e) && e.status === "Pago" && String(e.paid_at || "").startsWith(m)));
    return { fixoPago, fixoPrev, club, marcaGmv, marcaCom, pk, outros, total: fixoPago + club + marcaCom + pk + outros };
  };
  const S0 = streams(mes);
  const monthsBack = Array.from({ length: 6 }).map((_, i) => { const d = new Date(mes + "-15T12:00:00"); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });

  const EntryForm = ({ e, kind }: { e?: any; kind: string }) => (
    <form action={saveEntry} className="form-grid">{e ? <input type="hidden" name="id" value={e.id} /> : null}<input type="hidden" name="kind" value={kind} /><input type="hidden" name="back" value={here} />
      <div className="field"><label>Descrição</label><input className="input" name="description" required defaultValue={e?.description || ""} /></div>
      <div className="field"><label>Referência</label><input className="input" name="ref" placeholder="Ex.: Mensalidade 2026-10" defaultValue={e?.ref || ""} /></div>
      {kind === "receber" ? <div className="field"><label>Marca</label><select className="input" name="brand_id" defaultValue={e?.brand_id || ""}><option value="">—</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div> : null}
      <div className="field"><label>{kind === "receber" ? "Pagador" : "Fornecedor / favorecido"}</label><input className="input" name="party" defaultValue={e?.party || ""} /></div>
      <div className="field"><label>Categoria</label><select className="input" name="category" defaultValue={e?.category || ""}><option value="">—</option>{FIN_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>Valor (R$)</label><input className="input" type="number" step="0.01" name="value" required defaultValue={e?.value ?? ""} /></div>
      <div className="field"><label>Vencimento</label><input className="input" type="date" name="due" required defaultValue={e?.due || ""} /></div>
      <div><button className="btn btn-primary btn-sm">{e ? "Salvar" : "Lançar"}</button></div></form>
  );
  const Table = ({ rows, kind }: { rows: any[]; kind: string }) => rows.length ? <div className="table-wrap"><table><thead><tr><th>Descrição</th><th>{kind === "receber" ? "Pagador" : "Favorecido"}</th><th>Categoria</th><th>Vencimento</th><th className="r">Valor</th><th>Status</th><th></th></tr></thead><tbody>
    {rows.map((e: any) => <tr key={e.id}><td><b>{e.description}</b>{e.ref ? <div className="small muted">{e.ref}</div> : null}</td><td>{e.party || e.brands?.name || "—"}</td><td className="small">{e.category || "—"}</td><td className="num small">{fd(e.due)}{e.paid_at ? <div className="muted">pago {fd(e.paid_at)}</div> : null}</td><td className="r num"><b>{brl(e.value)}</b></td><td><Pill s={disp(e)} /></td>
      <td><div className="actions">{e.status !== "Pago" ? <><form action={payEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={here} /><button className="btn btn-ok btn-sm">Marcar como pago</button></form>{kind === "receber" && e.brand_id ? <Link className="btn btn-ghost btn-sm" href={`/financeiro?tab=cobrancas&fin=${e.id}`}>Lembrete</Link> : null}</> : <form action={cancelEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="reopen" value="1" /><input type="hidden" name="back" value={here} /><button className="btn btn-ghost btn-sm">Reabrir</button></form>}
        <details className="confirm-del"><summary className="btn btn-ghost btn-sm">Editar</summary><div className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)", maxWidth: 560 }}><EntryForm e={e} kind={kind} /><ConfirmDelete action={cancelEntry} fields={{ id: e.id, back: here }} label="Cancelar lançamento" warning="O lançamento sai dos totais (fica registrado como cancelado)." /></div></details></div></td></tr>)}
  </tbody></table></div> : <Empty icon="wallet" title="Nada por aqui" text="Lance a primeira conta acima." />;

  const selFin = q.fin ? openRec.find((e: any) => e.id === q.fin) : null;
  return (
    <>
      <PageH eyebrow="Gestão" title="Financeiro" sub="Módulo protegido: visível apenas para CEO, Financeiro e quem recebeu permissão." />
      <Notice q={q} />
      <div className="tabs">{TABS.map(([k, l]) => <Link key={k} className={`tab ${tab === k ? "on" : ""}`} href={`/financeiro?tab=${k}`}>{l}</Link>)}</div>

      {tab === "visao" ? <>
        <div className="card"><div className="card-h" style={{ flexWrap: "wrap", gap: 8 }}><div><h2>De onde vem o dinheiro</h2><span className="small muted">vendas da B4YOU entram sozinhas · mês de referência</span></div><form method="get" className="inline-form"><input type="hidden" name="tab" value="visao" /><input className="input" type="month" name="mes" defaultValue={mes} style={{ maxWidth: 170 }} /><button className="btn btn-ghost btn-sm">Ver</button></form></div>
          <div className="kpis"><Kpi k="Receita do mês" v={brl(S0.total)} hero /><Kpi k="Fixo mensal (recebido)" v={<>{brl(S0.fixoPago)}<span className="small muted" style={{ display: "block", fontSize: 12 }}>previsto {brl(S0.fixoPrev)}</span></>} /><Kpi k="Produtos da Leandra · Club Criadora" v={brl(S0.club)} /><Kpi k="Comissões das marcas" v={<>{brl(S0.marcaCom)}<span className="small muted" style={{ display: "block", fontSize: 12 }}>sobre {brl(S0.marcaGmv)} vendidos</span></>} /><Kpi k="Press kits" v={brl(S0.pk)} /><Kpi k="Outras receitas" v={brl(S0.outros)} /></div>
          <div className="table-wrap" style={{ marginTop: 12 }}><table><thead><tr><th>Mês</th><th className="r">Fixo mensal</th><th className="r">Club Criadora</th><th className="r">Comissões de marcas</th><th className="r">Press kits</th><th className="r">Outras</th><th className="r">Total</th></tr></thead><tbody>{monthsBack.map((m) => { const x = streams(m); return <tr key={m}><td><b>{m.split("-").reverse().join("/")}</b></td><td className="r num">{brl(x.fixoPago)}</td><td className="r num">{brl(x.club)}</td><td className="r num">{brl(x.marcaCom)}</td><td className="r num">{brl(x.pk)}</td><td className="r num">{brl(x.outros)}</td><td className="r num"><b>{brl(x.total)}</b></td></tr>; })}</tbody></table></div>
        </div>
        <div className="kpis"><Kpi k="A receber" v={brl(sum(openRec))} hero /><Kpi k="Inadimplência" v={brl(sum(openRec.filter((e: any) => e.due < today)))} /><Kpi k="A pagar" v={brl(sum(openPag))} /><Kpi k="Saldo projetado" v={brl(sum(openRec) - sum(openPag))} /><Kpi k="Recebido em 30 dias" v={brl(sum(rec.filter((e: any) => e.status === "Pago" && (e.paid_at || "") >= d30)))} /><Kpi k="Pago em 30 dias" v={brl(sum(pag.filter((e: any) => e.status === "Pago" && (e.paid_at || "") >= d30)))} /><Kpi k="Comissão Conecta (vendas)" v={brl(salesAll.reduce((s: number, x: any) => s + ccomm(x), 0))} /></div>
        <div className="grid g-main">
          <div className="card"><div className="card-h"><h2>Fluxo de caixa (6 meses)</h2><span className="small muted">entradas x saídas pagas</span></div><div className="hbars">{flow.map((f) => <div key={f.m} style={{ display: "flex", flexDirection: "column", gap: 4 }}><span className="small"><b>{f.m.split("-").reverse().join("/")}</b> · entrou {brl(f.in)} · saiu {brl(f.out)}</span><div className="bar"><i style={{ width: `${(f.in / maxF) * 100}%` }} /></div><div className="bar"><i style={{ width: `${(f.out / maxF) * 100}%`, background: "var(--ink)" }} /></div></div>)}</div></div>
          <div className="card"><div className="card-h"><h2>Próximos vencimentos</h2></div>{[...openRec, ...openPag].sort((a: any, b: any) => (a.due || "").localeCompare(b.due || "")).slice(0, 6).map((e: any) => <div className="li" key={e.id}><div className="grow"><b>{e.description}</b><span>{e.kind === "receber" ? "A receber" : "A pagar"} · {fd(e.due)}</span></div><span className="num"><b>{brl(e.value)}</b></span><Pill s={disp(e)} /></div>)}{!openRec.length && !openPag.length ? <p className="muted">Nada em aberto.</p> : null}</div>
        </div>
      </> : null}

      {tab === "receber" ? <>
        <div className="grid g2"><details className="mod"><summary>+ Nova conta a receber</summary><div style={{ paddingBottom: 14 }}><EntryForm kind="receber" /></div></details>
          <details className="mod"><summary>Gerar mensalidades do mês pelos contratos</summary><form action={generateMonthly} className="inline-form" style={{ paddingBottom: 14 }}><input type="hidden" name="back" value={here} /><input className="input" type="month" name="month" defaultValue={today.slice(0, 7)} style={{ maxWidth: 180 }} /><button className="btn btn-dark btn-sm">Gerar</button><span className="small muted">Usa o valor mensal e o dia de vencimento do contrato de cada marca ativa.</span></form></details></div>
        <div className="card"><Table rows={rec} kind="receber" /></div>
      </> : null}

      {tab === "pagar" ? <><details className="mod"><summary>+ Nova conta a pagar</summary><div style={{ paddingBottom: 14 }}><EntryForm kind="pagar" /></div></details><div className="card"><Table rows={pag} kind="pagar" /></div></> : null}

      {tab === "marcas" ? <div className="card"><div className="table-wrap"><table><thead><tr><th>Marca</th><th>Modelo</th><th className="r">Valor mensal</th><th>Vencimento</th><th>Próxima cobrança</th><th className="r">Saldo em aberto</th><th>Situação</th></tr></thead><tbody>
        {(brands || []).filter((b: any) => ["Ativa", "Negociação", "Pausada"].includes(b.status)).map((b: any) => { const c = (contracts || []).find((x: any) => x.brand_id === b.id); const op = openRec.filter((e: any) => e.brand_id === b.id); const late = op.some((e: any) => e.due < today); const nx = op.sort((a: any, z: any) => a.due.localeCompare(z.due))[0]; return <tr key={b.id}><td><Link href={`/marcas/${b.id}`}><b>{b.name}</b></Link></td><td className="small">{b.billing_model || "—"}</td><td className="r num">{c?.monthly_value ? brl(c.monthly_value) : "—"}</td><td className="small">{c?.due_day ? `dia ${c.due_day}` : "—"}</td><td className="num small">{nx ? fd(nx.due) : "—"}</td><td className="r num">{brl(sum(op))}</td><td><Pill s={late ? "Vencido" : op.length ? "Em aberto" : "Em dia"} /></td></tr>; })}
      </tbody></table></div></div> : null}

      {tab === "cobrancas" ? <>
        <div className="card"><div className="card-h"><h2>Cobranças em aberto</h2></div>{openRec.filter((e: any) => e.brand_id).length ? <div className="table-wrap"><table><thead><tr><th>Marca</th><th>Cobrança</th><th>Vencimento</th><th className="r">Valor</th><th>Status</th><th></th></tr></thead><tbody>
          {openRec.filter((e: any) => e.brand_id).map((e: any) => <tr key={e.id}><td><b>{e.brands?.name}</b></td><td>{e.description}<div className="small muted">{e.ref}</div></td><td className="num small">{fd(e.due)}</td><td className="r num">{brl(e.value)}</td><td><Pill s={disp(e)} /></td><td><div className="actions"><Link className="btn btn-ghost btn-sm" href={`/financeiro?tab=cobrancas&fin=${e.id}`}>Enviar lembrete</Link><form action={payEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={here} /><button className="btn btn-ok btn-sm">Marcar como pago</button></form></div></td></tr>)}
        </tbody></table></div> : <p className="muted">Nenhuma cobrança de marca em aberto.</p>}</div>
        {selFin ? (() => { const k = kindFor(selFin.due, today); const msg = reminderText(k, selFin.brands?.name || "", selFin, Math.max(0, daysTo(selFin.due, today))); const ph = String(selFin.brands?.whatsapp || selFin.brands?.phone || "").replace(/\D/g, "").replace(/^55/, ""); return (
          <div className="card" id="lembrete"><div className="card-h"><h2>Lembrete · {selFin.brands?.name}</h2><span className="small muted">{selFin.description} · {brl(selFin.value)} · vence {fd(selFin.due)}</span></div>
            <form action={sendReminder} className="form-grid"><input type="hidden" name="fin_id" value={selFin.id} /><input type="hidden" name="back" value="/financeiro?tab=cobrancas" />
              <div className="field full"><label>Mensagem</label><textarea className="input" name="message" defaultValue={msg} /></div>
              <div className="field"><label>Canal</label><select className="input" name="channel"><option>Plataforma</option><option>WhatsApp</option></select></div>
              <div className="actions" style={{ alignSelf: "end", justifyContent: "flex-start" }}><button className="btn btn-primary btn-sm">Enviar lembrete</button>{ph ? <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/55${ph}?text=${encodeURIComponent(msg)}`}>Abrir WhatsApp da marca</a> : null}</div>
            </form><p className="small muted" style={{ marginTop: 8 }}>O lembrete sempre aparece no portal da marca. No WhatsApp, o envio é feito por você pelo botão (fica registrado no histórico).</p></div>); })() : null}
        <div className="card"><div className="card-h"><h2>Lembretes automáticos</h2></div>
          <form action={saveRemSettings} className="form-grid"><input type="hidden" name="back" value={here} />
            <label className="check full"><input type="checkbox" name="ativo" defaultChecked={R.ativo !== false} /> Enviar lembretes automáticos no portal da marca (todo dia às 9h)</label>
            <div className="field"><label>Avisar quantos dias antes</label><input className="input" type="number" min={1} max={30} name="before" defaultValue={R.before} /></div>
            <label className="check"><input type="checkbox" name="onDay" defaultChecked={R.onDay} /> Avisar no dia do vencimento</label>
            <div className="field"><label>Avisar quantos dias depois de vencido</label><input className="input" type="number" min={1} name="after" defaultValue={R.after} /></div>
            <div><button className="btn btn-dark btn-sm">Salvar</button></div></form></div>
        <div className="card"><div className="card-h"><h2>Histórico de lembretes</h2></div>{logs?.length ? <div className="table-wrap"><table><thead><tr><th>Quando</th><th>Quem enviou</th><th>Marca</th><th>Cobrança</th><th>Mensagem</th><th>Canal</th><th>Tipo</th><th>Status</th></tr></thead><tbody>{logs.map((l: any) => <tr key={l.id}><td className="num small">{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td><td>{l.who || "Sistema"}</td><td>{l.brands?.name}</td><td className="small">{l.fin_entries?.description}</td><td className="small" style={{ maxWidth: 320 }}>{l.message}</td><td className="small">{l.channel}</td><td className="small">{l.mode}</td><td><Pill s={l.status === "Enviado" ? "Enviado" : l.status} /></td></tr>)}</tbody></table></div> : <p className="muted">Nenhum lembrete enviado ainda.</p>}</div>
      </> : null}

      {tab === "vendas" ? <>
        <div className="kpis"><Kpi k="GMV" v={brl(salesAll.reduce((s: number, x: any) => s + Number(x.sold), 0))} hero /><Kpi k="Vendas" v={salesAll.length} /><Kpi k="Ticket médio" v={brl(salesAll.length ? salesAll.reduce((s: number, x: any) => s + Number(x.sold), 0) / salesAll.length : 0)} /><Kpi k="Comissão creators" v={brl(salesAll.reduce((s: number, x: any) => s + comm(x), 0))} /><Kpi k="Comissão Conecta" v={brl(salesAll.reduce((s: number, x: any) => s + ccomm(x), 0))} /><Kpi k="A pagar às creators (liberadas)" v={brl(salesAll.filter((x: any) => x.status === "Liberada").reduce((s: number, x: any) => s + comm(x), 0))} /></div>
        <div className="chips">{[["", "Todas"], ...KINDS.map((k) => [k, k])].map(([k, l]) => <Link key={l} className={`chip ${(q.k || "") === k ? "on" : ""}`} href={`/financeiro?tab=vendas${k ? `&k=${encodeURIComponent(k)}` : ""}`}>{l}<span className="c">{salesAll.filter((x: any) => !k || x.kind === k).length}</span></Link>)}</div>
        <details className="mod"><summary>Produtos das marcas na B4YOU (para calcular a comissão da Conecta)</summary><div style={{ paddingBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="small muted">Cadastre aqui os produtos das marcas que são vendidos pela B4YOU com o ID do produto lá. Cada venda aprovada entra sozinha em “Comissão de marca”, com a comissão da Conecta e da creator afiliada.</p>
          {bprods?.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Marca</th><th>ID B4YOU</th><th className="r">Preço</th><th className="r">Creator</th><th className="r">Conecta</th><th>Status</th></tr></thead><tbody>{bprods.map((b: any) => <tr key={b.id}><td><b>{b.name}</b></td><td>{b.brands?.name}</td><td className="small">{b.b4you_product || "—"}</td><td className="r num">{b.price ? brl(b.price) : "—"}</td><td className="r num">{Number(b.creator_pct)}%</td><td className="r num">{Number(b.conecta_pct)}%</td><td><Pill s={b.status} /></td></tr>)}</tbody></table></div> : null}
          <form action={saveBrandProduct} className="form-grid"><input type="hidden" name="back" value={here} />
            <div className="field"><label>Marca</label><select className="input" name="brand_id" required><option value="">Escolha</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div className="field"><label>Produto</label><input className="input" name="name" required /></div>
            <div className="field"><label>ID ou nome do produto na B4YOU</label><input className="input" name="b4you_product" required /></div>
            <div className="field"><label>Preço (R$)</label><input className="input" type="number" step="0.01" name="price" /></div>
            <div className="field"><label>Comissão da creator (%)</label><input className="input" type="number" step="0.01" name="creator_pct" /></div>
            <div className="field"><label>Comissão da Conecta (%)</label><input className="input" type="number" step="0.01" name="conecta_pct" required /></div>
            <div><button className="btn btn-primary btn-sm">Cadastrar produto da marca</button></div></form>
        </div></details>
        <details className="mod"><summary>+ Registrar venda</summary><form action={saveSale} className="form-grid" style={{ paddingBottom: 14 }}><input type="hidden" name="back" value={here} />
          <div className="field"><label>Produto</label><input className="input" name="product" required /></div><div className="field"><label>Valor vendido (R$)</label><input className="input" type="number" step="0.01" name="sold" required /></div>
          <div className="field"><label>Creator</label><select className="input" name="creator_id"><option value="">—</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field"><label>Marca</label><select className="input" name="brand_id"><option value="">Conecta (produto próprio)</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field"><label>Campanha</label><select className="input" name="campaign_id"><option value="">—</option>{(camps || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field"><label>Comissão da creator (%)</label><input className="input" type="number" step="0.01" name="creator_pct" /></div><div className="field"><label>Comissão da Conecta (%)</label><input className="input" type="number" step="0.01" name="conecta_pct" /></div>
          <div className="field"><label>Origem</label><select className="input" name="kind">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
          <div className="field"><label>Regra</label><select className="input" name="rule">{["Contrato", "Campanha", "Produto", "Marca"].map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="field"><label>Status</label><select className="input" name="status">{SALE_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div><div className="field"><label>Data</label><input className="input" type="date" name="sale_date" defaultValue={today} /></div>
          <div><button className="btn btn-primary btn-sm">Registrar</button></div></form></details>
        <div className="card"><div className="card-h"><h2>Comissões por venda</h2><span className="small muted">precedência: contrato &gt; campanha &gt; produto &gt; marca</span></div>{salesAll.length ? <form action={setSaleStatus}><input type="hidden" name="back" value={here} /><div className="table-wrap"><table><thead><tr><th></th><th>Data</th><th>Origem</th><th>Produto</th><th>Creator</th><th>Marca</th><th className="r">Vendido</th><th className="r">Creator</th><th className="r">Conecta</th><th>Regra</th><th>Status</th></tr></thead><tbody>
          {salesAll.filter((x: any) => !q.k || x.kind === q.k).map((s: any) => <tr key={s.id}><td><input type="checkbox" name="id" value={s.id} aria-label="Selecionar venda" /></td><td className="num small">{fd(s.sale_date)}</td><td className="small"><Pill s={s.kind || "Outro"} />{s.source === "B4YOU" ? <div className="muted">B4YOU{s.buyer_email ? ` · ${s.buyer_email}` : ""}</div> : <div className="muted">{s.source}</div>}</td><td><b>{s.product}</b>{s.campaigns?.name ? <div className="small muted">{s.campaigns.name}</div> : null}</td><td>{s.creators?.name || "—"}</td><td>{s.brands?.name || "Conecta"}</td><td className="r num">{brl(s.sold)}</td><td className="r num small">{brl(comm(s))}<div className="muted">{Number(s.creator_pct)}%</div></td><td className="r num small">{brl(ccomm(s))}<div className="muted">{Number(s.conecta_pct)}%</div></td><td className="small">{s.rule}</td><td><Pill s={s.status} /></td></tr>)}
        </tbody></table></div><div className="inline-form" style={{ marginTop: 10 }}><span className="small">Selecionadas:</span><select className="input" name="status" style={{ maxWidth: 180 }}>{SALE_STATUS.map((s) => <option key={s}>{s}</option>)}</select><button className="btn btn-dark btn-sm">Aplicar status</button></div></form> : <Empty icon="coins" title="Nenhuma venda registrada" text="Vendas da B4YOU entram sozinhas pelo webhook; você também pode registrar manualmente." />}</div>
      </> : null}
    </>
  );
}
