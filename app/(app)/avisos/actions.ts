"use server";
import { revalidatePath } from "next/cache";
import { getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, back } from "@/lib/act";
import { AUDIENCES, resolveAudience } from "@/lib/audience";
import { emailEnabled, emailLayout, sendEmail } from "@/lib/email";

export async function sendAnnouncement(fd: FormData) {
  const s = await getSession();
  if (!s.profile || !["ceo", "equipe"].includes(s.profile.role)) back("/avisos", "Sem permissão.", false);
  const audience = g(fd, "audience");
  if (!AUDIENCES.some(([k]) => k === audience)) back("/avisos", "Escolha quem vai receber.", false);
  const title = g(fd, "title").slice(0, 140), body = g(fd, "body").slice(0, 3000);
  if (!title) back("/avisos", "Escreva o título do aviso.", false);
  const url = g(fd, "button_url");
  const row: any = {
    title, body: body || null, audience,
    button_url: /^https?:\/\//.test(url) || url.startsWith("/") ? url.slice(0, 500) : null,
    button_label: g(fd, "button_label").slice(0, 40) || null,
    brand_id: audience === "marca" ? g(fd, "brand_id") || null : null,
    campaign_id: audience === "campanha" ? g(fd, "campaign_id") || null : null,
    pinned_until: /^\d{4}-\d{2}-\d{2}$/.test(g(fd, "pinned_until")) ? g(fd, "pinned_until") : null,
    send_email: !!fd.get("send_email") && emailEnabled(),
    created_by: s.profile!.id,
  };
  if (row.button_url && !row.button_label) row.button_label = "Abrir";
  if (audience === "marca" && !row.brand_id) back("/avisos", "Escolha a marca.", false);
  if (audience === "campanha" && !row.campaign_id) back("/avisos", "Escolha a campanha.", false);
  const admin = createAdminClient();
  const people = (await resolveAudience(admin, row)).filter((p: any) => p.id !== s.profile!.id);
  if (!people.length) back("/avisos", "Ninguém nesse público ainda. Confira a escolha.", false);
  const { data: ann, error } = await admin.from("announcements").insert(row).select("id").single();
  if (error || !ann) back("/avisos", "Não foi possível enviar: " + (error?.message || ""), false);
  const id = ann!.id;
  for (let i = 0; i < people.length; i += 500) {
    const chunk = people.slice(i, i + 500);
    await admin.from("announcement_recipients").insert(chunk.map((p: any) => ({ announcement_id: id, profile_id: p.id })));
    await admin.from("notifications").insert(chunk.map((p: any) => ({ user_id: p.id, text: `📢 ${title}`, link: `/aviso/${id}` })));
  }
  let emailed = 0;
  if (row.send_email) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const cta = row.button_url ? { label: row.button_label || "Abrir", url: row.button_url.startsWith("/") ? site + row.button_url : row.button_url } : { label: "Ver na plataforma", url: `${site}/aviso/${id}` };
    for (const p of people.slice(0, 95)) { // limite diário do plano grátis do Resend
      if (p.email && (await sendEmail(p.email, title, emailLayout(title, [`Oi${p.name ? ", " + String(p.name).split(" ")[0] : ""}!`, ...(body ? body.split(/\n+/) : [])], cta)))) emailed++;
    }
  }
  await admin.from("announcements").update({ sent_count: people.length, emailed_count: emailed }).eq("id", id);
  await logAction(s.supabase, s.profile!, `enviou o aviso "${title}" para ${people.length} pessoa(s)`, "Campanhas", id);
  revalidatePath("/avisos"); revalidatePath("/clube"); revalidatePath("/portal");
  back("/avisos", `Aviso enviado para ${people.length} pessoa(s)${row.send_email ? ` · ${emailed} e-mail(s)` : ""}. 📢`);
}

export async function deleteAnnouncement(fd: FormData) {
  const s = await getSession();
  if (!s.profile || !["ceo", "equipe"].includes(s.profile.role)) back("/avisos", "Sem permissão.", false);
  await s.supabase.from("announcements").delete().eq("id", g(fd, "id"));
  revalidatePath("/avisos"); revalidatePath("/clube");
  back("/avisos", "Aviso apagado (as pessoas não veem mais).");
}

export async function unpinAnnouncement(fd: FormData) {
  const s = await getSession();
  if (!s.profile || !["ceo", "equipe"].includes(s.profile.role)) back("/avisos", "Sem permissão.", false);
  await s.supabase.from("announcements").update({ pinned_until: null }).eq("id", g(fd, "id"));
  revalidatePath("/avisos"); revalidatePath("/clube"); revalidatePath("/portal");
  back("/avisos", "Aviso desafixado do início.");
}
