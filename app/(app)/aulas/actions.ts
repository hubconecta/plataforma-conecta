"use server";
import { revalidatePath } from "next/cache";
import { getSession, logAction } from "@/lib/session";
import { can } from "@/lib/perms";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, back, notifyModule } from "@/lib/act";
import { classAudience } from "@/lib/classes";

const whenTxt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export async function saveClass(fd: FormData) {
  const s = await getSession();
  if (!s.profile || !(can(s.profile, "campanhas") || can(s.profile, "marcas")) || s.profile.role === "marca") back("/aulas", "Sem permissão.", false);
  const id = g(fd, "id"), day = g(fd, "day"), time = g(fd, "time") || "19:00";
  if (!g(fd, "title") || !/^\d{4}-\d{2}-\d{2}$/.test(day)) back("/aulas", "Informe o título e a data da aula.", false);
  const starts_at = new Date(`${day}T${time}:00-03:00`).toISOString();
  const url = g(fd, "url");
  const row: any = { title: g(fd, "title").slice(0, 160), theme: g(fd, "theme").slice(0, 2000) || null, brand_id: g(fd, "brand_id") || null, starts_at, duration_min: parseInt(g(fd, "duration")) || 60, url: /^https?:\/\//.test(url) ? url : null, audience: g(fd, "audience") === "Todas as creators" ? "Todas as creators" : "Creators da marca" };
  if (!row.brand_id) row.audience = "Todas as creators";
  if (!id) row.created_by = s.profile!.id;
  const { data, error } = id ? await s.supabase.from("classes").update(row).eq("id", id).select("id").single() : await s.supabase.from("classes").insert(row).select("id").single();
  if (error || !data) back("/aulas", "Não foi possível salvar: " + (error?.message || ""), false);
  if (!id || fd.get("notify")) {
    const admin = createAdminClient();
    const ids = await classAudience(admin, row);
    const bn = row.brand_id ? (await admin.from("brands").select("name").eq("id", row.brand_id).single()).data?.name : null;
    const text = `🎓 ${id ? "Aula atualizada" : "Nova aula"}${bn ? ` da ${bn}` : ""}: ${row.title} · ${whenTxt(starts_at)}`;
    for (let i = 0; i < ids.length; i += 500) await admin.from("notifications").insert(ids.slice(i, i + 500).map((u) => ({ user_id: u, text, link: "/aulas" })));
    await notifyModule(admin, "campanhas", text, "/aulas", s.profile!.id);
  }
  await logAction(s.supabase, s.profile!, `${id ? "editou" : "agendou"} a aula ${row.title}`, "Campanhas", data!.id);
  revalidatePath("/aulas"); revalidatePath("/clube"); revalidatePath("/portal");
  back("/aulas", id ? "Aula atualizada." : "Aula agendada e avisada para as creators e a marca. 🎓");
}

export async function setClassStatus(fd: FormData) {
  const s = await getSession();
  if (!s.profile || !(can(s.profile, "campanhas") || can(s.profile, "marcas")) || s.profile.role === "marca") back("/aulas", "Sem permissão.", false);
  const id = g(fd, "id"), status = g(fd, "status");
  if (status === "Excluir") { await s.supabase.from("classes").delete().eq("id", id); back("/aulas", "Aula excluída."); }
  const upd: any = { status: ["Agendada", "Cancelada", "Realizada"].includes(status) ? status : "Agendada" };
  if (fd.has("recording_url")) { const r = g(fd, "recording_url"); upd.recording_url = /^https?:\/\//.test(r) ? r : null; }
  const { data: c } = await s.supabase.from("classes").update(upd).eq("id", id).select("*").single();
  if (c && upd.status === "Cancelada") {
    const admin = createAdminClient();
    const ids = await classAudience(admin, c);
    for (let i = 0; i < ids.length; i += 500) await admin.from("notifications").insert(ids.slice(i, i + 500).map((u) => ({ user_id: u, text: `❌ Aula cancelada: ${c.title} (${whenTxt(c.starts_at)})`, link: "/aulas" })));
  }
  if (c && upd.recording_url) {
    const admin = createAdminClient();
    const ids = await classAudience(admin, c);
    for (let i = 0; i < ids.length; i += 500) await admin.from("notifications").insert(ids.slice(i, i + 500).map((u) => ({ user_id: u, text: `▶️ A gravação da aula ${c.title} está disponível`, link: "/aulas" })));
  }
  revalidatePath("/aulas");
  back("/aulas", "Aula atualizada.");
}
