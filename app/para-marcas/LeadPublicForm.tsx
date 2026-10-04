"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LEAD_INTERESTS, LEAD_AMOUNTS, UFS } from "@/lib/consts";

const I = ({ n, l, t = "text", req = false, ph = "" }: any) => <div className="field"><label htmlFor={`lf_${n}`}>{l}{req ? " *" : ""}</label><input className="input" id={`lf_${n}`} name={n} type={t} required={req} placeholder={ph} /></div>;
const YN = ({ n, l }: any) => <div className="field"><label htmlFor={`lf_${n}`}>{l}</label><select className="input" id={`lf_${n}`} name={n}><option value="">Prefiro não responder</option><option>Sim</option><option>Não</option></select></div>;

export default function LeadPublicForm({ qs }: { qs: any }) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) || "").trim() || null;
    const budget: any = {};
    ["hasBudget", "amount", "creators", "affiliates", "agency"].forEach((k) => { const v = g(k); if (v) budget[k === "hasBudget" ? "has" : k] = v; });
    const { error } = await createClient().from("leads").insert({ company: g("company"), brand_name: g("brand_name"), cnpj: g("cnpj"), site: g("site"), instagram: g("instagram"), tiktok: g("tiktok"), segment: g("segment"), category: g("category"), city: g("city"), state: g("state"), contact: g("contact"), contact_role: g("contact_role"), email: g("email"), phone: g("phone"), interests: fd.getAll("interests").map(String), objective: g("objective"), budget, source: "Formulário Para Marcas", stage: "Novo Lead", follow_up: new Date(Date.now() + 864e5).toISOString().slice(0, 10) });
    setBusy(false);
    if (error) { setErr("Não foi possível enviar agora. Tente de novo em alguns minutos."); return; }
    setDone(true); document.getElementById("form")?.scrollIntoView();
  }
  if (done) return <div className="empty" id="form"><h3>Recebemos o seu interesse!</h3><p>Nossa equipe comercial vai entrar em contato pelo e-mail ou WhatsApp informado. Obrigada por pensar na Conecta.</p></div>;
  return (
    <form className="signup" id="form" onSubmit={onSubmit} style={{ padding: 0 }}>
      <div><span className="eyebrow">Para marcas</span><h1 style={{ marginTop: 6 }}>Quero saber mais</h1><p className="muted" style={{ marginTop: 6 }}>Conte um pouco sobre a sua marca. Campos com * são obrigatórios.</p></div>
      <fieldset className="fs"><legend>Dados da empresa</legend><div className="form-grid"><I n="company" l="Nome da empresa" req /><I n="brand_name" l="Nome da marca" req /><I n="cnpj" l="CNPJ" /><I n="site" l="Site" /><I n="instagram" l="Instagram" ph="@suamarca" /><I n="tiktok" l="TikTok" /><I n="segment" l="Segmento" /><I n="category" l="Categoria" /><I n="city" l="Cidade" /><div className="field"><label htmlFor="lf_state">Estado</label><select className="input" id="lf_state" name="state"><option value=""></option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div></div></fieldset>
      <fieldset className="fs"><legend>Responsável</legend><div className="form-grid"><I n="contact" l="Nome" req /><I n="contact_role" l="Cargo" /><I n="email" l="E-mail" t="email" req /><I n="phone" l="WhatsApp" t="tel" req ph="(00) 00000-0000" /></div></fieldset>
      <fieldset className="fs"><legend>O que você busca na Conecta?</legend><div className="perm-grid">{LEAD_INTERESTS.map((x) => <label key={x} className="perm"><input type="checkbox" name="interests" value={x} />{x}</label>)}</div></fieldset>
      <fieldset className="fs"><legend>Qual é o principal objetivo da sua marca?</legend><div className="field"><label htmlFor="lf_obj" className="small">Conte o que você busca e quais resultados gostaria de alcançar.</label><textarea className="input" id="lf_obj" name="objective" /></div></fieldset>
      {Object.values(qs || {}).some(Boolean) ? <fieldset className="fs"><legend>Orçamento e estrutura · opcional</legend><div className="form-grid">
        {qs.hasBudget ? <YN n="hasBudget" l="Já possui orçamento para marketing de influência?" /> : null}
        {qs.amount ? <div className="field"><label htmlFor="lf_amount">Quanto pretende investir?</label><select className="input" id="lf_amount" name="amount"><option value="">Prefiro não responder</option>{LEAD_AMOUNTS.map((a) => <option key={a}>{a}</option>)}</select></div> : null}
        {qs.creators ? <YN n="creators" l="Já trabalha com creators?" /> : null}{qs.affiliates ? <YN n="affiliates" l="Já possui programa de afiliados?" /> : null}{qs.agency ? <YN n="agency" l="Já trabalhou com agência?" /> : null}
      </div></fieldset> : null}
      <label className="check"><input type="checkbox" required /> Autorizo a Conecta a entrar em contato com as informações acima.</label>
      {err ? <p className="err" role="alert">{err}</p> : null}
      <div><button className="btn btn-primary" disabled={busy}>{busy ? "Enviando…" : "Enviar para a Conecta"}</button></div>
    </form>
  );
}
