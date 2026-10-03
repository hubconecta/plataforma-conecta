import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, fd } from "@/components/ui";
import { setCampaignAppStatus } from "../actions";

export default async function Inscricoes({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("candidaturas");
  const { data } = await supabase.from("campaign_applications").select("*, creators(name,instagram,followers), campaigns(name)").order("created_at", { ascending: false });
  const Btn = ({ id, s, cls, l }: any) => <form action={setCampaignAppStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><button className={`btn ${cls} btn-sm`}>{l}</button></form>;
  return (
    <>
      <PageH eyebrow="Central de aprovação" title="Inscrições em campanhas" sub="Aprove, reprove ou coloque em lista de espera. A creator e a marca são avisadas." />
      <Notice q={q} />
      <div className="card">{data?.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Campanha</th><th>Data</th><th>Status</th><th>Respostas</th><th className="r">Ações</th></tr></thead><tbody>
        {data.map((a: any) => <tr key={a.id}><td><Person name={a.creators?.name || "—"} sub={a.creators?.instagram || ""} /></td><td><b>{a.campaigns?.name || "—"}</b></td><td className="num">{fd(a.created_at?.slice(0, 10))}</td><td><Pill s={a.status} /></td><td className="small">{a.answers?.motivo || "—"}</td>
          <td><div className="actions">{["Enviada", "Em análise"].includes(a.status) ? <><Btn id={a.id} s="Aprovada" cls="btn-ok" l="Aprovar" /><Btn id={a.id} s="Reprovada" cls="btn-bad" l="Reprovar" /><Btn id={a.id} s="Lista de espera" cls="btn-ghost" l="Lista de espera" /></> : null}</div></td></tr>)}
      </tbody></table></div> : <Empty icon="inbox" title="Nenhuma inscrição ainda" text="Inscrições feitas pelas creators no Clube Conecta aparecem aqui." />}</div>
    </>
  );
}
