import GroupLinks from "@/components/GroupLinks";
import Link from "next/link";
import { requireModule } from "@/lib/session";
import { Kpi, Pill, fd } from "@/components/ui";
import LevelBadge, { levelOf } from "@/components/LevelBadge";
import { photoUrl } from "@/lib/storage";

export default async function Clube() {
  const { supabase, profile } = await requireModule("clube");
  const me = profile.creator_id;
  const [{ data: c }, { data: open }, { data: mine }, { data: chs }, { data: parts }, { data: buys }, { data: addr }, { data: pts }] = await Promise.all([
    supabase.from("creators").select("name,xp").eq("id", me).single(),
    supabase.from("campaigns").select("id").eq("status", "Inscrições abertas"),
    supabase.from("campaign_applications").select("id,status").eq("creator_id", me),
    supabase.from("challenges").select("id,name,due_date,points").eq("status", "Ativo").order("due_date").limit(6),
    supabase.from("challenge_participants").select("challenge_id").eq("creator_id", me),
    supabase.from("method_purchases").select("status").eq("creator_id", me),
    supabase.from("creator_addresses").select("creator_id").eq("creator_id", me).maybeSingle(),
    supabase.from("points_log").select("points").eq("creator_id", me),
  ]);
  const first = (c?.name || profile.name || "").split(" ")[0];
  // Marcas em que ela está (entrou pelo formulário exclusivo da marca)
  const { data: cbs } = await supabase.from("creator_brands").select("brand_id").eq("creator_id", me);
  const myBrandIds = (cbs || []).map((x: any) => x.brand_id);
  const { data: myBrands } = myBrandIds.length ? await supabase.from("brand_public").select("id,name,logo_path,instagram").in("id", myBrandIds) : { data: [] as any[] };
  const { data: brandChs } = myBrandIds.length ? await supabase.from("challenges").select("id,brand_id").eq("status", "Ativo").in("brand_id", myBrandIds) : { data: [] as any[] };
  const { data: brandCamps } = myBrandIds.length ? await supabase.from("campaigns").select("id,brand_id").eq("status", "Inscrições abertas").in("brand_id", myBrandIds) : { data: [] as any[] };
  const { data: levels } = await supabase.from("levels").select("*").order("position");
  const joined = new Set((parts || []).map((p: any) => p.challenge_id));
  const avail = (chs || []).filter((x: any) => !joined.has(x.id)).slice(0, 2);
  const hasMethod = (buys || []).some((b: any) => b.status === "Pago");
  const lim = !!profile.limited;
  const xp = c?.xp || (pts || []).reduce((s: number, p: any) => s + p.points, 0);
  return (
    <>
      <div className="club-hero"><span className="eyebrow" style={{ color: "#FF8CC4" }}>Clube Conecta</span><h1>Olá, {first} 👋</h1>{(levels || []).length ? (() => { const lv = levelOf(levels || [], c?.xp || 0); return <Link href={lim ? "/clube/desafios" : "/clube/jornada"} style={{ textDecoration: "none", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><LevelBadge level={lv.cur} />{lv.next ? <span className="small" style={{ color: "#C9BFC6" }}>faltam {lv.next.min_points - (c?.xp || 0)} pts para {lv.next.name}</span> : null}</Link>; })() : null}{lim ? <p style={{ color: "#C9BFC6" }}>{(myBrands || []).length ? `Você faz parte da base de creators da ${(myBrands || []).map((b: any) => b.name).join(", ")}. Aqui você acompanha os desafios e as oportunidades da marca.` : "Aqui você acompanha os desafios e as oportunidades das marcas parceiras."}</p> : <p style={{ color: "#C9BFC6" }}>Você tem {open?.length || 0} campanhas com inscrições abertas.</p>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn btn-primary" href="/clube/oportunidades">Ver oportunidades</Link><Link className="btn btn-ghost" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="/clube/desafios">Desafios</Link></div></div>
      {(myBrands || []).length ? <div className="card"><div className="card-h"><h2>{(myBrands || []).length > 1 ? "Suas marcas" : "Sua marca"}</h2><span className="small muted">você faz parte da base de creators</span></div>
        <div className="list">{(myBrands || []).map((b: any) => { const nc = (brandChs || []).filter((x: any) => x.brand_id === b.id).length, np = (brandCamps || []).filter((x: any) => x.brand_id === b.id).length; return (
          <div className="li" key={b.id} style={{ flexWrap: "wrap" }}>{b.logo_path ? <img src={photoUrl(b.logo_path)} alt={`Logo ${b.name}`} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain", background: "#fff", border: "1px solid var(--line)" }} /> : null}
            <div className="grow"><b>{b.name}</b><span>{nc} desafio{nc === 1 ? "" : "s"} ativo{nc === 1 ? "" : "s"} · {np} oportunidade{np === 1 ? "" : "s"} aberta{np === 1 ? "" : "s"}{b.instagram ? ` · ${b.instagram}` : ""}</span></div>
            <Link className="btn btn-ghost btn-sm" href="/clube/desafios">Desafios</Link><Link className="btn btn-ghost btn-sm" href="/clube/oportunidades">Oportunidades</Link></div>); })}</div>
        {!(brandChs || []).length && !(brandCamps || []).length ? <p className="small muted" style={{ marginTop: 8 }}>Assim que a marca abrir um desafio ou uma campanha, você recebe uma notificação e eles aparecem aqui.</p> : null}</div> : null}
      <GroupLinks supabase={supabase} />
      {!addr ? <div className="notice info">Complete seu endereço em <Link href="/clube/perfil">Meu perfil e endereço</Link> para receber produtos e press kits.</div> : null}
      {lim ? <div className="kpis"><Kpi k="Pontos" v={xp} hero /><Kpi k="Desafios participando" v={joined.size} /></div> : <div className="kpis"><Kpi k="Pontos" v={xp} hero /><Kpi k="Inscrições enviadas" v={mine?.length || 0} /><Kpi k="Aprovadas" v={(mine || []).filter((a: any) => a.status === "Aprovada").length} /><Kpi k="Desafios participando" v={joined.size} /></div>}
      <div className="grid g2">
        <div className="card"><div className="card-h"><h2>Desafios disponíveis</h2><Link className="btn btn-ghost btn-sm" href="/clube/desafios">Ver todos</Link></div>{avail.length ? <div className="list">{avail.map((x: any) => <Link key={x.id} href="/clube/desafios" className="li" style={{ textDecoration: "none", color: "inherit" }}><div className="grow"><b>{x.name}</b><span>{x.points || 0} pontos · até {fd(x.due_date)}</span></div><Pill s="Disponível" /></Link>)}</div> : <p className="muted">Nenhum desafio novo agora.</p>}</div>
        {lim ? null : <div className="card" style={{ background: "#0B0B0C", color: "#F3EDF1", borderColor: "#26232A" }}><span className="eyebrow" style={{ color: "#FF8CC4" }}>Educação</span><h2 style={{ color: "#fff", margin: "6px 0" }}>Club Criadora</h2><p style={{ color: "#C9BFC6" }}>{hasMethod ? "Continue seus cursos de onde parou." : "Método Criadora Expert, Presets, Criadora Organizada e mais."}</p><div style={{ marginTop: 10 }}><Link className="btn btn-primary btn-sm" href="/club">Abrir o Club Criadora</Link></div></div>}
      </div>
    </>
  );
}
