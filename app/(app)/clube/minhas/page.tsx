import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";

export default async function Minhas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("minhas");
  const { data } = await supabase.from("campaign_applications").select("id,status,created_at,campaigns(name,start_date,end_date,deliverables)").eq("creator_id", profile.creator_id).order("created_at", { ascending: false });
  return (
    <>
      <PageH eyebrow="Clube Conecta" title="Minhas campanhas" />
      <Notice q={q} />
      <div className="card">{data?.length ? <div className="table-wrap"><table><thead><tr><th>Campanha</th><th>Período</th><th>Inscrição</th><th>Status</th></tr></thead><tbody>{data.map((a: any) => <tr key={a.id}><td><b>{a.campaigns?.name}</b><div className="small muted">{a.campaigns?.deliverables || ""}</div></td><td className="num">{fd(a.campaigns?.start_date)} – {fd(a.campaigns?.end_date)}</td><td className="num">{fd(a.created_at?.slice(0, 10))}</td><td><Pill s={a.status} /></td></tr>)}</tbody></table></div> : <Empty icon="megaphone" title="Você ainda não participa de nenhuma campanha" text="Veja as oportunidades abertas e se inscreva." />}</div>
    </>
  );
}
