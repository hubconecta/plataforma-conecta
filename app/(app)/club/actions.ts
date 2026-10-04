"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, orNull, num, back, notifyProfiles } from "@/lib/act";
import { COLORS } from "@/lib/metodo";
import { processB4Event } from "@/lib/b4";

const ADM = (pid: string, tab = "") => `/club/admin/${pid}${tab ? `?tab=${tab}` : ""}`;

async function productOf(supabase: any, pid: string) {
  const { data } = await supabase.from("products").select("id,title,slug").eq("id", pid).single();
  if (!data) back("/club/admin", "Produto não encontrado.", false);
  return data;
}
async function notifyStudents(supabase: any, pid: string, text: string, link: string) {
  const { data } = await supabase.from("method_purchases").select("creator_id").eq("status", "Pago").eq("product_id", pid);
  const ids = [...new Set((data || []).map((p: any) => p.creator_id))];
  if (!ids.length) return 0;
  const { data: ps } = await supabase.from("profiles").select("id").eq("role", "creator").eq("status", "ativo").in("creator_id", ids);
  await notifyProfiles(supabase, { ids: (ps || []).map((p: any) => p.id) }, text, link);
  return ps?.length || 0;
}

/* ----- Produtos ----- */
export async function saveProduct(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id");
  const slug = (g(fd, "slug") || g(fd, "title")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const row: any = { title: g(fd, "title"), slug, tagline: orNull(g(fd, "tagline")), description: orNull(g(fd, "description")), cover_path: orNull(g(fd, "cover_path")), color: g(fd, "color") || null, checkout_url: orNull(g(fd, "checkout_url")), b4you_product: orNull(g(fd, "b4you_product")), price: num(fd, "price"), status: g(fd, "status") || "Rascunho" };
  if (!row.title || !slug) back(id ? ADM(id, "produto") : "/club/admin", "Dê um nome ao produto.", false);
  if (!id) { const { count } = await supabase.from("products").select("id", { count: "exact", head: true }); row.position = count || 0; row.color = row.color || COLORS[(count || 0) % COLORS.length]; }
  const { data, error } = id ? await supabase.from("products").update(row).eq("id", id).select("id").single() : await supabase.from("products").insert(row).select("id").single();
  if (error) back(id ? ADM(id, "produto") : "/club/admin", error.message.includes("duplicate") ? "Já existe um produto com este endereço." : error.message, false);
  await logAction(supabase, profile, `${id ? "editou" : "criou"} o produto ${row.title} do Club Criadora (${row.status})`, "Club Criadora", data.id);
  revalidatePath("/club");
  back(id ? ADM(data.id, "produto") : ADM(data.id), id ? "Produto atualizado." : "Produto criado. Agora adicione os módulos e as aulas.");
}

export async function moveProduct(fd: FormData) {
  const { supabase } = await requireModule("metodo_adm");
  const id = g(fd, "id"), dir = Number(g(fd, "dir")) || 0;
  const { data: list } = await supabase.from("products").select("id").order("position").order("created_at");
  const arr = (list || []).map((x: any) => x.id); const i = arr.indexOf(id), j = i + dir;
  if (i >= 0 && j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; for (let k = 0; k < arr.length; k++) await supabase.from("products").update({ position: k }).eq("id", arr[k]); }
  back("/club/admin", "Ordem da vitrine atualizada.");
}

export async function deleteProduct(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back("/club/admin", "Só a CEO pode excluir produtos.", false);
  const id = g(fd, "id");
  const { data: p } = await s.supabase.from("products").select("title").eq("id", id).single();
  const { error } = await s.supabase.from("products").delete().eq("id", id);
  if (error) back(ADM(id, "produto"), error.message, false);
  await logAction(s.supabase, s.profile!, `excluiu o produto ${p?.title || ""} do Club Criadora`, "Club Criadora", null);
  back("/club/admin", "Produto excluído.");
}

/* ----- Módulos e aulas ----- */
export async function saveModule(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), pid = g(fd, "product_id");
  const prod = await productOf(supabase, pid);
  const row: any = { title: g(fd, "title"), description: orNull(g(fd, "description")), status: g(fd, "status") || "Rascunho", cover_path: orNull(g(fd, "cover_path")), color: g(fd, "color") || null };
  if (!row.title) back(ADM(pid), "Dê um nome ao módulo.", false);
  let prev: any = null;
  if (id) { const { data } = await supabase.from("method_modules").select("status").eq("id", id).single(); prev = data; }
  else { const { count } = await supabase.from("method_modules").select("id", { count: "exact", head: true }).eq("product_id", pid); row.position = count || 0; row.product_id = pid; row.color = row.color || COLORS[(count || 0) % COLORS.length]; }
  const { error } = id ? await supabase.from("method_modules").update(row).eq("id", id) : await supabase.from("method_modules").insert(row);
  if (error) back(ADM(pid), error.message, false);
  if (row.status === "Publicado" && prev?.status !== "Publicado") await notifyStudents(supabase, pid, `🆕 Novo módulo liberado em ${prod.title}: ${row.title}`, `/club/${prod.slug}`);
  await logAction(supabase, profile, `${id ? "editou" : "criou"} o módulo ${row.title} de ${prod.title} (${row.status})`, "Club Criadora", id || null);
  revalidatePath("/club");
  back(ADM(pid), id ? "Módulo atualizado." : "Módulo criado.");
}

export async function deleteModule(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), pid = g(fd, "product_id");
  const { data: m } = await supabase.from("method_modules").select("title").eq("id", id).single();
  await supabase.from("method_modules").delete().eq("id", id);
  await logAction(supabase, profile, `excluiu o módulo ${m?.title || ""}`, "Club Criadora", null);
  back(ADM(pid), "Módulo excluído.");
}

export async function saveLesson(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), pid = g(fd, "product_id");
  const prod = await productOf(supabase, pid);
  const row: any = { module_id: g(fd, "module_id"), title: g(fd, "title"), type: g(fd, "type") || "Vídeo", status: g(fd, "status") || "Rascunho", duration: orNull(g(fd, "duration")), description: orNull(g(fd, "description")), video_url: orNull(g(fd, "video_url")), video_path: orNull(g(fd, "video_path")), pdf_path: orNull(g(fd, "pdf_path")), thumb_path: orNull(g(fd, "thumb_path")), exercise: orNull(g(fd, "exercise")) };
  if (!row.title || !row.module_id) back(ADM(pid), "Informe o título da aula.", false);
  let prev: any = null;
  if (id) { const { data } = await supabase.from("method_lessons").select("status").eq("id", id).single(); prev = data; delete row.module_id; }
  else { const { count } = await supabase.from("method_lessons").select("id", { count: "exact", head: true }).eq("module_id", row.module_id); row.position = count || 0; }
  const { data: saved, error } = id ? await supabase.from("method_lessons").update(row).eq("id", id).select("id").single() : await supabase.from("method_lessons").insert(row).select("id").single();
  if (error) back(ADM(pid), error.message, false);
  if (row.status === "Publicada" && prev?.status !== "Publicada") await notifyStudents(supabase, pid, `📚 Nova aula em ${prod.title}: ${row.title}`, `/club/${prod.slug}/aula/${saved.id}`);
  await logAction(supabase, profile, `${id ? "editou" : "criou"} a aula ${row.title} de ${prod.title} (${row.status})`, "Club Criadora", saved.id);
  revalidatePath("/club");
  back(ADM(pid), id ? "Aula atualizada." : "Aula criada.");
}

export async function deleteLesson(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), pid = g(fd, "product_id");
  const { data: l } = await supabase.from("method_lessons").select("title").eq("id", id).single();
  await supabase.from("method_lessons").delete().eq("id", id);
  await logAction(supabase, profile, `excluiu a aula ${l?.title || ""}`, "Club Criadora", null);
  back(ADM(pid), "Aula excluída.");
}

export async function reorder(fd: FormData) {
  const { supabase } = await requireModule("metodo_adm");
  const table = g(fd, "kind") === "module" ? "method_modules" : "method_lessons";
  const id = g(fd, "id"), dir = Number(g(fd, "dir")) || 0, pid = g(fd, "product_id");
  const { data: cur } = await supabase.from(table).select("*").eq("id", id).single();
  let q = supabase.from(table).select("id").order("position").order("created_at");
  q = table === "method_lessons" ? q.eq("module_id", cur.module_id) : q.eq("product_id", cur.product_id);
  const { data: list } = await q;
  const arr = (list || []).map((x: any) => x.id); const i = arr.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) back(ADM(pid), "Já está no limite.", false);
  [arr[i], arr[j]] = [arr[j], arr[i]];
  for (let k = 0; k < arr.length; k++) await supabase.from(table).update({ position: k }).eq("id", arr[k]);
  back(ADM(pid), "Ordem atualizada.");
}

/* ----- Alunas ----- */
export async function notifyAll(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const pid = g(fd, "product_id"), prod = await productOf(supabase, pid);
  const n = await notifyStudents(supabase, pid, `${g(fd, "kind")} · ${prod.title}${g(fd, "extra") ? `: ${g(fd, "extra")}` : ""}`, `/club/${prod.slug}`);
  await logAction(supabase, profile, `avisou as alunas de ${prod.title}`, "Club Criadora", pid);
  back(ADM(pid, "alunas"), `Aviso enviado para ${n} aluna(s).`);
}

// Libera o acesso (pagamento conferido ou cortesia). Nunca é liberado só pelo clique no checkout.
export async function confirmPurchase(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const pid = g(fd, "product_id"), prod = await productOf(supabase, pid);
  const id = orNull(g(fd, "id")), creator = orNull(g(fd, "creator_id")), source = g(fd, "source") || "Confirmação manual";
  let cid = creator;
  if (id) { const { data: p } = await supabase.from("method_purchases").update({ status: "Pago", paid_at: new Date().toISOString(), confirmed_by: profile.id, source }).eq("id", id).select("creator_id").single(); cid = p?.creator_id || null; }
  else if (creator) {
    await supabase.from("method_purchases").insert({ creator_id: creator, product_id: pid, status: "Pago", source, paid_at: new Date().toISOString(), confirmed_by: profile.id, value: num(fd, "value") });
    const v = num(fd, "value");
    if (v) await createAdminClient().from("sales").insert({ creator_id: creator, product: prod.title, product_id: pid, kind: "Club Criadora", sold: v, creator_pct: 0, conecta_pct: 100, rule: "Produto", status: "Aprovada", source: source.includes("B4YOU") ? "B4YOU (manual)" : "Manual" });
  }
  if (!cid) back(ADM(pid, "alunas"), "Escolha a creator.", false);
  await notifyProfiles(supabase, { creator_id: cid }, `🎉 Acesso liberado: ${prod.title}! Bons estudos.`, `/club/${prod.slug}`);
  const { data: c } = await supabase.from("creators").select("name").eq("id", cid).single();
  await logAction(supabase, profile, `liberou ${prod.title} para ${c?.name || "creator"} (${source})`, "Club Criadora", cid, true);
  revalidatePath("/club");
  back(ADM(pid, "alunas"), `Acesso liberado para ${c?.name || "a creator"}.`);
}

export async function revokePurchase(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), pid = g(fd, "product_id");
  const { data: p } = await supabase.from("method_purchases").update({ status: "Reembolsado" }).eq("id", id).select("creators(name)").single();
  await logAction(supabase, profile, `retirou o acesso de ${(p as any)?.creators?.name || ""}`, "Club Criadora", id, true);
  back(ADM(pid, "alunas"), "Acesso retirado.");
}

/* ----- B4YOU (geral) ----- */
export async function saveB4Settings(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back("/club/admin", "Só a CEO altera a integração.", false);
  const admin = createAdminClient();
  const { data: cur } = await admin.from("settings").select("value").eq("key", "b4you").maybeSingle();
  let token = cur?.value?.token || "";
  if (!token || fd.get("new_token")) token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  await admin.from("settings").upsert({ key: "b4you", value: { ...(cur?.value || {}), token }, updated_at: new Date().toISOString() });
  await logAction(s.supabase, s.profile!, "atualizou o webhook da B4YOU", "Integrações", null, true);
  back("/club/admin", "Endereço do webhook pronto.");
}

export async function resolveEvent(fd: FormData) {
  const { supabase, profile } = await requireModule("metodo_adm");
  const id = g(fd, "id"), creator = g(fd, "creator_id"), pid = g(fd, "product_id");
  if (g(fd, "do") === "ignorar") { await supabase.from("b4_events").update({ status: "Ignorado" }).eq("id", id); back("/club/admin", "Evento ignorado."); }
  const { data: ev } = await supabase.from("b4_events").select("*").eq("id", id).single();
  if (!ev || !creator || !pid) back("/club/admin", "Escolha a creator e o produto.", false);
  const prod = await productOf(supabase, pid);
  await supabase.from("method_purchases").insert({ creator_id: creator, product_id: pid, status: "Pago", source: "B4YOU (webhook)", order_code: ev.order_code, value: ev.value, email: ev.email, paid_at: new Date().toISOString(), confirmed_by: profile.id });
  await supabase.from("b4_events").update({ status: "Processado", creator_id: creator, product_id: pid, note: `Conferido por ${profile.name}` }).eq("id", id);
  await notifyProfiles(supabase, { creator_id: creator }, `🎉 Pagamento confirmado! Seu acesso a ${prod.title} foi liberado.`, `/club/${prod.slug}`);
  await logAction(supabase, profile, `liberou ${prod.title} a partir de um evento da B4YOU`, "Integrações", creator, true);
  back("/club/admin", "Acesso liberado.");
}

/* ----- Creator ----- */
export async function startCheckout(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const slug = g(fd, "slug");
  const { data: p } = await s.supabase.from("products").select("id,title,checkout_url").eq("slug", slug).single();
  if (!p) back("/club", "Produto não encontrado.", false);
  const { data: open } = await s.supabase.from("method_purchases").select("id").eq("creator_id", s.profile.creator_id).eq("product_id", p.id).eq("status", "Aguardando pagamento").limit(1);
  if (!open?.length) await s.supabase.from("method_purchases").insert({ creator_id: s.profile.creator_id, product_id: p.id, status: "Aguardando pagamento", source: "Checkout B4YOU", email: s.profile.email });
  await logAction(s.supabase, s.profile, `iniciou o checkout de ${p.title}`, "Club Criadora", p.id);
  if (!p.checkout_url) back(`/club/${slug}`, "As vendas deste produto abrem em breve. A equipe Conecta foi avisada do seu interesse.", false);
  redirect(p.checkout_url);
}

export async function toggleLesson(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id"), done = g(fd, "done") === "1", next = g(fd, "next"), slug = g(fd, "slug");
  if (done) await s.supabase.from("method_progress").delete().eq("creator_id", s.profile.creator_id).eq("lesson_id", id);
  else await s.supabase.from("method_progress").insert({ creator_id: s.profile.creator_id, lesson_id: id });
  revalidatePath("/club");
  redirect(!done && next ? `/club/${slug}/aula/${next}` : `/club/${slug}/aula/${id}`);
}

// Lê de novo um aviso guardado (depois de corrigir o ID do produto, por exemplo)
export async function reprocessEvent(fd: FormData) {
  await requireModule("metodo_adm");
  const st = await processB4Event(createAdminClient(), g(fd, "id"));
  back("/club/admin", st === "Processado" ? "Aviso processado: acesso liberado." : st === "Ignorado" ? "Aviso lido: não é um pagamento aprovado." : "Ainda não deu para liberar: veja o motivo no aviso.", st === "Processado" || st === "Ignorado");
}

export async function reprocessAll() {
  const { supabase } = await requireModule("metodo_adm");
  const { data } = await supabase.from("b4_events").select("id").eq("status", "Para revisar").order("created_at").limit(50);
  const admin = createAdminClient();
  let ok = 0;
  for (const e of data || []) if ((await processB4Event(admin, e.id)) === "Processado") ok++;
  back("/club/admin", `${ok} de ${data?.length || 0} aviso(s) liberados.`);
}
