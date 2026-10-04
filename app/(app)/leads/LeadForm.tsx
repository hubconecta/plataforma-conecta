import { LEAD_STAGES, LEAD_SOURCES, LEAD_INTERESTS, UFS } from "@/lib/consts";
import { saveLead } from "./actions";

export default function LeadForm({ l, owners, showValue }: { l?: any; owners: any[]; showValue: boolean }) {
  const F = ({ n, l: lb, t = "text", req }: { n: string; l: string; t?: string; req?: boolean }) => <div className="field"><label htmlFor={`ld_${n}`}>{lb}</label><input className="input" id={`ld_${n}`} name={n} type={t} required={req} defaultValue={l?.[n] ?? ""} /></div>;
  return (
    <form action={saveLead} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {l ? <input type="hidden" name="id" value={l.id} /> : null}
      <fieldset className="fs"><legend>Empresa</legend><div className="form-grid">
        <F n="company" l="Empresa (razão ou nome)" req /><F n="brand_name" l="Nome da marca" /><F n="cnpj" l="CNPJ" /><F n="site" l="Site" />
        <F n="instagram" l="Instagram" /><F n="tiktok" l="TikTok" /><F n="segment" l="Segmento" /><F n="category" l="Categoria" />
        <F n="city" l="Cidade" /><div className="field"><label htmlFor="ld_state">Estado</label><select className="input" id="ld_state" name="state" defaultValue={l?.state || ""}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div>
      </div></fieldset>
      <fieldset className="fs"><legend>Responsável</legend><div className="form-grid"><F n="contact" l="Nome" req /><F n="contact_role" l="Cargo" /><F n="email" l="E-mail" t="email" /><F n="phone" l="WhatsApp" t="tel" /></div></fieldset>
      <fieldset className="fs"><legend>Interesse</legend><div className="perm-grid">{LEAD_INTERESTS.map((i) => <label key={i} className="perm"><input type="checkbox" name="interests" value={i} defaultChecked={l?.interests?.includes(i)} />{i}</label>)}</div>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="ld_obj">Objetivo</label><textarea className="input" id="ld_obj" name="objective" defaultValue={l?.objective || ""} /></div></fieldset>
      <fieldset className="fs"><legend>Comercial</legend><div className="form-grid">
        <div className="field"><label htmlFor="ld_owner">Responsável Conecta</label><select className="input" id="ld_owner" name="owner_id" defaultValue={l?.owner_id || ""}><option value="">—</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
        {l ? null : <><div className="field"><label htmlFor="ld_stage">Etapa</label><select className="input" id="ld_stage" name="stage" defaultValue="Novo Lead">{LEAD_STAGES.slice(0, 5).map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="ld_src">Origem</label><select className="input" id="ld_src" name="source" defaultValue="Cadastro manual">{LEAD_SOURCES.filter((s) => s !== "Formulário Para Marcas").map((s) => <option key={s}>{s}</option>)}</select></div></>}
        {showValue ? <F n="value" l="Potencial mensal (R$)" t="number" /> : null}
        <F n="follow_up" l="Próximo follow-up" t="date" />
      </div></fieldset>
      <div><button className="btn btn-primary btn-sm">{l ? "Salvar lead" : "Cadastrar lead"}</button></div>
    </form>
  );
}
