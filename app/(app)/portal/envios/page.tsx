import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Kpi, Person, fd, brl } from "@/components/ui";
import { publicUrl } from "@/lib/storage";

export default async function MarcaEnvios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("marca_envios");
  const [{ data: ships }, { data: kits }] = await Promise.all([
    supabase.from("shipments").select("*, creators(name,instagram,tiktok), campaigns(name), pk_orders(press_kits(name))").order("created_at", { ascending: false }),
    supabase.from("press_kits").select("*").neq("status", "Rascunho").order("created_at", { ascending: false }),
  ]);
  const all = ships || [];
  const open = all.filter((s: any) => !["Entregue", "Cancelado"].includes(s.status));
  const n = (st: string[]) => all.filter((s: any) => st.includes(s.status)).length;
  const Row = ({ s }: { s: any }) => <tr><td><Person name={s.creators?.name || "Creator"} ig={s.creators?.instagram} tt={s.creators?.tiktok} /></td><td><b>{s.product}</b> · {s.qty}<div className="small muted">{s.campaigns?.name ? `Campanha ${s.campaigns.name}` : s.pk_orders?.press_kits?.name ? `Press kit ${s.pk_orders.press_kits.name}` : "Envio avulso"}</div></td><td className="small">{s.carrier || "—"}{s.tracking ? <div className="num">{s.tracking}</div> : null}</td><td className="num small">{fd(s.sent_at)}</td><td><Pill s={s.status} /></td><td>{s.status !== "Cancelado" ? <Link className="btn btn-ghost btn-sm" href={`/envios/${s.id}`}>Dados de envio</Link> : null}</td></tr>;
  const T = ({ rows }: { rows: any[] }) => <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Produto</th><th>Transportadora</th><th>Envio</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((s) => <Row key={s.id} s={s} />)}</tbody></table></div>;
  return (
    <>
      <PageH eyebrow="Sua marca" title="Press kits e envios" sub="Envios autorizados pela Conecta. Atualize transportadora, rastreio e status; o endereço da creator aparece só dentro de cada envio e o acesso fica registrado." />
      <Notice q={q} />
      <div className="kpis"><Kpi k="Aguardando envio" v={n(["Aguardando envio"])} hero /><Kpi k="Preparando" v={n(["Preparando"])} /><Kpi k="Em trânsito" v={n(["Enviado", "Em trânsito"])} /><Kpi k="Entregues" v={n(["Entregue"])} /><Kpi k="Com problema" v={n(["Problema"])} /></div>
      <div className="card"><div className="card-h"><h2>Envios em aberto</h2></div>{open.length ? <T rows={open} /> : <p className="muted">Nenhum envio em aberto.</p>}</div>
      <div className="card"><div className="card-h"><h2>Histórico de envios</h2></div>{all.length > open.length ? <T rows={all.filter((s: any) => !open.includes(s))} /> : <p className="muted">Ainda sem histórico.</p>}</div>
      <div className="section-t"><h2>Seus press kits</h2></div>
      {kits?.length ? <div className="cards">{kits.map((k: any) => <div className="ccard" key={k.id}>{k.photo_path ? <img src={publicUrl(k.photo_path)} alt="" style={{ width: "100%", height: 150, objectFit: "cover" }} /> : null}<div className="cbody"><div style={{ display: "flex", justifyContent: "space-between" }}><span className="eyebrow">{k.type}</span><Pill s={k.status} /></div><h3>{k.name}</h3><div className="cmeta"><div>Preço<b>{Number(k.price) > 0 ? brl(k.price) : "Gratuito"}</b></div><div>Estoque<b>{k.stock}</b></div></div></div></div>)}</div> : <Empty icon="gift" title="Nenhum press kit ainda" text="Os press kits da sua marca são criados pela Conecta." />}
    </>
  );
}
