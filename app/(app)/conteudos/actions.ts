"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { g, orNull, back, notifyProfiles, today } from "@/lib/act";

const H = (txt: string, internal = false) => ({ at: new Date().toISOString(), txt, ...(internal ? { internal: true } : {}) });

async function staffLoad(fd: FormData) {
  const s = await requireModule("conteudos");
  if (s.profile.role === "marca") back("/conteudos", "Sem permissão.", false);
  const id = g(fd, "id");
  const { data: c } = await s.supabase.from("contents").select("*, creators(name), campaigns(name,brand_id)").eq("id", id).single();
  if (!c) back("/conteudos", "Conteúdo não encontrado.", false);
  return { ...s, c, id, path: g(fd, "back") || "/conteudos" };
}

export async function approveContent(fd: FormData) {
  const { supabase, profile, c, id, path } = await staffLoad(fd);
  await supabase.from("contents").update({ status: "Aprovado", history: [...(c.history || []), H(`Aprovado por ${profile.name} (versão ${c.version})`)] }).eq("id", id);
  await notifyProfiles(supabase, { creator_id: c.creator_id }, `✅ Seu conteúdo para ${c.campaigns?.name || "a campanha"} foi aprovado`, "/clube/minhas");
  await logAction(supabase, profile, `aprovou o conteúdo de ${c.creators?.name} (${c.campaigns?.name || ""})`, "Conteúdos", id);
  back(path, "Conteúdo aprovado.");
}

export async function reviewContent(fd: FormData) {
  const { supabase, profile, c, id, path } = await staffLoad(fd);
  await supabase.from("contents").update({ status: "Em análise", history: [...(c.history || []), H(`Em análise com ${profile.name}`)] }).eq("id", id);
  await logAction(supabase, profile, `colocou em análise o conteúdo de ${c.creators?.name}`, "Conteúdos", id);
  back(path, "Conteúdo em análise.");
}

export async function adjustContent(fd: FormData) {
  const { supabase, profile, c, id, path } = await staffLoad(fd);
  const txt = g(fd, "note");
  if (!txt) back(path, "Explique o ajuste.", false);
  await supabase.from("contents").update({ status: "Ajuste solicitado", history: [...(c.history || []), H(`Ajuste solicitado por ${profile.name}: ${txt}`, true)] }).eq("id", id);
  await notifyProfiles(supabase, { creator_id: c.creator_id }, `✏️ Ajuste solicitado no seu conteúdo para ${c.campaigns?.name || "a campanha"}: ${txt}`, "/clube/minhas");
  await logAction(supabase, profile, `pediu ajuste no conteúdo de ${c.creators?.name}`, "Conteúdos", id);
  back(path, "Ajuste solicitado. A creator foi avisada.");
}

export async function publishContent(fd: FormData) {
  const { supabase, profile, c, id, path } = await staffLoad(fd);
  const views = Number(g(fd, "views")) || 0, interactions = Number(g(fd, "interactions")) || 0;
  const pub = orNull(g(fd, "published_at")) || c.published_at || today();
  const link = orNull(g(fd, "link")) || c.link;
  const was = c.status === "Publicado";
  await supabase.from("contents").update({ status: "Publicado", views, interactions, published_at: pub, link, history: [...(c.history || []), H(was ? `Métricas atualizadas por ${profile.name}: ${views} views, ${interactions} interações` : `Publicado em ${pub.split("-").reverse().join("/")} (registrado por ${profile.name})`)] }).eq("id", id);
  if (!was) await notifyProfiles(supabase, { brand_id: c.campaigns?.brand_id }, `Conteúdo publicado: ${c.creators?.name} em ${c.campaigns?.name || "campanha"}`, "/conteudos");
  await logAction(supabase, profile, `${was ? "atualizou as métricas do" : "marcou como publicado o"} conteúdo de ${c.creators?.name}`, "Conteúdos", id);
  revalidatePath("/relatorios");
  back(path, was ? "Métricas atualizadas." : "Conteúdo marcado como publicado. A marca foi avisada.");
}

/* ----- Creator ----- */
export async function sendContent(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id"), link = g(fd, "link");
  if (!link) back("/clube/minhas", "Cole o link do conteúdo.", false);
  if (id) {
    const { data: c } = await s.supabase.from("contents").select("status,version,history").eq("id", id).single();
    if (c?.status !== "Ajuste solicitado") back("/clube/minhas", "Este conteúdo não está aguardando ajuste.", false);
    const v = (c.version || 1) + 1;
    const { error } = await s.supabase.from("contents").update({ status: "Enviado", link, version: v, history: [...(c.history || []), H(`Nova versão enviada pela creator (versão ${v})`)] }).eq("id", id);
    if (error) back("/clube/minhas", "Não foi possível enviar.", false);
  } else {
    const camp = g(fd, "campaign_id");
    const { data: cp } = await s.supabase.from("campaigns").select("status").eq("id", camp).single();
    if (cp?.status !== "Ativa") back("/clube/minhas", "Só dá para enviar conteúdo quando a campanha está ativa.", false);
    const { error } = await s.supabase.from("contents").insert({ creator_id: s.profile.creator_id, campaign_id: camp, platform: g(fd, "platform") || "Instagram", type: g(fd, "type") || "Reels", link, status: "Enviado", history: [H("Enviado pela creator (versão 1)")] });
    if (error) back("/clube/minhas", "Não foi possível enviar: você precisa estar aprovada nesta campanha.", false);
  }
  await logAction(s.supabase, s.profile, "enviou conteúdo de campanha", "Conteúdos", id || null);
  back("/clube/minhas", "Conteúdo enviado! A equipe Conecta vai analisar.");
}
