import { SHIP_STATUS } from "@/lib/consts";
import { updateShipment } from "./actions";

export default function ShipmentForm({ s, staff, backPath }: { s: any; staff: boolean; backPath: string }) {
  const F = ({ n, l, t = "text" }: { n: string; l: string; t?: string }) => <div className="field"><label htmlFor={`sh_${n}`}>{l}</label><input className="input" id={`sh_${n}`} name={n} type={t} defaultValue={s[n] ?? ""} /></div>;
  return (
    <form action={updateShipment} className="form-grid">
      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="back" value={backPath} />
      {staff ? <><F n="product" l="Produto" /><F n="qty" l="Quantidade" t="number" /></> : null}
      <F n="carrier" l="Transportadora" /><F n="tracking" l="Código de rastreio" />
      <F n="sent_at" l="Data de envio" t="date" /><F n="eta" l="Previsão de entrega" t="date" /><F n="delivered_at" l="Entregue em" t="date" />
      <div className="field"><label htmlFor="sh_status">Status</label><select className="input" id="sh_status" name="status" defaultValue={s.status}>{SHIP_STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="field full"><label htmlFor="sh_notes">Observações</label><textarea className="input" id="sh_notes" name="notes" defaultValue={s.notes || ""} /></div>
      <div><button className="btn btn-primary btn-sm">Atualizar envio</button></div>
    </form>
  );
}
