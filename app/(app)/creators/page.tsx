import Link from "next/link";
import Social from "@/components/Social";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, fd } from "@/components/ui";
import { creatorAccess, deleteCreator } from "../actions";
import { addCreatorBrand } from "./actions";
import ConfirmDelete from "@/components/ConfirmDelete";
import LevelBadge, { levelOf } from "@/components/LevelBadge";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { LabelFilter } from "@/components/Labels";

export default async function Creators({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("creators");
  const isCeo = profile.role === "ceo";
  const L = await loadLabels(supabase, "creator");
  const CL = L.usable("creator");
  const et = CL.some((l) => l.id === q.et) ? q.et : "";
  const [{ data: all }, { data: logins }] = await Promise.all([
    supabase.from("creators").select("id,name,email,instagram,tiktok,niche,city,state,followers,status,tags,kind,xp,avatar_path").order("name"),
    supabase.from("profiles").select("creator_id,status,access_status,last_login_at").eq("role", "creator"),
  ]);
  const [{ data: cbs }, { data: bl }] = await Promise.all([
    supabase.from("creator_brands").select("creator_id,brand_id"),
    supabase.from("brands").select("id,name").order("name"),
  ]);
  const BN = new Map((bl || []).map((b: any) => [b.id, b.name]));
  const brandsOf = (cid: string) => (cbs || []).filter((x: any) => x.creator_id === cid).map((x: any) => x.brand_id);
  const withBase = (bl || []).filter((b: any) => (cbs || []).some((x: any) => x.brand_id === b.id));
  const mk = withBase.some((b: any) => b.id === q.marca) ? q.marca : "";
  const data = (all || []).filter((c: any) => (!et || L.has("creator", c.id, et)) && (!mk || brandsOf(c.id).includes(mk)));
  const { data: levels } = await supabase.from("levels").select("*").order("position");
  const acc = new Map((logins || []).map((l: any) => [l.creator_id, l]));
  const accLabel = (l: any) => !l ? "Sem acesso" : l.status !== "ativo" ? "Bloqueado" : l.last_login_at ? "Ativo" : "Link enviado";
  return (
    <>
      <PageH eyebrow="CRM de creators" title="Creators" sub={`${all?.length || 0} creators na base${et || mk ? ` · ${data.length} no filtro` : ""}`} />
      <Notice q={q} />
      <div className="card include-box"><div className="card-h"><div><h2>➕ Incluir creator numa marca</h2><span className="small muted">Para quem já está na Conecta: escolha a creator e a marca. Ela entra na base da marca, recebe o aviso e passa a ver a marca em “Minhas marcas”.</span></div></div>
        <form action={addCreatorBrand} className="form-grid"><input type="hidden" name="back" value={mk ? `/creators?marca=${mk}` : "/creators"} />
          <div className="field"><label htmlFor="inc_c">Creator</label><select className="input" id="inc_c" name="creator_id" required defaultValue=""><option value="" disabled>Escolha a creator</option>{(all || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.instagram ? ` · ${c.instagram}` : ""}</option>)}</select></div>
          <div className="field"><label htmlFor="inc_b">Marca</label><select className="input" id="inc_b" name="brand_id" required defaultValue={mk || ""}><option value="" disabled>Escolha a marca</option>{(bl || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field" style={{ justifyContent: "flex-end" }}><button className="btn btn-primary">Incluir na marca</button></div></form></div>
      {withBase.length ? <div className="chips" aria-label="Filtrar por marca"><span className="small muted" style={{ alignSelf: "center" }}>Base da marca:</span><Link className={`chip ${!mk ? "on" : ""}`} href="/creators">Todas</Link>{withBase.map((b: any) => <Link key={b.id} className={`chip ${mk === b.id ? "on" : ""}`} href={`/creators?marca=${b.id}`}>{b.name} <span className="c">{(cbs || []).filter((x: any) => x.brand_id === b.id).length}</span></Link>)}</div> : null}
      <LabelFilter labels={CL} active={et} base={mk ? `/creators?marca=${mk}` : "/creators"} />
      <div className="card">{data?.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Marcas</th><th>Etiquetas</th><th>Perfil</th><th>Nicho</th><th>Cidade</th><th className="r">Seguidores</th><th>Nível</th><th>Status</th><th>Clube</th><th></th></tr></thead><tbody>
        {data.map((c: any) => { const l = acc.get(c.id); return <tr key={c.id}><td><Link href={`/creators/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}><Person name={c.name} src={c.avatar_path} star={levelOf(levels || [], c.xp || 0).cur?.color} starTitle={levelOf(levels || [], c.xp || 0).cur?.name} /></Link><Social ig={c.instagram} tt={c.tiktok} /></td><td className="small">{brandsOf(c.id).length ? brandsOf(c.id).map((b: string) => <Link key={b} className="chip" style={{ padding: "3px 8px", fontSize: 11.5, marginRight: 4, display: "inline-block" }} href={`/marcas/${b}#base`}>{BN.get(b) || "marca"}</Link>) : <span className="muted">—</span>}</td><td><LabelPicker all={CL} on={L.ids("creator", c.id)} entity="creator" id={c.id} compact /></td><td className="small">{c.kind || "—"}</td><td>{c.niche || "—"}</td><td>{c.city ? `${c.city}/${c.state || ""}` : "—"}</td><td className="r num">{(c.followers || 0).toLocaleString("pt-BR")}</td><td><LevelBadge level={levelOf(levels || [], c.xp || 0).cur} small /><div className="small muted">{c.xp || 0} pts</div></td><td><Pill s={c.status} /></td>
          <td><Pill s={accLabel(l)} />{l?.last_login_at ? <div className="small muted">último acesso {fd(l.last_login_at.slice(0, 10))}</div> : null}</td>
          <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
            <form action={creatorAccess}><input type="hidden" name="creator_id" value={c.id} /><button className="btn btn-ghost btn-sm">{l ? "Novo link do Clube" : "Liberar acesso ao Clube"}</button></form>
            {isCeo ? <ConfirmDelete action={deleteCreator} fields={{ id: c.id }} warning={`Apaga ${c.name}, as inscrições dela em campanhas, o endereço e o login do Clube. Não dá para desfazer.`} /> : null}
          </div></td></tr>; })}
      </tbody></table></div> : <Empty icon="users" title="Nenhuma creator ainda" text="Creators entram aprovando os cadastros feitos pelo link público /cadastro." />}</div>
    </>
  );
}
