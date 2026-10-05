"use server";
import { revalidatePath } from "next/cache";
import { getSession, logAction } from "@/lib/session";
import { can } from "@/lib/perms";
import { g, back } from "@/lib/act";
import { ENT, SCOPES, safeColor, type Entity, type Label } from "@/lib/label-ui";

async function team() {
  const s = await getSession();
  if (!s.profile || !["ceo", "equipe", "financeiro"].includes(s.profile.role) || s.profile.status !== "ativo") return null;
  return s as { supabase: any; profile: NonNullable<typeof s.profile> };
}
const refresh = (e?: Entity) => { (e ? ENT[e].paths : ["/marcas", "/creators", "/formularios", "/tarefas", "/calendario"]).forEach((p) => revalidatePath(p, "layout")); revalidatePath("/etiquetas"); };

// Liga ou desliga uma etiqueta num item (usado pelo seletor de etiquetas).
export async function setLabel(entity: Entity, entityId: string, labelId: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  const s = await team();
  if (!s || !ENT[entity]) return { ok: false, error: "Sem permissão." };
  if (!can(s.profile, ENT[entity].mod)) return { ok: false, error: "Você não tem acesso a este módulo." };
  const { error } = on
    ? await s.supabase.from("label_links").upsert({ label_id: labelId, entity, entity_id: entityId }, { onConflict: "label_id,entity,entity_id", ignoreDuplicates: true })
    : await s.supabase.from("label_links").delete().eq("label_id", labelId).eq("entity", entity).eq("entity_id", entityId);
  if (error) return { ok: false, error: "Não foi possível salvar a etiqueta." };
  refresh(entity);
  return { ok: true };
}

// Cria uma etiqueta nova (e já coloca no item, se vier de um item).
export async function createLabel(name: string, color: string, scope: string, apply?: { entity: Entity; id: string }): Promise<{ ok: boolean; label?: Label; error?: string }> {
  const s = await team();
  if (!s) return { ok: false, error: "Sem permissão." };
  const n = String(name || "").trim().slice(0, 40);
  if (!n) return { ok: false, error: "Dê um nome à etiqueta." };
  const { data, error } = await s.supabase.from("labels").insert({ name: n, color: safeColor(color), scope: SCOPES.includes(scope) ? scope : "Todas", created_by: s.profile.id, position: 100 }).select("id,name,color,scope,position").single();
  if (error || !data) return { ok: false, error: "Não foi possível criar a etiqueta." };
  if (apply && ENT[apply.entity] && can(s.profile, ENT[apply.entity].mod)) await s.supabase.from("label_links").insert({ label_id: data.id, entity: apply.entity, entity_id: apply.id });
  await logAction(s.supabase, s.profile, `criou a etiqueta ${n}`, "Etiquetas", data.id);
  refresh(apply?.entity);
  return { ok: true, label: data };
}

// ---- Página "Etiquetas" (formulários) ----
export async function saveLabelForm(fd: FormData) {
  const s = await team();
  if (!s) back("/etiquetas", "Sem permissão.", false);
  const id = g(fd, "id"), name = g(fd, "name").slice(0, 40), scope = g(fd, "scope");
  if (!name) back("/etiquetas", "Dê um nome à etiqueta.", false);
  const row: any = { name, color: safeColor(g(fd, "color")), scope: SCOPES.includes(scope) ? scope : "Todas", position: Number(g(fd, "position")) || 0 };
  if (!id) row.created_by = s!.profile.id;
  const { error } = id ? await s!.supabase.from("labels").update(row).eq("id", id) : await s!.supabase.from("labels").insert(row);
  if (error) back("/etiquetas", "Não foi possível salvar: " + error.message, false);
  await logAction(s!.supabase, s!.profile, `${id ? "editou" : "criou"} a etiqueta ${name}`, "Etiquetas", id || null);
  refresh();
  back("/etiquetas", id ? "Etiqueta atualizada." : "Etiqueta criada.");
}

export async function deleteLabelForm(fd: FormData) {
  const s = await team();
  if (!s) back("/etiquetas", "Sem permissão.", false);
  const id = g(fd, "id");
  const { data: l } = await s!.supabase.from("labels").select("name,created_by").eq("id", id).single();
  if (!l) back("/etiquetas", "Etiqueta não encontrada.", false);
  if (s!.profile.role !== "ceo" && l.created_by !== s!.profile.id) back("/etiquetas", "Só quem criou a etiqueta (ou a CEO) pode excluir.", false);
  await s!.supabase.from("labels").delete().eq("id", id);
  await logAction(s!.supabase, s!.profile, `excluiu a etiqueta ${l.name}`, "Etiquetas", null);
  refresh();
  back("/etiquetas", "Etiqueta excluída e retirada de todos os itens.");
}
