import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, fd } from "@/components/ui";
import Icon from "@/components/Icon";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { LabelFilter } from "@/components/Labels";

export default async function Marcas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("marcas");
  const L = await loadLabels(supabase, "marca");
  const ML = L.usable("marca");
  const et = ML.some((l) => l.id === q.et) ? q.et : "";
  const { data: all } = await supabase.from("brands").select("id,name,instagram,category,status,renewal_date,hiring_model,logo_path,owner:profiles!brands_owner_id_fkey(name)").order("name");
  const brands = (all || []).filter((b: any) => !et || L.has("marca", b.id, et));
  return (
    <>
      <PageH eyebrow="CRM de marcas" title="Marcas" sub={`${all?.length || 0} marcas cadastradas pela Conecta${et ? ` · ${brands.length} com a etiqueta` : ""}`} right={<Link className="btn btn-primary" href="/marcas/nova"><Icon name="plus" /> Nova marca</Link>} />
      <Notice q={q} />
      <LabelFilter labels={ML} active={et} base="/marcas" />
      <div className="card">{brands?.length ? (
        <div className="table-wrap"><table><thead><tr><th>Marca</th><th>Etiquetas</th><th>Categoria</th><th>Status</th><th>Responsável Conecta</th><th>Modelo</th><th>Renovação</th></tr></thead><tbody>
          {brands.map((b: any) => <tr key={b.id}><td><Link href={`/marcas/${b.id}`} style={{ color: "inherit", textDecoration: "none" }}><Person name={b.name} sub={b.instagram || ""} src={b.logo_path} /></Link></td><td><LabelPicker all={ML} on={L.ids("marca", b.id)} entity="marca" id={b.id} compact /></td><td>{b.category || "—"}</td><td><Pill s={b.status} /></td><td>{b.owner?.name || "—"}</td><td>{b.hiring_model || "—"}</td><td className="num">{fd(b.renewal_date)}</td></tr>)}
        </tbody></table></div>) : <Empty icon="store" title={et ? "Nenhuma marca com esta etiqueta" : "Nenhuma marca ainda"} text={et ? "Escolha outra etiqueta ou “Todas”." : "Cadastre a primeira marca cliente da Conecta."}><Link className="btn btn-primary" href="/marcas/nova">Nova marca</Link></Empty>}</div>
    </>
  );
}
