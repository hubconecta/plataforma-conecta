import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, fd } from "@/components/ui";
import Icon from "@/components/Icon";

export default async function Marcas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("marcas");
  const { data: brands } = await supabase.from("brands").select("id,name,instagram,category,status,renewal_date,hiring_model,owner:profiles!brands_owner_id_fkey(name)").order("name");
  return (
    <>
      <PageH eyebrow="CRM de marcas" title="Marcas" sub={`${brands?.length || 0} marcas cadastradas pela Conecta`} right={<Link className="btn btn-primary" href="/marcas/nova"><Icon name="plus" /> Nova marca</Link>} />
      <Notice q={q} />
      <div className="card">{brands?.length ? (
        <div className="table-wrap"><table><thead><tr><th>Marca</th><th>Categoria</th><th>Status</th><th>Responsável Conecta</th><th>Modelo</th><th>Renovação</th></tr></thead><tbody>
          {brands.map((b: any) => <tr key={b.id}><td><Link href={`/marcas/${b.id}`} style={{ color: "inherit", textDecoration: "none" }}><Person name={b.name} sub={b.instagram || ""} /></Link></td><td>{b.category || "—"}</td><td><Pill s={b.status} /></td><td>{b.owner?.name || "—"}</td><td>{b.hiring_model || "—"}</td><td className="num">{fd(b.renewal_date)}</td></tr>)}
        </tbody></table></div>) : <Empty icon="store" title="Nenhuma marca ainda" text="Cadastre a primeira marca cliente da Conecta."><Link className="btn btn-primary" href="/marcas/nova">Nova marca</Link></Empty>}</div>
    </>
  );
}
