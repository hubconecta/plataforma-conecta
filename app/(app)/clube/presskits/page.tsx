import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd, brl } from "@/components/ui";
import { publicUrl } from "@/lib/storage";
import { requestPressKit } from "../../presskits/actions";

export default async function CrPressKits({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("cr_presskits");
  const me = profile.creator_id;
  const [{ data: kits }, { data: orders }, { data: ships }, { data: addr }] = await Promise.all([
    supabase.from("press_kits").select("*").eq("status", "Ativo").order("created_at", { ascending: false }),
    supabase.from("pk_orders").select("*, press_kits(name, brand_id)").eq("creator_id", me).order("created_at", { ascending: false }),
    supabase.from("shipments").select("*").eq("creator_id", me).order("created_at", { ascending: false }),
    supabase.from("creator_addresses").select("creator_id").eq("creator_id", me).maybeSingle(),
  ]);
  const { data: bp } = await supabase.from("brand_public").select("id,name");
  const BN = new Map((bp || []).map((b: any) => [b.id, b.name]));
  const bn = (id?: string | null) => (id ? BN.get(id) || "Marca parceira" : "Conecta");
  const delivered = new Set((orders || []).filter((o: any) => o.status === "Entregue").map((o: any) => o.press_kits?.brand_id));
  const inProgress = new Set((orders || []).filter((o: any) => !["Entregue", "Cancelado"].includes(o.status)).map((o: any) => o.pk_id));
  const list = (kits || []).filter((k: any) => k.type !== "Renovação" || delivered.has(k.brand_id));
  return (
    <>
      <PageH eyebrow="Clube Conecta" title="Press kits" sub="Peça seu press kit e acompanhe a entrega." />
      <Notice q={q} />
      {!addr ? <div className="notice info">Cadastre seu endereço em <Link href="/clube/perfil">Meu perfil e endereço</Link> para receber produtos.</div> : null}
      {list.length ? <div className="cards">{list.map((k: any) => <div className="ccard" key={k.id}>
        {k.photo_path ? <img src={publicUrl(k.photo_path)} alt="" style={{ width: "100%", height: 170, objectFit: "cover" }} /> : null}
        <div className="cbody"><span className="eyebrow">{bn(k.brand_id)} · {k.type}</span><h3>{k.name}</h3>
          {k.description ? <p className="small">{k.description}</p> : null}
          {k.items ? <ul className="small" style={{ paddingLeft: 18 }}>{String(k.items).split("\n").filter(Boolean).map((i: string) => <li key={i}>{i}</li>)}</ul> : null}
          <p><b>{Number(k.price) > 0 && k.type !== "Gratuito" ? brl(k.price) : "Gratuito"}</b></p>
          {inProgress.has(k.id) ? <span className="pill info">Pedido em andamento</span> : <form action={requestPressKit}><input type="hidden" name="id" value={k.id} /><button className="btn btn-primary btn-block">{k.type === "Renovação" ? "RENOVAR PRESS KIT" : "QUERO MEU PRESS KIT"}</button></form>}
        </div></div>)}</div> : <Empty icon="gift" title="Nenhum press kit disponível agora" text="Quando uma marca liberar press kits, eles aparecem aqui." />}
      <div className="card"><div className="card-h"><h2>Meus pedidos e envios</h2></div>
        {orders?.length || ships?.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Data</th><th className="r">Valor</th><th>Rastreio</th><th>Status</th></tr></thead><tbody>
          {(orders || []).map((o: any) => <tr key={o.id}><td><b>{o.press_kits?.name}</b><div className="small muted">{bn(o.press_kits?.brand_id)} · {o.order_code}</div></td><td className="num small">{fd(String(o.created_at).slice(0, 10))}</td><td className="r num">{Number(o.value) > 0 ? brl(o.value) : "Gratuito"}</td><td className="num small">{o.tracking || "—"}</td><td><Pill s={o.status} /></td></tr>)}
          {(ships || []).filter((s: any) => !s.pk_order_id).map((s: any) => <tr key={s.id}><td><b>{s.product}</b><div className="small muted">{bn(s.brand_id)} · {s.reason}</div></td><td className="num small">{fd(String(s.created_at).slice(0, 10))}</td><td className="r">—</td><td className="num small">{s.tracking || "—"}</td><td><Pill s={s.status} /></td></tr>)}
        </tbody></table></div> : <p className="muted">Você ainda não tem pedidos.</p>}
      </div>
    </>
  );
}
