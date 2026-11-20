import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireModule } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageH, Empty, fd } from "@/components/ui";
import HubLock from "@/components/HubLock";
import { hubArea } from "@/lib/hub-areas";
import { hubSettings } from "@/lib/hub";
import { prizeSummary } from "@/components/PrizeList";

// Áreas exclusivas do Conecta Hub. A creator Free vê o bloqueio; os dados só vêm do banco para quem tem o Hub ativo (RLS).
export default async function HubArea({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const A = hubArea(area);
  if (!A) notFound();
  const { supabase, profile } = await requireModule(A.key);
  const hub = !!(profile as any).hub;
  if (!hub) {
    const cfg = await hubSettings(createAdminClient());
    return (<><PageH eyebrow="Conecta Hub" title={`${A.emoji} ${A.title}`} /><HubLock title={A.title} desc={A.desc} price={cfg.price} /></>);
  }
  if (A.slug === "academy") redirect("/club/conecta-academy");
  const head = <PageH eyebrow="Conecta Hub · exclusivo" title={`${A.emoji} ${A.title}`} sub={A.desc} right={<Link className="btn btn-ghost btn-sm" href="/hub">Meu Hub</Link>} />;

  if (A.slug === "campanhas") {
    const { data } = await supabase.from("campaigns").select("id,name,status,end_date,brand_id,brands(name)").eq("access_level", "hub").in("status", ["Inscrições abertas", "Ativa"]).order("created_at", { ascending: false });
    return (<>{head}{data?.length ? <div className="hub-items">{data.map((c: any) => (
      <div key={c.id} className="hub-item"><span className="eyebrow">{c.brands?.name || "Conecta"} · {c.status}</span><b>{c.name}</b><span className="small muted">{c.end_date ? `Inscrições até ${fd(c.end_date)}` : "Inscrições abertas"}</span>
        <Link className="btn btn-primary btn-sm" href="/clube/oportunidades">{c.status === "Inscrições abertas" ? "Ver e me inscrever" : "Ver campanha"}</Link></div>))}</div>
      : <div className="card"><Empty icon="megaphone" title="Nenhuma campanha exclusiva aberta agora" text="Assim que abrir uma campanha só para o Hub, você recebe uma notificação." /></div>}</>);
  }
  if (A.slug === "desafios") {
    const { data } = await supabase.from("challenges").select("id,name,due_date,prizes,reward_label,reward_type,reward_value,winners,brands(name)").eq("access_level", "hub").eq("status", "Ativo").order("created_at", { ascending: false });
    return (<>{head}{data?.length ? <div className="hub-items">{data.map((c: any) => (
      <div key={c.id} className="hub-item"><span className="eyebrow">{c.brands?.name || "Conecta"}</span><b>{c.name}</b><span className="small muted">Prêmio: {prizeSummary(c)}{c.due_date ? ` · até ${fd(c.due_date)}` : ""}</span>
        <Link className="btn btn-primary btn-sm" href="/clube/desafios">Participar</Link></div>))}</div>
      : <div className="card"><Empty icon="trophy" title="Nenhum desafio exclusivo ativo agora" text="Os próximos desafios do Hub aparecem aqui." /></div>}</>);
  }
  const [{ data: items }, { data: groups }] = await Promise.all([
    supabase.from("hub_items").select("*").eq("section", A.slug).eq("status", "Publicado").order("pinned", { ascending: false }).order("position").order("created_at", { ascending: false }),
    A.slug === "comunidade" ? supabase.from("community_links").select("id,title,url").eq("audience", "Hub").order("position") : Promise.resolve({ data: [] as any[] }),
  ]);
  const cats = new Map<string, any[]>();
  (items || []).forEach((i: any) => { const k = i.category || ""; cats.set(k, [...(cats.get(k) || []), i]); });
  return (
    <>
      {head}
      {groups?.length ? <div className="card" style={{ marginBottom: 14 }}><div className="card-h"><h2>💬 Grupos exclusivos</h2></div><div className="list">{groups.map((l: any) => <div className="li" key={l.id}><div className="grow"><b>{l.title}</b></div><a className="btn btn-ok btn-sm" href={l.url} target="_blank" rel="noopener noreferrer">Entrar</a></div>)}</div></div> : null}
      {[...cats.entries()].map(([cat, list]) => (
        <div className="hub-sec" key={cat || "_"} style={{ marginTop: 14 }}>{cat ? <h2>{cat}</h2> : null}
          <div className="hub-items">{list.map((i: any) => (
            <div key={i.id} className={`hub-item ${i.pinned ? "pin" : ""}`}><span className="eyebrow">{i.pinned ? "📌 " : ""}{i.kind}</span><b>{i.title}</b>{i.body ? <p>{i.body}</p> : null}
              {i.url ? <a className="btn btn-primary btn-sm" href={i.url} target="_blank" rel="noopener noreferrer">{i.kind === "Material" ? "Baixar / abrir" : i.kind === "Vídeo" ? "Assistir" : "Abrir"}</a> : null}</div>))}</div>
        </div>))}
      {!items?.length && !groups?.length ? <div className="card"><Empty icon="sparkle" title="Os conteúdos desta área estão chegando" text="A equipe Conecta está preparando tudo. Você recebe uma notificação quando sair novidade." /></div> : null}
    </>
  );
}
