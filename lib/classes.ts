// Quem recebe o aviso da aula: creators da marca (base + aprovadas nas campanhas dela) ou todas, e a marca.
export async function classAudience(admin: any, cls: { brand_id: string | null; audience: string }) {
  let creatorIds: string[] | null = null;
  if (cls.brand_id && cls.audience !== "Todas as creators") {
    const [{ data: base }, { data: camps }] = await Promise.all([
      admin.from("creator_brands").select("creator_id").eq("brand_id", cls.brand_id),
      admin.from("campaigns").select("id").eq("brand_id", cls.brand_id),
    ]);
    const { data: apps } = (camps || []).length ? await admin.from("campaign_applications").select("creator_id").eq("status", "Aprovada").in("campaign_id", camps.map((c: any) => c.id)) : { data: [] };
    creatorIds = [...new Set([...(base || []), ...(apps || [])].map((x: any) => x.creator_id))] as string[];
  }
  let q = admin.from("profiles").select("id,creator_id").eq("role", "creator").eq("status", "ativo");
  if (creatorIds) { if (!creatorIds.length) q = null; else q = q.in("creator_id", creatorIds); }
  let ids: string[] = [];
  if (q) {
    const { data } = await q;
    let list = data || [];
    if (!creatorIds) { const { data: lim } = await admin.from("creators").select("id").eq("brand_only", true); const L = new Set((lim || []).map((x: any) => x.id)); list = list.filter((p: any) => !L.has(p.creator_id)); }
    ids = list.map((p: any) => p.id);
  }
  if (cls.brand_id) { const { data: bs } = await admin.from("profiles").select("id").eq("role", "marca").eq("status", "ativo").eq("brand_id", cls.brand_id); ids = ids.concat((bs || []).map((p: any) => p.id)); }
  return ids;
}

