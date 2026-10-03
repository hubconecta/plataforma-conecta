import { saveBrand } from "../actions";

const STS = ["Lead", "Proposta", "Negociação", "Ativa", "Pausada", "Encerrada"];
export default function BrandForm({ b, owners, showFin, contract }: { b?: any; owners: any[]; showFin: boolean; contract?: any }) {
  const v = (k: string) => b?.[k] ?? "";
  const F = ({ n, l, t = "text", req = false, full = false }: any) => <div className={`field ${full ? "full" : ""}`}><label htmlFor={"bf_" + n}>{l}{req ? " *" : ""}</label><input className="input" id={"bf_" + n} name={n} type={t} required={req} defaultValue={v(n)} /></div>;
  const S = ({ n, l, opts }: any) => <div className="field"><label htmlFor={"bf_" + n}>{l}</label><select className="input" id={"bf_" + n} name={n} defaultValue={v(n) || opts[0]}>{opts.map((o: string) => <option key={o}>{o}</option>)}</select></div>;
  return (
    <form action={saveBrand} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {b?.id ? <input type="hidden" name="id" value={b.id} /> : null}
      <fieldset className="fs"><legend>Empresa</legend><div className="form-grid"><F n="razao_social" l="Nome da empresa (razão social)" /><F n="name" l="Nome fantasia" req /><F n="cnpj" l="CNPJ" /><F n="segment" l="Segmento" /><F n="category" l="Categoria" /><F n="site" l="Site" /><F n="instagram" l="Instagram" /><F n="tiktok" l="TikTok" /></div></fieldset>
      <fieldset className="fs"><legend>Contato</legend><div className="form-grid"><F n="contact_name" l="Responsável" /><F n="contact_role" l="Cargo" /><F n="email" l="E-mail" t="email" /><F n="phone" l="Telefone" /><F n="whatsapp" l="WhatsApp" /><F n="address" l="Endereço" full /><F n="city" l="Cidade" /><F n="state" l="Estado" /><F n="zip" l="CEP" /></div></fieldset>
      <fieldset className="fs"><legend>Contrato</legend><div className="form-grid"><F n="start_date" l="Início da parceria" t="date" /><F n="renewal_date" l="Renovação" t="date" /><S n="contract_type" l="Tipo de contrato" opts={["Prestação de serviços", "Por campanha", "Afiliados", "Outro"]} /><S n="hiring_model" l="Modelo de contratação" opts={["Fee mensal + comissão", "Fee mensal", "Por campanha", "Somente comissão"]} /><S n="billing_model" l="Modelo de cobrança" opts={["Mensal", "Por campanha", "Por venda"]} /><S n="status" l="Status" opts={STS} />
        <div className="field"><label htmlFor="bf_owner">Responsável Conecta</label><select className="input" id="bf_owner" name="owner_id" defaultValue={v("owner_id")}><option value="">—</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
        {showFin ? <><div className="field"><label htmlFor="bf_mv">Valor mensal (R$)</label><input className="input" id="bf_mv" name="monthly_value" type="number" step="0.01" defaultValue={contract?.monthly_value ?? ""} /></div><div className="field"><label htmlFor="bf_cp">Comissão (%)</label><input className="input" id="bf_cp" name="commission_pct" type="number" step="0.01" defaultValue={contract?.commission_pct ?? ""} /></div><div className="field"><label htmlFor="bf_dd">Dia de vencimento</label><input className="input" id="bf_dd" name="due_day" type="number" min="1" max="31" defaultValue={contract?.due_day ?? ""} /></div></> : <p className="small muted full">Valores do contrato ficam visíveis só com permissão financeira.</p>}
        <div className="field full"><label htmlFor="bf_notes">Observações</label><textarea className="input" id="bf_notes" name="notes" defaultValue={v("notes")} /></div></div></fieldset>
      <div><button className="btn btn-primary">{b?.id ? "Salvar alterações" : "Cadastrar marca"}</button></div>
    </form>
  );
}
