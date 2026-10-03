import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty } from "@/components/ui";

export default async function Creators() {
  const { supabase } = await requireModule("creators");
  const { data } = await supabase.from("creators").select("id,name,instagram,niche,city,state,followers,status,tags,kind").order("name");
  return (
    <>
      <PageH eyebrow="CRM de creators" title="Creators" sub={`${data?.length || 0} creators na base`} />
      <div className="card">{data?.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Perfil</th><th>Nicho</th><th>Cidade</th><th className="r">Seguidores</th><th>Status</th><th>Tags</th></tr></thead><tbody>
        {data.map((c: any) => <tr key={c.id}><td><Person name={c.name} sub={c.instagram || ""} /></td><td className="small">{c.kind || "—"}</td><td>{c.niche || "—"}</td><td>{c.city ? `${c.city}/${c.state || ""}` : "—"}</td><td className="r num">{(c.followers || 0).toLocaleString("pt-BR")}</td><td><Pill s={c.status} /></td><td>{(c.tags || []).map((t: string) => <span key={t} className="tag">{t}</span>)}</td></tr>)}
      </tbody></table></div> : <Empty icon="users" title="Nenhuma creator ainda" text="Creators entram aprovando os cadastros feitos pelo link público /cadastro." />}</div>
    </>
  );
}
