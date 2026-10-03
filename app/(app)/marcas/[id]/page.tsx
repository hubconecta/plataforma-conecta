import { notFound } from "next/navigation";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Notice, fd, brl } from "@/components/ui";
import BrandForm from "../BrandForm";
import { createBrandAccess, resendAccess, setUserStatus } from "../../actions";

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
  return (
    <>
      <PageH eyebrow={b.category || "Marca"} title={b.name} right={<Pill s={b.status} />} />
      <Notice q={q} />
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
