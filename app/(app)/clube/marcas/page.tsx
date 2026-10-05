import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";
import { photoUrl } from "@/lib/storage";
import { prizeSummary } from "@/components/PrizeList";

// "Minhas afiliações": as marcas das quais a creator faz parte (base da marca e campanhas aprovadas).
export default async function MinhasAfiliacoes({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("minhas_marcas");
  const me = profile.creator_id;
  const [{ data: cbs }, { data: apps }] = await Promise.all([
    supabase.from("creator_brands").select("brand_id,created_at").eq("creator_id", me),
    supabase.from("campaign_applications").select("status,campaign_id,campaigns(id,name,status,brand_id,start_date,end_date)").eq("creator_id", me),
  ]);
  const since = new Map<string, string>();
  (cbs || []).forEach((x: any) => since.set(x.brand_id, String(x.created_at).slice(0, 10)));
  (apps || []).filter((a: any) => a.status === "Aprovada" && a.campaigns?.brand_id).forEach((a: any) => { if (!since.has(a.campaigns.brand_id)) since.set(a.campaigns.brand_id, a.campaigns.start_date || ""); });
  const ids = [...since.keys()];
  const [{ data: brands }, { data: chs }, { data: open }, { data: glinks }] = ids.length ? await Promise.all([
    supabase.from("brand_public").select("id,name,logo_path,instagram,category").in("id", ids),
    supabase.from("challenges").select("id,name,brand_id,due_date,prizes,reward_label,reward_type,reward_value,winners").eq("status", "Ativo").in("brand_id", ids),
    supabase.from("campaigns").select("id,name,brand_id,end_date").eq("status", "Inscrições abertas").in("brand_id", ids),
    supabase.from("campaign_links").select("campaign_id,url"),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }] as any[];
  const GL = new Map((glinks || []).map((x: any) => [x.campaign_id, x.url]));
  const list = (brands || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
  const ig = (h?: string) => (h ? `https://instagram.com/${String(h).replace(/^@/, "")}` : "");
  return (
    <>
      <PageH eyebrow="Clube Conecta · Afiliada" title="Minhas afiliações" sub="As marcas das quais você é creator afiliada: desafios, campanhas e grupos de cada uma." />
      <Notice q={q} />
      {list.length ? <div className="aff-grid">{list.map((b: any) => {
        const bc = (chs || []).filter((x: any) => x.brand_id === b.id), bo = (open || []).filter((x: any) => x.brand_id === b.id);
        const mine = (apps || []).filter((a: any) => a.campaigns?.brand_id === b.id);
        return (
          <div className="card aff-card" key={b.id}>
            <div className="aff-head">{b.logo_path ? <img src={photoUrl(b.logo_path)} alt={`Logo ${b.name}`} /> : <span className="aff-ph">{b.name.slice(0, 2).toUpperCase()}</span>}
              <div style={{ minWidth: 0 }}><span className="eyebrow">Afiliada{since.get(b.id) ? ` desde ${fd(since.get(b.id)!)}` : ""}</span><h2 style={{ margin: "2px 0" }}>{b.name}</h2><span className="small muted">{[b.category, b.instagram].filter(Boolean).join(" · ")}</span></div></div>
            {b.instagram ? <a className="btn btn-ghost btn-sm" href={ig(b.instagram)} target="_blank" rel="noopener noreferrer">Seguir {b.instagram} no Instagram</a> : null}
            <div><b className="small">🔥 Desafios ativos ({bc.length})</b>{bc.length ? <div className="list">{bc.map((x: any) => <Link key={x.id} href="/clube/desafios" className="li" style={{ textDecoration: "none", color: "inherit" }}><div className="grow"><b>{x.name}</b><span>Prêmio: {prizeSummary(x)}{x.due_date ? ` · até ${fd(x.due_date)}` : ""}</span></div></Link>)}</div> : <p className="small muted">Nenhum desafio ativo agora.</p>}</div>
            <div><b className="small">📣 Oportunidades abertas ({bo.length})</b>{bo.length ? <div className="list">{bo.map((x: any) => <Link key={x.id} href="/clube/oportunidades" className="li" style={{ textDecoration: "none", color: "inherit" }}><div className="grow"><b>{x.name}</b><span>{x.end_date ? `até ${fd(x.end_date)}` : "inscrições abertas"}</span></div></Link>)}</div> : <p className="small muted">Nenhuma campanha com inscrições abertas.</p>}</div>
            {mine.length ? <div><b className="small">⭐ Minhas campanhas com a marca</b><div className="list">{mine.map((a: any) => <div className="li" key={a.campaign_id}><div className="grow"><b>{a.campaigns?.name}</b><span>{a.campaigns?.status}</span></div><Pill s={a.status} />{a.status === "Aprovada" && GL.get(a.campaign_id) ? <a className="btn btn-ok btn-sm" href={GL.get(a.campaign_id) as string} target="_blank" rel="noopener noreferrer">Grupo</a> : null}</div>)}</div></div> : null}
          </div>);
      })}</div> : <div className="card"><Empty icon="store" title="Você ainda não é afiliada de nenhuma marca" text="Quando você entrar pela página exclusiva de uma marca ou for aprovada numa campanha, a marca aparece aqui." /></div>}
    </>
  );
}
