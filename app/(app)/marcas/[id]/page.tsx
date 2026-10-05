import Link from "next/link";
import { addCreatorBrand, removeCreatorBrand } from "../../creators/actions";
import { notFound } from "next/navigation";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Notice, Person, fd, brl } from "@/components/ui";
import BrandForm from "../BrandForm";
import { createBrandAccess, resendAccess, setUserStatus, deleteUserAccess, deleteBrand } from "../../actions";
import ConfirmDelete from "@/components/ConfirmDelete";
import FileUpload from "@/components/FileUpload";
import { photoUrl } from "@/lib/storage";
import { saveBrandProfile } from "../../perfil/actions";

const ACC: Record<string, string> = { convite_enviado: "Convite enviado", primeiro_acesso_pendente: "Primeiro acesso pendente", ativo: "Ativo", bloqueado: "Bloqueado", inativo: "Desativado" };

export default async function Marca({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("marcas");
  const { data: b } = await supabase.from("brands").select("*").eq("id", id).single();
  if (!b) notFound();
  const showFin = can(profile, "fin");
  const [{ data: owners }, { data: users }, { data: camps }, contractRes] = await Promise.all([
    supabase.from("profiles").select("id,name").in("role", ["ceo", "equipe"]).order("name"),
    supabase.from("profiles").select("id,name,email,status,access_status,last_login_at,created_at,cargo,whatsapp").eq("brand_id", id).eq("role", "marca"),
    supabase.from("campaigns").select("id,name,status,start_date,end_date,results").eq("brand_id", id).order("created_at", { ascending: false }),
    showFin ? supabase.from("brand_contracts").select("*").eq("brand_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const u = users?.[0];
  const accLabel = u ? (u.status !== "ativo" ? ACC[u.status] || u.status : u.last_login_at ? "Ativo" : ACC[u.access_status] || "Convite enviado") : "Acesso não criado";
  const back = `/marcas/${id}`;
  const LB = await loadLabels(supabase, "marca", [id]);
  const { data: allCreators } = await supabase.from("creators").select("id,name,instagram").order("name");
  const { data: base } = await supabase.from("creator_brands").select("created_at, source, creators(id,name,instagram,tiktok,whatsapp,city,state,brand_only,avatar_path)").eq("brand_id", id).order("created_at", { ascending: false });
  return (
    <>
      <PageH eyebrow={b.category || "Marca"} title={b.name} right={<div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Pill s={b.status} />{can(profile, "relatorios") ? <a className="btn btn-ghost btn-sm" href={`/relatorios?marca=${id}&tab=vivo`}>Relatório da marca</a> : null}{profile.role === "ceo" ? <ConfirmDelete action={deleteBrand} fields={{ id }} label="Excluir marca" warning={`Exclui ${b.name}, os dados de contrato e os acessos ao portal. Só é possível se a marca não tiver campanhas; se tiver, mude o status para Inativa.`} /> : null}</div>} />
      <Notice q={q} />
      <div className="lbl-detail"><span className="small muted">🏷 Etiquetas</span><LabelPicker all={LB.usable("marca")} on={LB.ids("marca", id)} entity="marca" id={id} /></div>
      <div className="card" id="base"><div className="card-h"><div><h2>Creators da marca · {base?.length || 0}</h2><span className="small muted">Quem entrou pelo formulário exclusivo da marca. Clique no nome para ver o perfil.</span></div><Link className="btn btn-ghost btn-sm" href={`/creators?marca=${id}`}>Ver em Creators</Link></div>
        {base?.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Redes</th><th>WhatsApp</th><th>Cidade</th><th>Base</th><th>Entrou em</th><th></th></tr></thead><tbody>
          {base.map((b: any, i: number) => b.creators ? <tr key={i}><td><Link href={`/creators/${b.creators.id}`} style={{ color: "inherit", textDecoration: "none" }}><Person name={b.creators.name} src={b.creators.avatar_path} /></Link></td><td className="small">{[b.creators.instagram, b.creators.tiktok].filter(Boolean).join(" · ") || "—"}</td><td className="small">{b.creators.whatsapp || "—"}</td><td className="small">{b.creators.city ? `${b.creators.city}/${b.creators.state || ""}` : "—"}</td><td><Pill s={b.creators.brand_only ? "Só da marca" : "Base Conecta"} /></td><td className="num small">{fd(String(b.created_at).slice(0, 10))}</td><td><form action={removeCreatorBrand}><input type="hidden" name="creator_id" value={b.creators.id} /><input type="hidden" name="brand_id" value={id} /><input type="hidden" name="back" value={`/marcas/${id}`} /><button className="btn btn-ghost btn-sm" title="Tirar da base desta marca">Tirar</button></form></td></tr> : null)}
        </tbody></table></div> : <p className="muted small">Nenhuma creator ainda. Crie um formulário em Formulários escolhendo esta marca e mande o link no grupo dela.</p>}
        {allCreators?.length ? <form action={addCreatorBrand} className="field" style={{ marginTop: 12, gap: 6 }}><input type="hidden" name="brand_id" value={id} /><input type="hidden" name="back" value={`/marcas/${id}`} /><label>Colocar creator que já está na Conecta nesta marca</label><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><select className="input" name="creator_id" required defaultValue="" style={{ flex: 1, minWidth: 200 }}><option value="" disabled>Escolha a creator</option>{allCreators.filter((c: any) => !(base || []).some((b: any) => b.creators?.id === c.id)).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.instagram ? ` · ${c.instagram}` : ""}</option>)}</select><button className="btn btn-dark btn-sm">Adicionar à base</button></div></form> : null}
      </div>
      <div className="card profile-head">{b.logo_path ? <img className="brand-logo" src={photoUrl(b.logo_path)} alt={`Logo ${b.name}`} /> : <span className="brand-logo" style={{ display: "grid", placeItems: "center", fontWeight: 800 }}>{b.name.slice(0, 2).toUpperCase()}</span>}<div style={{ flex: 1, minWidth: 200 }}><h2>{b.name}</h2>{b.description ? <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{b.description}</p> : null}</div>
        <details className="mod" style={{ width: "100%" }}><summary className="small">Logo e apresentação da marca</summary><form action={saveBrandProfile} className="form-grid" style={{ paddingBottom: 12 }}><input type="hidden" name="brand_id" value={id} />
          <FileUpload name="logo_path" bucket="perfis" folder="marcas" accept="image/*" current={b.logo_path} label="Logo da marca" />
          <div className="field full"><label>Sobre a marca</label><textarea className="input" name="description" defaultValue={b.description || ""} /></div>
          {[["site", "Site"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["contact_name", "Responsável"], ["email", "E-mail"], ["whatsapp", "WhatsApp"]].map(([n, l]) => <div className="field" key={n}><label>{l}</label><input className="input" name={n} defaultValue={b[n] || ""} /></div>)}
          <div><button className="btn btn-primary btn-sm">Salvar</button></div></form></details></div>
      <div className="card">
        <div className="card-h"><div><h2>Acesso ao Portal da Marca</h2><span className="muted">a marca não se cadastra sozinha: o acesso é criado pela Conecta</span></div><Pill s={accLabel} /></div>
        {u ? (<>
          <dl className="dl"><div><dt>Responsável</dt><dd>{u.name}{u.cargo ? ` · ${u.cargo}` : ""}</dd></div><div><dt>E-mail de acesso</dt><dd>{u.email}</dd></div><div><dt>Criado em</dt><dd>{fd(u.created_at?.slice(0, 10))}</dd></div><div><dt>Último acesso</dt><dd>{u.last_login_at ? fd(u.last_login_at.slice(0, 10)) : "ainda não acessou"}</dd></div></dl>
          <div className="actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            <form action={resendAccess}><input type="hidden" name="email" value={u.email} /><input type="hidden" name="back" value={back} /><button className="btn btn-ghost btn-sm">Reenviar acesso / redefinir senha</button></form>
            {u.status === "ativo" ? (<>
              <form action={setUserStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value="bloqueado" /><input type="hidden" name="back" value={back} /><button className="btn btn-ghost btn-sm">Bloquear</button></form>
              <form action={setUserStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value="inativo" /><input type="hidden" name="back" value={back} /><button className="btn btn-bad btn-sm">Desativar</button></form>
            </>) : <form action={setUserStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value="ativo" /><input type="hidden" name="back" value={back} /><button className="btn btn-ok btn-sm">Reativar</button></form>}
            {profile.role === "ceo" ? <ConfirmDelete action={deleteUserAccess} fields={{ id: u.id, back }} label="Excluir acesso" warning={`O login ${u.email} será apagado. A marca continua cadastrada e você pode criar um novo acesso com outro e-mail.`} /> : null}
          </div></>
        ) : (
          <form action={createBrandAccess} className="form-grid" style={{ marginTop: 6 }}>
            <input type="hidden" name="brand_id" value={id} />
            <div className="field"><label htmlFor="ac1">Nome do responsável</label><input className="input" id="ac1" name="name" required defaultValue={b.contact_name || ""} /></div>
            <div className="field"><label htmlFor="ac2">E-mail de acesso (login)</label><input className="input" id="ac2" name="email" type="email" required defaultValue={b.email || ""} /></div>
            <div className="field"><label htmlFor="ac3">WhatsApp</label><input className="input" id="ac3" name="whatsapp" defaultValue={b.whatsapp || ""} /></div>
            <div className="field"><label htmlFor="ac4">Cargo</label><input className="input" id="ac4" name="cargo" defaultValue={b.contact_role || ""} /></div>
            <p className="small muted full">O responsável recebe o e-mail “Seu acesso à plataforma Conecta” com um link seguro para criar a própria senha.</p>
            <div><button className="btn btn-primary">Criar acesso e enviar e-mail</button></div>
          </form>
        )}
      </div>
      <div className="card"><div className="card-h"><h2>Campanhas</h2></div>{camps?.length ? <div className="table-wrap"><table><thead><tr><th>Campanha</th><th>Status</th><th>Período</th><th className="r">GMV</th></tr></thead><tbody>{camps.map((c: any) => <tr key={c.id}><td><b>{c.name}</b></td><td><Pill s={c.status} /></td><td className="num">{fd(c.start_date)} – {fd(c.end_date)}</td><td className="r num">{brl(c.results?.gmv || 0)}</td></tr>)}</tbody></table></div> : <p className="muted">Nenhuma campanha desta marca ainda.</p>}</div>
      <h2 style={{ marginTop: 8 }}>Dados da marca</h2>
      <BrandForm b={b} owners={owners || []} showFin={showFin} contract={(contractRes as any)?.data} />
    </>
  );
}
