// Carrega as etiquetas de um tipo de item (marcas, creators, formulários, tarefas, compromissos).
import { ENT, fitsScope, type Entity, type Label } from "./label-ui";

export async function loadLabels(supabase: any, entity: Entity | Entity[], ids?: string[]) {
  const ents = Array.isArray(entity) ? entity : [entity];
  let lq = supabase.from("label_links").select("label_id,entity,entity_id").in("entity", ents);
  if (ids) lq = ids.length ? lq.in("entity_id", ids.slice(0, 300)) : null;
  const [{ data: all }, links] = await Promise.all([
    supabase.from("labels").select("id,name,color,scope,position").order("position").order("name"),
    lq ? lq : Promise.resolve({ data: [] as any[] }),
  ]);
  const labels: Label[] = all || [];
  const byId = new Map(labels.map((l) => [l.id, l]));
  const on = new Map<string, string[]>();
  (links.data || []).forEach((r: any) => { const k = `${r.entity}:${r.entity_id}`; on.set(k, [...(on.get(k) || []), r.label_id]); });
  return {
    all: labels,
    // etiquetas que podem ser usadas neste tipo de item
    usable: (e: Entity) => labels.filter((l) => fitsScope(l, e)),
    // ids das etiquetas de um item
    ids: (e: Entity, id: string) => on.get(`${e}:${id}`) || [],
    // etiquetas de um item, na ordem da lista
    of: (e: Entity, id: string) => (on.get(`${e}:${id}`) || []).map((x) => byId.get(x)).filter(Boolean).sort((a: any, b: any) => (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name)) as Label[],
    has: (e: Entity, id: string, labelId: string) => (on.get(`${e}:${id}`) || []).includes(labelId),
  };
}

// Grava as etiquetas escolhidas no formulário de criação (checkboxes name="label_ids").
export async function applyLabels(supabase: any, entity: Entity, id: string, fd: FormData) {
  const chosen = [...new Set(fd.getAll("label_ids").map(String).filter(Boolean))];
  if (!chosen.length) return;
  await supabase.from("label_links").insert(chosen.map((label_id) => ({ label_id, entity, entity_id: id })));
}

export { ENT };
