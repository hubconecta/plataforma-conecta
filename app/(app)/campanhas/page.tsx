import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd, brl, Kpi } from "@/components/ui";
import { saveCampaign, saveResults } from "../actions";

const STS = ["Futura", "Inscrições abertas", "Ativa", "Encerrada"];
const RES = [["creators", "Creators"], ["concluded", "Concluíram"], ["views", "Visualizações"], ["interactions", "Interações"], ["clicks", "Cliques"], ["orders", "Pedidos"], ["gmv", "Vendas R$ (GMV)"]];

export default async function Campanhas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("campanhas");
  const isBrand = profile.role === "marca";
  const { data: camps } = await supabase.from("campaigns").select("*, brands(name)").order("created_at", { ascending: false });
  const { data: brands } = isBrand ? { data: [] as any[] } : await supabase.from("brands").select("id,name").order("name");
  const Form = ({ c }: { c?: any }) => (
    <form action={saveCampaign} className="form-grid">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="field"><label>Marca</label><select className="input" name="brand_id" required defaultValue={c?.brand_id || ""}><option value="">Escolha</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label>Nome</label><input className="input" name="name" required defaultValue={c?.name || ""} /></div>
      <div className="field"><label>Produto</label><input className="input" name="product" defaultValue={c?.product || ""} /></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={c?.status || "Futura"}>{STS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Início</label><input className="input" type="date" name="start_date" defaultValue={c?.start_date || ""} /></div>
      <div className="field"><label>Fim</label><input className="input" type="date" name="end_date" defaultValue={c?.end_date || ""} /></div>
      <div className="field"><label>Vagas</label><input className="input" type="number" name="slots" defaultValue={c?.slots || 10} /></div>
      <div className="field"><label>Nicho</label><input className="input" name="niche" defaultValue={c?.niche || ""} /></div>
      <div className="field"><label>Cachê por creator (R$)</label><input className="input" type="number" step="0.01" name="fee" defaultValue={c?.fee || ""} /></div>
      <div className="field"><label>Comissão (%)</label><input className="input" type="number" step="0.01" name="commission_pct" defaultValue={c?.commission_pct || ""} /></div>
      <div className="field full"><label>Objetivo</label><input className="input" name="objective" defaultValue={c?.objective || ""} /></div>
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={c?.description || ""} /></div>
      <div className="field full"><label>Briefing</label><textarea className="input" name="briefing" defaultValue={c?.briefing || ""} /></div>
      <div className="field"><label>Requisitos</label><textarea className="input" name="requirements" defaultValue={c?.requirements || ""} /></div>
      <div className="field"><label>Entregáveis</label><textarea className="input" name="deliverables" defaultValue={c?.deliverables || ""} /></div>
      <label className="check full"><input type="checkbox" name="requires_shipping" defaultChecked={!!c?.requires_shipping} /> Esta campanha envolve envio de produto</label>
      <div><button className="btn btn-primary btn-sm">{c ? "Salvar campanha" : "Criar campanha"}</button></div>
    </form>
  );
  return (
    <>
      <PageH eyebrow={isBrand ? "Suas campanhas" : "Operação"} title="Campanhas" sub={`${camps?.length || 0} campanhas`} />
      <Notice q={q} />
      {isBrand ? null : <details className="mod"><summary>+ Nova campanha</summary><div style={{ paddingBottom: 16 }}><Form /></div></details>}
      {camps?.length ? camps.map((c: any) => (
        <details className="mod" key={c.id}>
          <summary><span style={{ flex: 1, minWidth: 0 }}>{c.name}<br /><span className="small muted" style={{ fontWeight: 500 }}>{c.brands?.name} · {fd(c.start_date)} – {fd(c.end_date)}</span></span><Pill s={c.status} /></summary>
          <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="kpis">{RES.map(([k, l]) => <Kpi key={k} k={l} v={k === "gmv" ? brl(c.results?.[k] || 0) : (c.results?.[k] || 0).toLocaleString("pt-BR")} />)}</div>
            {isBrand ? <p className="muted">{c.description || ""}</p> : <>
              <div><h3 style={{ marginBottom: 8 }}>Registrar resultados (aparece no portal da marca)</h3><form action={saveResults} className="form-grid"><input type="hidden" name="id" value={c.id} />{RES.map(([k, l]) => <div className="field" key={k}><label>{l}</label><input className="input" type="number" name={k} defaultValue={c.results?.[k] || 0} /></div>)}<div><button className="btn btn-dark btn-sm">Salvar resultados</button></div></form></div>
              <div><h3 style={{ marginBottom: 8 }}>Editar campanha</h3><Form c={c} /></div></>}
          </div>
        </details>
      )) : <Empty icon="megaphone" title="Nenhuma campanha ainda" text={isBrand ? "Quando a Conecta criar campanhas para a sua marca, elas aparecem aqui." : "Crie a primeira campanha."} />}
    </>
  );
}
