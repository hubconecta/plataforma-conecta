"use client";
import { useState } from "react";
import { FIELD_TYPES, FORM_USES, FORM_STATUS } from "@/lib/consts";

type Fld = { id: string; label: string; type: string; req: boolean; options?: string[] };
const LBL = Object.fromEntries(FIELD_TYPES);
const uid = () => "q" + Math.random().toString(36).slice(2, 8);

const BRAND_TEMPLATE: [string, string, boolean][] = [["nome", "Nome completo", true], ["cpf", "CPF", true], ["email", "E-mail", true], ["telefone", "WhatsApp", true], ["endereco", "Endereço completo", true], ["instagram", "Instagram", true], ["tiktok", "TikTok", false]];

export default function FormBuilder({ f, campaigns, brands = [], action, site }: { f?: any; campaigns: any[]; brands?: any[]; action: any; site: string }) {
  const [fields, setFields] = useState<Fld[]>(f?.fields || []);
  const [brand, setBrand] = useState<string>(f?.brand_id || "");
  const [slug, setSlug] = useState<string>(f?.slug || "");
  const up = (i: number, p: Partial<Fld>) => setFields(fields.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= fields.length) return; const a = [...fields]; [a[i], a[j]] = [a[j], a[i]]; setFields(a); };
  const add = (t: string) => setFields([...fields, { id: uid(), label: `${LBL[t]} ${fields.filter((x) => x.type === t).length + 1}`, type: t, req: false, ...(["selecao", "multipla"].includes(t) ? { options: ["Opção 1", "Opção 2"] } : {}) }]);
  const template = () => setFields([...fields, ...BRAND_TEMPLATE.filter(([t]) => !fields.some((x) => x.type === t)).map(([t, l, r]) => ({ id: uid(), label: l, type: t, req: r }))]);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {f ? <input type="hidden" name="id" value={f.id} /> : null}
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      <div className="form-grid">
        <div className="field"><label htmlFor="fb_t">Título</label><input className="input" id="fb_t" name="title" required defaultValue={f?.title || ""} onChange={(e) => { if (!f) setSlug(e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} /></div>
        <div className="field"><label htmlFor="fb_s">Endereço do link</label><input className="input" id="fb_s" name="slug" required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /><span className="small muted">{site}/f/{slug || "…"}</span></div>
        <div className="field"><label htmlFor="fb_u">Uso</label><select className="input" id="fb_u" name="use" defaultValue={f?.use || "Pesquisa"}>{FORM_USES.map((u) => <option key={u}>{u}</option>)}</select></div>
        <div className="field"><label htmlFor="fb_c">Campanha (opcional)</label><select className="input" id="fb_c" name="campaign_id" defaultValue={f?.campaign_id || ""}><option value="">Geral</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label htmlFor="fb_b">Marca (formulário exclusivo)</label><select className="input" id="fb_b" name="brand_id" value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Nenhuma · formulário da Conecta</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div className="field"><label htmlFor="fb_st">Status</label><select className="input" id="fb_st" name="status" defaultValue={f?.status || "Rascunho"}>{FORM_STATUS.map((u) => <option key={u}>{u}</option>)}</select></div>
        <div className="field full"><label htmlFor="fb_d">Descrição (aparece no topo do formulário)</label><textarea className="input" id="fb_d" name="description" defaultValue={f?.description || ""} /></div>
      </div>
      {brand ? <fieldset className="fs"><legend>Formulário da marca</legend>
        <p className="small muted">As respostas aparecem no Portal da Marca e cada creator entra na base de creators desta marca.</p>
        <label className="perm"><input type="checkbox" name="create_access" defaultChecked={f ? !!f.create_access : true} />Criar o acesso da creator na hora (ela cria a senha no formulário e vê só os desafios desta marca)</label>
        <label className="perm"><input type="checkbox" name="ask_join" defaultChecked={f ? !!f.ask_join : true} />Perguntar “Quero fazer parte também da base de creators da Conecta” (se marcar, ela entra no Clube completo)</label>
        <div><button type="button" className="btn btn-dark btn-sm" onClick={template}>+ Usar modelo: nome, CPF, e-mail, WhatsApp, endereço, Instagram e TikTok</button></div>
        <p className="small muted">O formulário precisa ter as perguntas “Nome completo” e “E-mail” para a creator entrar na base da marca.</p>
      </fieldset> : null}
      <fieldset className="fs"><legend>Perguntas ({fields.length})</legend>
        {fields.map((x, i) => (
          <div key={x.id} className="form-grid" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
            <div className="field full"><label>{i + 1}. {LBL[x.type]}</label><input className="input" value={x.label} onChange={(e) => up(i, { label: e.target.value })} /></div>
            {x.options ? <div className="field full"><label>Opções (separe por vírgula)</label><input className="input" value={x.options.join(", ")} onChange={(e) => up(i, { options: e.target.value.split(",").map((o) => o.trimStart()) })} /></div> : null}
            <div className="actions full" style={{ justifyContent: "flex-start", alignItems: "center" }}>
              <label className="check small"><input type="checkbox" checked={x.req} onChange={(e) => up(i, { req: e.target.checked })} /> Obrigatório</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} aria-label="Descer">↓</button>
              <button type="button" className="btn btn-bad btn-sm" onClick={() => setFields(fields.filter((_, j) => j !== i))}>Remover</button>
            </div>
          </div>))}
        <div><span className="lbl small">Adicionar campo</span><div className="chips" style={{ marginTop: 6 }}>{FIELD_TYPES.map(([k, l]) => <button type="button" key={k} className="chip" onClick={() => add(k)}>+ {l}</button>)}</div></div>
      </fieldset>
      <div><button className="btn btn-primary">Salvar formulário</button></div>
    </form>
  );
}
