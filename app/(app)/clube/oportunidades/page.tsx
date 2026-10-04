import { requireModule } from "@/lib/session";
import { PageH, Empty, Notice, fd, brl } from "@/components/ui";
import { applyToCampaign } from "../../actions";

export default async function Oportunidades({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("oportunidades");
  const [{ data: camps }, { data: mine }, { data: brands }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("status", "Inscrições abertas").order("start_date"),
    supabase.from("campaign_applications").select("campaign_id,status").eq("creator_id", profile.creator_id),
    supabase.from("brand_public").select("id,name"),
  ]);
  const { data: me } = await supabase.from("creators").select("kind,niche").eq("id", profile.creator_id).single();
  const fits = (c: any) => { const k = String(me?.kind || ""); const prof = (c.profiles_wanted || []).some((p: string) => k.toLowerCase().includes(p.split(" ")[0].toLowerCase())); const nic = !c.niches?.length || c.niches.includes(me?.niche); return (prof || !c.profiles_wanted?.length) && nic; };
  const applied = new Map((mine || []).map((a: any) => [a.campaign_id, a.status]));
  const bname = (id: string) => (brands || []).find((b: any) => b.id === id)?.name || "";
  return (
    <>
      <PageH eyebrow="Central de oportunidades" title="Oportunidades para você" />
      <Notice q={q} />
      {camps?.length ? <div className="grid g2">{camps.map((c: any) => (
        <div className="card" key={c.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><span className="eyebrow">{bname(c.brand_id)}</span>{fits(c) ? <span className="pill ok">Combina com o seu perfil</span> : null}</div><h2>{c.name}</h2>
          {[...(c.campaign_types || []), ...(c.profiles_wanted || [])].length ? <div>{(c.campaign_types || []).map((t: string) => <span key={t} className="tag" style={{ background: "var(--pink-soft)", color: "var(--pink-strong)" }}>{t}</span>)}{(c.profiles_wanted || []).map((t: string) => <span key={t} className="tag">{t}</span>)}</div> : null}
          {c.niches?.length ? <p className="small muted">Nichos: {c.niches.join(", ")}</p> : null}<p className="small muted">{c.description || c.objective || ""}</p>
          <div className="cmeta"><div>Período<b>{fd(c.start_date)}</b></div><div>Cachê<b>{brl(c.fee)}</b></div><div>Comissão<b>{c.commission_pct ? c.commission_pct + "%" : "—"}</b></div></div>
          {c.requirements ? <p className="small"><b>Requisitos:</b> {c.requirements}</p> : null}
          {c.deliverables || c.contents_per_creator ? <p className="small"><b>Entregas:</b> {c.contents_per_creator ? `${c.contents_per_creator} conteúdo(s). ` : ""}{c.deliverables || ""}</p> : null}
          {applied.has(c.id) ? <span className="pill info">Inscrição: {String(applied.get(c.id))}</span> : (
            <details className="mod"><summary>QUERO PARTICIPAR</summary><form action={applyToCampaign} className="form-grid" style={{ paddingBottom: 14 }}><input type="hidden" name="campaign_id" value={c.id} /><div className="field full"><label>Por que você quer participar?</label><textarea className="input" name="motivo" required /></div><div className="field"><label>Formato que mais domina</label><select className="input" name="formato"><option>Reels</option><option>Stories</option><option>TikTok</option><option>Carrossel</option></select></div><div><button className="btn btn-primary btn-sm">Enviar inscrição</button></div></form></details>)}
        </div>))}</div> : <Empty icon="compass" title="Nenhuma oportunidade aberta agora" text="Quando uma campanha abrir inscrições, ela aparece aqui." />}
    </>
  );
}
