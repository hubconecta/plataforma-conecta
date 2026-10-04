import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Person, fd, brl } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import { publicUrl } from "@/lib/storage";
import { PK_TYPES, PK_STATUS, PKO_STATUS } from "@/lib/consts";
import { savePressKit, setOrderStatus } from "./actions";

export default async function PressKits({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("presskits");
  const tab = q.tab === "pedidos" ? "pedidos" : "kits";
  const [{ data: kits }, { data: brands }, { data: orders }] = await Promise.all([
    supabase.from("press_kits").select("*, brands(name)").order("created_at", { ascending: false }),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("pk_orders").select("*, press_kits(name, brands(name)), creators(name,instagram), shipments(id)").order("created_at", { ascending: false }),
  ]);
  const back = `/presskits?tab=${tab}`;
  const Form = ({ k }: { k?: any }) => (
    <form action={savePressKit} className="form-grid">
      {k ? <input type="hidden" name="id" value={k.id} /> : null}<input type="hidden" name="back" value={back} />
      <div className="field"><label>Nome</label><input className="input" name="name" required defaultValue={k?.name || ""} /></div>
      <div className="field"><label>Marca</label><select className="input" name="brand_id" defaultValue={k?.brand_id || q.marca || ""}><option value="">Conecta</option>{(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label>Tipo</label><select className="input" name="type" defaultValue={k?.type || "Gratuito"}>{PK_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={k?.status || "Rascunho"}>{PK_STATUS.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="field"><label>Preço para a creator (R$)</label><input className="input" type="number" step="0.01" name="price" defaultValue={k?.price ?? ""} /></div>
      <div className="field"><label>Custo (R$)</label><input className="input" type="number" step="0.01" name="cost" defaultValue={k?.cost ?? ""} /></div>
      <div className="field"><label>Itens por kit</label><input className="input" type="number" name="qty" defaultValue={k?.qty ?? 1} /></div>
      <div className="field"><label>Estoque</label><input className="input" type="number" name="stock" defaultValue={k?.stock ?? 0} /></div>
      <div className="field"><label>Link do checkout (B4YOU)</label><input className="input" name="checkout_url" type="url" defaultValue={k?.checkout_url || ""} placeholder="https://" /></div>
      <div className="field"><label>ID do produto na B4YOU</label><input className="input" name="b4you_id" defaultValue={k?.b4you_id || ""} /></div>
      <FileUpload name="photo_path" bucket="publico" folder="presskits" accept="image/*" current={k?.photo_path} label="Foto" />
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={k?.description || ""} /></div>
      <div className="field full"><label>O que vem no kit (um item por linha)</label><textarea className="input" name="items" defaultValue={k?.items || ""} /></div>
      <div><button className="btn btn-primary btn-sm">{k ? "Salvar press kit" : "Criar press kit"}</button></div>
    </form>
  );
  return (
    <>
      <PageH eyebrow="Operação" title="Press kits" sub="Kits gratuitos, vendidos ou de renovação para as creators. Pagos e aprovados viram envio automaticamente." />
      <Notice q={q} />
      <div className="tabs"><Link className={`tab ${tab === "kits" ? "on" : ""}`} href="/presskits">Press kits ({kits?.length || 0})</Link><Link className={`tab ${tab === "pedidos" ? "on" : ""}`} href="/presskits?tab=pedidos">Histórico de pedidos ({orders?.length || 0})</Link></div>
      {tab === "kits" ? <>
        <details className="mod" open={q.novo === "1"}><summary>+ Novo press kit</summary><div style={{ paddingBottom: 16 }}><Form /></div></details>
        {kits?.length ? <div className="cards">{kits.map((k: any) => <div className="ccard" key={k.id}>
          {k.photo_path ? <img src={publicUrl(k.photo_path)} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} /> : null}
          <div className="cbody"><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className="eyebrow">{k.type} · {k.brands?.name || "Conecta"}</span><Pill s={k.status} /></div>
            <h3>{k.name}</h3>
            <div className="cmeta"><div>Preço<b>{Number(k.price) > 0 ? brl(k.price) : "Gratuito"}</b></div><div>Estoque<b>{k.stock}</b></div><div>Pedidos<b>{(orders || []).filter((o: any) => o.pk_id === k.id).length}</b></div></div>
            <p className="small muted">{k.b4you_id ? `ID B4YOU ${k.b4you_id} · ` : ""}{k.checkout_url ? "Checkout configurado" : "Checkout não configurado"}</p>
            <details className="mod"><summary className="small">Editar</summary><div style={{ paddingBottom: 12 }}><Form k={k} /></div></details>
          </div></div>)}</div> : <Empty icon="gift" title="Nenhum press kit ainda" text="Crie o primeiro press kit para as creators pedirem pelo Clube." />}
      </> : <div className="card">{orders?.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Press kit</th><th>Data</th><th className="r">Valor</th><th>Pagamento</th><th>Status</th><th>Atualizar</th></tr></thead><tbody>
        {orders.map((o: any) => <tr key={o.id}><td><Person name={o.creators?.name || "Creator"} sub={o.creators?.instagram || ""} /></td><td><b>{o.press_kits?.name}</b><div className="small muted">{o.press_kits?.brands?.name || "Conecta"} · {o.order_code}</div></td><td className="num small">{fd(String(o.created_at).slice(0, 10))}</td><td className="r num">{Number(o.value) > 0 ? brl(o.value) : "—"}</td><td><Pill s={o.payment} /></td><td><Pill s={o.status} />{o.tracking ? <div className="small num">{o.tracking}</div> : null}</td>
          <td><form action={setOrderStatus} className="inline-form"><input type="hidden" name="id" value={o.id} /><input type="hidden" name="back" value={back} /><select className="input" name="status" defaultValue={o.status} style={{ maxWidth: 170 }}>{PKO_STATUS.map((s) => <option key={s} value={s}>{s === "Pago" ? "Pago (confirmar pagamento)" : s}</option>)}</select><input className="input" name="tracking" placeholder="Rastreio" defaultValue={o.tracking || ""} style={{ maxWidth: 130 }} /><button className="btn btn-dark btn-sm">OK</button></form>
            {o.shipments?.length ? <Link className="small" href={`/envios/${o.shipments[0].id}`}>Ver envio</Link> : null}</td></tr>)}
      </tbody></table></div> : <Empty icon="gift" title="Nenhum pedido ainda" text="Os pedidos das creators aparecem aqui." />}</div>}
    </>
  );
}
