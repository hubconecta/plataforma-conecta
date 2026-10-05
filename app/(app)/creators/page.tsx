import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, fd } from "@/components/ui";
import { creatorAccess, deleteCreator } from "../actions";
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
    supabase.from("creators").select("id,name,email,instagram,niche,city,state,followers,status,tags,kind,xp,avatar_path").order("name"),
    supabase.from("profiles").select("creator_id,status,access_status,last_login_at").eq("role", "creator"),
  ]);
  const data = (all || []).filter((c: any) => !et || L.has("creator", c.id, et));
  const { data: levels } = await supabase.from("levels").select("*").order("position");
  const acc = new Map((logins || []).map((l: any) => [l.creator_id, l]));
  const accLabel = (l: any) => !l ? "Sem acesso" : l.status !== "ativo" ? "Bloqueado" : l.last_login_at ? "Ativo" : "Link enviado";
  return (
    <>
      <PageH eyebrow="CRM de creators" title="Creators" sub={`${all?.length || 0} creators na base${et ? ` · ${data.length} com a etiqueta` : ""}`} />
      <Notice q={q} />
      <LabelFilter labels={CL} active={et} base="/creators" />
      <div className="card">{data?.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Etiquetas</th><th>Perfil</th><th>Nicho</th><th>Cidade</th><th className="r">Seguidores</th><th>Nível</th><th>Status</th><th>Clube</th><th></th></tr></thead><tbody>
        {data.map((c: any) => { const l = acc.get(c.id); return <tr key={c.id}><td><Link href={`/creators/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}><Person name={c.name} sub={c.instagram || ""} src={c.avatar_path} star={levelOf(levels || [], c.xp || 0).cur?.color} starTitle={levelOf(levels || [], c.xp || 0).cur?.name} /></Link></td><td><LabelPicker all={CL} on={L.ids("creator", c.id)} entity="creator" id={c.id} compact /></td><td className="small">{c.kind || "—"}</td><td>{c.niche || "—"}</td><td>{c.city ? `${c.city}/${c.state || ""}` : "—"}</td><td className="r num">{(c.followers || 0).toLocaleString("pt-BR")}</td><td><LevelBadge level={levelOf(levels || [], c.xp || 0).cur} small /><div className="small muted">{c.xp || 0} pts</div></td><td><Pill s={c.status} /></td>
          <td><Pill s={accLabel(l)} />{l?.last_login_at ? <div className="small muted">último acesso {fd(l.last_login_at.slice(0, 10))}</div> : null}</td>
          <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
            <form action={creatorAccess}><input type="hidden" name="creator_id" value={c.id} /><button className="btn btn-ghost btn-sm">{l ? "Novo link do Clube" : "Liberar acesso ao Clube"}</button></form>
            {isCeo ? <ConfirmDelete action={deleteCreator} fields={{ id: c.id }} warning={`Apaga ${c.name}, as inscrições dela em campanhas, o endereço e o login do Clube. Não dá para desfazer.`} /> : null}
          </div></td></tr>; })}
      </tbody></table></div> : <Empty icon="users" title="Nenhuma creator ainda" text="Creators entram aprovando os cadastros feitos pelo link público /cadastro." />}</div>
    </>
  );
}
