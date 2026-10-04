import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd, brl, Kpi } from "@/components/ui";
import { RESULT_KEYS as RES } from "@/lib/consts";
import { saveCampaign, saveResults, proposeCampaign, reviewCampaign } from "../actions";

const STS = ["Em aprovação", "Ajuste solicitado", "Futura", "Inscrições abertas", "Ativa", "Encerrada", "Recusada"];

export default async function Campanhas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("campanhas");
  const isBrand = profile.role === "marca";
  const { data: camps } = await supabase.from("campaigns").select("*, brands(name)").order("created_at", { ascending: false });
  const { data: brands } = isBrand ? { data: [] as any[] } : await supabase.from("brands").select("id,name").order("name");
  const all = camps || [];
  const f = q.s && STS.includes(q.s) ? q.s : "";
  const shown = f ? all.filter((c: any) => c.status === f) : all;
  const T = ({ n, l, c }: { n: string; l: string; c?: any }) => <div className="field full"><label>{l}</label><textarea className="input" name={n} defaultValue={c?.[n] || ""} /></div>;
  const Common = ({ c }: { c?: any }) => (<>
    <div className="field"><label>Nome</label><input className="input" name="name" required defaultValue={c?.name || ""} /></div>
    <div className="field"><label>Produto</label><input className="input" name="product" defaultValue={c?.product || ""} /></div>
    <div className="field"><label>Início</label><input className="input" type="date" name="start_date" defaultValue={c?.start_date || ""} /></div>
    <div className="field"><label>Fim</label><input className="input" type="date" name="end_date" defaultValue={c?.end_date || ""} /></div>
    <div className="field"><label>Vagas (creators)</label><input className="input" type="number" name="slots" defaultValue={c?.slots || 10} /></div>
    <div className="field"><label>Nicho</label><input className="input" name="niche" defaultValue={c?.niche || ""} /></div>
    <div className="field full"><label>Objetivo</label><input className="input" name="objective" defaultValue={c?.objective || ""} /></div>
    <T n="description" l="Descrição" c={c} /><T n="briefing" l="Briefing" c={c} /><T n="requirements" l="Requisitos das creators" c={c} /><T n="deliverables" l="Entregáveis" c={c} />
    <label className="check full"><input type="checkbox" name="requires_shipping" defaultChecked={!!c?.requires_shipping} /> Esta campanha envolve envio de produto</label>
  </>);
  const StaffForm = ({ c }: { c?: any }) => (
    <form action={saveCampaign} className="form-grid">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="field"><label>Marca</label><select className="input" name="brand_id" required defaultValue={c?.brand_id || ""}><option value="">Escolha</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={c?.status || "Futura"}>{STS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <Common c={c} />
      <div className="field"><label>Cachê por creator (R$)</label><input className="input" type="number" step="0.01" name="fee" defaultValue={c?.fee || ""} /></div>
      <div className="field"><label>Comissão (%)</label><input className="input" type="number" step="0.01" name="commission_pct" defaultValue={c?.commission_pct || ""} /></div>
      <div><button className="btn btn-primary btn-sm">{c ? "Salvar campanha" : "Criar campanha"}</button></div>
    </form>
  );
  const BrandForm = ({ c }: { c?: any }) => (
    <form action={proposeCampaign} className="form-grid">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <Common c={c} />
      <div className="field"><label>Verba prevista (R$, opcional)</label><input className="input" type="number" step="0.01" name="budget" defaultValue={c?.budget || ""} /></div>
      <div className="full"><button className="btn btn-primary btn-sm">{c ? "Salvar e reenviar para aprovação" : "Enviar para aprovação da Conecta"}</button></div>
    </form>
  );
  const Review = ({ c }: { c: any }) => (
    <div className="actions" style={{ justifyContent: "flex-start" }}>
      {["Inscrições abertas", "Futura"].map((s) => <form key={s} action={reviewCampaign}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={s} /><button className={`btn ${s === "Futura" ? "btn-ghost" : "btn-primary"} btn-sm`}>{s === "Futura" ? "Aprovar (futura)" : "Aprovar e abrir inscrições"}</button></form>)}
      {["Ajuste solicitado", "Recusada"].map((s) => <details key={s} className="confirm-del"><summary className={`btn ${s === "Recusada" ? "btn-bad" : "btn-ghost"} btn-sm`}>{s === "Recusada" ? "Recusar" : "Pedir ajuste"}</summary><form action={reviewCampaign} className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={s} /><textarea className="input" name="note" required placeholder="Explique para a marca" /><button className="btn btn-dark btn-sm">Enviar</button></form></details>)}
    </div>
  );
  const pend = all.filter((c: any) => c.status === "Em aprovação").length;
  return (
    <>
      <PageH eyebrow={isBrand ? "Suas campanhas" : "Operação"} title="Campanhas" sub={isBrand ? "Proponha uma campanha: ela vai para a aprovação da Conecta antes de abrir para as creators." : `${all.length} campanhas${pend ? ` · ${pend} aguardando aprovação` : ""}`} />
      <Notice q={q} />
      <details className="mod" open={q.novo === "1"}><summary>+ {isBrand ? "Propor nova campanha" : "Nova campanha"}</summary><div style={{ paddingBottom: 16 }}>{isBrand ? <BrandForm /> : <StaffForm />}</div></details>
      {all.length ? <div className="chips"><Link className={`chip ${!f ? "on" : ""}`} href="/campanhas">Todas<span className="c">{all.length}</span></Link>{STS.filter((s) => all.some((c: any) => c.status === s)).map((s) => <Link key={s} className={`chip ${f === s ? "on" : ""}`} href={`/campanhas?s=${encodeURIComponent(s)}`}>{s}<span className="c">{all.filter((c: any) => c.status === s).length}</span></Link>)}</div> : null}
      {shown.length ? shown.map((c: any) => (
        <details className="mod" key={c.id} open={!isBrand && c.status === "Em aprovação" && pend === 1}>
          <summary><span style={{ flex: 1, minWidth: 0 }}>{c.name}<br /><span className="small muted" style={{ fontWeight: 500 }}>{c.brands?.name} · {fd(c.start_date)} – {fd(c.end_date)}</span></span><Pill s={c.status} /></summary>
          <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {c.review_note && ["Ajuste solicitado", "Recusada"].includes(c.status) ? <div className="notice info">Retorno da Conecta: {c.review_note}</div> : null}
            {["Em aprovação", "Ajuste solicitado", "Recusada"].includes(c.status) ? <dl className="dl">{[["Produto", c.product], ["Objetivo", c.objective], ["Vagas", c.slots], ["Verba prevista", c.budget ? brl(c.budget) : null], ["Envio de produto", c.requires_shipping ? "Sim" : "Não"], ["Descrição", c.description], ["Briefing", c.briefing], ["Requisitos", c.requirements], ["Entregáveis", c.deliverables]].map(([k, v]) => v ? <div key={k as string}><dt>{k}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{String(v)}</dd></div> : null)}</dl>
              : <div className="kpis">{RES.map(([k, l]) => <Kpi key={k} k={l} v={k === "gmv" ? brl(c.results?.[k] || 0) : (c.results?.[k] || 0).toLocaleString("pt-BR")} />)}</div>}
            {!isBrand && ["Em aprovação", "Ajuste solicitado"].includes(c.status) ? <Review c={c} /> : null}
            {isBrand ? (["Em aprovação", "Ajuste solicitado"].includes(c.status) ? <div><h3 style={{ marginBottom: 8 }}>Editar proposta</h3><BrandForm c={c} /></div> : <p className="muted">{c.description || ""}</p>) : <>
              {!["Em aprovação", "Ajuste solicitado", "Recusada"].includes(c.status) ? <div><h3 style={{ marginBottom: 8 }}>Registrar resultados (vai para o relatório da marca)</h3><form action={saveResults} className="form-grid"><input type="hidden" name="id" value={c.id} />{RES.map(([k, l]) => <div className="field" key={k}><label>{l}</label><input className="input" type="number" name={k} defaultValue={c.results?.[k] || 0} /></div>)}<div><button className="btn btn-dark btn-sm">Salvar resultados</button></div></form></div> : null}
              <div><h3 style={{ marginBottom: 8 }}>Editar campanha</h3><StaffForm c={c} /></div></>}
          </div>
        </details>
      )) : <Empty icon="megaphone" title="Nenhuma campanha aqui" text={isBrand ? "Clique em Propor nova campanha para enviar sua ideia para a Conecta." : "Crie a primeira campanha."} />}
    </>
  );
}
