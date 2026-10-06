import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Empty, Notice, Kpi } from "@/components/ui";

// Lista de contratos: a equipe vê todos, a marca vê os dela e a creator os dela (regras do banco).
export default async function Contratos({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await getSession();
  if (!profile) redirect("/login");
  const staff = ["ceo", "equipe"].includes(profile.role);
  if (staff && !can(profile, "campanhas")) redirect("/");
  if (!staff && !["marca", "creator"].includes(profile.role)) redirect("/");
  let qy = supabase.from("contract_signatures").select("id,status,created_at,creator_signed_at,brand_signed_at,campaign_id,campaigns(name,brands(name)),creators(name)").order("created_at", { ascending: false });
  if (q.campanha) qy = qy.eq("campaign_id", q.campanha);
  const { data } = await qy;
  const list = (data || []).filter((c: any) => staff || c.status !== "Cancelado");
  const st = (s: string) => list.filter((c: any) => c.status === s).length;
  const isBrand = profile.role === "marca";
  return (
    <>
      <PageH eyebrow={staff ? "Campanhas" : isBrand ? "Sua marca" : "Clube Conecta"} title={staff ? "Contratos das campanhas" : "Contratos"} sub={staff ? "Contratos enviados para as creators aprovadas, com a situação da assinatura de cada parte." : isBrand ? "Contratos das creators das suas campanhas. Assine os que estão aguardando a marca." : "Seus contratos de campanha. Leia e assine por aqui."} right={q.campanha ? <Link className="btn btn-ghost btn-sm" href="/contratos">Ver todos</Link> : undefined} />
      <Notice q={q} />
      <div className="kpis"><Kpi k="Aguardando creator" v={st("Aguardando creator")} hero /><Kpi k="Aguardando marca" v={st("Aguardando marca")} /><Kpi k="Assinados" v={st("Assinado")} /></div>
      <div className="card">{list.length ? <div className="list">{list.map((c: any) => {
        const pend = (profile.role === "creator" && c.status === "Aguardando creator") || (isBrand && c.status === "Aguardando marca");
        return <Link key={c.id} href={`/contrato/${c.id}`} className="li" style={{ textDecoration: "none", color: "inherit" }}><div className="grow"><b>{c.campaigns?.name}</b><span>{c.campaigns?.brands?.name}{!(profile.role === "creator") ? ` · ${c.creators?.name || ""}` : ""}</span></div><Pill s={c.status} />{pend ? <span className="btn btn-primary btn-sm">Assinar</span> : <span className="btn btn-ghost btn-sm">Ver</span>}</Link>;
      })}</div> : <Empty icon="file" title="Nenhum contrato ainda" text={staff ? "Ative o contrato na campanha (Campanhas → editar → Contrato para as aprovadas)." : "Quando você for aprovada numa campanha com contrato, ele aparece aqui."} />}</div>
    </>
  );
}
