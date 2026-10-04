import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Notice, fd, brl } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { LEAD_STAGES } from "@/lib/consts";
import LeadForm from "../LeadForm";
import { setLeadStage, setLeadOwner, addLeadNote, convertLead, deleteLead } from "../actions";

export default async function Lead({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("crm");
  const showValue = profile.role === "ceo" || can(profile, "fin");
  const [{ data: l }, { data: notes }, { data: owners }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,name").in("role", ["ceo", "equipe"]).eq("status", "ativo").order("name"),
  ]);
  if (!l) notFound();
  const b = l.budget || {};
  const wa = l.phone ? `https://wa.me/55${String(l.phone).replace(/\D/g, "").replace(/^55/, "")}` : "";
  return (
    <>
      <PageH eyebrow={`Lead · ${l.source}`} title={l.brand_name || l.company} sub={`${l.company} · entrou em ${fd(String(l.created_at).slice(0, 10))}`} right={<div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}><Link className="btn btn-ghost btn-sm" href="/leads">Voltar</Link><Pill s={l.stage} /></div>} />
      <Notice q={q} />
      <div className="actions" style={{ justifyContent: "flex-start" }}>
        {wa ? <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
        {l.email ? <a className="btn btn-ghost btn-sm" href={`mailto:${l.email}`}>E-mail</a> : null}
        {l.brand_id ? <Link className="btn btn-dark btn-sm" href={`/marcas/${l.brand_id}`}>Abrir marca</Link> : <form action={convertLead}><input type="hidden" name="id" value={id} /><button className="btn btn-primary btn-sm">CONVERTER EM MARCA</button></form>}
        {profile.role === "ceo" ? <ConfirmDelete action={deleteLead} fields={{ id }} warning="Apaga o lead e o histórico de interações. Se ele já virou marca, a marca continua." /> : null}
      </div>
      <div className="grid g2">
        <div className="card"><div className="card-h"><h2>Etapa e responsável</h2></div>
          <form action={setLeadStage} className="inline-form"><input type="hidden" name="id" value={id} /><select className="input" name="stage" defaultValue={l.stage} style={{ maxWidth: 260 }}>{LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}</select><button className="btn btn-dark btn-sm">Mover</button></form>
          <form action={setLeadOwner} className="inline-form" style={{ marginTop: 10 }}><input type="hidden" name="id" value={id} /><select className="input" name="owner_id" defaultValue={l.owner_id || ""} style={{ maxWidth: 260 }}><option value="">Sem responsável</option>{(owners || []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><button className="btn btn-ghost btn-sm">Atribuir</button></form>
          <dl className="dl" style={{ marginTop: 14 }}><div><dt>Próximo follow-up</dt><dd>{fd(l.follow_up)}</dd></div><div><dt>Última interação</dt><dd>{fd(String(l.last_at).slice(0, 10))}</dd></div>{showValue ? <div><dt>Potencial mensal</dt><dd>{l.value ? brl(l.value) : "—"}</dd></div> : null}{l.converted_at ? <div><dt>Convertido em</dt><dd>{fd(String(l.converted_at).slice(0, 10))}</dd></div> : null}</dl>
        </div>
        <div className="card"><div className="card-h"><h2>Responsável da empresa</h2></div><dl className="dl">{[["Nome", l.contact], ["Cargo", l.contact_role], ["E-mail", l.email], ["WhatsApp", l.phone], ["Site", l.site], ["Instagram", l.instagram], ["TikTok", l.tiktok], ["CNPJ", l.cnpj], ["Segmento", l.segment], ["Cidade", l.city ? `${l.city}/${l.state || ""}` : null]].map(([k, v]) => v ? <div key={k}><dt>{k}</dt><dd>{v}</dd></div> : null)}</dl></div>
      </div>
      <div className="card"><div className="card-h"><h2>Interesse e objetivo</h2></div>
        <div>{(l.interests || []).map((i: string) => <span key={i} className="tag">{i}</span>)}</div>
        {l.objective ? <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{l.objective}</p> : null}
        {Object.keys(b).length ? <dl className="dl" style={{ marginTop: 12 }}>{[["Já tem verba", b.has], ...(profile.role === "ceo" || showValue ? [["Pretende investir", b.amount]] : []), ["Já trabalha com creators", b.creators], ["Tem programa de afiliados", b.affiliates], ["Tem agência", b.agency]].map(([k, v]) => v ? <div key={k}><dt>{k}</dt><dd>{v}</dd></div> : null)}</dl> : null}
      </div>
      <div className="card"><div className="card-h"><h2>Interações</h2></div>
        <form action={addLeadNote} className="form-grid"><input type="hidden" name="id" value={id} /><div className="field full"><label>O que aconteceu?</label><textarea className="input" name="text" required placeholder="Ex.: Liguei, ela pediu proposta para março." /></div><div className="field"><label>Próximo follow-up</label><input className="input" type="date" name="follow_up" /></div><div style={{ alignSelf: "end" }}><button className="btn btn-dark btn-sm">Registrar interação</button></div></form>
        <div className="list" style={{ marginTop: 10 }}>{(notes || []).map((n: any) => <div className="li" key={n.id}><div className="grow"><b>{n.who}</b><span style={{ whiteSpace: "pre-wrap", color: "var(--ink)" }}>{n.text}</span><span>{new Date(n.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span></div></div>)}</div>
      </div>
      <details className="mod"><summary>Editar dados do lead</summary><div style={{ paddingBottom: 16 }}><LeadForm l={l} owners={owners || []} showValue={showValue} /></div></details>
    </>
  );
}
