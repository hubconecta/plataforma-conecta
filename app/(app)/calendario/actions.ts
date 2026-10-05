"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, orNull, back } from "@/lib/act";
import { applyLabels } from "@/lib/labels";

export async function saveEvent(fd: FormData) {
  const { supabase, profile } = await requireModule("calendario");
  const id = g(fd, "id"), path = g(fd, "back") || "/calendario";
  const row: any = { title: g(fd, "title"), notes: orNull(g(fd, "notes")), location: orNull(g(fd, "location")), day: g(fd, "day"), start_time: orNull(g(fd, "start_time")), end_time: orNull(g(fd, "end_time")), owner_id: orNull(g(fd, "owner_id")) || profile.id, brand_id: orNull(g(fd, "brand_id")) };
  if (!row.title || !row.day) back(path, "Informe o título e a data.", false);
  if (!id) row.created_by = profile.id;
  const { data: saved, error } = id ? await supabase.from("calendar_events").update(row).eq("id", id).select("id").single() : await supabase.from("calendar_events").insert(row).select("id").single();
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  if (!id && saved?.id) await applyLabels(supabase, "event", saved.id, fd);
  await logAction(supabase, profile, `${id ? "editou" : "agendou"} o compromisso ${row.title}`, "Calendário", id || null);
  revalidatePath("/calendario");
  back(path, id ? "Compromisso atualizado." : "Compromisso agendado.");
}

export async function deleteEvent(fd: FormData) {
  const { supabase, profile } = await requireModule("calendario");
  const id = g(fd, "id");
  const { data: e } = await supabase.from("calendar_events").select("title").eq("id", id).single();
  await supabase.from("calendar_events").delete().eq("id", id);
  await logAction(supabase, profile, `excluiu o compromisso ${e?.title || ""}`, "Calendário", null);
  back(g(fd, "back") || "/calendario", "Compromisso excluído.");
}
