// Quem recebe um aviso, conforme o público escolhido. Devolve perfis (id, e-mail, nome).
export const AUDIENCES: [string, string][] = [
  ["base", "Creators da base Conecta (Clube completo)"],
  ["todas", "Todas as creators (inclui as só de marca)"],
  ["marca", "Creators de uma marca"],
  ["campanha", "Aprovadas em uma campanha"],
  ["marcas", "Marcas (Portal da Marca)"],
  ["equipe", "Equipe Conecta"],
];

export async function resolveAudience(admin: any, a: { audience: string; brand_id?: string | null; campaign_id?: string | null }) {
  const sel = "id,email,name,creator_id";
  if (a.audience === "marcas") return (await admin.from("profiles").select(sel).eq("role", "marca").eq("status", "ativo")).data || [];
  if (a.audience === "equipe") return (await admin.from("profiles").select(sel).in("role", ["ceo", "equipe", "financeiro"]).eq("status", "ativo")).data || [];
  let creatorIds: string[] | null = null;
  if (a.audience === "marca" && a.brand_id) {
    const [{ data: base }, { data: camps }] = await Promise.all([
      admin.from("creator_brands").select("creator_id").eq("brand_id", a.brand_id),
      admin.from("campaigns").select("id").eq("brand_id", a.brand_id),
    ]);
    const { data: apps } = (camps || []).length ? await admin.from("campaign_applications").select("creator_id").eq("status", "Aprovada").in("campaign_id", camps.map((c: any) => c.id)) : { data: [] };
    creatorIds = [...new Set([...(base || []), ...(apps || [])].map((x: any) => x.creator_id))] as string[];
  }
  if (a.audience === "campanha" && a.campaign_id) {
    const { data } = await admin.from("campaign_applications").select("creator_id").eq("status", "Aprovada").eq("campaign_id", a.campaign_id);
    creatorIds = (data || []).map((x: any) => x.creator_id);
  }
  if (creatorIds && !creatorIds.length) return [];
  let q = admin.from("profiles").select(sel).eq("role", "creator").eq("status", "ativo");
  if (creatorIds) q = q.in("creator_id", creatorIds);
  let list: any[] = (await q).data || [];
  if (a.audience === "base") {
    const { data: lim, error } = await admin.from("creators").select("id").eq("brand_only", true);
    if (!error) { const L = new Set((lim || []).map((x: any) => x.id)); list = list.filter((p) => !L.has(p.creator_id)); }
  }
  return list;
}
