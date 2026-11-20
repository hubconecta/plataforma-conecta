"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, back, money } from "@/lib/act";
import { hubSettings, manualHub, hubCreatorIds } from "@/lib/hub";
import { processB4Event } from "@/lib/b4";

const P = "/assinaturas";

export async function saveHubSettings(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const admin = createAdminClient();
  const cur = await hubSettings(admin);
  const price = money(g(fd, "price"));
  const grace = parseInt(g(fd, "grace_days"));
  const url = g(fd, "checkout_url");
  if (price == null || price <= 0) back(`${P}?tab=config`, "Informe o valor da assinatura.", false);
  if (url && !/^https:\/\//.test(url)) back(`${P}?tab=config`, "O link do checkout precisa começar com https://", false);
  const value = { ...cur, price, grace_days: isNaN(grace) ? 3 : Math.min(30, Math.max(0, grace)), checkout_url: url.slice(0, 500), b4you_product: g(fd, "b4you_product").slice(0, 200),
    testers: [...new Set(g(fd, "testers").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => x.includes("@")))].slice(0, 50) };
  await admin.from("settings").upsert({ key: "hub", value });
  await admin.from("plans").update({ price }).eq("code", "hub");
  await logAction(supabase, profile, "atualizou as configurações do Conecta Hub", "Conecta Hub", null, true);
  revalidatePath(P); revalidatePath("/hub");
  back(`${P}?tab=config`, "Configurações do Conecta Hub salvas.");
}

export async function grantHub(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const cid = g(fd, "creator_id"), reason = g(fd, "reason").slice(0, 300), until = g(fd, "until");
  const path = g(fd, "back") || P;
  if (!cid) back(path, "Escolha a creator.", false);
  if (!reason) back(path, "Escreva o motivo da liberação (fica no histórico).", false);
  if (until && (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until < new Date().toISOString().slice(0, 10))) back(path, "A data final precisa ser hoje ou depois.", false);
  const admin = createAdminClient();
  const { data: cr } = await admin.from("creators").select("name").eq("id", cid).single();
  if (!cr) back(path, "Creator não encontrada.", false);
  const end = await manualHub(admin, cid, "liberar", profile.id, reason, until || null);
  await logAction(supabase, profile, `liberou manualmente o Conecta Hub para ${cr!.name} até ${end?.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} (motivo: ${reason})`, "Conecta Hub", cid, true);
  revalidatePath(P);
  back(path, `Conecta Hub liberado para ${cr!.name}.`);
}

export async function revokeHub(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const cid = g(fd, "creator_id"), reason = g(fd, "reason").slice(0, 300);
  const path = g(fd, "back") || P;
  if (!reason) back(path, "Escreva o motivo da retirada (fica no histórico).", false);
  const admin = createAdminClient();
  const { data: cr } = await admin.from("creators").select("name").eq("id", cid).single();
  const r = await manualHub(admin, cid, "retirar", profile.id, reason);
  if (!r) back(path, "Essa creator não tem assinatura.", false);
  await logAction(supabase, profile, `retirou o acesso ao Conecta Hub de ${cr?.name || "creator"} (motivo: ${reason})`, "Conecta Hub", cid, true);
  revalidatePath(P);
  back(path, "Acesso ao Conecta Hub retirado.");
}

// Aviso da B4YOU sem creator encontrada: a equipe escolhe a creator e o aviso é aplicado de novo
export async function resolveHubEvent(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const id = g(fd, "id"), cid = g(fd, "creator_id");
  const admin = createAdminClient();
  if (g(fd, "do") === "ignorar") { await admin.from("b4_events").update({ status: "Ignorado", note: `Ignorado por ${profile.name}` }).eq("id", id); back(`${P}?tab=avisos`, "Aviso ignorado."); }
  if (!cid) back(`${P}?tab=avisos`, "Escolha a creator.", false);
  await admin.from("b4_events").update({ creator_id: cid }).eq("id", id);
  const st = await processB4Event(admin, id);
  await logAction(supabase, profile, "conferiu um aviso de pagamento do Conecta Hub e escolheu a creator", "Conecta Hub", cid, true);
  revalidatePath(P);
  back(`${P}?tab=avisos`, st === "Processado" ? "Aviso aplicado: assinatura atualizada." : "Aviso lido, mas não mudou a assinatura (veja o motivo).", st === "Processado");
}

export async function reprocessHubEvents() {
  await requireModule("assinaturas");
  const admin = createAdminClient();
  const { data } = await admin.from("b4_events").select("id").eq("status", "Para revisar").order("created_at").limit(50);
  let ok = 0;
  for (const e of data || []) if ((await processB4Event(admin, e.id)) === "Processado") ok++;
  back(`${P}?tab=avisos`, `${ok} de ${data?.length || 0} aviso(s) aplicados.`);
}

const SECTIONS = ["tiktok", "instagram", "comunidade", "materiais"];
const KINDS = ["Oportunidade", "Conteúdo", "Material", "Link", "Aviso", "Produto", "Vídeo"];

export async function saveHubItem(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const id = g(fd, "id"), url = g(fd, "url");
  const row: any = {
    section: SECTIONS.includes(g(fd, "section")) ? g(fd, "section") : "materiais",
    kind: KINDS.includes(g(fd, "kind")) ? g(fd, "kind") : "Conteúdo",
    category: g(fd, "category").slice(0, 80) || null,
    title: g(fd, "title").slice(0, 160),
    body: g(fd, "body").slice(0, 4000) || null,
    url: /^https?:\/\//.test(url) ? url.slice(0, 600) : null,
    pinned: !!fd.get("pinned"),
    status: g(fd, "status") === "Rascunho" ? "Rascunho" : "Publicado",
  };
  if (!row.title) back(`${P}?tab=conteudos`, "Dê um título ao conteúdo.", false);
  if (!id) row.created_by = profile.id;
  const { error } = id ? await supabase.from("hub_items").update(row).eq("id", id) : await supabase.from("hub_items").insert(row);
  if (error) back(`${P}?tab=conteudos`, "Não foi possível salvar: " + error.message, false);
  if (!id && row.status === "Publicado" && fd.get("notify")) {
    const admin = createAdminClient();
    const H = await hubCreatorIds(admin);
    if (H.length) {
      const { data: ps } = await admin.from("profiles").select("id").eq("role", "creator").eq("status", "ativo").in("creator_id", H);
      for (let i = 0; i < (ps || []).length; i += 500) await admin.from("notifications").insert(ps!.slice(i, i + 500).map((p: any) => ({ user_id: p.id, text: `💎 Novidade no Conecta Hub: ${row.title}`, link: `/hub/${row.section}` })));
    }
  }
  await logAction(supabase, profile, `${id ? "editou" : "publicou"} o conteúdo do Conecta Hub "${row.title}"`, "Conecta Hub", id || null);
  revalidatePath(P); revalidatePath(`/hub/${row.section}`); revalidatePath("/hub");
  back(`${P}?tab=conteudos`, id ? "Conteúdo atualizado." : "Conteúdo publicado no Conecta Hub. 💎");
}

export async function deleteHubItem(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const { data } = await supabase.from("hub_items").delete().eq("id", g(fd, "id")).select("title").single();
  await logAction(supabase, profile, `apagou o conteúdo do Conecta Hub "${data?.title || ""}"`, "Conecta Hub", null);
  revalidatePath(P);
  back(`${P}?tab=conteudos`, "Conteúdo apagado.");
}

// Volta para o modo teste: o Hub some para as creators (menos as de teste e quem já assina)
export async function pauseHub() {
  const { supabase, profile } = await requireModule("assinaturas");
  const admin = createAdminClient();
  const cfg = await hubSettings(admin);
  await admin.from("settings").upsert({ key: "hub", value: { ...cfg, launched: false } });
  await logAction(supabase, profile, "colocou o Conecta Hub em modo teste", "Conecta Hub", null);
  revalidatePath(P); revalidatePath("/clube");
  back(`${P}?tab=config`, "Conecta Hub em modo teste: só as creators de teste veem.");
}

// Lançamento: todas as creators (que ainda não assinam) recebem a notificação e um aviso fixado no início
export async function launchHub() {
  const { supabase, profile } = await requireModule("assinaturas");
  const admin = createAdminClient();
  const cfg = await hubSettings(admin);
  const H = new Set(await hubCreatorIds(admin));
  const { data: ps } = await admin.from("profiles").select("id,creator_id").eq("role", "creator").eq("status", "ativo").not("creator_id", "is", null);
  const people = (ps || []).filter((p: any) => !H.has(p.creator_id));
  if (!people.length) back(`${P}?tab=config`, "Nenhuma creator para avisar.", false);
  const pin = new Date(Date.now() - 3 * 3600e3 + 14 * 864e5).toISOString().slice(0, 10);
  const price = Number(cfg.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const { data: ann } = await admin.from("announcements").insert({
    title: "💎 Chegou o CONECTA HUB", audience: "free", created_by: profile.id, pinned_until: pin,
    body: `Seu próximo nível como creator começa aqui.\n\nO Conecta Hub é o espaço exclusivo para creators que querem ampliar suas oportunidades, aprender, se conectar com marcas e desenvolver sua presença no digital: campanhas exclusivas, comunidade, TikTok Shop, Instagram, Conecta Academy, desafios exclusivos e materiais.\n\nTudo isso por R$ ${price}/mês.`,
    button_label: "Quero fazer parte", button_url: "/hub",
  }).select("id").single();
  for (let i = 0; i < people.length; i += 500) {
    const chunk = people.slice(i, i + 500);
    if (ann) await admin.from("announcement_recipients").insert(chunk.map((p: any) => ({ announcement_id: ann.id, profile_id: p.id })));
    await admin.from("notifications").insert(chunk.map((p: any) => ({ user_id: p.id, text: "💎 Chegou o CONECTA HUB! Campanhas exclusivas, comunidade, Academy e muito mais. Toque para conhecer.", link: "/hub" })));
  }
  if (ann) await admin.from("announcements").update({ sent_count: people.length }).eq("id", ann.id);
  await admin.from("settings").upsert({ key: "hub", value: { ...cfg, launched: true, launched_at: new Date().toISOString() } });
  await logAction(supabase, profile, `lançou o Conecta Hub e avisou ${people.length} creator(s)`, "Conecta Hub", null);
  revalidatePath(P); revalidatePath("/clube");
  back(`${P}?tab=config`, `Conecta Hub lançado! ${people.length} creator(s) receberam a notificação. 💎`);
}

// Grupos (WhatsApp, Telegram…) só para assinantes do Conecta Hub
export async function saveHubGroup(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  const url = g(fd, "url"), title = g(fd, "title").slice(0, 120) || "Comunidade Conecta Hub";
  if (!/^https?:\/\//.test(url)) back(`${P}?tab=conteudos`, "Cole o link completo do grupo (https://chat.whatsapp.com/…).", false);
  const { error } = await createAdminClient().from("community_links").insert({ title, url: url.slice(0, 500), audience: "Hub" });
  if (error) back(`${P}?tab=conteudos`, /audience/.test(error.message) ? "Rode antes o arquivo supabase/23_conecta_hub.sql no Supabase." : error.message, false);
  await logAction(supabase, profile, `adicionou o grupo exclusivo do Conecta Hub "${title}"`, "Conecta Hub", null);
  revalidatePath(P); revalidatePath("/hub/comunidade");
  back(`${P}?tab=conteudos`, "Grupo exclusivo adicionado. Só as assinantes do Conecta Hub veem. 💬");
}
export async function deleteHubGroup(fd: FormData) {
  const { supabase, profile } = await requireModule("assinaturas");
  await createAdminClient().from("community_links").delete().eq("id", g(fd, "id")).eq("audience", "Hub");
  await logAction(supabase, profile, "removeu um grupo exclusivo do Conecta Hub", "Conecta Hub", null);
  revalidatePath(P); revalidatePath("/hub/comunidade");
  back(`${P}?tab=conteudos`, "Grupo removido.");
}
