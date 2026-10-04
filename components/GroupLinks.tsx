import Icon from "./Icon";

// Grupos de WhatsApp que a pessoa pode entrar: comunidade + grupos das campanhas dela.
export default async function GroupLinks({ supabase, campaignIds }: { supabase: any; campaignIds?: string[] }) {
  const [{ data: com }, { data: camp }] = await Promise.all([
    supabase.from("community_links").select("*").order("position").order("created_at"),
    campaignIds && !campaignIds.length ? Promise.resolve({ data: [] }) : (campaignIds ? supabase.from("campaign_links").select("*, campaigns(name)").in("campaign_id", campaignIds) : supabase.from("campaign_links").select("*, campaigns(name,status)")),
  ]);
  const list = [...(com || []).map((c: any) => ({ t: c.title, u: c.url, s: "Comunidade" })), ...(camp || []).filter((c: any) => !c.campaigns?.status || !["Encerrada", "Recusada"].includes(c.campaigns.status)).map((c: any) => ({ t: c.title || `Grupo · ${c.campaigns?.name || "campanha"}`, u: c.url, s: "Campanha" }))];
  if (!list.length) return null;
  return (
    <div className="card"><div className="card-h"><h2>Grupos no WhatsApp</h2></div><div className="list">
      {list.map((g, i) => <a key={i} className="li" href={g.u} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}><span className="alert-ic" style={{ background: "#E8F8EE", color: "#1F8A55" }}><Icon name="wa" /></span><span className="grow"><b>{g.t}</b><span>{g.s}</span></span><span className="btn btn-ok btn-sm">Entrar</span></a>)}
    </div></div>
  );
}
