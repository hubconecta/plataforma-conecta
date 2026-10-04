import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Person, fd } from "@/components/ui";
import { SHIP_STATUS } from "@/lib/consts";
import { newShipment, bulkSamples } from "./actions";

export default async function Envios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("amostras");
  const [{ data: ships }, { data: creators }, { data: brands }, { data: camps }, { data: addrs }] = await Promise.all([
    supabase.from("shipments").select("*, creators(name,instagram), brands(name), campaigns(name), pk_orders(press_kits(name))").order("created_at", { ascending: false }),
    supabase.from("creators").select("id,name").order("name"),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("campaigns").select("id,name").not("status", "in", "(Em aprovação,Ajuste solicitado,Recusada)").order("created_at", { ascending: false }),
    supabase.from("creator_addresses").select("creator_id"),
  ]);
  const hasAddr = new Set((addrs || []).map((a: any) => a.creator_id));
  const all = ships || [];
  const f = q.s === "todos" ? "todos" : SHIP_STATUS.includes(q.s) ? q.s : "abertos";
  const shown = all.filter((s: any) => f === "todos" ? true : f === "abertos" ? !["Entregue", "Cancelado"].includes(s.status) : s.status === f);
  const BrandCamp = () => <><div className="field"><label>Marca</label><select className="input" name="brand_id"><option value="">—</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="field"><label>Campanha (opcional)</label><select className="input" name="campaign_id"><option value="">—</option>{(camps || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div></>;
  return (
    <>
      <PageH eyebrow="Logística" title="Amostras e envios" sub="O endereço da creator só aparece dentro de um envio autorizado, e cada acesso fica registrado no histórico (quem viu, qual creator, marca, campanha ou press kit, data e hora)." />
      <Notice q={q} />
      <div className="grid g2">
        <details className="mod"><summary>+ Novo envio autorizado</summary><form action={newShipment} className="form-grid" style={{ paddingBottom: 16 }}>
          <div className="field"><label>Creator</label><select className="input" name="creator_id" required><option value="">Escolha</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{hasAddr.has(c.id) ? "" : " (sem endereço)"}</option>)}</select></div>
          <BrandCamp /><div className="field"><label>Produto</label><input className="input" name="product" required /></div><div className="field"><label>Quantidade</label><input className="input" type="number" name="qty" defaultValue={1} /></div>
          <div className="field full"><label>Motivo</label><input className="input" name="reason" defaultValue="Ação de logística autorizada pela Conecta" /></div><div><button className="btn btn-primary btn-sm">Autorizar envio</button></div></form></details>
        <details className="mod"><summary>+ Enviar amostras (várias creators)</summary><form action={bulkSamples} className="form-grid" style={{ paddingBottom: 16 }}>
          <BrandCamp /><div className="field"><label>Produto</label><input className="input" name="product" required /></div><div className="field"><label>Quantidade por creator</label><input className="input" type="number" name="qty" defaultValue={1} /></div>
          <div className="full perm-grid">{(creators || []).map((c: any) => <label key={c.id} className="perm"><input type="checkbox" name="creators" value={c.id} />{c.name}{hasAddr.has(c.id) ? "" : <span className="small" style={{ color: "var(--warn)" }}> · sem endereço</span>}</label>)}</div>
          <div><button className="btn btn-primary btn-sm">Criar envios</button></div></form></details>
      </div>
      <div className="chips">{[["abertos", "Em aberto"], ["todos", "Todos"], ...SHIP_STATUS.filter((s) => s !== "Aguardando envio").map((s) => [s, s])].map(([k, l]) => <Link key={k} className={`chip ${f === k ? "on" : ""}`} href={`/envios?s=${encodeURIComponent(k)}`}>{l}</Link>)}</div>
      <div className="card">{shown.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Marca</th><th>Produto</th><th>Transportadora</th><th>Envio</th><th>Previsão</th><th>Status</th><th></th></tr></thead><tbody>
        {shown.map((s: any) => <tr key={s.id}><td><Person name={s.creators?.name || "Creator"} sub={s.creators?.instagram || ""} /></td><td>{s.brands?.name || "—"}</td><td><b>{s.product}</b> · {s.qty}<div className="small muted">{s.campaigns?.name ? `Campanha ${s.campaigns.name}` : s.pk_orders?.press_kits?.name ? `Press kit ${s.pk_orders.press_kits.name}` : "Envio avulso"}</div></td><td className="small">{s.carrier || "—"}{s.tracking ? <div className="num">{s.tracking}</div> : null}</td><td className="num small">{fd(s.sent_at)}</td><td className="num small">{fd(s.eta)}</td><td><Pill s={s.status} /></td><td><Link className="btn btn-ghost btn-sm" href={`/envios/${s.id}`}>Dados de envio</Link></td></tr>)}
      </tbody></table></div> : <Empty icon="truck" title="Nenhum envio aqui" text="Envios nascem quando uma creator é aprovada em campanha com produto, compra ou ganha um press kit, ou quando você autoriza aqui." />}</div>
    </>
  );
}
