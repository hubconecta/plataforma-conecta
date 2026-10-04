import { requireModule } from "@/lib/session";
import { grantable } from "@/lib/perms";
import { PageH, Pill, Person, Notice, fd } from "@/components/ui";
import { saveTeamMember, resendAccess, deleteUserAccess } from "../actions";
import ConfirmDelete from "@/components/ConfirmDelete";

function TeamForm({ u }: { u?: any }) {
  const p: string[] = u?.perms || grantable().filter((m) => !m.sens).map((m) => m.key);
  return (
    <form action={saveTeamMember} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {u ? <input type="hidden" name="id" value={u.id} /> : null}
      <div className="form-grid">
        <div className="field"><label>Nome</label><input className="input" name="name" required defaultValue={u?.name || ""} /></div>
        {u ? null : <div className="field"><label>E-mail (login)</label><input className="input" name="email" type="email" required /></div>}
        <div className="field"><label>WhatsApp</label><input className="input" name="whatsapp" defaultValue={u?.whatsapp || ""} /></div>
        <div className="field"><label>Cargo</label><input className="input" name="cargo" defaultValue={u?.cargo || ""} /></div>
        <div className="field"><label>Departamento</label><input className="input" name="departamento" defaultValue={u?.departamento || ""} /></div>
        <div className="field"><label>Data de entrada</label><input className="input" name="entrada" type="date" defaultValue={u?.entrada || ""} /></div>
        <div className="field"><label>Status</label><select className="input" name="status" defaultValue={u?.status || "ativo"}><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></div>
        <div className="field full"><label>Responsabilidades</label><textarea className="input" name="responsabilidades" defaultValue={u?.responsabilidades || ""} /></div>
      </div>
      <div><span className="lbl">Permissões</span><div className="perm-grid" style={{ marginTop: 6 }}>{grantable().map((m) => <label key={m.key} className={`perm ${m.sens ? "sens" : ""}`}><input type="checkbox" name="perm" value={m.key} defaultChecked={p.includes(m.key)} />{m.label}</label>)}</div>
        <p className="small muted" style={{ marginTop: 6 }}>Itens em destaque mostram dados financeiros sensíveis.</p></div>
      <div><button className="btn btn-primary btn-sm">{u ? "Salvar" : "Convidar colaboradora"}</button></div>
    </form>
  );
}

export default async function Colaboradoras({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("colaboradoras");
  const isCeo = profile.role === "ceo";
  const { data: team } = await supabase.from("profiles").select("*").eq("role", "equipe").order("name");
  return (
    <>
      <PageH eyebrow="Pessoas" title="Colaboradoras" sub="Cada pessoa da equipe tem login próprio e acessa só o que foi liberado." />
      <Notice q={q} />
      <details className="mod" open={!team?.length}><summary>+ Nova colaboradora</summary><div style={{ paddingBottom: 16 }}><TeamForm /></div></details>
      {(team || []).map((u: any) => (
        <details className="mod" key={u.id}><summary><Person src={u.avatar_path} name={u.name} sub={`${u.cargo || ""}${u.departamento ? " · " + u.departamento : ""} · ${u.email}`} /><span style={{ marginLeft: "auto" }}><Pill s={u.status} /></span></summary><div style={{ paddingBottom: 16 }}><p className="small muted">Entrada: {fd(u.entrada)} · {(u.perms || []).length} permissões</p><TeamForm u={u} />
          <div className="actions" style={{ justifyContent: "flex-start", marginTop: 14, alignItems: "flex-start" }}>
            <form action={resendAccess}><input type="hidden" name="email" value={u.email} /><input type="hidden" name="back" value="/colaboradoras" /><button className="btn btn-ghost btn-sm">Gerar novo link de acesso</button></form>
            {isCeo ? <ConfirmDelete action={deleteUserAccess} fields={{ id: u.id, back: "/colaboradoras" }} label="Excluir colaboradora" warning={`O login de ${u.email} será apagado e ela perde o acesso na hora. O histórico de ações continua registrado. Se for só uma pausa, use Status: Inativa.`} /> : null}
          </div></div></details>
      ))}
    </>
  );
}
