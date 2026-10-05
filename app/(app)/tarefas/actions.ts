"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, orNull, back, notifyProfiles } from "@/lib/act";
import { TASK_STATUS } from "@/lib/consts";
import { applyLabels } from "@/lib/labels";

export async function saveTask(fd: FormData) {
  const { supabase, profile } = await requireModule("demandas");
  const id = g(fd, "id"), path = g(fd, "back") || "/tarefas";
  const row: any = { title: g(fd, "title"), description: orNull(g(fd, "description")), owner_id: orNull(g(fd, "owner_id")), due: orNull(g(fd, "due")), prio: g(fd, "prio") || "Média", brand_id: orNull(g(fd, "brand_id")), campaign_id: orNull(g(fd, "campaign_id")), creator_id: orNull(g(fd, "creator_id")) };
  if (fd.has("status")) row.status = g(fd, "status");
  if (!row.title) back(path, "Dê um título à tarefa.", false);
  if (!id) row.created_by = profile.id;
  const { data: saved, error } = id ? await supabase.from("tasks").update(row).eq("id", id).select("id").single() : await supabase.from("tasks").insert(row).select("id").single();
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  if (!id && saved?.id) await applyLabels(supabase, "task", saved.id, fd);
  // quem recebe a tarefa é avisada pelo banco (vale para CEO, colaboradoras e financeiro); o resto da equipe, pelo histórico
  await logAction(supabase, profile, `${id ? "editou" : "criou"} a tarefa ${row.title}`, "Tarefas", id || null);
  revalidatePath("/tarefas");
  back(path, id ? "Tarefa atualizada." : "Tarefa criada.");
}

export async function moveTask(fd: FormData) {
  const { supabase, profile } = await requireModule("demandas");
  const id = g(fd, "id"), dir = Number(g(fd, "dir")) || 0;
  const { data: t } = await supabase.from("tasks").select("title,status,created_by,owner_id").eq("id", id).single();
  if (!t) back("/tarefas", "Tarefa não encontrada.", false);
  const i = Math.min(2, Math.max(0, TASK_STATUS.indexOf(t.status) + dir));
  await supabase.from("tasks").update({ status: TASK_STATUS[i] }).eq("id", id);
  if (TASK_STATUS[i] === "Concluído" && t.status !== "Concluído") {
    const to = [t.created_by, t.owner_id].filter((x: any) => x && x !== profile.id);
    if (to.length) await notifyProfiles(supabase, { ids: [...new Set(to)] as string[] }, `✅ ${profile.name} concluiu a tarefa: ${t.title}`, "/tarefas");
  }
  await logAction(supabase, profile, `moveu a tarefa ${t.title} para ${TASK_STATUS[i]}`, "Tarefas", id);
  revalidatePath("/tarefas");
  back(g(fd, "back") || "/tarefas", `Tarefa em: ${TASK_STATUS[i] === "Concluído" ? "Concluída" : TASK_STATUS[i]}.`);
}

export async function deleteTask(fd: FormData) {
  const { supabase, profile } = await requireModule("demandas");
  const id = g(fd, "id");
  const { data: t } = await supabase.from("tasks").select("title,created_by").eq("id", id).single();
  if (profile.role !== "ceo" && t?.created_by !== profile.id) back("/tarefas", "Só quem criou a tarefa (ou a CEO) pode excluir.", false);
  await supabase.from("tasks").delete().eq("id", id);
  await logAction(supabase, profile, `excluiu a tarefa ${t?.title || ""}`, "Tarefas", null);
  back("/tarefas", "Tarefa excluída.");
}
