"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, orNull, back, notifyProfiles, notifyCeo } from "@/lib/act";

export async function saveEvent(fd: FormData) {
  const { supabase, profile } = await requireModule("calendario");
  const id = g(fd, "id"), path = g(fd, "back") || "/calendario";
  const row: any = { title: g(fd, "title"), notes: orNull(g(fd, "notes")), location: orNull(g(fd, "location")), day: g(fd, "day"), start_time: orNull(g(fd, "start_time")), end_time: orNull(g(fd, "end_time")), owner_id: orNull(g(fd, "owner_id")) || profile.id, brand_id: orNull(g(fd, "brand_id")) };
  if (!row.title || !row.day) back(path, "Informe o título e a data.", false);
  if (!id) row.created_by = profile.id;
  const { error } = id ? await supabase.from("calendar_events").update(row).eq("id", id) : await supabase.from("calendar_events").insert(row);
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  if (row.owner_id !== profile.id && !id) await notifyProfiles(supabase, { ids: [row.owner_id] }, `📅 Novo compromisso na sua agenda: ${row.title} em ${row.day.split("-").reverse().join("/")}${row.start_time ? ` às ${row.start_time.slice(0, 5)}` : ""}`, `/calendario?m=${row.day.slice(0, 7)}`);
  const when = `${row.day.split("-").reverse().join("/")}${row.start_time ? ` às ${row.start_time.slice(0, 5)}` : ""}`;
  await notifyCeo(supabase, profile, `📅 ${profile.name} ${id ? "alterou" : "agendou"}: ${row.title} em ${when}`, `/calendario?m=${row.day.slice(0, 7)}&dia=${row.day}&who=todos`);
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
